import toSJIS from "qrcode/helper/to-sjis.js";
import AlignmentPattern from "qrcode/lib/core/alignment-pattern.js";
import AlphanumericData from "qrcode/lib/core/alphanumeric-data.js";
import BitBuffer from "qrcode/lib/core/bit-buffer.js";
import BitMatrix from "qrcode/lib/core/bit-matrix.js";
import ByteData from "qrcode/lib/core/byte-data.js";
import ECCode from "qrcode/lib/core/error-correction-code.js";
import ECLevel from "qrcode/lib/core/error-correction-level.js";
import FinderPattern from "qrcode/lib/core/finder-pattern.js";
import FormatInfo from "qrcode/lib/core/format-info.js";
import KanjiData from "qrcode/lib/core/kanji-data.js";
import MaskPattern from "qrcode/lib/core/mask-pattern.js";
import Mode from "qrcode/lib/core/mode.js";
import NumericData from "qrcode/lib/core/numeric-data.js";
import ReedSolomonEncoder from "qrcode/lib/core/reed-solomon-encoder.js";
import Segments from "qrcode/lib/core/segments.js";
import Utils from "qrcode/lib/core/utils.js";
import Version from "qrcode/lib/core/version.js";
import type { QrLayoutField } from "@/types/LabelLayout";

interface Segment {
  mode: { bit: number };
  data: unknown;
  getLength(): number;
  getBitsLength(): number;
  write(buffer: InstanceType<typeof BitBuffer>): void;
}

export interface QrModel2Symbol {
  /** Row-major modules, with 1 representing a dark module. */
  modules: Uint8Array;
  size: number;
  version: number;
  mask: number;
}

function explicitSegments(field: QrLayoutField): Segment[] | undefined {
  if (!field.segments) return undefined;
  return field.segments.map((segment) => {
    if (segment.mode === "N") return new NumericData(segment.data) as Segment;
    if (segment.mode === "A") return new AlphanumericData(segment.data) as Segment;
    if (segment.mode === "K") return new KanjiData(segment.data) as Segment;
    return new ByteData(
      Uint8Array.from(
        [...segment.data].map((character) => character.codePointAt(0) ?? 0)
      )
    ) as Segment;
  });
}

function requiredBits(
  segments: readonly Segment[],
  version: number,
  structuredAppend: QrLayoutField["structuredAppend"]
): number {
  let bits = structuredAppend ? 20 : 0;
  for (const segment of segments) {
    bits +=
      4 +
      Mode.getCharCountIndicator(segment.mode, version) +
      segment.getBitsLength();
  }
  return bits;
}

function dataCapacityBits(
  version: number,
  errorCorrectionLevel: unknown
): number {
  return (
    (Utils.getSymbolTotalCodewords(version) -
      ECCode.getTotalCodewordsCount(version, errorCorrectionLevel)) *
    8
  );
}

function selectVersionAndSegments(
  field: QrLayoutField,
  errorCorrectionLevel: unknown
): { version: number; segments: Segment[] } {
  const explicit = explicitSegments(field);
  for (const range of [
    { first: 1, last: 9, optimizerVersion: 9 },
    { first: 10, last: 26, optimizerVersion: 26 },
    { first: 27, last: 40, optimizerVersion: 40 },
  ]) {
    const segments =
      explicit ?? (Segments.fromString(field.data, range.optimizerVersion) as Segment[]);
    for (let version = range.first; version <= range.last; version++) {
      if (
        requiredBits(segments, version, field.structuredAppend) <=
        dataCapacityBits(version, errorCorrectionLevel)
      ) {
        return { version, segments };
      }
    }
  }
  throw new Error("QR Model 2 data exceeds the Version 40 symbol capacity.");
}

