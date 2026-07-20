import bwipjs from "bwip-js";

interface RawMatrixBarcode {
  pixs: number[];
  pixx: number;
  pixy: number;
}

export interface MicroPdf417Metric {
  readonly columns: number;
  readonly rows: number;
  readonly errorCodewords: number;
  readonly leftRowAddressPattern: number;
  readonly centerRowAddressPattern: number;
  readonly rightRowAddressPattern: number;
}

/** Zebra ^BF mode numbers, in the order defined by the ZPL programming guide. */
export const MICRO_PDF417_VERSIONS = [
  "11x1", "14x1", "17x1", "20x1", "24x1", "28x1",
  "8x2", "11x2", "14x2", "17x2", "20x2", "23x2", "26x2",
  "6x3", "8x3", "10x3", "12x3", "15x3", "20x3", "26x3", "32x3", "38x3", "44x3",
  "6x4", "8x4", "10x4", "12x4", "15x4", "20x4", "26x4", "32x4", "38x4", "44x4", "4x4",
] as const;

// ISO/IEC 24728 MicroPDF417 symbol metrics.  The last three values select
// the row-address patterns and are retained here to keep the table complete,
// even though bwip-js performs the final low-level placement.
export const MICRO_PDF417_METRICS: readonly MicroPdf417Metric[] = [
  [1, 11, 7, 1, 0, 9], [1, 14, 7, 8, 0, 8], [1, 17, 7, 36, 0, 36],
  [1, 20, 8, 19, 0, 19], [1, 24, 8, 9, 0, 17], [1, 28, 8, 25, 0, 33],
  [2, 8, 8, 1, 0, 1], [2, 11, 9, 1, 0, 9], [2, 14, 9, 8, 0, 8],
  [2, 17, 10, 36, 0, 36], [2, 20, 11, 19, 0, 19], [2, 23, 13, 9, 0, 17],
  [2, 26, 15, 27, 0, 35], [3, 6, 12, 1, 1, 1], [3, 8, 14, 7, 7, 7],
  [3, 10, 16, 15, 15, 15], [3, 12, 18, 25, 25, 25], [3, 15, 21, 37, 37, 37],
  [3, 20, 26, 1, 17, 33], [3, 26, 32, 1, 9, 17], [3, 32, 38, 21, 29, 37],
  [3, 38, 44, 15, 31, 47], [3, 44, 50, 1, 25, 49], [4, 4, 8, 47, 19, 43],
  [4, 6, 12, 1, 1, 1], [4, 8, 14, 7, 7, 7], [4, 10, 16, 15, 15, 15],
  [4, 12, 18, 25, 25, 25], [4, 15, 21, 37, 37, 37], [4, 20, 26, 1, 17, 33],
  [4, 26, 32, 1, 9, 17], [4, 32, 38, 21, 29, 37], [4, 38, 44, 15, 31, 47],
  [4, 44, 50, 1, 25, 49],
].map(
  ([columns, rows, errorCodewords, left, center, right]) => ({
    columns,
    rows,
    errorCodewords,
    leftRowAddressPattern: left,
    centerRowAddressPattern: center,
    rightRowAddressPattern: right,
  })
);

export interface StructuredPdf417Part {
  /** Original source assigned to this symbol. */
  readonly source: string;
  /** ^NNN-formatted data codewords when Macro PDF417 metadata is required. */
  readonly encodedData: string;
  readonly raw: boolean;
  readonly index: number;
  readonly total: number;
}

export type Pdf417Variant = "pdf417" | "micropdf417";

let pdf417CodewordMaps: readonly ReadonlyMap<number, number>[] | undefined;

function matrixResult(options: Record<string, string | number | boolean>): RawMatrixBarcode {
  const raw = bwipjs.raw(options as { bcid: string; text: string })[0] as unknown as
    | RawMatrixBarcode
    | undefined;
  if (!raw || !Array.isArray(raw.pixs) || !Number.isInteger(raw.pixx)) {
    throw new Error("The PDF417 encoder did not return a module matrix.");
  }
  return raw;
}

function rawCodewordText(codewords: readonly number[]): string {
  return codewords
    .map((codeword) => `^${String(codeword).padStart(3, "0")}`)
    .join("");
}

function modulePattern(
  matrix: RawMatrixBarcode,
  row: number,
  startX: number
): number {
  let pattern = 0;
  const offset = row * matrix.pixx + startX;
  for (let bit = 0; bit < 17; bit++) {
    pattern = pattern * 2 + (matrix.pixs[offset + bit] ? 1 : 0);
  }
  return pattern;
}

