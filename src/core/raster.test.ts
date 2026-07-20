import { describe, expect, it } from "vitest";
import {
  blitRaster,
  createMonochromeRaster,
  fillRect,
  getDot,
  rasterToRgba,
  setDot,
  transformRaster,
} from "./raster";

describe("monochrome raster", () => {
  it("packs black dots MSB-first and keeps row-tail bits clear", () => {
    const raster = createMonochromeRaster(10, 2);
    expect(raster.stride).toBe(2);
    expect(raster.bitOrder).toBe("msb-first");

    setDot(raster, 0, 0);
    setDot(raster, 7, 0);
    setDot(raster, 8, 0);
    expect([...raster.data]).toEqual([0x81, 0x80, 0, 0]);

    fillRect(raster, 0, 1, 10, 1);
    expect([...raster.data.slice(2)]).toEqual([0xff, 0xc0]);
    expect(raster.data[3] & 0x3f).toBe(0);
  });

  it("supports clear and XOR composition without gray pixels", () => {
    const raster = createMonochromeRaster(4, 1);
    fillRect(raster, 0, 0, 4, 1);
    fillRect(raster, 1, 0, 2, 1, "xor");
    setDot(raster, 3, 0, "clear");
    expect([0, 1, 2, 3].map((x) => getDot(raster, x, 0))).toEqual([
      true,
      false,
      false,
      false,
    ]);

    const rgba = rasterToRgba(raster);
    expect(new Set(rgba.filter((_, index) => index % 4 !== 3))).toEqual(
      new Set([0, 255])
    );
    expect(new Set(rgba.filter((_, index) => index % 4 === 3))).toEqual(
      new Set([255])
    );
  });

  it("blits rotations and applies label transforms deterministically", () => {
    const source = createMonochromeRaster(2, 3);
    setDot(source, 0, 0);
    setDot(source, 1, 2);
    const target = createMonochromeRaster(5, 5);
    expect(blitRaster(target, source, 1, 1, { orientation: "R" })).toEqual({
      width: 3,
      height: 2,
    });
    expect(getDot(target, 3, 1)).toBe(true);
    expect(getDot(target, 1, 2)).toBe(true);

    const mirrored = transformRaster(source, { mirrorX: true });
    expect(getDot(mirrored, 1, 0)).toBe(true);
    expect(getDot(mirrored, 0, 2)).toBe(true);

    const inverted = transformRaster(source, { invert: true });
    expect(getDot(inverted, 0, 0)).toBe(false);
    expect(getDot(inverted, 1, 0)).toBe(true);
  });
});