function createCodewords(
  bitBuffer: InstanceType<typeof BitBuffer>,
  version: number,
  errorCorrectionLevel: unknown
): Uint8Array {
  const totalCodewords = Utils.getSymbolTotalCodewords(version);
  const ecTotalCodewords = ECCode.getTotalCodewordsCount(
    version,
    errorCorrectionLevel
  );
  const dataTotalCodewords = totalCodewords - ecTotalCodewords;
  const ecTotalBlocks = ECCode.getBlocksCount(version, errorCorrectionLevel);
  const blocksInGroup2 = totalCodewords % ecTotalBlocks;
  const blocksInGroup1 = ecTotalBlocks - blocksInGroup2;
  const totalCodewordsInGroup1 = Math.floor(totalCodewords / ecTotalBlocks);
  const dataCodewordsInGroup1 = Math.floor(dataTotalCodewords / ecTotalBlocks);
  const dataCodewordsInGroup2 = dataCodewordsInGroup1 + 1;
  const ecCount = totalCodewordsInGroup1 - dataCodewordsInGroup1;
  const encoder = new ReedSolomonEncoder(ecCount);
  const source = new Uint8Array(bitBuffer.buffer);
  const dataBlocks: Uint8Array[] = [];
  const errorBlocks: Uint8Array[] = [];
  let offset = 0;
  let maximumDataSize = 0;
  for (let block = 0; block < ecTotalBlocks; block++) {
    const dataSize =
      block < blocksInGroup1
        ? dataCodewordsInGroup1
        : dataCodewordsInGroup2;
    const data = source.slice(offset, offset + dataSize);
    dataBlocks.push(data);
    errorBlocks.push(encoder.encode(data));
    offset += dataSize;
    maximumDataSize = Math.max(maximumDataSize, dataSize);
  }

  const output = new Uint8Array(totalCodewords);
  let cursor = 0;
  for (let index = 0; index < maximumDataSize; index++) {
    for (const block of dataBlocks) {
      if (index < block.length) output[cursor++] = block[index];
    }
  }
  for (let index = 0; index < ecCount; index++) {
    for (const block of errorBlocks) output[cursor++] = block[index];
  }
  return output;
}

function createData(
  field: QrLayoutField,
  segments: readonly Segment[],
  version: number,
  errorCorrectionLevel: unknown
): Uint8Array {
  const buffer = new BitBuffer();
  if (field.structuredAppend) {
    buffer.put(0x3, 4);
    buffer.put(field.structuredAppend.index, 4);
    buffer.put(field.structuredAppend.total - 1, 4);
    buffer.put(field.structuredAppend.parity, 8);
  }
  for (const segment of segments) {
    buffer.put(segment.mode.bit, 4);
    buffer.put(
      segment.getLength(),
      Mode.getCharCountIndicator(segment.mode, version)
    );
    segment.write(buffer);
  }

  const capacity = dataCapacityBits(version, errorCorrectionLevel);
  const terminator = Math.min(4, capacity - buffer.getLengthInBits());
  if (terminator > 0) buffer.put(0, terminator);
  while (buffer.getLengthInBits() % 8 !== 0) buffer.putBit(0);
  const remaining = (capacity - buffer.getLengthInBits()) / 8;
  for (let index = 0; index < remaining; index++) {
    buffer.put(index % 2 === 0 ? 0xec : 0x11, 8);
  }
  return createCodewords(buffer, version, errorCorrectionLevel);
}

function setupFinderPatterns(matrix: any, version: number): void {
  for (const [row, column] of FinderPattern.getPositions(version)) {
    for (let y = -1; y <= 7; y++) {
      if (row + y < 0 || row + y >= matrix.size) continue;
      for (let x = -1; x <= 7; x++) {
        if (column + x < 0 || column + x >= matrix.size) continue;
        const dark =
          (y >= 0 && y <= 6 && (x === 0 || x === 6)) ||
          (x >= 0 && x <= 6 && (y === 0 || y === 6)) ||
          (x >= 2 && x <= 4 && y >= 2 && y <= 4);
        matrix.set(row + y, column + x, dark, true);
      }
    }
  }
}

function setupTimingPatterns(matrix: any): void {
  for (let coordinate = 8; coordinate < matrix.size - 8; coordinate++) {
    const dark = coordinate % 2 === 0;
    matrix.set(coordinate, 6, dark, true);
    matrix.set(6, coordinate, dark, true);
  }
}

