/*
 * Code 49 encodation and checks follow ANSI/AIM BC6-2000 and the
 * BSD-3-Clause libzint reference implementation by Robin Stuart.
 */
import {
  CODE49_EVEN_PATTERNS,
  CODE49_ODD_PATTERNS,
} from "./code49Patterns";

const BASIC = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%";
const X_WEIGHTS = [
  1, 9, 31, 26, 2, 12, 17, 23, 37, 18, 22, 6, 27, 44, 15, 43,
  39, 11, 13, 5, 41, 33, 36, 8, 4, 32, 3, 19, 40, 25, 29, 10,
] as const;
const Y_WEIGHTS = [
  9, 31, 26, 2, 12, 17, 23, 37, 18, 22, 6, 27, 44, 15, 43, 39,
  11, 13, 5, 41, 33, 36, 8, 4, 32, 3, 19, 40, 25, 29, 10, 24,
] as const;
const Z_WEIGHTS = [
  31, 26, 2, 12, 17, 23, 37, 18, 22, 6, 27, 44, 15, 43, 39, 11,
  13, 5, 41, 33, 36, 8, 4, 32, 3, 19, 40, 25, 29, 10, 24, 30,
] as const;
const ROW_PARITY = ["OEEO", "EOEO", "OOEE", "EEOO", "OEOE", "EOOE"];

export interface Code49Symbol {
  /** Row-major modules including the required 10X/1X horizontal quiet zones. */
  modules: Uint8Array;
  width: 81;
  height: number;
  rows: number;
  display: string;
}

function baseValue(character: string): number {
  const value = BASIC.indexOf(character);
  if (value < 0) {
    throw new Error(`Code 49 internal data contains an invalid character: ${character}`);
  }
  return value;
}

function shiftedCharacter(marker: "<" | ">", base: string): string | undefined {
  if (marker === "<") {
    if (base === " ") return "\0";
    if (base >= "A" && base <= "Z") {
      return String.fromCharCode(base.charCodeAt(0) - 64);
    }
    if (base >= "1" && base <= "5") {
      return String.fromCharCode(26 + Number(base));
    }
    return (
      {
        "0": "'",
        "6": "!",
        "7": '"',
        "8": "#",
        "9": "&",
        "-": "(",
        ".": ")",
        $: "*",
        "/": ",",
        "+": ":",
      } as Readonly<Record<string, string>>
    )[base];
  }
  if (base >= "A" && base <= "Z") return base.toLowerCase();
  return (
    {
      "0": "^",
      "1": ";",
      "2": "<",
      "3": "=",
      "4": ">",
      "5": "?",
      "6": "@",
      "7": "[",
      "8": "\\",
      "9": "]",
      "-": "_",
      ".": "`",
      " ": "\x7f",
      $: "{",
      "/": "|",
      "+": "}",
      "%": "~",
    } as Readonly<Record<string, string>>
  )[base];
}

function numericCodewords(digits: string): number[] {
  if (!/^\d+$/.test(digits) || digits.length === 2) {
    throw new Error("Code 49 numeric mode contains an invalid digit count.");
  }
  const output: number[] = [];
  let cursor = 0;
  const blocks = Math.floor(digits.length / 5);
  const remainder = digits.length % 5;
  for (let block = 0; block < blocks; block++) {
    if (block === blocks - 1 && remainder === 2) {
      let value = 100000 + Number(digits.slice(cursor, cursor + 4));
      output.push(Math.floor(value / 2304));
      value %= 2304;
      output.push(Math.floor(value / 48), value % 48);
      cursor += 4;
      value = Number(digits.slice(cursor, cursor + 3));
      output.push(Math.floor(value / 48), value % 48);
      cursor += 3;
    } else {
      let value = Number(digits.slice(cursor, cursor + 5));
      output.push(Math.floor(value / 2304));
      value %= 2304;
      output.push(Math.floor(value / 48), value % 48);
      cursor += 5;
    }
  }
  const tail = digits.slice(cursor);
  if (tail.length === 1) output.push(Number(tail));
  else if (tail.length === 3) {
    const value = Number(tail);
    output.push(Math.floor(value / 48), value % 48);
  } else if (tail.length === 4) {
    let value = 100000 + Number(tail);
    output.push(Math.floor(value / 2304));
    value %= 2304;
    output.push(Math.floor(value / 48), value % 48);
  } else if (tail.length !== 0) {
    throw new Error("Code 49 numeric mode contains an invalid digit count.");
  }
  return output;
}

