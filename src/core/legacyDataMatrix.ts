import { LEGACY_DATA_MATRIX_PLACEMENT_BASE64 } from "@/assets/legacyDataMatrixPlacement.generated";

export type LegacyDataMatrixQuality = 0 | 50 | 80 | 100 | 140;

export interface LegacyDataMatrixOptions {
  data: string;
  quality: LegacyDataMatrixQuality;
  format: number;
  columns?: number;
  rows?: number;
}

export interface LegacyDataMatrixSymbol {
  /** Row-major modules, with 1 representing a dark module. */
  modules: Uint8Array;
  size: number;
}

const FORMAT_SEGMENTS = ["", "00000", "00001", "00010", "00011", "00100", "00101"];

// Table 12 values are transmitted least-significant bit first.
const QUALITY_HEADERS: Readonly<Record<LegacyDataMatrixQuality, string>> = {
  0: "0111111",
  50: "0111000000000111000",
  80: "0111000000111000111",
  100: "0111000000111111111",
  140: "0111000111000111111",
};

const MASTER_RANDOM_BYTES = Uint8Array.from(
  `
    05 ff c7 31 88 a8 83 9c 64 87 9f 64 b3 e0 4d 9c 80 29 3a 90
    b3 8b 9e 90 45 bf f5 68 4b 08 cf 44 b8 d4 4c 5b a0 ab 72 52
    1c e4 d2 74 a4 da 8a 08 fa a7 c7 dd 00 30 a9 e6 64 ab d5 8b
    ed 9c 79 f8 08 d1 8b c6 22 64 0b 33 43 d0 80 d4 44 95 2e 6f
    5e 13 8d 47 62 06 eb 80 82 c9 41 d5 73 8a 30 23 24 e3 7f b2
    a8 0b ed 38 42 4c d7 b0 ce 98 bd e1 d5 e4 c3 1d 15 4a cf d1
    1f 39 26 18 93 fc 19 b2 2d ab f2 6e a1 9f af d0 8a 2b a0 56
    b0 41 6d 43 a4 63 f3 aa 7d af 35 57 c2 94 4a 65 0b 41 de b8
    e2 30 12 27 9b 66 2b 34 5b b8 99 e8 28 71 d0 95 6b 07 4d 3c
    7a b3 e5 29 b3 ba 8c cc 2d e0 c9 c0 22 ec 4c de f8 58 07 fc
    19 f2 64 e2 c3 e2 d8 b9 fd 67 a0 bc f5 2e c9 49 75 62 82 27
    10 f4 19 6f 49 f7 b3 84 14 ea eb e1 2a 31 ab 47 7d 08 29 ac
    bb 72 fa fa 62 b8 c8 d3 86 89 95 fd df cc 9c ad f1 d4 6c 64
    23 24 2a 56 1f 36 eb b7 d6 ff da 57 f4 50 79 08 00
  `
    .trim()
    .split(/\s+/)
    .map((value) => Number.parseInt(value, 16))
);

interface ConvolutionalCode {
  k: number;
  memory: number;
  /** Output -> input branch -> current/delay tap mask. */
  masks: readonly (readonly string[])[];
}

const CONVOLUTIONAL_CODES: Readonly<
  Record<Exclude<LegacyDataMatrixQuality, 0>, ConvolutionalCode>
> = {
  50: {
    k: 3,
    memory: 3,
    masks: [
      ["1000", "0001", "0111"],
      ["0011", "1101", "0000"],
      ["0111", "0100", "1100"],
      ["1100", "1110", "1101"],
    ],
  },
  80: {
    k: 2,
    memory: 11,
    masks: [
      ["110101110010", "000100011001"],
      ["010011001110", "100100101100"],
      ["100001110000", "111010010101"],
    ],
  },
  100: {
    k: 1,
    memory: 15,
    masks: [["1010011111100001"], ["1101101000010111"]],
  },
  140: {
    k: 1,
    memory: 13,
    masks: [
      ["10001001001011"],
      ["10011001111101"],
      ["11101101010111"],
      ["11101101011111"],
    ],
  },
};

const BASE_FORMATS: Readonly<
  Record<1 | 2 | 3 | 4, { base: number; group: number; lengths: readonly number[] }>
> = {
  1: { base: 11, group: 6, lengths: [4, 7, 11, 14, 18, 21] },
  2: { base: 27, group: 5, lengths: [5, 10, 15, 20, 24] },
  3: { base: 41, group: 4, lengths: [6, 11, 17, 22] },
  4: { base: 37, group: 4, lengths: [6, 11, 16, 21] },
};

