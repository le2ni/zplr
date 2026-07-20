import { describe, expect, it } from "vitest";
import { renderZpl } from "@/index.node";
import {
  microPdf417DataCapacity,
  microPdf417DataCodewords,
  pdf417DataCapacity,
  pdf417DataCodewords,
  structuredPdf417Parts,
} from "./pdf417Structured";

function rawCodewords(value: string): number[] {
  return [...value.matchAll(/\^(\d{3})/g)].map((match) => Number(match[1]));
}

describe("PDF417 structured append", () => {
  it("extracts the bundled encoder's exact high-level codewords", () => {
    expect(pdf417DataCodewords("ABC123")).toEqual([1, 88, 32, 119]);
    expect(microPdf417DataCodewords("ABC123")).toEqual([900, 1, 88, 32, 119]);
  });

  it("matches Zebra's ^FM PDF417 segmentation and emits Macro metadata", () => {
    const source = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".repeat(4);
    const capacity = pdf417DataCapacity(0, 5, 10);
    const parts = structuredPdf417Parts(source, capacity);

    expect(capacity).toBe(47);
    expect(parts.map((part) => part.source.length)).toEqual([69, 67, 8]);
    expect(parts.every((part) => rawCodewords(part.encodedData).length <= capacity)).toBe(true);
    expect(rawCodewords(parts[0].encodedData).slice(-10)).toEqual([
      928, 111, 100, 0, 0, 36, 923, 1, 111, 103,
    ]);
    expect(rawCodewords(parts[2].encodedData).at(-1)).toBe(922);
  });

  it("renders raw Macro codewords in MicroPDF417 symbols", async () => {
    const source = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".repeat(7);
    const parts = structuredPdf417Parts(
      source,
      microPdf417DataCapacity(20),
      "micropdf417"
    );
    expect(parts).toHaveLength(3);
    expect(rawCodewords(parts[2].encodedData).slice(42, 47)).toEqual([
      900, 838, 779, 867, 865,
    ]);

    const result = await renderZpl(
      `^XA^PW448^LL222^BY1^FM10,10,150,10,290,10^BFN,2,20^FD${source}^FS^XZ`
    );
    expect(result.labels[0].highlightRegions.filter(({ type }) => type === "barcode"))
      .toHaveLength(3);
    expect(result.diagnostics.filter(({ severity }) => severity === "error")).toEqual([]);
  });
});
