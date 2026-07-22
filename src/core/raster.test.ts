import { describe, expect, it } from "vitest";
import {
  blitRaster,
  createMonochromeRaster,
  fillRect,
  getDot,
  rasterToRgba,
  setDot,
  strokeRoundedRect,
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

  it("keeps every rounded-box corner pixel-perfectly symmetric", () => {
    for (const [width, height, thickness, rounding] of [
      [31, 19, 2, 8],
      [32, 20, 3, 6],
      [47, 24, 5, 4],
      [70, 10, 10, 4],
    ] as const) {
      const raster = createMonochromeRaster(width + 6, height + 8);
      strokeRoundedRect(raster, 3, 4, width, height, thickness, rounding);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dot = getDot(raster, x + 3, y + 4);
          expect(getDot(raster, width - 1 - x + 3, y + 4)).toBe(dot);
          expect(getDot(raster, x + 3, height - 1 - y + 4)).toBe(dot);
        }
      }
    }
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

  it("clips magnified blits to the visible destination window", () => {
    const source = createMonochromeRaster(2, 2);
    setDot(source, 0, 0);
    setDot(source, 1, 1);
    const target = createMonochromeRaster(3, 3);

    expect(
      blitRaster(target, source, -99_999, -99_999, {
        scaleX: 100_000,
        scaleY: 100_000,
      })
    ).toEqual({ width: 200_000, height: 200_000 });
    expect(
      Array.from({ length: 3 }, (_, y) =>
        Array.from({ length: 3 }, (_, x) => getDot(target, x, y))
      )
    ).toEqual([
      [true, false, false],
      [false, true, true],
      [false, true, true],
    ]);
  });

  it("preserves scaled pixels for every orientation while clipping", () => {
    const source = createMonochromeRaster(3, 2);
    setDot(source, 0, 0);
    setDot(source, 2, 0);
    setDot(source, 1, 1);

    for (const orientation of ["N", "R", "I", "B"] as const) {
      const actual = createMonochromeRaster(7, 7);
      const expected = createMonochromeRaster(7, 7);
      blitRaster(actual, source, -1, 1, {
        orientation,
        scaleX: 2,
        scaleY: 3,
      });

      const logicalWidth = source.width * 2;
      const logicalHeight = source.height * 3;
      for (let sourceY = 0; sourceY < source.height; sourceY++) {
        for (let sourceX = 0; sourceX < source.width; sourceX++) {
          if (!getDot(source, sourceX, sourceY)) continue;
          for (let scaleY = 0; scaleY < 3; scaleY++) {
            for (let scaleX = 0; scaleX < 2; scaleX++) {
              const x = sourceX * 2 + scaleX;
              const y = sourceY * 3 + scaleY;
              const point =
                orientation === "R"
                  ? { x: logicalHeight - 1 - y, y: x }
                  : orientation === "I"
                  ? { x: logicalWidth - 1 - x, y: logicalHeight - 1 - y }
                  : orientation === "B"
                  ? { x: y, y: logicalWidth - 1 - x }
                  : { x, y };
              setDot(expected, -1 + point.x, 1 + point.y);
            }
          }
        }
      }

      expect(actual.data).toEqual(expected.data);
    }
  });
});