/**
 * Build the inverse PDF417 cluster tables from the bundled encoder itself.
 * This avoids duplicating the 2,787-entry ISO pattern table while still
 * exposing the encoder's exact high-level codewords for structured append.
 */
function codewordMaps(): readonly ReadonlyMap<number, number>[] {
  if (pdf417CodewordMaps) return pdf417CodewordMaps;
  const maps = [new Map<number, number>(), new Map<number, number>(), new Map<number, number>()];
  const next = [0, 0, 0];

  for (let pass = 0; pass < 4; pass++) {
    const values: number[] = [];
    for (let position = 1; position <= 897; position++) {
      const row = Math.floor(position / 30);
      const cluster = row % 3;
      const value = next[cluster] <= 928 ? next[cluster]++ : 900;
      values.push(value);
    }
    const matrix = matrixResult({
      bcid: "pdf417",
      text: rawCodewordText(values),
      raw: true,
      columns: 30,
      rows: 30,
      eclevel: 0,
      fixedeclevel: true,
      rowmult: 1,
    });
    for (let valueIndex = 0; valueIndex < values.length; valueIndex++) {
      const position = valueIndex + 1;
      const row = Math.floor(position / 30);
      const column = position % 30;
      maps[row % 3].set(modulePattern(matrix, row, 34 + column * 17), values[valueIndex]);
    }
  }

  if (maps.some((map) => map.size !== 929)) {
    throw new Error("The PDF417 encoder's codeword pattern table is incomplete.");
  }
  pdf417CodewordMaps = maps;
  return maps;
}

/** Return the exact high-level PDF417 data codewords emitted by bwip-js. */
export function pdf417DataCodewords(data: string): number[] {
  if (data.length === 0) return [];
  const matrix = matrixResult({
    bcid: "pdf417",
    text: data,
    columns: 30,
    eclevel: 0,
    fixedeclevel: true,
    rowmult: 1,
  });
  const columns = (matrix.pixx - 69) / 17;
  if (!Number.isInteger(columns) || columns < 1 || columns > 30) {
    throw new Error("The PDF417 encoder returned invalid symbol dimensions.");
  }
  const maps = codewordMaps();
  const codewords: number[] = [];
  for (let position = 0; position < columns * matrix.pixy; position++) {
    const row = Math.floor(position / columns);
    const column = position % columns;
    const codeword = maps[row % 3].get(
      modulePattern(matrix, row, 34 + column * 17)
    );
    if (codeword === undefined) {
      throw new Error("The PDF417 encoder returned an unknown codeword pattern.");
    }
    codewords.push(codeword);
  }
  const dataLengthDescriptor = codewords[0];
  if (
    !Number.isInteger(dataLengthDescriptor) ||
    dataLengthDescriptor < 1 ||
    dataLengthDescriptor > codewords.length
  ) {
    throw new Error("The PDF417 data length descriptor is invalid.");
  }
  const result = codewords.slice(1, dataLengthDescriptor);
  while (result[result.length - 1] === 900) result.pop();
  return result;
}

/** Return the exact MicroPDF417 high-level data codewords emitted by bwip-js. */
export function microPdf417DataCodewords(data: string): number[] {
  if (data.length === 0) return [];
  const matrix = matrixResult({
    bcid: "micropdf417",
    text: data,
    rowmult: 1,
  });
  const columns = [38, 55, 82, 99].indexOf(matrix.pixx) + 1;
  const metric = MICRO_PDF417_METRICS.find(
    (candidate) =>
      candidate.columns === columns && candidate.rows === matrix.pixy
  );
  if (!metric) {
    throw new Error("The MicroPDF417 encoder returned invalid symbol dimensions.");
  }
  const codewordXs =
    columns === 1
      ? [10]
      : columns === 2
      ? [10, 27]
      : columns === 3
      ? [10, 37, 54]
      : [10, 27, 54, 71];
  const maps = codewordMaps();
  const codewords: number[] = [];
  for (let position = 0; position < columns * metric.rows; position++) {
    const row = Math.floor(position / columns);
    const column = position % columns;
    const cluster = (row + metric.leftRowAddressPattern - 1) % 3;
    const codeword = maps[cluster].get(
      modulePattern(matrix, row, codewordXs[column])
    );
    if (codeword === undefined) {
      throw new Error("The MicroPDF417 encoder returned an unknown codeword pattern.");
    }
    codewords.push(codeword);
  }
  const capacity = columns * metric.rows - metric.errorCodewords;
  const result = codewords.slice(0, capacity);
  while (result[result.length - 1] === 900) result.pop();
  return result;
}

function twoNumericCodewords(value: number): [number, number] {
  const encoded = 100_000 + Math.max(0, Math.trunc(value));
  return [Math.floor(encoded / 900), encoded % 900];
}