function setupAlignmentPatterns(matrix: any, version: number): void {
  for (const [row, column] of AlignmentPattern.getPositions(version)) {
    for (let y = -2; y <= 2; y++) {
      for (let x = -2; x <= 2; x++) {
        const dark =
          y === -2 || y === 2 || x === -2 || x === 2 || (x === 0 && y === 0);
        matrix.set(row + y, column + x, dark, true);
      }
    }
  }
}

function setupVersionInformation(matrix: any, version: number): void {
  const bits = Version.getEncodedBits(version);
  for (let index = 0; index < 18; index++) {
    const row = Math.floor(index / 3);
    const column = (index % 3) + matrix.size - 11;
    const dark = ((bits >>> index) & 1) !== 0;
    matrix.set(row, column, dark, true);
    matrix.set(column, row, dark, true);
  }
}

function setupFormatInformation(
  matrix: any,
  errorCorrectionLevel: unknown,
  mask: number
): void {
  const bits = FormatInfo.getEncodedBits(errorCorrectionLevel, mask);
  for (let index = 0; index < 15; index++) {
    const dark = ((bits >>> index) & 1) !== 0;
    const vertical =
      index < 6
        ? index
        : index < 8
        ? index + 1
        : matrix.size - 15 + index;
    matrix.set(vertical, 8, dark, true);
    const horizontal =
      index < 8
        ? matrix.size - index - 1
        : index < 9
        ? 15 - index
        : 14 - index;
    matrix.set(8, horizontal, dark, true);
  }
  matrix.set(matrix.size - 8, 8, true, true);
}

function setupData(matrix: any, data: Uint8Array): void {
  let direction = -1;
  let row = matrix.size - 1;
  let bit = 7;
  let byte = 0;
  for (let column = matrix.size - 1; column > 0; column -= 2) {
    if (column === 6) column--;
    while (true) {
      for (let offset = 0; offset < 2; offset++) {
        if (matrix.isReserved(row, column - offset)) continue;
        const dark =
          byte < data.length && ((data[byte] >>> bit) & 1) !== 0;
        matrix.set(row, column - offset, dark);
        if (--bit < 0) {
          byte++;
          bit = 7;
        }
      }
      row += direction;
      if (row < 0 || row >= matrix.size) {
        row -= direction;
        direction = -direction;
        break;
      }
    }
  }
}

function encodeQrModel2Symbol(
  field: QrLayoutField,
  requestedMask: number | undefined
): QrModel2Symbol {
  if (field.model !== "2") throw new Error("QR Model 2 encoding requires model 2.");
  Utils.setToSJISFunction(toSJIS);
  const errorCorrectionLevel = ECLevel[field.reliability];
  const { version, segments } = selectVersionAndSegments(
    field,
    errorCorrectionLevel
  );
  const data = createData(field, segments, version, errorCorrectionLevel);
  const matrix = new BitMatrix(Utils.getSymbolSize(version));
  setupFinderPatterns(matrix, version);
  setupTimingPatterns(matrix);
  setupAlignmentPatterns(matrix, version);
  setupFormatInformation(matrix, errorCorrectionLevel, 0);
  if (version >= 7) setupVersionInformation(matrix, version);
  setupData(matrix, data);
  const mask =
    requestedMask === undefined
      ? MaskPattern.getBestMask(
          matrix,
          setupFormatInformation.bind(undefined, matrix, errorCorrectionLevel)
        )
      : Math.max(0, Math.min(7, Math.trunc(requestedMask)));
  MaskPattern.applyMask(mask, matrix);
  setupFormatInformation(matrix, errorCorrectionLevel, mask);
  return {
    modules: new Uint8Array(matrix.data),
    size: matrix.size,
    version,
    mask,
  };
}

export function encodeQrModel2(field: QrLayoutField): QrModel2Symbol {
  return encodeQrModel2Symbol(field, undefined);
}

/** @internal Exact-mask helper used by real-printer conformance tests. */
export function encodeQrModel2WithMask(
  field: QrLayoutField,
  mask: number
): QrModel2Symbol {
  return encodeQrModel2Symbol(field, mask);
}
