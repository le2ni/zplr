import { describe, expect, it } from "vitest";
import { zlibSync } from "fflate";
import { GraphicDecodeError } from "./graphicDecoder";
import { decodeBmp, decodePcx, ImageDecodeError } from "./imageDecoder";
import { decodePng, PngDecodeError } from "./pngDecoder";

function bytes(hex: string): Uint8Array {
  return Uint8Array.from(Buffer.from(hex, "hex"));
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const value of data) {
    crc ^= value;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, body: Uint8Array): Uint8Array {
  const result = new Uint8Array(body.length + 12);
  const view = new DataView(result.buffer);
  const typeBytes = Uint8Array.from(type, (character) => character.charCodeAt(0));
  view.setUint32(0, body.length);
  result.set(typeBytes, 4);
  result.set(body, 8);
  view.setUint32(body.length + 8, crc32(result.subarray(4, body.length + 8)));
  return result;
}

function concatenate(...parts: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function grayscalePng(scanlines: Uint8Array, corruptAdler = false): Uint8Array {
  const header = Uint8Array.from([
    0, 0, 0, 1,
    0, 0, 0, 1,
    8, 0, 0, 0, 0,
  ]);
  const compressed = zlibSync(scanlines);
  if (corruptAdler) compressed[compressed.length - 1] ^= 1;
  return concatenate(
    Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", compressed),
    chunk("IEND", new Uint8Array())
  );
}

function budgetError(operation: () => unknown): void {
  try {
    operation();
    throw new Error("Expected image decoding to exceed its budget.");
  } catch (error) {
    expect(error).toBeInstanceOf(GraphicDecodeError);
    expect((error as GraphicDecodeError).code).toBe("GRAPHIC_LIMIT_EXCEEDED");
  }
}

function rleBmp(): Uint8Array {
  const data = new Uint8Array(66);
  const view = new DataView(data.buffer);
  data.set([0x42, 0x4d]);
  view.setUint32(2, data.length, true);
  view.setUint32(10, 62, true);
  view.setUint32(14, 40, true);
  view.setInt32(18, 8, true);
  view.setInt32(22, 2, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 8, true);
  view.setUint32(30, 1, true);
  view.setUint32(46, 2, true);
  data.set([255, 255, 255, 0], 58);
  data.set([8, 0, 0, 1], 62);
  return data;
}

function trueColorPcx(planes = 3): Uint8Array {
  const data = new Uint8Array(128);
  data.set([0x0a, 5, 1, 8]);
  const view = new DataView(data.buffer);
  view.setUint16(8, 7, true);
  data[65] = planes;
  view.setUint16(66, 8, true);
  return data;
}

function grayscalePcxWithFalsePaletteMarker(): Uint8Array {
  const width = 769;
  const data = new Uint8Array(128 + width);
  data.set([0x0a, 5, 1, 8]);
  const view = new DataView(data.buffer);
  view.setUint16(8, width - 1, true);
  data[65] = 1;
  view.setUint16(66, width, true);
  data.fill(100, 128);
  data[128] = 0x0c;
  return data;
}

function overlappingBitfieldBmp(): Uint8Array {
  const data = new Uint8Array(70);
  const view = new DataView(data.buffer);
  data.set([0x42, 0x4d]);
  view.setUint32(2, data.length, true);
  view.setUint32(10, 66, true);
  view.setUint32(14, 40, true);
  view.setInt32(18, 1, true);
  view.setInt32(22, 1, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 16, true);
  view.setUint32(30, 3, true);
  view.setUint32(54, 0x7c00, true);
  view.setUint32(58, 0x7c00, true);
  view.setUint32(62, 0x001f, true);
  return data;
}

function bitfieldBmpWithHeaderGap(): Uint8Array {
  const data = new Uint8Array(74);
  const view = new DataView(data.buffer);
  data.set([0x42, 0x4d]);
  view.setUint32(2, data.length, true);
  view.setUint32(10, 70, true);
  view.setUint32(14, 52, true);
  view.setInt32(18, 1, true);
  view.setInt32(22, 1, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 32, true);
  view.setUint32(30, 3, true);
  view.setUint32(54, 0x00ff0000, true);
  view.setUint32(58, 0x0000ff00, true);
  view.setUint32(62, 0x000000ff, true);
  view.setUint32(66, 0xff000000, true);
  return data;
}

describe("downloaded image decoding", () => {
  it("bounds PNG inflated working data, not only packed output", () => {
    const png = bytes(
      "89504E470D0A1A0A0000000D49484452000000010000000108000000003A7E9B55" +
        "0000000A49444154789C636000000002000148AFA4710000000049454E44AE426082"
    );
    budgetError(() => decodePng(png, 1));

    const corrupted = png.slice();
    corrupted[corrupted.length - 5] ^= 1;
    expect(() => decodePng(corrupted, 128)).toThrow(PngDecodeError);

    const emptyTransparency = bytes(
      "89504E470D0A1A0A0000000D49484452000000010000000108000000003A7E9B55" +
        "0000000074524E5336B970CC" +
        "0000000A49444154789C636000000002000148AFA4710000000049454E44AE426082"
    );
    expect(() => decodePng(emptyTransparency, 128)).toThrow(PngDecodeError);
  });

  it("bounds BMP RLE index buffers", () => {
    budgetError(() => decodeBmp(rleBmp(), 2));
    expect(() => decodeBmp(overlappingBitfieldBmp(), 32)).toThrow(
      /masks are invalid or overlapping/
    );
    expect(decodeBmp(bitfieldBmpWithHeaderGap(), 32).data[0]).toBe(0x80);
  });

  it("bounds PCX scanline buffers and rejects extra true-color planes", () => {
    budgetError(() => decodePcx(trueColorPcx(), 1));
    expect(() => decodePcx(trueColorPcx(4), 32)).toThrow(ImageDecodeError);

    const trailing = new Uint8Array(128 + 24 + 1);
    trailing.set(trueColorPcx());
    expect(() => decodePcx(trailing, 32)).toThrow(ImageDecodeError);

    const grayscale = decodePcx(
      grayscalePcxWithFalsePaletteMarker(),
      769
    );
    expect(grayscale).toMatchObject({ width: 769, height: 1 });
    expect(grayscale.data.slice(0, -1).every((value) => value === 0xff)).toBe(
      true
    );
    expect(grayscale.data.at(-1)).toBe(0x80);
  });

  it("rejects lowercase PNG reserved chunk-type bits", () => {
    const png = bytes(
      "89504E470D0A1A0A0000000D49484452000000010000000108000000003A7E9B55" +
        "0000000A49444154789C636000000002000148AFA4710000000049454E44AE426082"
    );
    png[png.length - 6] = 0x6e;
    expect(() => decodePng(png, 128)).toThrow(/reserved bit/);
  });

  it("rejects extra inflated PNG bytes and invalid zlib checksums", () => {
    expect(() => decodePng(grayscalePng(Uint8Array.from([0, 0, 0])), 128)).toThrow(
      /unexpected decompressed size/
    );
    expect(() =>
      decodePng(grayscalePng(Uint8Array.from([0, 0]), true), 128)
    ).toThrow(/invalid checksum/);
    expect(decodePng(grayscalePng(Uint8Array.from([0, 0])), 128)).toMatchObject({
      width: 1,
      height: 1,
    });
  });

  it("rejects a PNG palette placed after transparency", () => {
    const header = Uint8Array.from([
      0, 0, 0, 1,
      0, 0, 0, 1,
      8, 2, 0, 0, 0,
    ]);
    const png = concatenate(
      Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk("IHDR", header),
      chunk("tRNS", new Uint8Array(6)),
      chunk("PLTE", new Uint8Array(3)),
      chunk("IDAT", zlibSync(new Uint8Array(4))),
      chunk("IEND", new Uint8Array())
    );
    expect(() => decodePng(png, 128)).toThrow(/invalid palette/);
  });
});