function explicitCodewords(
  data: string,
  mode: 0 | 1 | 2 | 3 | 4 | 5
): { codewords: number[]; display: string } {
  if (data.length === 0) throw new Error("Code 49 field data is empty.");
  const codewords: number[] = [];
  let display = "";
  let cursor = 0;
  let implicitShift: "<" | ">" | undefined =
    mode === 4 ? "<" : mode === 5 ? ">" : undefined;

  if (mode === 2) {
    if (!/^\d+$/.test(data)) {
      throw new Error("Code 49 starting mode 2 requires numeric field data.");
    }
    return { codewords: numericCodewords(data), display: data };
  }

  while (cursor < data.length) {
    const character = data[cursor];
    if (character === "<" || character === ">") {
      const base = data[cursor + 1];
      const shifted = base && shiftedCharacter(character, base);
      if (shifted === undefined) {
        throw new Error("Code 49 field data contains an invalid shift sequence.");
      }
      codewords.push(character === "<" ? 43 : 44, baseValue(base));
      display += shifted;
      implicitShift = undefined;
      cursor += 2;
      continue;
    }
    if (character === "=") {
      const end = data.indexOf("=", cursor + 1);
      const digits = data.slice(cursor + 1, end < 0 ? data.length : end);
      codewords.push(48, ...numericCodewords(digits));
      display += digits;
      implicitShift = undefined;
      if (end < 0) break;
      codewords.push(48);
      cursor = end + 1;
      continue;
    }
    if (character === ":" || character === ";" || character === "?") {
      codewords.push(character === ":" ? 45 : character === ";" ? 46 : 47);
      implicitShift = undefined;
      cursor++;
      continue;
    }
    codewords.push(baseValue(character));
    if (implicitShift !== undefined) {
      const shifted = shiftedCharacter(implicitShift, character);
      if (shifted === undefined) {
        throw new Error(`Code 49 starting mode ${mode} has an invalid first character.`);
      }
      display += shifted;
      implicitShift = undefined;
    } else {
      display += character;
    }
    cursor++;
  }
  return { codewords, display };
}

function appendBits(target: number[], value: number, count: number): void {
  for (let bit = count - 1; bit >= 0; bit--) target.push((value >>> bit) & 1);
}