function decodeBase64(value: string): Uint8Array {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const clean = value.replace(/\s+/g, "").replace(/=+$/, "");
  const output = new Uint8Array(Math.floor((clean.length * 6) / 8));
  let accumulator = 0;
  let available = 0;
  let outputIndex = 0;
  for (const character of clean) {
    const digit = alphabet.indexOf(character);
    if (digit < 0) throw new Error("Legacy Data Matrix placement data is corrupt.");
    accumulator = (accumulator << 6) | digit;
    available += 6;
    if (available >= 8) {
      available -= 8;
      output[outputIndex++] = (accumulator >> available) & 0xff;
      accumulator &= (1 << available) - 1;
    }
  }
  return output;
}

let placementTables: ReadonlyMap<number, Uint16Array> | undefined;

function legacyPlacement(side: number): Uint16Array {
  if (!placementTables) {
    const packed = decodeBase64(LEGACY_DATA_MATRIX_PLACEMENT_BASE64);
    const tables = new Map<number, Uint16Array>();
    let bitOffset = 0;
    for (let currentSide = 7; currentSide <= 47; currentSide += 2) {
      const area = currentSide * currentSide;
      const width = Math.ceil(Math.log2(area));
      const table = new Uint16Array(area);
      for (let index = 0; index < area; index++) {
        let value = 0;
        for (let bit = 0; bit < width; bit++, bitOffset++) {
          value |=
            ((packed[bitOffset >> 3] >> (bitOffset & 7)) & 1) << bit;
        }
        table[index] = value;
      }
      tables.set(currentSide, table);
    }
    placementTables = tables;
  }
  const table = placementTables.get(side);
  if (!table) throw new Error(`No legacy Data Matrix placement grid exists for ${side}.`);
  return table;
}

function appendLsb(bits: number[], value: number, width: number): void {
  for (let bit = 0; bit < width; bit++) bits.push((value >>> bit) & 1);
}

function legacyBytes(value: string): number[] {
  const output: number[] = [];
  for (let index = 0; index < value.length; index++) {
    const codePoint = value.codePointAt(index) ?? 0;
    if (codePoint > 0xffff) index++;
    if (codePoint === 92 && value[index + 1] === "&") {
      output.push(13, 10);
      index++;
    } else if (codePoint === 92 && value[index + 1] === "\\") {
      output.push(92);
      index++;
    } else if (codePoint <= 255) {
      output.push(codePoint);
    } else {
      throw new Error("Legacy Data Matrix field data must contain single-byte characters.");
    }
  }
  if (output.length > 596) {
    throw new Error("Legacy Data Matrix field data exceeds Zebra's 596-character limit.");
  }
  return output;
}

function baseCode(format: 1 | 2 | 3 | 4, byte: number): number | undefined {
  if (byte === 32) return 0;
  if (format !== 1 && byte >= 65 && byte <= 90) return byte - 64;
  if (format === 1 && byte >= 48 && byte <= 57) return byte - 47;
  if ((format === 3 || format === 4) && byte >= 48 && byte <= 57) {
    return byte - 21;
  }
  if (format === 3) {
    if (byte === 46) return 37;
    if (byte === 44) return 38;
    if (byte === 45) return 39;
    if (byte === 47) return 40;
  }
  return undefined;
}

function encodedDataBits(format: number, bytes: readonly number[]): number[] {
  const bits: number[] = [];
  if (format >= 1 && format <= 4) {
    const typedFormat = format as 1 | 2 | 3 | 4;
    const definition = BASE_FORMATS[typedFormat];
    const codes = bytes.map((byte) => {
      const code = baseCode(typedFormat, byte);
      if (code === undefined) {
        throw new Error(
          `Legacy Data Matrix format ${format} cannot encode byte ${byte}.`
        );
      }
      return code;
    });
    for (let offset = 0; offset < codes.length; offset += definition.group) {
      const group = codes.slice(offset, offset + definition.group);
      let value = 0;
      let weight = 1;
      for (const code of group) {
        value += code * weight;
        weight *= definition.base;
      }
      appendLsb(bits, value, definition.lengths[group.length - 1]);
    }
    return bits;
  }
  const width = format === 5 ? 7 : 8;
  for (const byte of bytes) {
    if (format === 5 && byte > 127) {
      throw new Error(`Legacy Data Matrix ASCII format cannot encode byte ${byte}.`);
    }
    appendLsb(bits, byte, width);
  }
  return bits;
}

