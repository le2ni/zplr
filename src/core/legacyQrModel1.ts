import QRCode, { type GeneratedQRCodeSegment } from "qrcode";
import toSJIS from "qrcode/helper/to-sjis";
import type {
  QrInputSegment,
  QrLayoutField,
  QrStructuredAppend,
} from "@/types/LabelLayout";

export interface LegacyQrModel1Symbol {
  /** Row-major modules, with 1 representing a dark module. */
  modules: Uint8Array;
  size: number;
  version: number;
  mask: number;
}

interface EncodedSegment {
  mode: "N" | "A" | "B" | "K";
  data: string | Uint8Array;
}

interface VersionCharacteristics {
  totalCodewords: number;
  dataCodewords: Readonly<Record<QrLayoutField["reliability"], number>>;
  blocks: Readonly<Record<QrLayoutField["reliability"], number>>;
  remainderCodewords: Readonly<Record<QrLayoutField["reliability"], number>>;
}

const characteristics = (
  totalCodewords: number,
  data: readonly [number, number, number, number],
  blocks: readonly [number, number, number, number],
  remainder: readonly [number, number, number, number] = [0, 0, 0, 0]
): VersionCharacteristics => ({
  totalCodewords,
  dataCodewords: { L: data[0], M: data[1], Q: data[2], H: data[3] },
  blocks: { L: blocks[0], M: blocks[1], Q: blocks[2], H: blocks[3] },
  remainderCodewords: {
    L: remainder[0],
    M: remainder[1],
    Q: remainder[2],
    H: remainder[3],
  },
});

// ISO/IEC 18004:2000, Annex M, tables M.2 through M.5.  A Model 1
// symbol begins with one four-bit data codeword; every following codeword is
// eight bits.  The values below count that four-bit codeword as one.
const MODEL_1_VERSIONS: readonly VersionCharacteristics[] = [
  characteristics(26, [19, 16, 13, 9], [1, 1, 1, 1]),
  characteristics(46, [36, 30, 24, 16], [1, 1, 1, 1]),
  characteristics(72, [57, 44, 36, 24], [1, 1, 1, 1]),
  characteristics(100, [80, 60, 50, 34], [1, 1, 1, 1]),
  characteristics(134, [108, 82, 68, 46], [1, 1, 1, 2]),
  characteristics(170, [136, 106, 86, 58], [1, 2, 2, 2]),
  characteristics(212, [170, 132, 108, 72], [1, 2, 2, 3], [0, 0, 0, 2]),
  characteristics(256, [208, 160, 128, 87], [2, 2, 2, 3], [0, 0, 0, 1]),
  characteristics(306, [246, 186, 156, 102], [2, 2, 3, 3]),
  characteristics(358, [290, 222, 183, 124], [2, 2, 3, 4], [0, 0, 1, 2]),
  characteristics(416, [336, 256, 208, 145], [2, 4, 4, 5], [0, 0, 0, 1]),
  characteristics(476, [384, 292, 244, 165], [2, 4, 4, 5], [0, 0, 0, 1]),
  characteristics(542, [432, 332, 276, 192], [3, 4, 4, 6], [2, 2, 2, 2]),
  characteristics(610, [489, 368, 310, 210], [3, 4, 5, 6], [1, 2, 0, 4]),
];

const ALPHANUMERIC = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

function putBits(output: number[], value: number, count: number): void {
  for (let bit = count - 1; bit >= 0; bit--) {
    output.push((value >>> bit) & 1);
  }
}

function countBits(mode: EncodedSegment["mode"], version: number): number {
  const group = version < 10 ? 0 : 1;
  if (mode === "N") return [10, 12][group];
  if (mode === "A") return [9, 11][group];
  if (mode === "B") return [8, 16][group];
  return [8, 10][group];
}

