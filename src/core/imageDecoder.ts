import type { StoredGraphic } from "./interpreter";

export class ImageDecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageDecodeError";
  }
}

function u16(data: Uint8Array, offset: number): number {
  return data[offset] | (data[offset + 1] << 8);
}

function u32(data: Uint8Array, offset: number): number {
  return (
    data[offset] |
    (data[offset + 1] << 8) |
    (data[offset + 2] << 16) |
    (data[offset + 3] << 24)
  ) >>> 0;
}

function i32(data: Uint8Array, offset: number): number {
  return u32(data, offset) | 0;
}

function dark(red: number, green: number, blue: number, alpha = 255): boolean {
  return alpha >= 128 && red * 0.2126 + green * 0.7152 + blue * 0.0722 < 128;
}

function set(output: Uint8Array, bytesPerRow: number, x: number, y: number): void {
  output[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7);
}

function maskComponent(value: number, mask: number): number {
  if (!mask) return 0;
  let shift = 0;
  while (((mask >>> shift) & 1) === 0) shift++;
  const maximum = mask >>> shift;
  return Math.round((((value & mask) >>> shift) * 255) / maximum);
}

function decodeRleBmp(
  data: Uint8Array,
  offset: number,
  width: number,
  height: number,
  bits: 4 | 8
): Uint8Array {
  const indexes = new Uint8Array(width * height);
  let x = 0;
  let y = 0;
  let cursor = offset;
  while (cursor + 1 < data.length && y < height) {
    const count = data[cursor++];
    const value = data[cursor++];
    if (count > 0) {
      for (let index = 0; index < count; index++) {
        if (x < width) {
          indexes[y * width + x] =
            bits === 8
              ? value
              : index & 1
              ? value & 0x0f
              : value >> 4;
        }
        x++;
      }
      continue;
    }
    if (value === 0) {
      x = 0;
      y++;
    } else if (value === 1) {
      break;
    } else if (value === 2) {
      if (cursor + 1 >= data.length) throw new ImageDecodeError("BMP RLE delta is truncated.");
      x += data[cursor++];
      y += data[cursor++];
    } else {
      const pixels = value;
      const literalBytes = bits === 8 ? pixels : Math.ceil(pixels / 2);
      if (cursor + literalBytes > data.length) {
        throw new ImageDecodeError("BMP RLE literal run is truncated.");
      }
      for (let index = 0; index < pixels; index++) {
        const byte = data[cursor + (bits === 8 ? index : index >> 1)];
        const paletteIndex =
          bits === 8 ? byte : index & 1 ? byte & 0x0f : byte >> 4;
        if (x < width) indexes[y * width + x] = paletteIndex;
        x++;
      }
      cursor += literalBytes;
      if (literalBytes & 1) cursor++;
    }
  }
  return indexes;
}

/** Decodes common Windows/OS2 BMP variants to packed monochrome dots. */
export function decodeBmp(data: Uint8Array, maxBytes: number): StoredGraphic {
  if (data.length < 26 || data[0] !== 0x42 || data[1] !== 0x4d) {
    throw new ImageDecodeError("Downloaded BMP has an invalid header.");
  }
  const pixelOffset = u32(data, 10);
  const dibSize = u32(data, 14);
  const core = dibSize === 12;
  const width = core ? u16(data, 18) : i32(data, 18);
  const signedHeight = core ? u16(data, 20) : i32(data, 22);
  const height = Math.abs(signedHeight);
  const topDown = !core && signedHeight < 0;
  const bits = core ? u16(data, 24) : u16(data, 28);
  const compression = core ? 0 : u32(data, 30);
  if (width <= 0 || height <= 0 || ![1, 4, 8, 16, 24, 32].includes(bits)) {
    throw new ImageDecodeError("Downloaded BMP dimensions or bit depth are unsupported.");
  }
  const bytesPerRow = Math.ceil(width / 8);
  if (bytesPerRow * height > maxBytes) {
    throw new ImageDecodeError("Decoded BMP exceeds the configured graphic budget.");
  }
  if (![0, 1, 2, 3].includes(compression) || (compression === 1 && bits !== 8) || (compression === 2 && bits !== 4)) {
    throw new ImageDecodeError("Downloaded BMP uses an unsupported compression mode.");
  }
  const paletteEntries =
    bits <= 8
      ? Math.min(1 << bits, core ? 1 << bits : u32(data, 46) || 1 << bits)
      : 0;
  const paletteOffset = 14 + dibSize;
  const paletteStride = core ? 3 : 4;
  const palette: Array<[number, number, number, number]> = [];
  for (let index = 0; index < paletteEntries; index++) {
    const at = paletteOffset + index * paletteStride;
    if (at + paletteStride > data.length) throw new ImageDecodeError("BMP palette is truncated.");
    palette.push([data[at + 2], data[at + 1], data[at], 255]);
  }
  let redMask = bits === 16 ? 0x7c00 : 0x00ff0000;
  let greenMask = bits === 16 ? 0x03e0 : 0x0000ff00;
  let blueMask = bits === 16 ? 0x001f : 0x000000ff;
  let alphaMask = 0;
  if (compression === 3) {
    const masks = dibSize >= 52 ? 54 : 14 + dibSize;
    if (masks + 12 > data.length) throw new ImageDecodeError("BMP color masks are truncated.");
    redMask = u32(data, masks);
    greenMask = u32(data, masks + 4);
    blueMask = u32(data, masks + 8);
    if (masks + 16 <= pixelOffset) alphaMask = u32(data, masks + 12);
  }
  const output = new Uint8Array(bytesPerRow * height);
  const indexed =
    compression === 1 || compression === 2
      ? decodeRleBmp(data, pixelOffset, width, height, bits as 4 | 8)
      : undefined;
  const sourceStride = Math.ceil((width * bits) / 32) * 4;
  for (let y = 0; y < height; y++) {
    const storedY = topDown ? y : height - 1 - y;
    for (let x = 0; x < width; x++) {
      let red = 255;
      let green = 255;
      let blue = 255;
      let alpha = 255;
      if (indexed) {
        [red, green, blue, alpha] = palette[indexed[storedY * width + x]] ?? [255, 255, 255, 255];
      } else {
        const row = pixelOffset + storedY * sourceStride;
        if (row < 0 || row + sourceStride > data.length) throw new ImageDecodeError("BMP pixel data is truncated.");
        if (bits === 1 || bits === 4 || bits === 8) {
          const index =
            bits === 1
              ? (data[row + (x >> 3)] >> (7 - (x & 7))) & 1
              : bits === 4
              ? x & 1
                ? data[row + (x >> 1)] & 0x0f
                : data[row + (x >> 1)] >> 4
              : data[row + x];
          [red, green, blue, alpha] = palette[index] ?? [255, 255, 255, 255];
        } else if (bits === 24) {
          const at = row + x * 3;
          blue = data[at];
          green = data[at + 1];
          red = data[at + 2];
        } else {
          const at = row + x * (bits >> 3);
          const value = bits === 16 ? u16(data, at) : u32(data, at);
          red = maskComponent(value, redMask);
          green = maskComponent(value, greenMask);
          blue = maskComponent(value, blueMask);
          alpha = alphaMask ? maskComponent(value, alphaMask) : 255;
        }
      }
      if (dark(red, green, blue, alpha)) set(output, bytesPerRow, x, y);
    }
  }
  return { data: output, bytesPerRow, width, height };
}

