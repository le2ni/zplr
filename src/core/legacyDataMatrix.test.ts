import { describe, expect, it } from "vitest";
import {
  encodeLegacyDataMatrix,
  type LegacyDataMatrixQuality,
} from "./legacyDataMatrix";

function rows(modules: Uint8Array, size: number): string[] {
  return Array.from({ length: size }, (_, y) =>
    Array.from(modules.subarray(y * size, (y + 1) * size)).join("")
  );
}

function fnv1a(modules: Uint8Array): number {
  let hash = 2166136261;
  for (const module of modules) hash = Math.imul(hash ^ module, 16777619);
  return hash >>> 0;
}

describe("legacy Data Matrix ECC 000-140", () => {
  it("matches the ISO/IEC 16022 Annex Q ECC-050 worked example", () => {
    const symbol = encodeLegacyDataMatrix({
      data: "AB12-X",
      quality: 50,
      format: 3,
      columns: 13,
      rows: 13,
    });
    expect(rows(symbol.modules, symbol.size)).toEqual([
      "1010101010101",
      "1110100110010",
      "1100101011011",
      "1101110010100",
      "1110111010101",
      "1011000011000",
      "1111010011011",
      "1001001111100",
      "1101011110011",
      "1011111010100",
      "1100100111101",
      "1001101101110",
      "1111111111111",
    ]);
  });

  it.each([
    [0, 0x4a7c8eff],
    [50, 0x248713ec],
    [80, 0x5a5b71b3],
    [100, 0x2de7a140],
    [140, 0x8c9a91da],
  ] as const)(
    "matches the real printer's forced 49x49 quality-%i modules",
    (quality, expectedHash) => {
      const symbol = encodeLegacyDataMatrix({
        data: "ABCDEFGHIJKLMNOPQRSTUVWXYZ012345",
        quality,
        format: 6,
        columns: 49,
        rows: 49,
      });
      expect(symbol.size).toBe(49);
      expect(fnv1a(symbol.modules)).toBe(expectedHash);
    }
  );

  it("implements format 0 as the printer's format-6 alias", () => {
    const options = {
      data: "ABC123",
      quality: 0 as const,
      columns: 13,
      rows: 13,
    };
    expect(
      encodeLegacyDataMatrix({ ...options, format: 0 }).modules
    ).toEqual(encodeLegacyDataMatrix({ ...options, format: 6 }).modules);
  });

  it("supports every legacy encodation alphabet and rejects mismatches", () => {
    const accepted = [
      [1, "123 456"],
      [2, "ABC XYZ"],
      [3, "AB12-X/.,"],
      [4, "AB12 XYZ"],
      [5, "A\u0000\u007f"],
      [6, "A\u0000\u00ff"],
    ] as const;
    for (const [format, data] of accepted) {
      expect(() =>
        encodeLegacyDataMatrix({ data, quality: 0, format })
      ).not.toThrow();
    }
    for (const [format, data] of [
      [1, "A"],
      [2, "1"],
      [3, "a"],
      [4, "."],
      [5, "\u0080"],
      [6, "\u0100"],
    ] as const) {
      expect(() =>
        encodeLegacyDataMatrix({ data, quality: 0, format })
      ).toThrow(/Legacy Data Matrix/);
    }
  });

  it("expands the documented carriage-return and backslash sequences", () => {
    const escaped = encodeLegacyDataMatrix({
      data: "A\\&B\\\\C",
      quality: 80,
      format: 6,
    });
    const literal = encodeLegacyDataMatrix({
      data: "A\r\nB\\C",
      quality: 80,
      format: 6,
    });
    expect(escaped.modules).toEqual(literal.modules);
  });

  it("honors every forced odd size and Zebra's sizing validation", () => {
    for (let size = 9; size <= 49; size += 2) {
      expect(
        encodeLegacyDataMatrix({
          data: "A",
          quality: 0,
          format: 6,
          columns: size,
          rows: 0,
        }).size
      ).toBe(size);
    }
    expect(() =>
      encodeLegacyDataMatrix({ data: "A", quality: 0, format: 6, columns: 8 })
    ).toThrow(/at least 9/);
    expect(() =>
      encodeLegacyDataMatrix({ data: "A", quality: 0, format: 6, columns: 10 })
    ).toThrow(/must be odd/);
    expect(
      encodeLegacyDataMatrix({ data: "A", quality: 0, format: 6, columns: 50 })
        .size
    ).toBe(9);
    expect(() =>
      encodeLegacyDataMatrix({
        data: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        quality: 140,
        format: 6,
        columns: 9,
      })
    ).toThrow(/does not fit/);
  });

  it("matches Zebra's maximum field-size table", () => {
    const maxima: Readonly<Record<LegacyDataMatrixQuality, readonly number[]>> = {
      0: [596, 452, 394, 413, 310, 271],
      50: [457, 333, 291, 305, 228, 200],
      80: [402, 293, 256, 268, 201, 176],
      100: [300, 218, 190, 200, 150, 131],
      140: [144, 105, 91, 96, 72, 63],
    };
    const character = ["", "1", "A", "A", "A", "A", "A"];
    for (const quality of [0, 50, 80, 100, 140] as const) {
      maxima[quality].forEach((maximum, index) => {
        const format = index + 1;
        expect(() =>
          encodeLegacyDataMatrix({
            data: character[format].repeat(maximum),
            quality,
            format,
            columns: 49,
            rows: 49,
          })
        ).not.toThrow();
        expect(() =>
          encodeLegacyDataMatrix({
            data: character[format].repeat(maximum + 1),
            quality,
            format,
            columns: 49,
            rows: 49,
          })
        ).toThrow(/exceeds|does not fit/);
      });
    }
  });
});