function kanjiValue(character: string): number {
  let value = toSJIS(character);
  if (value >= 0x8140 && value <= 0x9ffc) value -= 0x8140;
  else if (value >= 0xe040 && value <= 0xebbf) value -= 0xc140;
  else throw new Error(`QR Kanji data contains an invalid Shift JIS character: ${character}`);
  return ((value >>> 8) & 0xff) * 0xc0 + (value & 0xff);
}

function appendSegmentBits(
  output: number[],
  segment: EncodedSegment,
  version: number
): void {
  const modeBits = { N: 0x1, A: 0x2, B: 0x4, K: 0x8 } as const;
  putBits(output, modeBits[segment.mode], 4);

  if (segment.mode === "B") {
    const bytes =
      typeof segment.data === "string"
        ? Uint8Array.from(
            [...segment.data].map((character) => character.codePointAt(0) ?? 0)
          )
        : segment.data;
    putBits(output, bytes.length, countBits("B", version));
    for (const byte of bytes) putBits(output, byte, 8);
    return;
  }

  const data = String(segment.data);
  const characters = [...data];
  putBits(output, characters.length, countBits(segment.mode, version));
  if (segment.mode === "N") {
    for (let offset = 0; offset < data.length; offset += 3) {
      const group = data.slice(offset, offset + 3);
      putBits(output, Number(group), group.length === 3 ? 10 : group.length === 2 ? 7 : 4);
    }
  } else if (segment.mode === "A") {
    for (let offset = 0; offset < data.length; offset += 2) {
      const first = ALPHANUMERIC.indexOf(data[offset]);
      const second = ALPHANUMERIC.indexOf(data[offset + 1]);
      if (first < 0 || (offset + 1 < data.length && second < 0)) {
        throw new Error("QR alphanumeric data contains an unsupported character.");
      }
      if (offset + 1 < data.length) putBits(output, first * 45 + second, 11);
      else putBits(output, first, 6);
    }
  } else {
    for (const character of characters) putBits(output, kanjiValue(character), 13);
  }
}

function appendStructuredAppendBits(
  output: number[],
  structuredAppend: QrStructuredAppend | undefined
): void {
  if (!structuredAppend) return;
  putBits(output, 0x3, 4);
  putBits(output, structuredAppend.index, 4);
  putBits(output, structuredAppend.total - 1, 4);
  putBits(output, structuredAppend.parity, 8);
}

function generatedSegments(data: string, version: 9 | 14): EncodedSegment[] {
  const generated = QRCode.create(data, {
    version,
    errorCorrectionLevel: "L",
    toSJISFunc: toSJIS,
  }).segments;
  return generated.map((segment: GeneratedQRCodeSegment) => ({
    mode:
      segment.mode.id === "Numeric"
        ? "N"
        : segment.mode.id === "Alphanumeric"
        ? "A"
        : segment.mode.id === "Kanji"
        ? "K"
        : "B",
    data: segment.data,
  }));
}

function fallbackAutomaticSegment(data: string): EncodedSegment[] {
  if (/^\d+$/.test(data)) return [{ mode: "N", data }];
  if (/^[0-9A-Z $%*+\-./:]+$/.test(data)) return [{ mode: "A", data }];
  return [{ mode: "B", data: new TextEncoder().encode(data) }];
}

function layoutSegments(segments: readonly QrInputSegment[]): EncodedSegment[] {
  return segments.map((segment) => ({
    mode: segment.mode,
    data:
      segment.mode === "B"
        ? Uint8Array.from(
            [...segment.data].map((character) => character.codePointAt(0) ?? 0)
          )
        : segment.data,
  }));
}

function dataBits(
  segments: readonly EncodedSegment[],
  version: number,
  structuredAppend: QrStructuredAppend | undefined
): number[] {
  const output: number[] = [];
  appendStructuredAppendBits(output, structuredAppend);
  for (const segment of segments) appendSegmentBits(output, segment, version);
  return output;
}