export function encodeZplCode49(
  data: string,
  mode: 0 | 1 | 2 | 3 | 4 | 5,
  requestedRowHeight: number
): Code49Symbol {
  const { codewords, display } = explicitCodewords(data, mode);
  if (codewords.length > 49) {
    throw new Error("Code 49 field data exceeds the eight-row symbol capacity.");
  }

  let rows = Math.ceil(codewords.length / 7);
  const padCount = rows * 7 - codewords.length;
  if ((rows <= 6 && padCount < 5) || rows > 6 || rows === 1) rows++;
  if (rows < 2 || rows > 8) {
    throw new Error("Code 49 requires between two and eight rows.");
  }

  const grid = Array.from({ length: rows }, () => Array(8).fill(48) as number[]);
  for (let index = 0; index < codewords.length; index++) {
    grid[Math.floor(index / 7)][index % 7] = codewords[index];
  }
  grid[rows - 1][6] = 7 * (rows - 2) + mode;
  for (let row = 0; row < rows - 1; row++) {
    grid[row][7] = grid[row].slice(0, 7).reduce((sum, value) => sum + value, 0) % 49;
  }

  let position = 0;
  let xCheck = grid[rows - 1][6] * 20;
  let yCheck = grid[rows - 1][6] * 16;
  let zCheck = grid[rows - 1][6] * 38;
  for (let row = 0; row < rows - 1; row++) {
    for (let pair = 0; pair < 4; pair++) {
      const value = grid[row][pair * 2] * 49 + grid[row][pair * 2 + 1];
      xCheck += X_WEIGHTS[position] * value;
      yCheck += Y_WEIGHTS[position] * value;
      zCheck += Z_WEIGHTS[position] * value;
      position++;
    }
  }
  if (rows > 6) {
    zCheck %= 2401;
    grid[rows - 1][0] = Math.floor(zCheck / 49);
    grid[rows - 1][1] = zCheck % 49;
  }
  let value = grid[rows - 1][0] * 49 + grid[rows - 1][1];
  xCheck += X_WEIGHTS[position] * value;
  yCheck += Y_WEIGHTS[position] * value;
  position++;
  yCheck %= 2401;
  grid[rows - 1][2] = Math.floor(yCheck / 49);
  grid[rows - 1][3] = yCheck % 49;
  value = grid[rows - 1][2] * 49 + grid[rows - 1][3];
  xCheck = (xCheck + X_WEIGHTS[position] * value) % 2401;
  grid[rows - 1][4] = Math.floor(xCheck / 49);
  grid[rows - 1][5] = xCheck % 49;
  grid[rows - 1][7] =
    grid[rows - 1].slice(0, 7).reduce((sum, item) => sum + item, 0) % 49;

  const encodedRows: number[][] = [];
  for (let row = 0; row < rows; row++) {
    const bits = Array(10).fill(0) as number[];
    appendBits(bits, 2, 2);
    for (let pair = 0; pair < 4; pair++) {
      const patternValue = grid[row][pair * 2] * 49 + grid[row][pair * 2 + 1];
      const even = row === rows - 1 || ROW_PARITY[row]?.[pair] === "E";
      appendBits(
        bits,
        (even ? CODE49_EVEN_PATTERNS : CODE49_ODD_PATTERNS)[patternValue],
        16
      );
    }
    appendBits(bits, 15, 4);
    bits.push(0);
    encodedRows.push(bits);
  }

  const rowHeight = Math.max(1, Math.trunc(requestedRowHeight));
  const height = rows * rowHeight + rows + 1;
  const modules = new Uint8Array(81 * height);
  modules.fill(1, 0, 81);
  let y = 1;
  for (const encoded of encodedRows) {
    for (let repeat = 0; repeat < rowHeight; repeat++, y++) {
      modules.set(encoded, y * 81);
    }
    modules.fill(1, y * 81 + 10, y * 81 + 80);
    y++;
  }
  modules.fill(1, (height - 1) * 81, height * 81);
  return { modules, width: 81, height, rows, display };
}

/** Expands BWIPP's compact row-height representation used for automatic mode. */
export function expandAutomaticCode49(
  pixs: readonly number[],
  width: number,
  rowHeight: number
): Uint8Array {
  const logicalRows = pixs.length / width;
  if (!Number.isInteger(logicalRows) || (logicalRows & 1) === 0) {
    throw new Error("The Code 49 encoder returned invalid compact rows.");
  }
  const height = ((logicalRows - 1) / 2) * rowHeight + (logicalRows + 1) / 2;
  const output = new Uint8Array(width * height);
  let targetRow = 0;
  for (let row = 0; row < logicalRows; row++) {
    const repeat = (row & 1) === 0 ? 1 : rowHeight;
    for (let count = 0; count < repeat; count++, targetRow++) {
      output.set(pixs.slice(row * width, (row + 1) * width), targetRow * width);
    }
  }
  return output;
}
