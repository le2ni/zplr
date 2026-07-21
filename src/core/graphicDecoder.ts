import { unzlibSync } from "fflate";

function uint32(data: Uint8Array, offset: number): number {
  return (
    data[offset] * 0x1000000 +
    (data[offset + 1] << 16) +
    (data[offset + 2] << 8) +
    data[offset + 3]
  );
}

function adler32(data: Uint8Array): number {
  let first = 1;
  let second = 0;
  for (let offset = 0; offset < data.length; offset += 2_655) {
    const end = Math.min(offset + 2_655, data.length);
    for (let index = offset; index < end; index++) {
      first += data[index];
      second += first;
    }
    first %= 65_521;
    second %= 65_521;
  }
  return ((second << 16) | first) >>> 0;
}

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

export function validateGraphicGeometry(
  bytesPerRow: number,
  expectedBytes: number,
  maxBytes: number
): { width: number; height: number } {
  if (
    !Number.isSafeInteger(bytesPerRow) ||
    !Number.isSafeInteger(expectedBytes) ||
    bytesPerRow <= 0 ||
    expectedBytes <= 0
  ) {
    throw new GraphicDecodeError(
      "INVALID_GRAPHIC_DIMENSIONS",
      "Graphic byte count and bytes per row must be positive safe integers."
    );
  }
  const width = bytesPerRow * 8;
  const height = Math.ceil(expectedBytes / bytesPerRow);
  const rasterBytes = bytesPerRow * height;
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(rasterBytes)) {
    throw new GraphicDecodeError(
      "INVALID_GRAPHIC_DIMENSIONS",
      "Graphic row geometry exceeds the supported integer range."
    );
  }
  if (expectedBytes > maxBytes || rasterBytes > maxBytes) {
    throw new GraphicDecodeError(
      "GRAPHIC_LIMIT_EXCEEDED",
      `Graphic raster requires ${rasterBytes} bytes, exceeding the ${maxBytes}-byte limit.`
    );
  }
  if (expectedBytes % bytesPerRow !== 0) {
    throw new GraphicDecodeError(
      "INVALID_GRAPHIC_DIMENSIONS",
      "Graphic byte count must contain a whole number of rows."
    );
  }
  return { width, height };
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

  const decodedNibbles = () => rows.length * rowNibbles + row.length;

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

  for (const character of source) {
    if (/\s/.test(character)) continue;
    if (decodedNibbles() >= expectedNibbles) break;
    const count = repeatCount(character);
    if (count !== undefined) {
      repeats += count;
      continue;
    }
    if (character === "," || character === "!") {
      if (repeats > 0) {
        throw new GraphicDecodeError(
          "INVALID_GRAPHIC_COMPRESSION",
          "A graphic repeat count must be followed by a hexadecimal value."
        );
      }
      row = row.padEnd(rowNibbles, character === "," ? "0" : "F");
      finishRow();
      continue;
    }
    if (character === ":") {
      if (repeats > 0) {
        throw new GraphicDecodeError(
          "INVALID_GRAPHIC_COMPRESSION",
          "A graphic repeat count must be followed by a hexadecimal value."
        );
      }
      finishRow();
      if (decodedNibbles() >= expectedNibbles) break;
      if (rows.length === 0) {
        throw new GraphicDecodeError(
          "INVALID_GRAPHIC_COMPRESSION",
          "A repeated graphic row was requested before any row was decoded."
        );
      }
      ensureWithinLimit(rowNibbles);
      rows.push(rows[rows.length - 1]);
      continue;
    }
    if (!/[0-9A-Fa-f]/.test(character)) {
      throw new GraphicDecodeError(
        "INVALID_GRAPHIC_HEX",
        `Graphic data contains invalid character ${JSON.stringify(character)}.`
      );
    }
    const countToAppend = Math.min(
      repeats || 1,
      expectedNibbles - decodedNibbles()
    );
    row += character.repeat(countToAppend);
    repeats = 0;
    while (row.length >= rowNibbles) {
      rows.push(row.slice(0, rowNibbles));
      row = row.slice(rowNibbles);
    }
  }
  if (repeats > 0 && decodedNibbles() < expectedNibbles) {
    throw new GraphicDecodeError(
      "INVALID_GRAPHIC_COMPRESSION",
      "A graphic repeat count must be followed by a hexadecimal value."
    );
  }
  finishRow();
  return rows.join("");
}