function selectVersionAndSegments(field: QrLayoutField): {
  version: number;
  segments: EncodedSegment[];
} {
  const explicitSegments = field.segments ? layoutSegments(field.segments) : undefined;
  for (const range of [
    { first: 1, last: 9, optimizerVersion: 9 as const },
    { first: 10, last: 14, optimizerVersion: 14 as const },
  ]) {
    let segments = explicitSegments;
    if (!segments) {
      try {
        segments = generatedSegments(field.data, range.optimizerVersion);
      } catch {
        segments = fallbackAutomaticSegment(field.data);
      }
    }
    for (let version = range.first; version <= range.last; version++) {
      const capacity =
        MODEL_1_VERSIONS[version - 1].dataCodewords[field.reliability] * 8 - 4;
      if (dataBits(segments, version, field.structuredAppend).length <= capacity) {
        return { version, segments };
      }
    }
  }
  throw new Error("QR Model 1 data exceeds the Version 14 symbol capacity.");
}

const GF_EXP = new Uint8Array(512);
const GF_LOG = new Uint8Array(256);
{
  let value = 1;
  for (let index = 0; index < 255; index++) {
    GF_EXP[index] = value;
    GF_LOG[value] = index;
    value <<= 1;
    if (value & 0x100) value ^= 0x11d;
  }
  for (let index = 255; index < GF_EXP.length; index++) {
    GF_EXP[index] = GF_EXP[index - 255];
  }
}

function gfMultiply(left: number, right: number): number {
  return left === 0 || right === 0 ? 0 : GF_EXP[GF_LOG[left] + GF_LOG[right]];
}

function polynomialMultiply(left: Uint8Array, right: Uint8Array): Uint8Array {
  const output = new Uint8Array(left.length + right.length - 1);
  for (let x = 0; x < left.length; x++) {
    for (let y = 0; y < right.length; y++) {
      output[x + y] ^= gfMultiply(left[x], right[y]);
    }
  }
  return output;
}

const generatorCache = new Map<number, Uint8Array>();

function generatorPolynomial(degree: number): Uint8Array {
  const cached = generatorCache.get(degree);
  if (cached) return cached;
  let polynomial: Uint8Array = Uint8Array.of(1);
  for (let index = 0; index < degree; index++) {
    polynomial = polynomialMultiply(polynomial, Uint8Array.of(1, GF_EXP[index]));
  }
  generatorCache.set(degree, polynomial);
  return polynomial;
}

function reedSolomon(data: Uint8Array, degree: number): Uint8Array {
  const generator = generatorPolynomial(degree);
  const working = new Uint8Array(data.length + degree);
  working.set(data);
  for (let offset = 0; offset < data.length; offset++) {
    const coefficient = working[offset];
    if (coefficient === 0) continue;
    for (let index = 0; index < generator.length; index++) {
      working[offset + index] ^= gfMultiply(generator[index], coefficient);
    }
  }
  return working.slice(data.length);
}