function decodePcxRle(data: Uint8Array, offset: number, expected: number): Uint8Array {
  const output = new Uint8Array(expected);
  let cursor = offset;
  let target = 0;
  while (target < expected && cursor < data.length) {
    const lead = data[cursor++];
    const count = (lead & 0xc0) === 0xc0 ? lead & 0x3f : 1;
    const value = count === 1 && (lead & 0xc0) !== 0xc0 ? lead : data[cursor++];
    if (value === undefined || target + count > expected) {
      throw new ImageDecodeError("PCX RLE data is invalid or truncated.");
    }
    output.fill(value, target, target + count);
    target += count;
  }
  if (target !== expected) throw new ImageDecodeError("PCX pixel data is truncated.");
  return output;
}

/** Decodes 1/4/8-bit indexed and 24-bit PCX images. */
export function decodePcx(data: Uint8Array, maxBytes: number): StoredGraphic {
  if (data.length < 128 || data[0] !== 0x0a || data[2] !== 1) {
    throw new ImageDecodeError("Downloaded PCX has an invalid header.");
  }
  const bits = data[3];
  const width = u16(data, 8) - u16(data, 4) + 1;
  const height = u16(data, 10) - u16(data, 6) + 1;
  const planes = data[65];
  const sourceBytesPerRow = u16(data, 66);
  const bytesPerRow = Math.ceil(width / 8);
  if (
    width <= 0 ||
    height <= 0 ||
    sourceBytesPerRow <= 0 ||
    !((bits === 1 && planes >= 1 && planes <= 4) || (bits === 8 && (planes === 1 || planes >= 3)))
  ) {
    throw new ImageDecodeError("Downloaded PCX dimensions or plane layout are unsupported.");
  }
  if (bytesPerRow * height > maxBytes) {
    throw new ImageDecodeError("Decoded PCX exceeds the configured graphic budget.");
  }
  const scanlineBytes = sourceBytesPerRow * planes;
  const pixels = decodePcxRle(data, 128, scanlineBytes * height);
  const palette16: Array<[number, number, number]> = [];
  for (let index = 0; index < 16; index++) {
    palette16.push([data[16 + index * 3], data[17 + index * 3], data[18 + index * 3]]);
  }
  let palette256: Uint8Array | undefined;
  if (bits === 8 && planes === 1 && data.length >= 769 && data[data.length - 769] === 0x0c) {
    palette256 = data.slice(data.length - 768);
  }
  const output = new Uint8Array(bytesPerRow * height);
  for (let y = 0; y < height; y++) {
    const row = y * scanlineBytes;
    for (let x = 0; x < width; x++) {
      let red = 255;
      let green = 255;
      let blue = 255;
      if (bits === 1) {
        let index = 0;
        for (let plane = 0; plane < planes; plane++) {
          const byte = pixels[row + plane * sourceBytesPerRow + (x >> 3)];
          index |= ((byte >> (7 - (x & 7))) & 1) << plane;
        }
        [red, green, blue] = palette16[index] ?? [255, 255, 255];
      } else if (planes === 1) {
        const index = pixels[row + x];
        if (palette256) {
          red = palette256[index * 3];
          green = palette256[index * 3 + 1];
          blue = palette256[index * 3 + 2];
        } else red = green = blue = index;
      } else {
        red = pixels[row + x];
        green = pixels[row + sourceBytesPerRow + x];
        blue = pixels[row + sourceBytesPerRow * 2 + x];
      }
      if (dark(red, green, blue)) set(output, bytesPerRow, x, y);
    }
  }
  return { data: output, bytesPerRow, width, height };
}