/** Zebra-compatible Macro PDF417 control block used by ^FM. */
export function macroPdf417Codewords(
  payload: readonly number[],
  index: number,
  total: number,
  capacity: number,
  variant: Pdf417Variant = "pdf417"
): number[] {
  // "AAAABG" is Zebra's default six-character file identifier.  Its text
  // compaction is 0,0,36.  Segment index and count use PDF417 numeric
  // compaction with the mandatory leading 1.
  const controlBlock = [
    928,
    ...twoNumericCodewords(index),
    0,
    0,
    36,
    923,
    1,
    ...twoNumericCodewords(total),
  ];
  if (index === total - 1) controlBlock.push(922);
  // Zebra places the Macro control block at the end of the symbol's data
  // region.  Text-latch/pad codewords occupy every cell between the payload
  // and that block, so the terminator of the final segment is adjacent to EC.
  const padding = Math.max(1, capacity - payload.length - controlBlock.length);
  const padPattern =
    variant === "micropdf417"
      ? [900, 838, 779, 867, 865, 898, 868, 839]
      : [900];
  const padCodewords = Array.from(
    { length: padding },
    (_, padIndex) => padPattern[padIndex % padPattern.length]
  );
  return [...payload, ...padCodewords, ...controlBlock];
}

function dataCodewords(value: string, variant: Pdf417Variant): number[] {
  return variant === "micropdf417"
    ? microPdf417DataCodewords(value)
    : pdf417DataCodewords(value);
}

function codewordLength(value: string, variant: Pdf417Variant): number {
  try {
    return dataCodewords(value, variant).length;
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

/**
 * Split a payload at codeword boundaries and add complete Macro PDF417
 * metadata.  A payload that fits in one symbol remains an ordinary symbol,
 * matching Zebra's ^FM behavior.
 */
export function structuredPdf417Parts(
  data: string,
  dataCodewordCapacity: number,
  variant: Pdf417Variant = "pdf417"
): StructuredPdf417Part[] {
  const capacity = Math.max(0, Math.trunc(dataCodewordCapacity));
  if (codewordLength(data, variant) <= capacity) {
    return [{ source: data, encodedData: data, raw: false, index: 0, total: 1 }];
  }
  if (capacity <= 12) {
    throw new Error("The selected PDF417 geometry cannot contain structured-append metadata.");
  }

  const characters = Array.from(data);
  const chunks: string[] = [];
  let offset = 0;
  while (offset < characters.length) {
    const remaining = characters.slice(offset).join("");
    if (codewordLength(remaining, variant) + 12 <= capacity) {
      chunks.push(remaining);
      break;
    }

    let low = 1;
    let high = characters.length - offset;
    let best = 0;
    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      const candidate = characters.slice(offset, offset + middle).join("");
      if (codewordLength(candidate, variant) + 11 <= capacity) {
        best = middle;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }
    if (best === 0) {
      throw new Error("The selected PDF417 geometry cannot contain a payload segment.");
    }
    chunks.push(characters.slice(offset, offset + best).join(""));
    offset += best;
  }

  const total = chunks.length;
  return chunks.map((source, index) => {
    const codewords = macroPdf417Codewords(
      dataCodewords(source, variant),
      index,
      total,
      capacity,
      variant
    );
    if (codewords.length > capacity) {
      throw new Error("Structured PDF417 segmentation exceeded the selected symbol capacity.");
    }
    return {
      source,
      encodedData: rawCodewordText(codewords),
      raw: true,
      index,
      total,
    };
  });
}

export function pdf417DataCapacity(
  errorLevel: number,
  columns: number,
  rows: number
): number {
  const errorCodewords = 2 ** (Math.max(0, Math.min(8, Math.trunc(errorLevel))) + 1);
  const selectedColumns = Math.max(0, Math.min(30, Math.trunc(columns)));
  const selectedRows = Math.max(0, Math.min(90, Math.trunc(rows)));
  const cells =
    selectedColumns > 0 && selectedRows > 0
      ? selectedColumns * selectedRows
      : selectedColumns > 0
      ? Math.min(928, selectedColumns * 90)
      : selectedRows > 0
      ? Math.min(928, selectedRows * 30)
      : 928;
  // One non-error-correction codeword is the PDF417 length descriptor.
  return Math.max(0, cells - errorCodewords - 1);
}

export function microPdf417DataCapacity(mode: number): number {
  const metric = MICRO_PDF417_METRICS[Math.max(0, Math.min(33, Math.trunc(mode)))];
  return metric.columns * metric.rows - metric.errorCodewords;
}
