import { unzlibSync } from "fflate";

export interface DecodedGraphic {
  data: Uint8Array;
  bytesPerRow: number;
  width: number;
  height: number;
}

export class GraphicDecodeError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "GraphicDecodeError";
  }
}

function repeatCount(character: string): number | undefined {
  if (character >= "G" && character <= "Z") return character.charCodeAt(0) - 70;
  if (character >= "g" && character <= "z") return (character.charCodeAt(0) - 102) * 20;
  return undefined;
}

function decodeCompressedHex(
  source: string,
  bytesPerRow: number,
  expectedBytes: number
): string {
  const rowNibbles = bytesPerRow * 2;
  const expectedNibbles = expectedBytes * 2;
  const rows: string[] = [];
  let row = "";
  let repeats = 0;

  const ensureWithinLimit = (additionalNibbles = 0) => {
    if (rows.length * rowNibbles + row.length + additionalNibbles > expectedNibbles) {
      throw new GraphicDecodeError(
        "GRAPHIC_BYTE_COUNT_MISMATCH",
        `Graphic declared ${expectedBytes} bytes but its ASCII data expands beyond that size.`
      );
    }
  };

  const finishRow = () => {
    if (row.length === 0) return;
    ensureWithinLimit(Math.max(0, rowNibbles - row.length));
    rows.push(row.padEnd(rowNibbles, "0").slice(0, rowNibbles));
    row = "";
  };

  for (const character of source.replace(/\s+/g, "")) {
    const count = repeatCount(character);
    if (count !== undefined) {
      repeats += count;
      continue;
    }
    if (character === "," || character === "!") {
      row = row.padEnd(rowNibbles, character === "," ? "0" : "F");
      finishRow();
      repeats = 0;
      continue;
    }
    if (character === ":") {
      finishRow();
      if (rows.length === 0) {
        throw new GraphicDecodeError(
          "INVALID_GRAPHIC_COMPRESSION",
          "A repeated graphic row was requested before any row was decoded."
        );
      }
      ensureWithinLimit(rowNibbles);
      rows.push(rows[rows.length - 1]);
      repeats = 0;
      continue;
    }
    if (!/[0-9A-Fa-f]/.test(character)) {
      throw new GraphicDecodeError(
        "INVALID_GRAPHIC_HEX",
        `Graphic data contains invalid character ${JSON.stringify(character)}.`
      );
    }
    const countToAppend = repeats || 1;
    ensureWithinLimit(countToAppend);
    row += character.repeat(countToAppend);
    repeats = 0;
    while (row.length >= rowNibbles) {
      rows.push(row.slice(0, rowNibbles));
      row = row.slice(rowNibbles);
    }
  }
  finishRow();
  return rows.join("");
}

