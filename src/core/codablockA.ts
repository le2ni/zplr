/*
 * CODABLOCK A encodation follows AIM USA TSC052.  Zebra's ^BB command
 * supplies the row/column geometry and optionally appends the two modulo-43
 * block checks defined by the symbology.
 */

const CODE39_CHARACTERS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%";

export interface CodablockASymbol {
  /** Code 39 data between each row's ordinary start and stop characters. */
  rowContents: readonly string[];
  rows: number;
  columns: number;
  display: string;
}

export interface CodablockAOptions {
  security: boolean;
  columns?: number;
  rows?: number;
}

function value(character: string): number {
  const result = CODE39_CHARACTERS.indexOf(character);
  if (result < 0) {
    throw new Error(
      `CODABLOCK A field data contains an unsupported character: ${character}`
    );
  }
  return result;
}

function indicator(characterValue: number): string {
  const character = CODE39_CHARACTERS[characterValue];
  if (character === undefined) {
    throw new Error("CODABLOCK A row geometry exceeds the indicator range.");
  }
  return character;
}

/** Encodes the row contents used by Zebra's CODABLOCK A implementation. */
export function encodeZplCodablockA(
  data: string,
  options: CodablockAOptions
): CodablockASymbol {
  if (data.length === 0) throw new Error("CODABLOCK A field data is empty.");
  if (data.length > 1340) {
    throw new Error("CODABLOCK A field data exceeds 1,340 characters.");
  }
  for (const character of data) value(character);

  const requestedRows =
    options.rows === undefined ? undefined : Math.trunc(options.rows);
  const requestedColumns =
    options.columns === undefined ? undefined : Math.trunc(options.columns);
  if (
    requestedRows !== undefined &&
    (requestedRows < 1 || requestedRows > 22)
  ) {
    throw new Error("CODABLOCK A requires between one and 22 rows.");
  }
  if (
    requestedColumns !== undefined &&
    (requestedColumns < 2 || requestedColumns > 62)
  ) {
    throw new Error("CODABLOCK A requires between two and 62 data columns.");
  }

  let rows: number;
  let columns: number;
  if (requestedRows !== undefined) {
    rows = requestedRows;
    const checks = options.security && rows > 1 ? 2 : 0;
    columns =
      requestedColumns ?? Math.max(1, Math.ceil((data.length + checks) / rows));
  } else if (requestedColumns !== undefined) {
    columns = requestedColumns;
    rows =
      data.length <= columns
        ? 1
        : Math.ceil((data.length + (options.security ? 2 : 0)) / columns);
  } else {
    rows = 1;
    columns = data.length;
  }

  if (rows < 1 || rows > 22 || columns < 1 || columns > 62) {
    throw new Error("CODABLOCK A field data does not fit the requested geometry.");
  }
  if (rows === 1) {
    if (requestedColumns !== undefined && data.length > requestedColumns) {
      throw new Error("CODABLOCK A field data exceeds the requested row width.");
    }
    // Zebra omits the right row indicator, padding, and block checks for a
    // single-row symbol, even when security is requested.
    return {
      rowContents: [`${indicator(21)}${data}`],
      rows,
      columns: data.length,
      display: data,
    };
  }

  const checkCount = options.security ? 2 : 0;
  const capacity = rows * columns;
  if (data.length + checkCount > capacity) {
    throw new Error("CODABLOCK A field data exceeds the requested row grid.");
  }
  const padded = data + " ".repeat(capacity - data.length - checkCount);
  let cells = padded;
  if (options.security) {
    let first = 0;
    let second = 0;
    for (let index = 0; index < padded.length; index++) {
      const characterValue = value(padded[index]);
      first = (first + characterValue * (index + 1)) % 43;
      second = (second + characterValue * index) % 43;
    }
    cells += indicator(first) + indicator(second);
  }

  const rowContents: string[] = [];
  for (let row = 0; row < rows; row++) {
    const rowIndicator = indicator(row === 0 ? 20 + rows : row - 1);
    rowContents.push(
      rowIndicator +
        cells.slice(row * columns, (row + 1) * columns) +
        rowIndicator
    );
  }
  return { rowContents, rows, columns, display: data };
}