function finalizeCodewords(
  field: QrLayoutField,
  version: number,
  segments: readonly EncodedSegment[]
): Uint8Array {
  const characteristics = MODEL_1_VERSIONS[version - 1];
  const dataCount = characteristics.dataCodewords[field.reliability];
  const capacityBits = dataCount * 8 - 4;
  const bits = dataBits(segments, version, field.structuredAppend);
  for (let index = 0; index < Math.min(4, capacityBits - bits.length); index++) {
    bits.push(0);
  }
  while ((bits.length - 4) % 8 !== 0) bits.push(0);
  let pad = 0;
  while (bits.length < capacityBits) {
    putBits(bits, pad++ % 2 === 0 ? 0xec : 0x11, 8);
  }

  const data = new Uint8Array(dataCount);
  data[0] = bits.slice(0, 4).reduce((value, bit) => (value << 1) | bit, 0);
  for (let codeword = 1; codeword < data.length; codeword++) {
    const start = 4 + (codeword - 1) * 8;
    data[codeword] = bits
      .slice(start, start + 8)
      .reduce((value, bit) => (value << 1) | bit, 0);
  }

  const blockCount = characteristics.blocks[field.reliability];
  const dataPerBlock = dataCount / blockCount;
  const remainder = characteristics.remainderCodewords[field.reliability];
  const ecPerBlock =
    (characteristics.totalCodewords - dataCount - remainder) / blockCount;
  const errorCorrection: Uint8Array[] = [];
  for (let block = 0; block < blockCount; block++) {
    errorCorrection.push(
      reedSolomon(
        data.slice(block * dataPerBlock, (block + 1) * dataPerBlock),
        ecPerBlock
      )
    );
  }

  const output = new Uint8Array(characteristics.totalCodewords);
  output.set(data);
  let offset = data.length;
  for (const block of errorCorrection) {
    output.set(block, offset);
    offset += block.length;
  }
  // Remainder codewords are pad codewords outside the RS-protected blocks.
  for (let index = 0; index < remainder; index++) {
    output[offset++] = index % 2 === 0 ? 0xec : 0x11;
  }
  return output;
}

function setModule(
  modules: Uint8Array,
  size: number,
  x: number,
  y: number,
  dark: boolean
): void {
  modules[y * size + x] = dark ? 1 : 0;
}

function drawFinder(modules: Uint8Array, size: number, left: number, top: number): void {
  for (let y = -1; y <= 7; y++) {
    if (top + y < 0 || top + y >= size) continue;
    for (let x = -1; x <= 7; x++) {
      if (left + x < 0 || left + x >= size) continue;
      const dark =
        (y >= 0 && y <= 6 && (x === 0 || x === 6)) ||
        (x >= 0 && x <= 6 && (y === 0 || y === 6)) ||
        (x >= 2 && x <= 4 && y >= 2 && y <= 4);
      setModule(modules, size, left + x, top + y, dark);
    }
  }
}

function drawFunctionPatterns(modules: Uint8Array, size: number, version: number): void {
  drawFinder(modules, size, 0, 0);
  drawFinder(modules, size, size - 7, 0);
  drawFinder(modules, size, 0, size - 7);
  for (let coordinate = 8; coordinate < size - 8; coordinate++) {
    const dark = coordinate % 2 === 0;
    setModule(modules, size, coordinate, 6, dark);
    setModule(modules, size, 6, coordinate, dark);
  }

  // Model 1 extension patterns: a 2x2 corner with only its lower-right
  // module dark, plus alternating right-edge and bottom-edge blocks.
  for (let y = size - 2; y < size; y++) {
    for (let x = size - 2; x < size; x++) {
      setModule(modules, size, x, y, x === size - 1 && y === size - 1);
    }
  }
  const first = version % 2 === 0 ? 13 : 17;
  for (let block = 0; block < Math.floor(version / 2); block++) {
    const start = first + block * 8;
    for (let offset = 0; offset < 4; offset++) {
      setModule(modules, size, size - 2, start + offset, false);
      setModule(modules, size, size - 1, start + offset, true);
      setModule(modules, size, start + offset, size - 2, false);
      setModule(modules, size, start + offset, size - 1, true);
    }
  }
}

function maskBit(mask: number, x: number, y: number): boolean {
  const product = x * y;
  if (mask === 0) return (x + y) % 2 === 0;
  if (mask === 1) return y % 2 === 0;
  if (mask === 2) return x % 3 === 0;
  if (mask === 3) return (x + y) % 3 === 0;
  if (mask === 4) return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
  if (mask === 5) return (product % 2) + (product % 3) === 0;
  if (mask === 6) return ((product % 2) + (product % 3)) % 2 === 0;
  return (((x + y) % 2) + (product % 3)) % 2 === 0;
}