function decodeBase64(value: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const normalized = value.replace(/\s+/g, "").replace(/=+$/, "");
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const character of normalized) {
    const index = alphabet.indexOf(character);
    if (index < 0) {
      throw new GraphicDecodeError("INVALID_GRAPHIC_BASE64", "Graphic Base64 data is invalid.");
    }
    buffer = (buffer << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(bytes);
}

/** CRC-16/CCITT (XMODEM): polynomial 0x1021, initial value 0, no final XOR. */
export function crc16Ccitt(source: string): string {
  let crc = 0;
  for (let index = 0; index < source.length; index++) {
    const byte = source.charCodeAt(index);
    if (byte > 0x7f) {
      throw new GraphicDecodeError(
        "INVALID_GRAPHIC_BASE64",
        "Graphic Base64 data contains a non-ASCII character."
      );
    }
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function decodeWrappedData(
  source: string,
  expectedBytes: number,
  maxBytes: number
): Uint8Array | undefined {
  const trimmed = source.trim();
  const match = /^:(Z64|B64):([^:]+):([0-9A-Fa-f]{4})$/.exec(trimmed);
  if (!match) {
    if (/^:(?:Z64|B64):/.test(trimmed)) {
      throw new GraphicDecodeError(
        "INVALID_GRAPHIC_WRAPPER",
        "B64/Z64 graphic data must end with a four-digit hexadecimal CRC."
      );
    }
    return undefined;
  }
  const encodedText = match[2].replace(/\s+/g, "");
  const maximumEncodedLength = Math.ceil((maxBytes * 4) / 3) + 1024;
  if (encodedText.length > maximumEncodedLength) {
    throw new GraphicDecodeError(
      "GRAPHIC_LIMIT_EXCEEDED",
      `Encoded graphic data exceeds the bounded ${maxBytes}-byte graphic budget.`
    );
  }
  const expected = match[3].toUpperCase();
  const actual = crc16Ccitt(encodedText);
  if (actual !== expected) {
    throw new GraphicDecodeError(
      "GRAPHIC_CRC_MISMATCH",
      `Graphic CRC ${expected} does not match encoded-data CRC ${actual}.`
    );
  }
  const encoded = decodeBase64(encodedText);
  let decoded: Uint8Array;
  try {
    decoded =
      match[1] === "Z64"
        ? unzlibSync(encoded, { out: new Uint8Array(expectedBytes + 1) })
        : encoded;
  } catch {
    throw new GraphicDecodeError(
      "INVALID_GRAPHIC_ZLIB",
      "Z64 graphic data could not be decompressed."
    );
  }
  return decoded;
}

export function decodeGraphic(
  source: string,
  bytesPerRow: number,
  expectedBytes: number,
  maxBytes: number
): DecodedGraphic {
  bytesPerRow = Math.trunc(bytesPerRow);
  expectedBytes = Math.trunc(expectedBytes);
  if (bytesPerRow <= 0 || expectedBytes <= 0) {
    throw new GraphicDecodeError(
      "INVALID_GRAPHIC_DIMENSIONS",
      "Graphic byte count and bytes per row must be positive integers."
    );
  }
  if (expectedBytes > maxBytes) {
    throw new GraphicDecodeError(
      "GRAPHIC_LIMIT_EXCEEDED",
      `Graphic requires ${expectedBytes} bytes, exceeding the ${maxBytes}-byte limit.`
    );
  }

  const wrapped = decodeWrappedData(source, expectedBytes, maxBytes);
  const hex =
    wrapped === undefined
      ? decodeCompressedHex(source, bytesPerRow, expectedBytes)
      : undefined;
  const data =
    wrapped ??
    Uint8Array.from(
      (hex?.match(/.{2}/g) ?? []).map((byte) => Number.parseInt(byte, 16))
    );
  if (data.length !== expectedBytes) {
    throw new GraphicDecodeError(
      "GRAPHIC_BYTE_COUNT_MISMATCH",
      `Graphic declared ${expectedBytes} bytes but decoded ${data.length}.`
    );
  }
  return {
    data,
    bytesPerRow,
    width: bytesPerRow * 8,
    height: Math.ceil(expectedBytes / bytesPerRow),
  };
}

function binaryBytes(source: string, count: number): Uint8Array {
  if (source.length < count) {
    throw new GraphicDecodeError(
      "GRAPHIC_BYTE_COUNT_MISMATCH",
      `Graphic declared ${count} transmitted bytes but supplied ${source.length}.`
    );
  }
  const data = new Uint8Array(count);
  for (let index = 0; index < count; index++) {
    const value = source.charCodeAt(index);
    if (value > 0xff) {
      throw new GraphicDecodeError(
        "INVALID_GRAPHIC_BINARY",
        "Binary graphic data must contain byte-valued characters only."
      );
    }
    data[index] = value;
  }
  return data;
}

/** Decodes ^GFB raw bytes and ^GFC zlib/DEFLATE-compressed binary bytes. */
export function decodeBinaryGraphic(
  source: string,
  bytesPerRow: number,
  transmittedBytes: number,
  expectedBytes: number,
  compressed: boolean,
  maxBytes: number
): DecodedGraphic {
  bytesPerRow = Math.trunc(bytesPerRow);
  transmittedBytes = Math.trunc(transmittedBytes);
  expectedBytes = Math.trunc(expectedBytes);
  if (bytesPerRow <= 0 || transmittedBytes < 0 || expectedBytes <= 0) {
    throw new GraphicDecodeError(
      "INVALID_GRAPHIC_DIMENSIONS",
      "Graphic byte counts and bytes per row must be valid positive integers."
    );
  }
  if (transmittedBytes > maxBytes || expectedBytes > maxBytes) {
    throw new GraphicDecodeError(
      "GRAPHIC_LIMIT_EXCEEDED",
      `Graphic exceeds the ${maxBytes}-byte graphic budget.`
    );
  }
  const input = binaryBytes(source, transmittedBytes);
  let data: Uint8Array;
  try {
    data = compressed ? unzlibSync(input) : input;
  } catch {
    throw new GraphicDecodeError(
      "INVALID_GRAPHIC_ZLIB",
      "Compressed binary graphic data could not be decompressed."
    );
  }
  if (data.length !== expectedBytes) {
    throw new GraphicDecodeError(
      "GRAPHIC_BYTE_COUNT_MISMATCH",
      `Graphic declared ${expectedBytes} expanded bytes but decoded ${data.length}.`
    );
  }
  return {
    data,
    bytesPerRow,
    width: bytesPerRow * 8,
    height: Math.ceil(expectedBytes / bytesPerRow),
  };
}

export function decodeDownloadData(
  source: string,
  expectedBytes: number,
  maxBytes: number
): Uint8Array {
  expectedBytes = Math.trunc(expectedBytes);
  if (expectedBytes < 0 || expectedBytes > maxBytes) {
    throw new GraphicDecodeError(
      "GRAPHIC_LIMIT_EXCEEDED",
      `Downloaded object requires ${expectedBytes} bytes, exceeding the ${maxBytes}-byte limit.`
    );
  }
  const wrapped = decodeWrappedData(source, expectedBytes, maxBytes);
  let data = wrapped;
  if (!data) {
    const hex = source.replace(/\s+/g, "");
    if (hex.length % 2 !== 0 || !/^[0-9A-Fa-f]*$/.test(hex)) {
      throw new GraphicDecodeError(
        "INVALID_OBJECT_DATA",
        "Downloaded object data must be hexadecimal, B64, or Z64 encoded."
      );
    }
    data = Uint8Array.from(
      hex.match(/.{2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? []
    );
  }
  if (data.length !== expectedBytes) {
    throw new GraphicDecodeError(
      "OBJECT_BYTE_COUNT_MISMATCH",
      `Object declared ${expectedBytes} bytes but decoded ${data.length}.`
    );
  }
  return data;
}
