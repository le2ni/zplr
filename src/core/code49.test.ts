import bwipjs from "bwip-js";
import { describe, expect, it } from "vitest";
import { renderZpl } from "@/index.node";
import {
  encodeZplCode49,
  expandAutomaticCode49,
} from "./code49";
import { getDot } from "./raster";

function fnv1a(modules: Uint8Array): number {
  let hash = 0x811c9dc5;
  for (const module of modules) {
    hash ^= module;
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function automaticModules(data: string, rowHeight = 8): Uint8Array {
  const raw = bwipjs.raw({
    bcid: "code49",
    text: data,
    rowheight: rowHeight,
    sepheight: 1,
  })[0] as { pixs: number[]; pixx: number } | undefined;
  if (!raw) throw new Error("Code 49 test encoder produced no symbol.");
  return expandAutomaticCode49(raw.pixs, raw.pixx, rowHeight);
}

describe("printer-conformant Code 49", () => {
  it.each([
    ["automatic alphanumeric", "12345ABCDE", "A", 0x86d9cba1],
    ["mode 0", "12345ABCDE", 0, 0xaa425427],
    ["mode 0 numeric shift", "=12345", 0, 0xf3057231],
    ["mode 1", "123ABC", 1, 0x249dd101],
    ["mode 2", "12345", 2, 0x59e1de61],
    ["mode 3", "123ABC", 3, 0x94030c91],
    ["mode 3 structured append", "12123ABC", 3, 0x75cab4f1],
    ["mode 4 implied shift 1", "A", 4, 0xe0645091],
    ["mode 5 implied shift 2", "A", 5, 0xa69029c1],
    ["mode 5 explicit shift", ">A", 5, 0x45c35891],
  ] as const)("matches the Zebra preview for %s", (_name, data, mode, hash) => {
    const modules =
      mode === "A"
        ? automaticModules(data)
        : encodeZplCode49(data, mode, 8).modules;
    expect(fnv1a(modules)).toBe(hash);
  });

  it("expands encoder rows to the exact Zebra row height", () => {
    const modules = automaticModules("12345ABCDE", 12);
    expect(modules).toHaveLength(81 * 27);
    expect(fnv1a(modules)).toBe(0xdc0bf1e1);
  });

  it("uses the selected start mode in the integrated renderer", async () => {
    const result = await renderZpl(
      "^XA^PW200^LL100^FO0,0^BY2^B4N,8,N,0^FD12345ABCDE^FS^XZ"
    );
    expect(
      result.diagnostics.filter((diagnostic) => diagnostic.severity === "error")
    ).toEqual([]);
    expect(result.labels[0].highlightRegions).toContainEqual(
      expect.objectContaining({ type: "barcode", width: 162, height: 56 })
    );
    const modules = new Uint8Array(81 * 28);
    for (let y = 0; y < 28; y++) {
      for (let x = 0; x < 81; x++) {
        modules[y * 81 + x] = getDot(result.labels[0].raster, x * 2, y * 2)
          ? 1
          : 0;
      }
    }
    expect(fnv1a(modules)).toBe(0xaa425427);
  });

  it("rejects data that is invalid for the selected numeric start mode", async () => {
    const result = await renderZpl(
      "^XA^PW200^LL100^FO0,0^BY2^B4N,8,N,2^FD123ABC^FS^XZ"
    );
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "INVALID_BARCODE_DATA" })
    );
  });
});