function placeCodeword(
  modules: Uint8Array,
  size: number,
  value: number,
  x: number,
  y: number,
  width: 2 | 4,
  mask: number,
  first = false
): void {
  const firstBit = first ? 4 : 0;
  for (let bit = firstBit; bit < 8; bit++) {
    const moduleX = x - (bit % width);
    const moduleY = y - Math.floor(bit / width);
    const dark = ((value >>> (7 - bit)) & 1) !== 0;
    setModule(modules, size, moduleX, moduleY, dark !== maskBit(mask, moduleX, moduleY));
  }
}

// This is the inverse of ZXing-C++'s Apache-2.0 Model 1 reader placement.
// It implements ISO/IEC 18004:2000 M.7.3: two vertical columns on the
// right, horizontal symbol characters through the center, then four vertical
// columns on the left.  Keeping the formula next to the encoder makes the
// unusual four-bit first symbol explicit and testable.
function placeCodewords(
  modules: Uint8Array,
  size: number,
  codewords: Uint8Array,
  mask: number
): void {
  const columns = Math.floor(size / 4) + 3;
  let codeword = 0;
  for (let column = 0; column < columns; column++) {
    if (column <= 1) {
      const rows = Math.floor((size - 8) / 4);
      for (let row = 0; row < rows; row++) {
        if (column === 0 && row % 2 === 0 && row > 0 && row < rows - 1) continue;
        const x = size - 1 - column * 2;
        const y = size - 1 - row * 4;
        placeCodeword(modules, size, codewords[codeword], x, y, 2, mask, codeword === 0);
        codeword++;
      }
    } else if (columns - column <= 4) {
      const rows = Math.floor((size - 16) / 4);
      for (let row = 0; row < rows; row++) {
        const remaining = columns - column;
        const x = (remaining - 1) * 2 + 1 + (remaining === 4 ? 1 : 0);
        const y = size - 1 - 8 - row * 4;
        placeCodeword(modules, size, codewords[codeword++], x, y, 2, mask);
      }
    } else {
      const rows = Math.floor(size / 2);
      for (let row = 0; row < rows; row++) {
        if (column === 2 && row >= rows - 4) continue;
        if (row === 0 && column % 2 === 1 && column + 1 !== columns - 4) continue;
        const x = size - 1 - 4 - (column - 2) * 4;
        const y = size - 1 - row * 2 - (row >= rows - 3 ? 1 : 0);
        placeCodeword(modules, size, codewords[codeword++], x, y, 4, mask);
      }
    }
  }
  if (codeword !== codewords.length) {
    throw new Error("QR Model 1 placement did not consume the complete codeword sequence.");
  }
}

function formatBits(reliability: QrLayoutField["reliability"], mask: number): number {
  const levelBits = { L: 1, M: 0, Q: 3, H: 2 }[reliability];
  const data = (levelBits << 3) | mask;
  let remainder = data << 10;
  for (let bit = 14; bit >= 10; bit--) {
    if (remainder & (1 << bit)) remainder ^= 0x537 << (bit - 10);
  }
  return ((data << 10) | remainder) ^ 0x2825;
}

function drawFormatInformation(
  modules: Uint8Array,
  size: number,
  reliability: QrLayoutField["reliability"],
  mask: number
): void {
  const bits = formatBits(reliability, mask);
  for (let index = 0; index < 15; index++) {
    const dark = ((bits >>> index) & 1) !== 0;
    const verticalY = index < 6 ? index : index < 8 ? index + 1 : size - 15 + index;
    setModule(modules, size, 8, verticalY, dark);
    const horizontalX =
      index < 8 ? size - index - 1 : index < 9 ? 15 - index : 14 - index;
    setModule(modules, size, horizontalX, 8, dark);
  }
  setModule(modules, size, 8, size - 8, true);
}