function decodeBase64(value: string): Uint8Array {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const compact = value.replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(compact)) {
    throw new GraphicDecodeError(
      "INVALID_GRAPHIC_BASE64",
      "Graphic Base64 data is invalid."
    );
  }
  const padding = compact.length - compact.replace(/=+$/, "").length;
  const normalized = compact.slice(0, compact.length - padding);
  const remainder = normalized.length % 4;
  const expectedPadding = remainder === 2 ? 2 : remainder === 3 ? 1 : 0;
  if (
    remainder === 1 ||
    (padding > 0 &&
      (compact.length % 4 !== 0 || padding !== expectedPadding))
  ) {
    throw new GraphicDecodeError(
      "INVALID_GRAPHIC_BASE64",
      "Graphic Base64 padding or length is invalid."
    );
  }
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const character of normalized) {
    const index = alphabet.indexOf(character);
    buffer = (buffer << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
      buffer &= bits === 0 ? 0 : (1 << bits) - 1;
    }
  }
  if (buffer !== 0) {
    throw new GraphicDecodeError(
      "INVALID_GRAPHIC_BASE64",
      "Graphic Base64 data contains non-zero trailing bits."
    );
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
  const maximumDecodedInput =
    match[1] === "B64"
      ? expectedBytes
      : maxBytes + Math.ceil(maxBytes / 16_384) * 5 + 64;
  const maximumEncodedLength = 4 * Math.ceil(maximumDecodedInput / 3);
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
  if (
    match[1] === "Z64" &&
    decoded.length === expectedBytes &&
    (encoded.length < 6 ||
      adler32(decoded) !== uint32(encoded, encoded.length - 4))
  ) {
    throw new GraphicDecodeError(
      "INVALID_GRAPHIC_ZLIB",
      "Z64 graphic data has an invalid checksum."
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
  const dimensions = validateGraphicGeometry(
    bytesPerRow,
    expectedBytes,
    maxBytes
  );

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
    ...dimensions,
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

/** Decodes ^GFB raw bytes. Zebra's proprietary ^GFC encoding is not decoded. */
export function decodeBinaryGraphic(
  source: string,
  bytesPerRow: number,
  transmittedBytes: number,
  expectedBytes: number,
  compressed: boolean,
  maxBytes: number
): DecodedGraphic {
  const dimensions = validateGraphicGeometry(
    bytesPerRow,
    expectedBytes,
    maxBytes
  );
  if (!Number.isSafeInteger(transmittedBytes) || transmittedBytes < 0) {
    throw new GraphicDecodeError(
      "INVALID_GRAPHIC_DIMENSIONS",
      "The transmitted graphic byte count must be a non-negative safe integer."
    );
  }
  if (transmittedBytes > maxBytes) {
    throw new GraphicDecodeError(
      "GRAPHIC_LIMIT_EXCEEDED",
      `Graphic exceeds the ${maxBytes}-byte graphic budget.`
    );
  }
  if (compressed) {
    throw new GraphicDecodeError(
      "UNSUPPORTED_GRAPHIC_FORMAT",
      "Zebra compressed-binary ^GFC payloads are not supported."
    );
  }
  const input = binaryBytes(source, transmittedBytes);
  const data = input;
  if (data.length !== expectedBytes) {
    throw new GraphicDecodeError(
      "GRAPHIC_BYTE_COUNT_MISMATCH",
      `Graphic declared ${expectedBytes} expanded bytes but decoded ${data.length}.`
    );
  }
  return {
    data,
    bytesPerRow,
    ...dimensions,
  };
}

export function decodeDownloadData(
  source: string,
  expectedBytes: number,
  maxBytes: number
): Uint8Array {
  if (!Number.isSafeInteger(expectedBytes) || expectedBytes < 0) {
    throw new GraphicDecodeError(
      "OBJECT_BYTE_COUNT_MISMATCH",
      `Downloaded object declares an invalid byte count: ${expectedBytes}.`
    );
  }
  if (expectedBytes > maxBytes) {
    throw new GraphicDecodeError(
      "GRAPHIC_LIMIT_EXCEEDED",
      `Downloaded object requires ${expectedBytes} bytes, exceeding the ${maxBytes}-byte limit.`
    );
  }
  const wrapped = decodeWrappedData(source, expectedBytes, maxBytes);
  let data = wrapped;
  if (!data) {
    data = new Uint8Array(expectedBytes);
    let highNibble: number | undefined;
    let offset = 0;
    for (const character of source) {
      if (/\s/.test(character)) continue;
      const nibble = Number.parseInt(character, 16);
      if (!/^[0-9A-Fa-f]$/.test(character) || !Number.isFinite(nibble)) {
        throw new GraphicDecodeError(
          "INVALID_OBJECT_DATA",
          "Downloaded object data must be hexadecimal, B64, or Z64 encoded."
        );
      }
      if (highNibble === undefined) {
        highNibble = nibble;
        continue;
      }
      if (offset >= expectedBytes) {
        throw new GraphicDecodeError(
          "OBJECT_BYTE_COUNT_MISMATCH",
          `Object declared ${expectedBytes} bytes but supplied more data.`
        );
      }
      data[offset++] = (highNibble << 4) | nibble;
      highNibble = undefined;
    }
    if (highNibble !== undefined) {
      throw new GraphicDecodeError(
        "INVALID_OBJECT_DATA",
        "Downloaded object hexadecimal data must contain complete byte pairs."
      );
    }
    if (offset !== expectedBytes) {
      throw new GraphicDecodeError(
        "OBJECT_BYTE_COUNT_MISMATCH",
        `Object declared ${expectedBytes} bytes but decoded ${offset}.`
      );
    }
  }
  if (data.length !== expectedBytes) {
    throw new GraphicDecodeError(
      "OBJECT_BYTE_COUNT_MISMATCH",
      `Object declared ${expectedBytes} bytes but decoded ${data.length}.`
    );
  }
  return data;
}