function crc16(format: number, bytes: readonly number[]): number {
  let crc = 0;
  for (const byte of [format, 0, ...bytes]) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 1) !== 0 ? (crc >>> 1) ^ 0x8408 : crc >>> 1;
    }
  }
  return crc & 0xffff;
}

function protectedBits(
  quality: LegacyDataMatrixQuality,
  unprotected: readonly number[]
): number[] {
  if (quality === 0) return [...unprotected];
  const code = CONVOLUTIONAL_CODES[quality];
  const input = [...unprotected];
  while (input.length % code.k !== 0) input.push(0);
  input.push(...new Array(code.memory * code.k).fill(0));
  const state = Array.from({ length: code.k }, () =>
    new Array<number>(code.memory).fill(0)
  );
  const output: number[] = [];
  for (let offset = 0; offset < input.length; offset += code.k) {
    const current = input.slice(offset, offset + code.k);
    for (const outputMasks of code.masks) {
      let parity = 0;
      for (let branch = 0; branch < code.k; branch++) {
        const values = [current[branch], ...state[branch]];
        const mask = outputMasks[branch];
        for (let tap = 0; tap < mask.length; tap++) {
          if (mask[tap] === "1") parity ^= values[tap];
        }
      }
      output.push(parity);
    }
    for (let branch = 0; branch < code.k; branch++) {
      state[branch].pop();
      state[branch].unshift(current[branch]);
    }
  }
  return output;
}

function requestedSymbolSide(columns = 0, rows = 0): number {
  const normalize = (value: number): number => {
    const integer = Math.max(0, Math.trunc(value));
    if (integer > 49) return 0;
    if (integer === 0) return 0;
    if (integer < 9) {
      throw new Error("Legacy Data Matrix rows and columns must be 0 or at least 9.");
    }
    if (integer % 2 === 0) {
      throw new Error("Legacy Data Matrix rows and columns must be odd.");
    }
    return integer;
  };
  return Math.max(normalize(columns), normalize(rows));
}

/** Encodes Zebra's legacy ECC 000/050/080/100/140 Data Matrix variants. */
export function encodeLegacyDataMatrix(
  options: LegacyDataMatrixOptions
): LegacyDataMatrixSymbol {
  if (![0, 50, 80, 100, 140].includes(options.quality)) {
    throw new Error(`Unsupported legacy Data Matrix quality ${options.quality}.`);
  }
  const quality = options.quality;
  const format = options.format === 0 ? 6 : options.format;
  if (format < 1 || format > 6 || !Number.isInteger(format)) {
    throw new Error(`Unsupported legacy Data Matrix format ${options.format}.`);
  }
  const bytes = legacyBytes(options.data);
  const unprotected = FORMAT_SEGMENTS[format]
    .split("")
    .map(Number);
  appendLsb(unprotected, crc16(format, bytes), 16);
  appendLsb(unprotected, bytes.length, 9);
  unprotected.push(...encodedDataBits(format, bytes));

  const protectedStream = protectedBits(quality, unprotected);
  const header = QUALITY_HEADERS[quality].split("").map(Number);
  const required = header.length + protectedStream.length;
  const forcedSymbolSide = requestedSymbolSide(options.columns, options.rows);
  let dataSide = forcedSymbolSide > 0 ? forcedSymbolSide - 2 : 7;
  if (forcedSymbolSide === 0) {
    while (dataSide <= 47 && dataSide * dataSide < required) dataSide += 2;
  }
  if (dataSide > 47 || dataSide * dataSide < required) {
    throw new Error("Legacy Data Matrix data does not fit in the requested symbol size.");
  }

  const area = dataSide * dataSide;
  const unrandomized = [...header, ...protectedStream];
  unrandomized.push(...new Array(area - unrandomized.length).fill(0));
  const randomized = unrandomized.map(
    (bit, index) =>
      bit ^
      ((MASTER_RANDOM_BYTES[index >> 3] >> (7 - (index & 7))) & 1)
  );

  const inner = new Uint8Array(area);
  const placement = legacyPlacement(dataSide);
  for (let index = 0; index < area; index++) {
    inner[placement[index]] = randomized[index];
  }

  const size = dataSide + 2;
  const modules = new Uint8Array(size * size);
  for (let position = 0; position < size; position++) {
    modules[position] = position % 2 === 0 ? 1 : 0;
    modules[position * size] = 1;
    modules[position * size + size - 1] = position % 2 === 0 ? 1 : 0;
    modules[(size - 1) * size + position] = 1;
  }
  for (let y = 0; y < dataSide; y++) {
    modules.set(inner.subarray(y * dataSide, (y + 1) * dataSide), (y + 1) * size + 1);
  }
  return { modules, size };
}