function linePenalty(line: Uint8Array): number {
  const runs: number[] = line[0] === 1 ? [-1, 1] : [1];
  let previous = line[0];
  for (let index = 1; index < line.length; index++) {
    if (line[index] === previous) runs[runs.length - 1]++;
    else {
      previous = line[index];
      runs.push(1);
    }
  }

  let penalty = 0;
  for (let index = 0; index < runs.length; index++) {
    if (runs[index] >= 5) penalty += 3 + runs[index] - 5;
    if (
      (index & 1) === 1 &&
      index >= 3 &&
      index < runs.length - 2 &&
      runs[index] % 3 === 0
    ) {
      const unit = runs[index] / 3;
      if (
        runs[index - 2] === unit &&
        runs[index - 1] === unit &&
        runs[index + 1] === unit &&
        runs[index + 2] === unit &&
        (index === 3 ||
          runs[index - 3] >= 4 * unit ||
          index + 4 >= runs.length ||
          runs[index + 3] >= 4 * unit)
      ) {
        penalty += 40;
      }
    }
  }
  return penalty;
}

/** @internal Real-printer-compatible mask score used by conformance tests. */
export function legacyQrMaskPenalty(modules: Uint8Array, size: number): number {
  let penalty = 0;
  let dark = 0;
  const row = new Uint8Array(size);
  const column = new Uint8Array(size);
  for (let first = 0; first < size; first++) {
    for (let second = 0; second < size; second++) {
      row[second] = modules[first * size + second];
      column[second] = modules[second * size + first];
      dark += row[second];
    }
    penalty += linePenalty(row) + linePenalty(column);
  }

  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const sum =
        modules[y * size + x] +
        modules[y * size + x + 1] +
        modules[(y + 1) * size + x] +
        modules[(y + 1) * size + x + 1];
      if (sum === 0 || sum === 4) penalty += 3;
    }
  }

  const roundedDarkPercent = Math.floor(
    Math.floor((200 * dark + modules.length) / modules.length) / 2
  );
  penalty += Math.floor(Math.abs(roundedDarkPercent - 50) / 5) * 10;
  return penalty;
}

function buildSymbol(
  field: QrLayoutField,
  version: number,
  codewords: Uint8Array,
  mask: number
): Uint8Array {
  const size = version * 4 + 17;
  const modules = new Uint8Array(size * size);
  drawFunctionPatterns(modules, size, version);
  placeCodewords(modules, size, codewords, mask);
  drawFormatInformation(modules, size, field.reliability, mask);
  return modules;
}

/** @internal Exact-mask helper used by real-printer conformance tests. */
export function encodeLegacyQrModel1WithMask(
  field: QrLayoutField,
  requestedMask: number
): LegacyQrModel1Symbol {
  if (field.model !== "1") throw new Error("Legacy QR encoding requires QR Model 1.");
  const { version, segments } = selectVersionAndSegments(field);
  const mask = Math.max(0, Math.min(7, Math.trunc(requestedMask)));
  const modules = buildSymbol(
    field,
    version,
    finalizeCodewords(field, version, segments),
    mask
  );
  return { modules, size: version * 4 + 17, version, mask };
}

export function encodeLegacyQrModel1(field: QrLayoutField): LegacyQrModel1Symbol {
  if (field.model !== "1") throw new Error("Legacy QR encoding requires QR Model 1.");
  const { version, segments } = selectVersionAndSegments(field);
  const size = version * 4 + 17;
  const codewords = finalizeCodewords(field, version, segments);
  let mask = 0;
  let modules = buildSymbol(field, version, codewords, mask);
  let penalty = legacyQrMaskPenalty(modules, size);
  for (let candidate = 1; candidate < 8; candidate++) {
    const candidateModules = buildSymbol(field, version, codewords, candidate);
    const candidatePenalty = legacyQrMaskPenalty(candidateModules, size);
    if (candidatePenalty < penalty) {
      mask = candidate;
      modules = candidateModules;
      penalty = candidatePenalty;
    }
  }
  return { modules, size, version, mask };
}
