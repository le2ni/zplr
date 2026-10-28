import { describe, expect, it, vi } from "vitest";
import { createRenderSession, renderZpl } from "@/index.node";
import * as opentype from "opentype.js";
import { parseDocument } from "./documentParser";
import { interpretLabel } from "./interpreter";
import { serializeMasked } from "./serialization";
import { textClusters } from "./textClusters";
import { getDot } from "./raster";

const label = (fields: string) => `^XA^CI28^PW240^LL180${fields}^XZ`;

async function expectSameRaster(actual: string, expected: string) {
  const [rendered, reference] = await Promise.all([
    renderZpl(label(actual)), renderZpl(label(expected)),
  ]);
  expect(rendered.labels[0].raster.data).toEqual(reference.labels[0].raster.data);
  return rendered.labels[0];
}

describe("documented rendering gaps", () => {
  it("keeps combining clusters atomic with UTF-16 source offsets", () => {
    expect(textClusters("a\u0301👩‍💻B")).toEqual([
      { character: "a\u0301", start: 0, end: 2 },
      { character: "👩‍💻", start: 2, end: 7 },
      { character: "B", start: 7, end: 8 },
    ]);
    expect(serializeMasked("09a\u0301", "dd%", "1%", 1)).toBe("10a\u0301");
    expect(serializeMasked("09👩‍💻", "dd%", "1%", 1)).toBe("10👩‍💻");
    expect(serializeMasked("\u2067A0\u200f9\u2069\n", "Add", "1", 1))
      .toBe("\u2067A1\u200f0\u2069\n");
    expect(serializeMasked("BL00-9", "AAdd%d", "1%1", 1)).toBe("BL02-0");
    expect(serializeMasked("00i", "nnN", "1", 1)).toBe("00i");
    expect(serializeMasked("09Z", "nnA", "B", 1)).toBe("0aA");
  });

  it("falls back to code points when native segmentation is unavailable", async () => {
    const source = label("^FO10,10^A0N,20,15^FDFallback^FS");
    const reference = await renderZpl(source);
    expect(reference.labels[0].raster.data.some(Boolean)).toBe(true);
    const descriptor = Object.getOwnPropertyDescriptor(Intl, "Segmenter")!;
    Object.defineProperty(Intl, "Segmenter", { ...descriptor, value: undefined });
    try {
      expect(textClusters("a\u0301😀B")).toEqual([
        { character: "a", start: 0, end: 1 },
        { character: "\u0301", start: 1, end: 2 },
        { character: "😀", start: 2, end: 4 },
        { character: "B", start: 4, end: 5 },
      ]);
      expect(serializeMasked("09😀", "dd%", "1%", 1)).toBe("10😀");
      const rendered = await renderZpl(source);
      expect(rendered.labels[0].raster.data).toEqual(reference.labels[0].raster.data);
    } finally {
      Object.defineProperty(Intl, "Segmenter", descriptor);
    }
  });

  it("serializes decoded ^FH bytes and preserves combining clusters", async () => {
    for (const [source, mask, next] of [
      ["_30_39", "dd,1", "10"],
      ["09a_CC_81", "dd%,1%", "10a\u0301"],
      ["_E2_81_A7_30_39_E2_81_A9", "dd,1", "\u206710\u2069"],
    ]) {
      const job = await renderZpl(label(`^FO10,10^A0N,20,15^FH^FD${source}^SF${mask}^FS^PQ2`));
      const expected = await renderZpl(label(`^FO10,10^A0N,20,15^FD${next}^FS`));
      expect(job.labels).toHaveLength(2);
      expect(job.labels[1].raster.data).toEqual(expected.labels[0].raster.data);
    }
  });

  it.each(["H", "V", "R"])("keeps accents attached in ^FP%s layout", async (direction) => {
    const result = await expectSameRaster(
      `^FO80,20^A0N,22,15^FP${direction},3^FDa\u0301B^FS`,
      `^FO80,20^A0N,22,15^FP${direction},3^FDáB^FS`
    );
    const region = result.highlightRegions.find((entry) => entry.type === "text");
    expect(region?.textCaretStops?.map(({ offset }) => offset).sort()).toEqual([0, 2, 3]);
  });

  it("wraps complete combining clusters", async () => {
    await expectSameRaster(
      "^FO10,10^A0N,22,15^TBN,15,80^FDa\u0301a\u0301a\u0301^FS",
      "^FO10,10^A0N,22,15^TBN,15,80^FDááá^FS"
    );
  });

  it("uses the selected font's default glyph only when ^PA enables it", async () => {
    const api = (opentype as typeof opentype & { default?: typeof opentype }).default ?? opentype;
    const path = new api.Path();
    path.moveTo(0, 0); path.lineTo(400, 0); path.lineTo(400, 600); path.lineTo(0, 600); path.close();
    const bytes = new api.Font({ familyName: "Test", styleName: "Regular",
      unitsPerEm: 1000, ascender: 800, descender: -200, glyphs: [
        new api.Glyph({ name: ".notdef", advanceWidth: 500, path }),
        new api.Glyph({ name: "space", unicode: 32, advanceWidth: 500, path: new api.Path() }),
      ] }).toArrayBuffer();
    for (const font of ["^A@N,24,18,R:TEST.OTF", "^CWZ,R:TEST.OTF^AZN,24,18"]) {
      const options = { fontProvider: { resolveFont: () => bytes } };
      const hidden = await renderZpl(label(`^PA0^FO20,20${font}^FD🦄^FS`), options);
      const shown = await renderZpl(label(`^PA1^FO20,20${font}^FD🦄^FS`), options);
      expect(hidden.labels[0].raster.data.some(Boolean)).toBe(false);
      expect(shown.labels[0].raster.data.some(Boolean)).toBe(true);
      expect(shown.diagnostics.some(({ code }) => code === "FONT_SUBSTITUTED")).toBe(false);
    }
  });

  it("uses ^FT baselines and continuation independently for each coordinate", async () => {
    const source = "^LH10,5^FT20,30^AAN,9,5^FDAB^FS^FT^AAN,9,5^FDC^FS" +
      "^FT,50^AAN,9,5^FDD^FS^FT80,^AAN,9,5^FDE^FS";
    const layout = interpretLabel(parseDocument(label(source)).labels[0]);
    expect(layout.fields[1]).toMatchObject({ typeset: true, continueX: true, continueY: true });
    const rendered = await expectSameRaster(source,
      "^FO30,28^AAN,9,5^FDAB^FS^FO42,28^AAN,9,5^FDC^FS" +
      "^FO48,48^AAN,9,5^FDD^FS^FO90,48^AAN,9,5^FDE^FS");
    expect(rendered.highlightRegions.filter(({ type }) => type === "origin").map(({ x, y }) => [x, y]))
      .toEqual([[30, 35], [42, 35], [48, 55], [90, 55]]);
  });

  it.each([
    ["N", 50, 43, 62, 50], ["R", 48, 50, 50, 62],
    ["I", 38, 48, 38, 50], ["B", 43, 38, 50, 38],
  ] as const)("rotates ^FT baselines and continuation in %s orientation", async (rotation, x, y, nextX, nextY) => {
    await expectSameRaster(
      `^FT50,50^AA${rotation},9,5^FDAB^FS`,
      `^FO${x},${y}^AA${rotation},9,5^FDAB^FS`
    );
    await expectSameRaster(
      `^FT50,50^AA${rotation},9,5^FDAB^FS^FT^AA${rotation},9,5^FDC^FS`,
      `^FT50,50^AA${rotation},9,5^FDAB^FS^FT${nextX},${nextY}^AA${rotation},9,5^FDC^FS`
    );
  });

  it("anchors ^FT blocks to their last possible baseline without clamping", async () => {
    await expectSameRaster("^FT20,50^AAN,9,5^FB60,3,2^FDAB^FS",
      "^FO20,21^AAN,9,5^FB60,3,2^FDAB^FS");
    const clipped = await renderZpl(label("^FT20,3^AAN,9,5^FDAB^FS"));
    expect(clipped.labels[0].highlightRegions.find(({ type }) => type === "text"))
      .toMatchObject({ x: 20, y: -4 });
  });

  it("anchors ^FT graphics, images, and barcodes at their base", async () => {
    await expectSameRaster("^FT60,40,1^GB20,10,2^FS", "^FO40,30^GB20,10,2^FS");
    await expectSameRaster("^FT60,40,1^GFA,2,2,1,8040^FS", "^FO52,38^GFA,2,2,1,8040^FS");
    await expectSameRaster("^FT20,60^BY1^BCN,25,N,N^FD1234^FS",
      "^FO20,35^BY1^BCN,25,N,N^FD1234^FS");
  });

  it("inherits ^FW justification across fields and session calls", async () => {
    const session = createRenderSession();
    await session.render("^FWN,1");
    const result = await session.render(label("^FT60,40^GB20,10,2^FS"));
    const expected = await renderZpl(label("^FO40,30^GB20,10,2^FS"));
    expect(result.labels[0].raster.data).toEqual(expected.labels[0].raster.data);
    expect(getDot(result.labels[0].raster, 40, 30)).toBe(true);
  });

  it("consumes the complete documented ^TB literal-angle escape", async () => {
    await expectSameRaster("^FO10,10^AAN,9,5^TBN,80,20^FDA<< >B^FS",
      "^FO10,10^AAN,9,5^TBN,80,20^FDA<<B^FS");
  });

  it("doubles every rendered dot with ^JMB, including text and barcode modules", async () => {
    const content = "^FO2,3^GB6,5,1^FS^FO20,3^AAN,9,5^FDAB^FS" +
      "^FO2,20^BY1^BCN,20,N,N^FD1234^FS^FO70,5^GFA,2,2,1,8040^FS";
    const normal = (await renderZpl(`^XA^PW100^LL50^JMA${content}^XZ`)).labels[0];
    const doubled = (await renderZpl(`^XA^PW100^LL50^JMB${content}^XZ`)).labels[0];
    expect(doubled).toMatchObject({ width: 200, height: 100, printDensity: 8 });
    for (let y = 0; y < 100; y++) for (let x = 0; x < 200; x++) {
      expect(getDot(doubled.raster, x, y)).toBe(getDot(normal.raster, Math.floor(x / 2), Math.floor(y / 2)));
    }
    expect(doubled.highlightRegions.find(({ type }) => type === "text"))
      .toMatchObject({ x: 40, y: 6, width: 24, height: 18 });
  });

  it("persists ^JM, restores full density, and keeps physical measurement units", async () => {
    const session = createRenderSession();
    await session.render("^JMB");
    expect((await session.render("^XA^PW10^LL10^XZ")).labels[0].width).toBe(20);
    await session.render("^JMZ");
    expect((await session.render("^XA^PW10^LL10^XZ")).labels[0].width).toBe(20);
    await session.render("^JMA");
    expect((await session.render("^XA^PW10^LL10^XZ")).labels[0].width).toBe(10);
    const physical = await renderZpl("^XA^JMB^MUM^PW10^LL10^FO1,1^GB1,1,1^FS^XZ");
    expect(physical.labels[0]).toMatchObject({ width: 80, height: 80 });
    expect(getDot(physical.labels[0].raster, 8, 8)).toBe(true);
    const clipped = await renderZpl("^XA^JMB^PW10^LL10^FO1,1^GB1,1,1^FS^XZ", { width: 3, height: 3 });
    expect(getDot(clipped.labels[0].raster, 2, 2)).toBe(true);
  });

  it("preserves retained dots and XOR composition across ^JM changes", async () => {
    const session = createRenderSession();
    await session.render("^XA^PW10^LL10^MCN^FO3,3^GB1,1,1^FS^XZ");
    const result = await session.render("^XA^JMB^PW5^LL5^FO1,1^FR^GB1,1,1^FS^XZ");
    const raster = result.labels[0].raster;
    expect(getDot(raster, 2, 2)).toBe(true);
    expect(getDot(raster, 3, 2)).toBe(true);
    expect(getDot(raster, 2, 3)).toBe(true);
    expect(getDot(raster, 3, 3)).toBe(false);
  });

  it("formats localized clock text through the existing runtime API", async () => {
    const formatter = vi.spyOn(Intl, "DateTimeFormat").mockImplementation(function (_locale, options) {
      return {
        format: () => options?.weekday === "short" ? "Day" : options?.weekday === "long"
          ? "Weekday" : options?.month === "short" ? "Mon" : "Month",
      } as Intl.DateTimeFormat;
    });
    try {
      const rendered = await renderZpl(label("^KL4^FO10,10^AAN,9,5^FC%^FD%a %A %b %B^FS"),
        { clock: new Date("2026-10-03T12:00:00Z") });
      const expected = await renderZpl(label("^FO10,10^AAN,9,5^FDDay Weekday Mon Month^FS"));
      expect(rendered.labels[0].raster.data).toEqual(expected.labels[0].raster.data);
      expect(formatter).toHaveBeenCalledTimes(4);
      expect(formatter).toHaveBeenCalledWith("de", { weekday: "short", timeZone: "UTC" });
    } finally {
      formatter.mockRestore();
    }
  });
});
