import { Unzlib } from "fflate";
import type { StoredGraphic } from "./interpreter";
import { GraphicDecodeError } from "./graphicDecoder";

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

const CRC32_TABLE = Uint32Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit++) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

function crc32(data: Uint8Array, start: number, end: number): number {
  let crc = 0xffffffff;
  for (let offset = start; offset < end; offset++) {
    crc = CRC32_TABLE[(crc ^ data[offset]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
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

function inflatePngData(compressed: Uint8Array, expectedBytes: number): Uint8Array {
  const output = new Uint8Array(expectedBytes);
  let outputOffset = 0;
  let finished = false;
  let exceededExpectedSize = false;
  const decoder = new Unzlib((chunk, final) => {
    if (outputOffset + chunk.length > output.length) {
      exceededExpectedSize = true;
      throw new PngDecodeError("Downloaded PNG has an unexpected decompressed size.");
    }
    output.set(chunk, outputOffset);
    outputOffset += chunk.length;
    finished = final;
  });

  try {
    // Small input chunks keep even highly compressible malformed streams bounded
    // until the callback can enforce the exact PNG scanline size.
    for (let offset = 0; offset < compressed.length; offset += 1_024) {
      const end = Math.min(offset + 1_024, compressed.length);
      decoder.push(compressed.subarray(offset, end), end === compressed.length);
    }
  } catch (error) {
    if (exceededExpectedSize) throw error;
    throw new PngDecodeError("Downloaded PNG image data could not be decompressed.");
  }

  if (!finished || outputOffset !== expectedBytes) {
    throw new PngDecodeError("Downloaded PNG has an unexpected decompressed size.");
  }
  if (
    compressed.length < 6 ||
    adler32(output) !== uint32(compressed, compressed.length - 4)
  ) {
    throw new PngDecodeError("Downloaded PNG image data has an invalid checksum.");
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
  let sawHeader = false;
  let sawEnd = false;
  let sawPalette = false;
  let sawTransparency = false;
  let sawImageData = false;
  let imageDataEnded = false;
  let compressedBytes = 0;
  let imageDataChunks = 0;
  let endOffset = 0;
  let palette = new Uint8Array();
  let transparency = new Uint8Array();
  for (let offset = 8; offset + 12 <= data.length; ) {
    const length = uint32(data, offset);
    const chunkEnd = offset + 12 + length;
    if (!Number.isSafeInteger(chunkEnd) || chunkEnd > data.length) {
      throw new PngDecodeError("Downloaded PNG contains a truncated chunk.");
    }
    const type = String.fromCharCode(...data.subarray(offset + 4, offset + 8));
    if (!/^[A-Za-z]{4}$/.test(type)) {
      throw new PngDecodeError("Downloaded PNG contains an invalid chunk type.");
    }
    if ((type.charCodeAt(2) & 0x20) !== 0) {
      throw new PngDecodeError("Downloaded PNG contains a chunk with an invalid reserved bit.");
    }
    const body = data.subarray(offset + 8, offset + 8 + length);
    const expectedCrc = uint32(data, offset + 8 + length);
    if (crc32(data, offset + 4, offset + 8 + length) !== expectedCrc) {
      throw new PngDecodeError(`Downloaded PNG ${type} chunk has an invalid CRC.`);
    }
    if (type === "IHDR") {
      if (sawHeader || offset !== 8 || length !== 13) {
        throw new PngDecodeError("Downloaded PNG has an invalid IHDR chunk.");
      }
      sawHeader = true;
      width = uint32(body, 0);
      height = uint32(body, 4);
      bitDepth = body[8];
      colorType = body[9];
      if (body[10] !== 0 || body[11] !== 0) {
        throw new PngDecodeError(
          "Downloaded PNG uses an unsupported compression or filter method."
        );
      }
      interlace = body[12];
    } else if (type === "PLTE") {
      if (
        !sawHeader ||
        sawPalette ||
        sawTransparency ||
        sawImageData ||
        body.length === 0 ||
        body.length > 768 ||
        body.length % 3 !== 0
      ) {
        throw new PngDecodeError("Downloaded PNG has an invalid palette.");
      }
      sawPalette = true;
      palette = body.slice();
    } else if (type === "tRNS") {
      if (
        !sawHeader ||
        sawTransparency ||
        sawImageData ||
        body.length === 0 ||
        ![0, 2, 3].includes(colorType) ||
        (colorType === 3 && !sawPalette)
      ) {
        throw new PngDecodeError(
          "Downloaded PNG has an invalid transparency chunk."
        );
      }
      sawTransparency = true;
      transparency = body.slice();
    } else if (type === "IDAT") {
      if (!sawHeader || imageDataEnded) {
        throw new PngDecodeError(
          "Downloaded PNG has non-consecutive image data chunks."
        );
      }
      sawImageData = true;
      imageDataChunks++;
      compressedBytes += body.length;
      if (!Number.isSafeInteger(compressedBytes) || compressedBytes > maxBytes) {
        throw new GraphicDecodeError(
          "GRAPHIC_LIMIT_EXCEEDED",
          "Compressed PNG data exceeds the configured graphic budget."
        );
      }
    } else if (type === "IEND") {
      if (!sawHeader || !sawImageData || body.length !== 0) {
        throw new PngDecodeError("Downloaded PNG has an invalid IEND chunk.");
      }
      sawEnd = true;
      endOffset = chunkEnd;
      break;
    } else {
      if (!sawHeader) {
        throw new PngDecodeError("Downloaded PNG must begin with an IHDR chunk.");
      }
      if ((type.charCodeAt(0) & 0x20) === 0) {
        throw new PngDecodeError(
          `Downloaded PNG uses unsupported critical chunk ${type}.`
        );
      }
    }
    if (sawImageData && type !== "IDAT") imageDataEnded = true;
    offset = chunkEnd;
  }
  if (
    !sawHeader ||
    !sawEnd ||
    endOffset !== data.length ||
    imageDataChunks === 0 ||
    width <= 0 ||
    height <= 0 ||
    interlace !== 0
  ) {
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
  if (
    colorType === 3 &&
    (palette.length === 0 || palette.length / 3 > 1 << bitDepth)
  ) {
    throw new PngDecodeError(
      "Indexed PNG images require a palette that fits their bit depth."
    );
  }
  if ((colorType === 0 || colorType === 4) && sawPalette) {
    throw new PngDecodeError("Grayscale PNG images cannot contain a palette.");
  }
  if (
    (colorType === 0 && transparency.length !== 0 && transparency.length !== 2) ||
    (colorType === 2 && transparency.length !== 0 && transparency.length !== 6) ||
    (colorType === 3 && transparency.length > palette.length / 3) ||
    ((colorType === 4 || colorType === 6) && transparency.length !== 0)
  ) {
    throw new PngDecodeError("Downloaded PNG has an invalid transparency chunk.");
  }
  const maximumSample = (1 << bitDepth) - 1;
  if (
    (colorType === 0 &&
      transparency.length === 2 &&
      transparency[0] * 256 + transparency[1] > maximumSample) ||
    (colorType === 2 &&
      transparency.length === 6 &&
      (transparency[0] !== 0 ||
        transparency[2] !== 0 ||
        transparency[4] !== 0))
  ) {
    throw new PngDecodeError(
      "Downloaded PNG transparency samples exceed its bit depth."
    );
  }
  const rowBytes = Math.ceil((width * channels * bitDepth) / 8);
  const expectedInflated = (rowBytes + 1) * height;
  const bytesPerRow = Math.ceil(width / 8);
  const outputBytes = bytesPerRow * height;
  if (
    !Number.isSafeInteger(expectedInflated) ||
    !Number.isSafeInteger(outputBytes) ||
    expectedInflated > maxBytes ||
    outputBytes > maxBytes
  ) {
    throw new GraphicDecodeError(
      "GRAPHIC_LIMIT_EXCEEDED",
      "Decoded PNG working data exceeds the configured graphic budget."
    );
  }
  const compressed = new Uint8Array(compressedBytes);
  let target = 0;
  for (let offset = 8; offset < endOffset; ) {
    const length = uint32(data, offset);
    if (
      data[offset + 4] === 0x49 &&
      data[offset + 5] === 0x44 &&
      data[offset + 6] === 0x41 &&
      data[offset + 7] === 0x54
    ) {
      compressed.set(data.subarray(offset + 8, offset + 8 + length), target);
      target += length;
    }
    offset += length + 12;
  }
  const inflated = inflatePngData(compressed, expectedInflated);
  const bytesPerPixel = Math.max(1, Math.ceil((channels * bitDepth) / 8));
  const output = new Uint8Array(outputBytes);
  let previous: Uint8Array | undefined;
  let inputOffset = 0;
  for (let y = 0; y < height; y++) {
    const filter = inflated[inputOffset++];
    const source = inflated.subarray(inputOffset, inputOffset + rowBytes);
    inputOffset += rowBytes;
    const row = new Uint8Array(rowBytes);
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
    for (let x = 0; x < width; x++) {
      let red = 255;
      let green = 255;
      let blue = 255;
      let alpha = 255;
      if (colorType === 0) {
        const rawGray = sample(row, x * bitDepth, bitDepth);
        const gray = Math.round((rawGray * 255) / maximumSample);
        red = green = blue = gray;
        if (
          transparency.length === 2 &&
          rawGray === (transparency[0] << 8) + transparency[1]
        ) {
          alpha = 0;
        }
      } else if (colorType === 3) {
        const index = sample(row, x * bitDepth, bitDepth);
        if (index * 3 + 2 >= palette.length) {
          throw new PngDecodeError("Indexed PNG pixel refers past its palette.");
        }
        red = palette[index * 3];
        green = palette[index * 3 + 1];
        blue = palette[index * 3 + 2];
        alpha = transparency[index] ?? 255;
      } else {
        const offset = x * channels;
        red = row[offset];
        green = colorType === 4 ? red : row[offset + 1];
        blue = colorType === 4 ? red : row[offset + 2];
        if (colorType === 4) alpha = row[offset + 1];
        if (colorType === 6) alpha = row[offset + 3];
        if (
          colorType === 2 &&
          transparency.length === 6 &&
          red === (transparency[0] << 8) + transparency[1] &&
          green === (transparency[2] << 8) + transparency[3] &&
          blue === (transparency[4] << 8) + transparency[5]
        ) {
          alpha = 0;
        }
      }
      const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
      if (alpha >= 128 && luminance < 128) {
        output[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
    previous = row;
  }
  return { data: output, bytesPerRow, width, height };
}
