import { describe, expect, it } from "vitest";
import { unzlibSync } from "fflate";
import { decodeGraphic } from "../src/core/graphicDecoder";
import {
  collectZplResources,
  normalizedResourceName,
  rgbaToMonochrome,
  sourceTransactionForDownloadedFont,
  sourceTransactionForStoredGraphic,
  sourceEditForApplyFont,
  sourceTransactionForResourceRename,
  storedGraphicDefinition,
  z64Payload,
} from "./zplResources";

describe("ZPL resources", () => {
  it("packs thresholded RGBA pixels into printer rows", () => {
    const rgba = new Uint8ClampedArray([
      0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 255, 255, 255, 255, 255,
      255, 255, 255, 255, 0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 255,
    ]);
    expect(rgbaToMonochrome(rgba, 4, 2, { threshold: 128, dither: "threshold" })).toMatchObject({
      width: 4,
      height: 2,
      bytesPerRow: 1,
      data: new Uint8Array([0xa0, 0x50]),
    });
  });

  it("creates renderer-compatible Z64 payloads", () => {
    const bytes = new Uint8Array([0x80, 0x01, 0xfe, 0x7f]);
    const payload = z64Payload(bytes);
    expect(decodeGraphic(payload, 1, 4, 100).data).toEqual(bytes);
    const encoded = payload.split(":")[2]!;
    expect(unzlibSync(Uint8Array.from(Buffer.from(encoded, "base64")))).toEqual(bytes);
  });

  it("normalizes names and writes compressed DG definitions", () => {
    const bitmap = { width: 8, height: 1, bytesPerRow: 1, data: new Uint8Array([0x80]) };
    expect(normalizedResourceName("my logo.png", "GRF")).toBe("R:MY_LOGO.GRF");
    expect(storedGraphicDefinition("my logo.png", bitmap)).toMatch(/^~DGR:MY_LOGO\.GRF,1,1,:Z64:/);
  });

  it("finds references and renames definitions and uses atomically", () => {
    const source = "~DGR:LOGO.GRF,1,1,80\n^XA^FO1,2^XGR:LOGO.GRF,1,1^FS^XZ";
    const resource = collectZplResources(source)[0]!;
    expect(resource.references).toHaveLength(1);
    const transaction = sourceTransactionForResourceRename(source, resource, "brand")!;
    let renamed = source;
    for (const edit of [...transaction.edits].sort((left, right) => right.start - left.start)) {
      renamed = `${renamed.slice(0, edit.start)}${edit.text}${renamed.slice(edit.end)}`;
    }
    expect(renamed.match(/R:BRAND\.GRF/g)).toHaveLength(2);
  });

  it("selects the inserted graphic use rather than the end of its source", () => {
    const source = "^XA\n^PW100\n^LL80\n^XZ";
    const bitmap = { width: 8, height: 1, bytesPerRow: 1, data: new Uint8Array([0x80]) };
    const transaction = sourceTransactionForStoredGraphic(source, 0, bitmap, "mark", 7, 9)!;
    let edited = source;
    for (const edit of [...transaction.edits].sort((left, right) => right.start - left.start)) {
      edited = `${edited.slice(0, edit.start)}${edit.text}${edited.slice(edit.end)}`;
    }
    expect(edited.slice(transaction.primarySelectOriginAt, transaction.primarySelectOriginAt! + 6)).toBe("^FO7,9");
  });

  it("keeps a selected field anchored when a font definition is inserted before its label", () => {
    const source = "^XA^FO7,9^FDName^FS^XZ";
    const fieldStart = source.indexOf("^FO");
    const transaction = sourceTransactionForDownloadedFont(
      source,
      new Uint8Array([0, 1, 2, 3]),
      "brand",
      "Z",
      { start: fieldStart, end: source.indexOf("^XZ") },
    )!;
    const edit = transaction.edits[0]!;
    const edited = `${source.slice(0, edit.start)}${edit.text}${source.slice(edit.end)}`;
    expect(edited.slice(transaction.primarySelectOriginAt, transaction.primarySelectOriginAt! + 3)).toBe("^FO");
  });

  it("applies a registered font while preserving orientation and dimensions", () => {
    const source = "~DYR:BRAND.TTF,A,T,4,,AAAA^CWZ,R:BRAND.TTF\n^XA^FO7,9^A0N,30,20^FDName^FS^XZ";
    const fieldStart = source.indexOf("^FO");
    const change = sourceEditForApplyFont(
      source,
      { start: fieldStart, end: source.indexOf("^XZ") },
      "R:BRAND.TTF",
    )!;
    const edited = `${source.slice(0, change.start)}${change.text}${source.slice(change.end)}`;
    expect(edited).toContain("^AZN,30,20^FDName");
    expect(edited).not.toContain("^AZ0N");
  });
});
