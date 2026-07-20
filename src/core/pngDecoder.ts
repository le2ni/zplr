import { unzlibSync } from "fflate";
import type { StoredGraphic } from "./interpreter";

export class PngDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PngDecodeError";
  }
}

function uint32(data: Uint8Array, offset: number): number {
  return (
    data[offset] * 0x1000000 +
    (data[offset + 1] << 16) +
    (data[offset + 2] << 8) +
    data[offset + 3]
  );
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const output = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function paeth(left: number, above: number, upperLeft: number): number {
  const prediction = left + above - upperLeft;
  const leftDistance = Math.abs(prediction - left);
  const aboveDistance = Math.abs(prediction - above);
  const upperLeftDistance = Math.abs(prediction - upperLeft);
  return leftDistance <= aboveDistance && leftDistance <= upperLeftDistance
    ? left
    : aboveDistance <= upperLeftDistance
    ? above
    : upperLeft;
}

function sample(row: Uint8Array, bitOffset: number, bitDepth: number): number {
  if (bitDepth === 8) return row[bitOffset >> 3];
  const shift = 8 - bitDepth - (bitOffset & 7);
  return (row[bitOffset >> 3] >> shift) & ((1 << bitDepth) - 1);
}

/** Decodes non-interlaced PNGs into Zebra's packed one-bit graphic form. */
export function decodePng(data: Uint8Array, maxBytes: number): StoredGraphic {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (signature.some((value, index) => data[index] !== value)) {
    throw new PngDecodeError("Downloaded PNG has an invalid signature.");
  }
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  let palette = new Uint8Array();
  let transparency = new Uint8Array();
  const compressed: Uint8Array[] = [];
  for (let offset = 8; offset + 12 <= data.length; ) {
    const length = uint32(data, offset);
    const type = String.fromCharCode(...data.slice(offset + 4, offset + 8));
    const body = data.slice(offset + 8, offset + 8 + length);
    if (offset + 12 + length > data.length) {
      throw new PngDecodeError("Downloaded PNG contains a truncated chunk.");
    }
    if (type === "IHDR") {
      width = uint32(body, 0);
      height = uint32(body, 4);
      bitDepth = body[8];
      colorType = body[9];
      interlace = body[12];
    } else if (type === "PLTE") palette = body;
    else if (type === "tRNS") transparency = body;
    else if (type === "IDAT") compressed.push(body);
    else if (type === "IEND") break;
    offset += length + 12;
  }
  if (width <= 0 || height <= 0 || interlace !== 0) {
    throw new PngDecodeError(
      "Only positive-size, non-interlaced PNG images are supported."
    );
  }
  const channels =
    colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 3 ? 1 : colorType === 4 ? 2 : colorType === 6 ? 4 : 0;
  if (!channels || ![1, 2, 4, 8].includes(bitDepth)) {
    throw new PngDecodeError("Downloaded PNG uses an unsupported color type or bit depth.");
  }
  if (colorType !== 0 && colorType !== 3 && bitDepth !== 8) {
    throw new PngDecodeError("True-color PNG images must use 8-bit channels.");
  }
  const rowBytes = Math.ceil((width * channels * bitDepth) / 8);
  const expectedInflated = (rowBytes + 1) * height;
  const bytesPerRow = Math.ceil(width / 8);
  if (bytesPerRow * height > maxBytes) {
    throw new PngDecodeError("Decoded PNG exceeds the configured graphic budget.");
  }
  let inflated: Uint8Array;
  try {
    inflated = unzlibSync(concat(compressed), {
      out: new Uint8Array(expectedInflated),
    });
  } catch {
    throw new PngDecodeError("Downloaded PNG image data could not be decompressed.");
  }
  if (inflated.length !== expectedInflated) {
    throw new PngDecodeError("Downloaded PNG has an unexpected decompressed size.");
  }
  const bytesPerPixel = Math.max(1, Math.ceil((channels * bitDepth) / 8));
  const rows: Uint8Array[] = [];
  let inputOffset = 0;
  for (let y = 0; y < height; y++) {
    const filter = inflated[inputOffset++];
    const source = inflated.slice(inputOffset, inputOffset + rowBytes);
    inputOffset += rowBytes;
    const row = new Uint8Array(rowBytes);
    const previous = rows[y - 1];
    for (let x = 0; x < rowBytes; x++) {
      const raw = source[x];
      const left = x >= bytesPerPixel ? row[x - bytesPerPixel] : 0;
      const above = previous?.[x] ?? 0;
      const upperLeft = x >= bytesPerPixel ? previous?.[x - bytesPerPixel] ?? 0 : 0;
      const predictor =
        filter === 0
          ? 0
          : filter === 1
          ? left
          : filter === 2
          ? above
          : filter === 3
          ? Math.floor((left + above) / 2)
          : filter === 4
          ? paeth(left, above, upperLeft)
          : Number.NaN;
      if (!Number.isFinite(predictor)) throw new PngDecodeError("PNG uses an invalid row filter.");
      row[x] = (raw + predictor) & 0xff;
    }
    rows.push(row);
  }

  const output = new Uint8Array(bytesPerRow * height);
  const maximumSample = (1 << bitDepth) - 1;
  for (let y = 0; y < height; y++) {
    const row = rows[y];
    for (let x = 0; x < width; x++) {
      let red = 255;
      let green = 255;
      let blue = 255;
      let alpha = 255;
      if (colorType === 0) {
        const gray = Math.round((sample(row, x * bitDepth, bitDepth) * 255) / maximumSample);
        red = green = blue = gray;
      } else if (colorType === 3) {
        const index = sample(row, x * bitDepth, bitDepth);
        red = palette[index * 3] ?? 255;
        green = palette[index * 3 + 1] ?? 255;
        blue = palette[index * 3 + 2] ?? 255;
        alpha = transparency[index] ?? 255;
      } else {
        const offset = x * channels;
        red = row[offset];
        green = colorType === 4 ? red : row[offset + 1];
        blue = colorType === 4 ? red : row[offset + 2];
        if (colorType === 4) alpha = row[offset + 1];
        if (colorType === 6) alpha = row[offset + 3];
      }
      const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
      if (alpha >= 128 && luminance < 128) {
        output[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }
  return { data: output, bytesPerRow, width, height };
}
