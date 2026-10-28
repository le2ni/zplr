import { describe, expect, it } from "vitest";
import { zlibSync } from "fflate";
import { renderZpl } from "@/index.node";
import { decodePng } from "./pngDecoder";
import { GraphicDecodeError } from "./graphicDecoder";
import { getDot } from "./raster";

function chunk(type: string, data: Uint8Array): Buffer {
  const output = Buffer.alloc(data.length + 12);
  output.writeUInt32BE(data.length);
  output.write(type, 4);
  output.set(data, 8);
  let crc = 0xffffffff;
  for (const byte of output.subarray(4, -4)) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  output.writeUInt32BE((crc ^ 0xffffffff) >>> 0, output.length - 4);
  return output;
}

function png(width: number, height: number, depth: number, type: number,
  interlace: number, rows: number[], extra: Buffer[] = []): Uint8Array {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width); header.writeUInt32BE(height, 4);
  header.set([depth, type, 0, 0, interlace], 8);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header), ...extra, chunk("IDAT", zlibSync(Uint8Array.from(rows))),
    chunk("IEND", new Uint8Array())]);
}

// Pass membership from the PNG specification, independent of the decoder's
// pass offsets/strides. Odd dimensions exercise partial rows and padding.
const membership = [
  [1, 6, 4, 6, 2, 6, 4, 6], [7, 7, 7, 7, 7, 7, 7, 7],
  [5, 6, 5, 6, 5, 6, 5, 6], [7, 7, 7, 7, 7, 7, 7, 7],
  [3, 6, 4, 6, 3, 6, 4, 6], [7, 7, 7, 7, 7, 7, 7, 7],
  [5, 6, 5, 6, 5, 6, 5, 6], [7, 7, 7, 7, 7, 7, 7, 7],
];
const dark = (x: number, y: number) => (x * 3 + y * 5) % 7 < 3;

function interlaced(depth: number, width = 9, height = 11): Uint8Array {
  const scanlines: number[] = [];
  for (let pass = 1; pass <= 7; pass++) {
    let previous: number[] = [];
    for (let y = 0; y < height; y++) {
      const samples = Array.from({ length: width }, (_, x) => x)
        .filter((x) => membership[y % 8][x % 8] === pass)
        .map((x) => dark(x, y) ? 0 : 2 ** depth - 1);
      if (!samples.length) continue;
      const row = new Array(Math.ceil(samples.length * depth / 8)).fill(0);
      samples.forEach((sample, x) => {
        if (depth === 16) { row[x * 2] = sample >>> 8; row[x * 2 + 1] = sample & 255; }
        else row[Math.floor(x * depth / 8)] |= sample << (8 - depth - (x * depth % 8));
      });
      // Up filtering must reference the previous row of this pass, not the
      // previous output-image row or the last row from the previous pass.
      scanlines.push(2, ...row.map((byte, index) => (byte - (previous[index] ?? 0)) & 255));
      previous = row;
    }
  }
  return png(width, height, depth, 0, 1, scanlines);
}

describe("complete PNG sample and interlace decoding", () => {
  it.each([1, 2, 4, 8, 16])("decodes Adam7 grayscale at %i bits", (depth) => {
    const graphic = decodePng(interlaced(depth), 4096);
    const raster = { ...graphic, stride: graphic.bytesPerRow, bitOrder: "msb-first" as const };
    for (let y = 0; y < graphic.height; y++) {
      for (let x = 0; x < graphic.width; x++) expect(getDot(raster, x, y), `${x},${y}`).toBe(dark(x, y));
      expect(graphic.data[y * graphic.bytesPerRow + 1] & 0x7f).toBe(0);
    }
  });

  it.each([[1, 1], [1, 9], [9, 1], [2, 3]])("skips empty passes for %ix%i images", (width, height) => {
    const graphic = decodePng(interlaced(1, width, height), 4096);
    expect(graphic).toMatchObject({ width, height });
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      expect(Boolean(graphic.data[y * graphic.bytesPerRow + (x >> 3)] & (0x80 >> (x & 7))))
        .toBe(dark(x, y));
    }
  });

  it.each([0, 2, 4, 6])("decodes 16-bit color type %i", (type) => {
    const channels = type === 0 ? 1 : type === 2 ? 3 : type === 4 ? 2 : 4;
    const row = [0];
    for (const sample of [0, 65535, 16384]) {
      for (let channel = 0; channel < channels; channel++) {
        const value = (type === 4 || type === 6) && channel === channels - 1 ? 65535 : sample;
        row.push(value >>> 8, value & 255);
      }
    }
    expect(decodePng(png(3, 1, 16, type, 0, row), 4096).data).toEqual(Uint8Array.of(0xa0));
  });

  it("compares 16-bit transparent colors before reducing the sample depth", () => {
    const gray = png(2, 1, 16, 0, 0, [0, 0x12, 0x34, 0x12, 0x35],
      [chunk("tRNS", Uint8Array.of(0x12, 0x34))]);
    expect(decodePng(gray, 4096).data).toEqual(Uint8Array.of(0x40));
    const rgb = png(2, 1, 16, 2, 0, [0, 0, 1, 0, 2, 0, 3, 0, 1, 0, 2, 0, 4],
      [chunk("tRNS", Uint8Array.of(0, 1, 0, 2, 0, 3))]);
    expect(decodePng(rgb, 4096).data).toEqual(Uint8Array.of(0x40));
  });

  it("bounds all pass scanlines and rejects invalid PNG variants", () => {
    expect(() => decodePng(interlaced(16), 64)).toThrow(GraphicDecodeError);
    expect(() => decodePng(png(1, 1, 16, 3, 0, [0, 0, 0]), 4096)).toThrow(/bit depth/);
    expect(() => decodePng(png(1, 1, 8, 0, 2, [0, 0]), 4096)).toThrow(/interlace/);
    expect(() => decodePng(png(1, 1, 8, 0, 1, [0, 0, 0]), 4096)).toThrow(/size/);
    expect(() => decodePng(png(1, 1, 8, 0, 1, [5, 0]), 4096)).toThrow(/filter/);
  });

  it("downloads and recalls an interlaced 16-bit ~DY image", async () => {
    const image = interlaced(16);
    const source = `~DYR:ADAM.PNG,A,P,${image.length},,${Buffer.from(image).toString("hex")}` +
      "^XA^PW20^LL20^FO2,3^IMR:ADAM.PNG^FS^XZ";
    const rendered = await renderZpl(source);
    expect(rendered.diagnostics.some(({ severity }) => severity === "error")).toBe(false);
    for (let y = 0; y < 11; y++) for (let x = 0; x < 9; x++) {
      expect(getDot(rendered.labels[0].raster, x + 2, y + 3)).toBe(dark(x, y));
    }
  });
});
