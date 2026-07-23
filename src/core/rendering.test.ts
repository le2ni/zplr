import { describe, expect, it } from "vitest";
import {
  createRenderSession,
  parseDocument,
  renderZpl,
} from "@/index.node";
import type { RenderDocumentOptions, ZplDocument } from "@/types/ZplDocument";

async function renderDocument(
  document: ZplDocument,
  options: RenderDocumentOptions = {}
) {
  return (await createRenderSession(options).renderDocument(document)).labels;
}

function countDarkPixels(canvas: any): number {
  const pixels = canvas
    .getContext("2d")
    .getImageData(0, 0, canvas.width, canvas.height).data;
  let dark = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index] < 128 && pixels[index + 3] > 0) dark++;
  }
  return dark;
}

function darkPixelBounds(canvas: any) {
  const pixels = canvas
    .getContext("2d")
    .getImageData(0, 0, canvas.width, canvas.height).data;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const index = (y * canvas.width + x) * 4;
      if (pixels[index] >= 128 || pixels[index + 3] === 0) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return { minX, minY, maxX, maxY };
}

describe("shared renderer", () => {
  it("renders the same source deterministically through the public job API", async () => {
    const source = "^XA^PW40^LL24^FO2,2^GB12,8,2,B,2^FS^XZ";
    const first = await renderZpl(source);
    const second = await renderZpl(source);
    expect(await first.labels[0].canvas.toBuffer("png")).toEqual(
      await second.labels[0].canvas.toBuffer("png")
    );
    expect(first.labels).toHaveLength(1);
  });

  it("runs renderDocument through job-scoped persistent state", async () => {
    const document = parseDocument(
      "^XA^PW24^LL16^FO1,1^GB2,2,1^FS^XZ" +
        "^XA^FO3,3^GB2,2,1^FS^XZ"
    );
    const results = await renderDocument(document);
    expect(results).toHaveLength(2);
    expect(results.map(({ width, height }) => [width, height])).toEqual([
      [24, 16],
      [24, 16],
    ]);
  });

  it("renders a visible first text field", async () => {
    const result = await renderZpl("^XA^FO10,10^CF0,20,10^FDHello^FS^XZ", {
      width: 180,
      height: 60,
    });
    expect(countDarkPixels(result.labels[0].canvas)).toBeGreaterThan(0);
  });

  it("reports caret stops from each internally rendered glyph", async () => {
    const result = await renderZpl(
      "^XA^PW120^LL80^FO10,10^A0N,20,20^FDWi.W^FS^FO80,10^A0R,20,20^FDWi^FS^XZ"
    );
    const text = result.labels[0].highlightRegions.filter(({ type }) => type === "text");
    const normal = text[0]!;
    const normalStops = normal.textCaretStops ?? [];
    expect(normalStops.map(({ offset }) => offset)).toEqual([0, 1, 2, 3, 4]);
    const advances = normalStops.slice(1).map((stop, index) => stop.x - normalStops[index]!.x);
    expect(new Set(advances).size).toBeGreaterThan(1);
    expect(normalStops.at(-1)!.x - normalStops[0]!.x).toBe(normal.width);
    expect(normalStops.every((stop) => stop.y === 10 && stop.endY === 30)).toBe(true);

    const rotatedStops = text[1]!.textCaretStops ?? [];
    expect(rotatedStops.map(({ offset }) => offset)).toEqual([0, 1, 2]);
    expect(rotatedStops.every((stop) => stop.y === stop.endY && stop.x !== stop.endX)).toBe(true);
  });

  it("renders graphic boxes and circles with declared geometry", async () => {
    const document = parseDocument(
      "^XA^FO10,10^GB30,20,3,B,4^FS^FO60,10^GC20,2,B^FS^XZ"
    );
    const [result] = await renderDocument(document, { width: 100, height: 50 });
    expect(result.diagnostics).toEqual([]);
    expect(result.highlightRegions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "box",
          x: 10,
          y: 10,
          width: 30,
          height: 20,
        }),
        expect.objectContaining({
          type: "circle",
          x: 70,
          y: 20,
          radius: 10,
        }),
      ])
    );
    expect(countDarkPixels(result.canvas)).toBeGreaterThan(0);
  });

  it("does not mutate input and produces identical repeated renders", async () => {
    const document = parseDocument("^XA^FO10,10^FDHello^FS^XZ");
    const snapshot = JSON.stringify(document);
    const [first] = await renderDocument(document, { width: 120, height: 50 });
    const [second] = await renderDocument(document, { width: 120, height: 50 });
    expect(JSON.stringify(document)).toBe(snapshot);
    expect(await first.canvas.toBuffer("png")).toEqual(
      await second.canvas.toBuffer("png")
    );
  });

  it("reports rotated text geometry and multiline field-block geometry", async () => {
    const document = parseDocument(
      "^XA^CF0,10,5^FO0,0^A0R,10,5^FB25,3,0,L^FDAA\\&BB^FS^XZ"
    );
    const [result] = await renderDocument(document, { width: 80, height: 80 });
    const text = result.highlightRegions.find((region) => region.type === "text");
    expect(text?.width).toBe(20);
    expect(text?.height).toBe(25);
  });

  it("reports the rendered position of right-anchored text", async () => {
    const result = await renderZpl(
      "^XA^PW100^LL40^FO80,5,1^A0N,10,5^FDABC^FS^XZ"
    );
    const text = result.labels[0].highlightRegions.find(
      (region) => region.type === "text"
    );
    expect(text).toBeDefined();
    expect((text?.x ?? 0) + (text?.width ?? 0)).toBe(80);
    expect(text?.y).toBe(5);
  });

  it("uses the BY ratio for Code 39", async () => {
    const document = parseDocument(
      "^XA^FO0,0^BY2,2,30^B3N,N,30,N,N^FD123^FS^FO0,50^BY2,3,30^B3N,N,30,N,N^FD123^FS^XZ"
    );
    const [result] = await renderDocument(document, { width: 300, height: 120 });
    const barcodes = result.highlightRegions.filter(
      (region) => region.type === "barcode"
    );
    expect(barcodes).toHaveLength(2);
    expect(barcodes[1].width).toBeGreaterThan(barcodes[0].width ?? 0);
  });

  it("renders Code 128 and QR Model 2 without silent errors", async () => {
    const document = parseDocument(
      "^XA^FO0,0^BCN,30,N,N,N,A^FD123456^FS^FO100,0^BQN,2,3,Q,4^FDQA,HELLO^FS^XZ"
    );
    const [result] = await renderDocument(document, { width: 220, height: 100 });
    expect(
      result.diagnostics.filter((diagnostic) => diagnostic.severity === "error")
    ).toEqual([]);
    expect(result.diagnostics.map(({ code }) => code)).not.toContain(
      "PARTIALLY_SUPPORTED_COMMAND"
    );
    expect(
      result.highlightRegions.filter((region) => region.type === "barcode")
    ).toHaveLength(2);
  });

  it("returns a diagnostic and skips invalid barcode data", async () => {
    const document = parseDocument(
      "^XA^FO0,0^B3N,N,30,N,N^FDlowercase^FS^XZ"
    );
    const [result] = await renderDocument(document, { width: 120, height: 60 });
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "INVALID_BARCODE_DATA"
    );
    expect(
      result.highlightRegions.filter((region) => region.type === "barcode")
    ).toHaveLength(0);
  });

  it("honors text width scaling and all four orientations", async () => {
    const document = parseDocument(
      "^XA^FO0,0^A0N,10,5^FDABC^FS" +
        "^FO30,0^A0R,10,5^FDABC^FS" +
        "^FO60,0^A0I,10,5^FDABC^FS" +
        "^FO90,0^A0B,10,5^FDABC^FS^XZ"
    );
    const [result] = await renderDocument(document, { width: 130, height: 40 });
    const text = result.highlightRegions.filter((region) => region.type === "text");
    expect(text.map(({ width, height }) => [width, height])).toEqual([
      [9, 10],
      [10, 9],
      [9, 10],
      [10, 9],
    ]);

    const narrow = parseDocument("^XA^FO0,0^A0N,10,3^FDABC^FS^XZ");
    const wide = parseDocument("^XA^FO0,0^A0N,10,8^FDABC^FS^XZ");
    const [narrowResult] = await renderDocument(narrow, { width: 40, height: 20 });
    const [wideResult] = await renderDocument(wide, { width: 40, height: 20 });
    expect(narrowResult.highlightRegions.at(-1)?.width).toBe(6);
    expect(wideResult.highlightRegions.at(-1)?.width).toBe(13);
  });

  it("applies field-block alignment and line spacing", async () => {
    const renderAligned = async (justification: "L" | "C" | "R") => {
      const document = parseDocument(
        `^XA^FO0,0^A0N,20,10^FB100,2,4,${justification}^FDXX\\&YY^FS^XZ`
      );
      return (await renderDocument(document, { width: 110, height: 60 }))[0];
    };
    const left = await renderAligned("L");
    const center = await renderAligned("C");
    const right = await renderAligned("R");
    expect(darkPixelBounds(left.canvas).minX).toBeLessThan(
      darkPixelBounds(center.canvas).minX
    );
    expect(darkPixelBounds(center.canvas).minX).toBeLessThan(
      darkPixelBounds(right.canvas).minX
    );
    expect(left.highlightRegions.at(-1)).toMatchObject({
      width: 100,
      height: 44,
    });

    const justifiedDocument = parseDocument(
      "^XA^FO0,0^A0N,20,10^FB60,2,0,J^FDAA BB CC DDD EE^FS^XZ"
    );
    const leftDocument = parseDocument(
      "^XA^FO0,0^A0N,20,10^FB60,2,0,L^FDAA BB CC DDD EE^FS^XZ"
    );
    const [justified] = await renderDocument(justifiedDocument, {
      width: 110,
      height: 50,
    });
    const [wrappedLeft] = await renderDocument(leftDocument, {
      width: 110,
      height: 50,
    });
    expect(darkPixelBounds(justified.canvas).maxX).toBeGreaterThan(
      darkPixelBounds(wrappedLeft.canvas).maxX
    );
  });

  it("renders Mod-43 and UCC check digits as their explicit equivalents", async () => {
    const code39Checked = parseDocument(
      "^XA^FO0,0^BY2,2,30^B3N,Y,30,Y,N^FD123^FS^XZ"
    );
    const code39Explicit = parseDocument(
      "^XA^FO0,0^BY2,2,30^B3N,N,30,Y,N^FD1236^FS^XZ"
    );
    const [checked39] = await renderDocument(code39Checked, {
      width: 240,
      height: 80,
    });
    const [explicit39] = await renderDocument(code39Explicit, {
      width: 240,
      height: 80,
    });
    expect(await checked39.canvas.toBuffer("png")).toEqual(
      await explicit39.canvas.toBuffer("png")
    );
    expect(
      checked39.highlightRegions.find((region) => region.type === "barcode")
        ?.width
    ).toBe(156);

    const code128Checked = parseDocument(
      "^XA^FO0,0^BY2,,30^BCN,30,Y,N,Y,N^FD123^FS^XZ"
    );
    const code128Explicit = parseDocument(
      "^XA^FO0,0^BY2,,30^BCN,30,Y,N,N,N^FD1236^FS^XZ"
    );
    const [checked128] = await renderDocument(code128Checked, {
      width: 240,
      height: 80,
    });
    const [explicit128] = await renderDocument(code128Explicit, {
      width: 240,
      height: 80,
    });
    expect(await checked128.canvas.toBuffer("png")).toEqual(
      await explicit128.canvas.toBuffer("png")
    );
  });

  it("supports both barcode interpretation-line positions", async () => {
    const document = parseDocument(
      "^XA^FO0,0^BY2,3,30^B3N,N,30,Y,Y^FD123^FS^XZ"
    );
    const [result] = await renderDocument(document, { width: 200, height: 100 });
    expect(
      result.highlightRegions.find((region) => region.type === "barcode")
    ).toMatchObject({ height: 56 });
  });

  it("uses Code 128 automatic packing only in mode A", async () => {
    const document = parseDocument(
      "^XA^FO0,0^BCN,30,N,N,N,N^FD12345678^FS" +
        "^FO0,40^BCN,30,N,N,N,A^FD12345678^FS^XZ"
    );
    const [result] = await renderDocument(document, { width: 260, height: 80 });
    const barcodes = result.highlightRegions.filter(
      (region) => region.type === "barcode"
    );
    expect(barcodes[1].width).toBeLessThan(barcodes[0].width ?? 0);
  });

  it("honors Code 128 start and subset invocation codes in mode N", async () => {
    const invoked = parseDocument(
      "^XA^FO0,0^BCN,30,Y,N,N,N^FD>;12345678^FS^XZ"
    );
    const automatic = parseDocument(
      "^XA^FO0,0^BCN,30,Y,N,N,A^FD12345678^FS^XZ"
    );
    const [invokedResult] = await renderDocument(invoked, {
      width: 220,
      height: 70,
    });
    const [automaticResult] = await renderDocument(automatic, {
      width: 220,
      height: 70,
    });
    expect(invokedResult.diagnostics).toEqual([]);
    expect(
      invokedResult.highlightRegions.find(
        (region) => region.type === "barcode"
      )?.width
    ).toBe(158);
    expect(await invokedResult.canvas.toBuffer("png")).toEqual(
      await automaticResult.canvas.toBuffer("png")
    );
  });

  it("renders equivalent QR automatic and manual prefixes identically", async () => {
    const automatic = parseDocument(
      "^XA^FO0,0^BQN,2,3,Q,7^FDMA,HELLO^FS^XZ"
    );
    const manual = parseDocument(
      "^XA^FO0,0^BQN,2,3,Q,7^FDMM,AHELLO^FS^XZ"
    );
    const [automaticResult] = await renderDocument(automatic, {
      width: 100,
      height: 100,
    });
    const [manualResult] = await renderDocument(manual, {
      width: 100,
      height: 100,
    });
    expect(await automaticResult.canvas.toBuffer("png")).toEqual(
      await manualResult.canvas.toBuffer("png")
    );
  });

  it("ignores the printer's QR mask parameter and grows versions automatically", async () => {
    const maskOne = parseDocument(
      "^XA^FO0,0^BQN,2,2,Q,1^FDQA,HELLO^FS^XZ"
    );
    const maskSeven = parseDocument(
      "^XA^FO0,0^BQN,2,2,Q,7^FDQA,HELLO^FS^XZ"
    );
    const long = parseDocument(
      `^XA^FO0,0^BQN,2,2,Q,7^FDQA,${"LONG DATA ".repeat(20)}^FS^XZ`
    );
    const [one] = await renderDocument(maskOne, { width: 300, height: 300 });
    const [seven] = await renderDocument(maskSeven, { width: 300, height: 300 });
    const [longResult] = await renderDocument(long, { width: 300, height: 300 });
    expect(await one.canvas.toBuffer("png")).toEqual(
      await seven.canvas.toBuffer("png")
    );
    const shortRegion = seven.highlightRegions.find(
      (region) => region.type === "barcode"
    );
    const longRegion = longResult.highlightRegions.find(
      (region) => region.type === "barcode"
    );
    expect(longRegion?.width).toBeGreaterThan(shortRegion?.width ?? 0);
    expect(shortRegion?.width).toBe(42);
  });

  it("does not mutate a source-preserving document while rendering", async () => {
    const document = parseDocument("^XA^FO1,2^FDX^FS^XZ");
    const snapshot = JSON.stringify(document);
    await renderDocument(document, { width: 40, height: 30 });
    expect(JSON.stringify(document)).toBe(snapshot);
  });
});
