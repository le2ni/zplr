import { describe, expect, it } from "vitest";
import { zlibSync } from "fflate";
import { createRenderSession, renderZpl } from "@/index.node";
import { notoSansCondensedTtf } from "@/assets/notoSansCondensed.generated";
import type { MonochromeRaster } from "@/types/RenderJob";
import { getDot } from "./raster";
import { interpretLabel } from "./interpreter";
import { parseDocument } from "./documentParser";
import { shapeAndOrderText } from "./rasterRenderer";

function bounds(raster: MonochromeRaster) {
  let minX = raster.width;
  let minY = raster.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < raster.height; y++) {
    for (let x = 0; x < raster.width; x++) {
      if (!getDot(raster, x, y)) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return { minX, minY, maxX, maxY };
}

function binaryString(bytes: Uint8Array): string {
  let result = "";
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    result += String.fromCharCode(...bytes.slice(offset, offset + 8192));
  }
  return result;
}

function hex(bytes: Uint8Array): string {
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function oneDotBmp(): Uint8Array {
  const data = new Uint8Array(66);
  const view = new DataView(data.buffer);
  data.set([0x42, 0x4d]);
  view.setUint32(2, data.length, true);
  view.setUint32(10, 62, true);
  view.setUint32(14, 40, true);
  view.setInt32(18, 1, true);
  view.setInt32(22, 1, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 1, true);
  view.setUint32(34, 4, true);
  view.setUint32(46, 2, true);
  data.set([0, 0, 0, 0, 255, 255, 255, 0], 54);
  return data;
}

function oneDotPcx(): Uint8Array {
  const header = new Uint8Array(128);
  header.set([0x0a, 5, 1, 8]);
  const view = new DataView(header.buffer);
  view.setUint16(12, 72, true);
  view.setUint16(14, 72, true);
  header[65] = 1;
  view.setUint16(66, 2, true);
  view.setUint16(68, 1, true);
  const palette = new Uint8Array(769);
  palette[0] = 0x0c;
  palette.fill(255, 4);
  const output = new Uint8Array(header.length + 2 + palette.length);
  output.set(header);
  output.set([0, 0], header.length);
  output.set(palette, header.length + 2);
  return output;
}

describe("additional rendering commands", () => {
  it("renders all resident font identifiers without fallback diagnostics", async () => {
    const keys = [
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
      "H",
      "P",
      "Q",
      "R",
      "S",
      "T",
      "U",
      "V",
    ];
    for (const key of keys) {
      const result = await renderZpl(
        `^XA^PW100^LL100^FO0,0^A${key}N^FDABC123^FS^XZ`,
        { printDensity: 8 }
      );
      expect(result.labels[0].raster.data.some((byte) => byte !== 0)).toBe(true);
      expect(result.diagnostics.map(({ code }) => code)).not.toContain(
        "FONT_SUBSTITUTED"
      );
    }

    const lowercaseOnly = await renderZpl(
      "^XA^PW100^LL30^FO0,0^ABN^FDabc^FS^XZ"
    );
    expect(lowercaseOnly.labels[0].raster.data.every((byte) => byte === 0)).toBe(
      true
    );
  });

  it("renders every ^GS printer symbol without unsupported diagnostics", async () => {
    const result = await renderZpl(
      "^XA^PW500^LL100" +
        ["A", "B", "C", "D", "E"]
          .map((code, index) => `^FO${index * 90},10^GSN,60,60^FD${code}^FS`)
          .join("") +
        "^XZ"
    );
    expect(result.diagnostics.map(({ code }) => code)).not.toContain(
      "UNSUPPORTED_COMMAND"
    );
    expect(result.labels[0].raster.data.some((byte) => byte !== 0)).toBe(true);
  });

  it("concatenates complete and sliced ^FN fields with ^FE", async () => {
    const expanded = await renderZpl(
      "^XA^PW300^LL50^FO0,70^FN2^FDField FN 2 Data^FS" +
        "^FO0,70^FN3^FDField FN 3 Data^FS" +
        "^FO0,20^A0N,20,10^FE#^FD#2# / #3,b,1,4#^FS^XZ"
    );
    const direct = await renderZpl(
      "^XA^PW300^LL50^FO0,20^A0N,20,10^FDField FN 2 Data / Data^FS^XZ"
    );
    expect(expanded.labels[0].raster.data).toEqual(direct.labels[0].raster.data);
  });

  it("applies ^FP gap, reverse flow, and ^TB height clipping", async () => {
    const normal = await renderZpl(
      "^XA^PW160^LL80^FO80,0^AAN,18,10^FPH,0^FDABC^FS^XZ"
    );
    const spaced = await renderZpl(
      "^XA^PW160^LL80^FO80,0^AAN,18,10^FPH,7^FDABC^FS^XZ"
    );
    expect(bounds(spaced.labels[0].raster).maxX).toBeGreaterThan(
      bounds(normal.labels[0].raster).maxX
    );

    const reversed = await renderZpl(
      "^XA^PW160^LL80^FO80,0^AAN,18,10^FPR,0^FDABC^FS^XZ"
    );
    expect(bounds(reversed.labels[0].raster).maxX).toBeLessThan(80);

    const block = await renderZpl(
      "^XA^PW80^LL80^FO0,0^AAN,9,5^TBN,25,9" +
        "^FDone two three four five^FS^XZ"
    );
    expect(bounds(block.labels[0].raster).maxY).toBeLessThan(9);
  });

  it("converts millimetres and source dpi with persistent ^MU", async () => {
    const metric = await renderZpl(
      "^XA^MUM^PW20^LL10^FO2,3^GB2,2,1^FS^XZ",
      { printDensity: 8 }
    );
    expect(metric.labels[0]).toMatchObject({ width: 160, height: 80 });
    expect(getDot(metric.labels[0].raster, 16, 24)).toBe(true);

    const session = createRenderSession({ printDensity: 12 });
    await session.render("^XA^MUD,150,300^XZ");
    const converted = await session.render("^XA^PW20^LL10^FO1,1^GB1,1,1^FS^XZ");
    expect(converted.labels[0]).toMatchObject({ width: 40, height: 20 });
    expect(getDot(converted.labels[0].raster, 2, 2)).toBe(true);
  });

  it("loads and moves session images with ^IL and ^IM", async () => {
    const session = createRenderSession();
    await session.render("~DGR:DOT.GRF,1,1,80");

    const moved = await session.render(
      "^XA^PW10^LL10^FO4,5^IMR:DOT.GRF^FS^XZ"
    );
    expect(getDot(moved.labels[0].raster, 4, 5)).toBe(true);

    const loaded = await session.render("^XA^PW10^LL10^ILR:DOT.GRF^XZ");
    expect(getDot(loaded.labels[0].raster, 0, 0)).toBe(true);
  });

  it("saves images, transfers objects, and erases downloaded graphics", async () => {
    const session = createRenderSession();
    const saved = await session.render(
      "^XA^PW10^LL10^FO2,3^GB2,2,1^FS^ISR:SAVED.GRF,N^XZ"
    );
    expect(saved.labels).toHaveLength(0);

    await session.render("^TOR:SAVED.GRF,E:COPY.GRF");
    const copied = await session.render(
      "^XA^PW10^LL10^FO0,0^IME:COPY.GRF^FS^XZ"
    );
    expect(getDot(copied.labels[0].raster, 2, 3)).toBe(true);

    await session.render("~EG");
    const erased = await session.render(
      "^XA^PW10^LL10^FO0,0^IME:COPY.GRF^FS^XZ"
    );
    expect(erased.diagnostics.map(({ code }) => code)).toContain(
      "MISSING_GRAPHIC_RESOURCE"
    );
  });

  it("retains and clears the printer bitmap with ^MC", async () => {
    const session = createRenderSession();
    await session.render("^XA^PW12^LL12^MCN^FO1,1^GB2,2,1^FS^XZ");

    const overlaid = await session.render(
      "^XA^PW12^LL12^FO6,6^GB2,2,1^FS^XZ"
    );
    expect(getDot(overlaid.labels[0].raster, 1, 1)).toBe(true);
    expect(getDot(overlaid.labels[0].raster, 6, 6)).toBe(true);

    await session.render("^XA^PW12^LL12^MCY^XZ");
    const cleared = await session.render("^XA^PW12^LL12^XZ");
    expect(cleared.labels[0].raster.data.every((byte) => byte === 0)).toBe(true);
  });

  it("expands ^PQ batches with ^SN replication and ^SF mixed-radix masks", async () => {
    const serial = await renderZpl(
      "^XA^PW140^LL30^FO0,0^A0N,20,10^SN0007,2,Y^FS^PQ4,0,2^XZ"
    );
    expect(serial.labels).toHaveLength(4);
    for (const [index, value] of ["0007", "0007", "0009", "0009"].entries()) {
      const expected = await renderZpl(
        `^XA^PW140^LL30^FO0,0^A0N,20,10^FD${value}^FS^XZ`
      );
      expect(serial.labels[index].raster.data).toEqual(
        expected.labels[0].raster.data
      );
    }

    const masked = await renderZpl(
      "^XA^PW140^LL30^FO0,0^A0N,20,10" +
        "^FDBL0000^SFAAdddd,1^FS^PQ3^XZ"
    );
    for (const [index, value] of ["BL0000", "BL0001", "BL0002"].entries()) {
      const expected = await renderZpl(
        `^XA^PW140^LL30^FO0,0^A0N,20,10^FD${value}^FS^XZ`
      );
      expect(masked.labels[index].raster.data).toEqual(
        expected.labels[0].raster.data
      );
    }
  });

  it("formats deterministic primary and offset RTC fields with ^FC", async () => {
    const clock = new Date(2026, 6, 20, 14, 5, 6);
    const clocked = await renderZpl(
      "^XA^PW360^LL35^SO2,0,0,0,1,0,0^SO3,0,0,0,2,0,0" +
        "^FO0,0^A0N,20,10^FC%,{,#" +
        "^FD%Y-%m-%d %H:%M:%S {H #H^FS^XZ",
      { clock }
    );
    const expected = await renderZpl(
      "^XA^PW360^LL35^FO0,0^A0N,20,10" +
        "^FD2026-07-20 14:05:06 15 16^FS^XZ"
    );
    expect(clocked.labels[0].raster.data).toEqual(expected.labels[0].raster.data);
  });

  it("persists ^ST clock state and enforces the batch allocation limit", async () => {
    const session = createRenderSession();
    await session.render("^XA^ST07,20,2026,02,05,06,P^XZ");
    const clocked = await session.render(
      "^XA^PW120^LL30^FO0,0^A0N,20,10^FC%^FD%H:%M:%S^FS^XZ"
    );
    const expected = await renderZpl(
      "^XA^PW120^LL30^FO0,0^A0N,20,10^FD14:05:06^FS^XZ"
    );
    expect(clocked.labels[0].raster.data).toEqual(expected.labels[0].raster.data);

    const limited = await renderZpl("^XA^PW1^LL1^PQ5^XZ", {
      limits: { maxLabels: 2 },
    });
    expect(limited.labels).toHaveLength(2);
    expect(limited.diagnostics.map(({ code }) => code)).toContain(
      "LABEL_QUANTITY_LIMIT_EXCEEDED"
    );
  });

  it("honors ^CM memory aliases for subsequent resource commands", async () => {
    const session = createRenderSession();
    await session.render("^XA^CME,B,R,A^XZ");
    await session.render("~DGB:DOT.GRF,1,1,80");
    const result = await session.render(
      "^XA^PW5^LL5^FO1,1^XGB:DOT.GRF,1,1^FS^XZ"
    );
    expect(getDot(result.labels[0].raster, 1, 1)).toBe(true);
  });

  it("downloads and renders ~DB bitmap fonts through ^CW", async () => {
    const result = await renderZpl(
      "~DBR:TINY.FNT,N,5,8,5,4,1,TEST," +
        "#0041.5.8.0.5.8.FF818181FF" +
        "^CWZ,R:TINY.FNT" +
        "^XA^PW30^LL20^FO1,1^AZN,10,8^FDA^FS^XZ"
    );
    expect(result.diagnostics.map(({ code }) => code)).not.toContain(
      "FONT_SUBSTITUTED"
    );
    expect(getDot(result.labels[0].raster, 1, 1)).toBe(true);
    expect(getDot(result.labels[0].raster, 8, 10)).toBe(true);
  });

  it("applies downloaded ~DE translation tables selected with ^SE", async () => {
    const mapped = await renderZpl(
      "~DER:MAP.DAT,4,00410042" +
        "^XA^PW40^LL20^SER:MAP.DAT^FO0,0^AAN,9,5^FDB^FS^XZ"
    );
    const expected = await renderZpl(
      "^XA^PW40^LL20^FO0,0^AAN,9,5^FDA^FS^XZ"
    );
    expect(mapped.labels[0].raster.data).toEqual(expected.labels[0].raster.data);
  });

  it("decodes ^CI code pages, UTF-16, Shift-JIS, and remapping pairs", async () => {
    const cases = [
      ["^CI29^FH_^FD_00_41", "A"],
      ["^CI30^FH_^FD_41_00", "A"],
      ["^CI31^FH_^FD_A5", "Ą"],
      ["^CI15^FH_^FD_82_A0", "あ"],
      ["^CI12^FH_^FD_5C", "¥"],
      ["^CI0,65,66^FDB", "A"],
      ["^CI0,21,36^FD$", "€"],
    ] as const;
    for (const [encoded, expectedText] of cases) {
      const actual = await renderZpl(
        `^XA^PW80^LL30^FO0,0^A0N,20,12${encoded}^FS^XZ`
      );
      const expected = await renderZpl(
        `^XA^PW80^LL30^FO0,0^A0N,20,12^CI28^FD${expectedText}^FS^XZ`
      );
      expect(actual.labels[0].raster.data, encoded).toEqual(
        expected.labels[0].raster.data
      );
      expect(actual.diagnostics.map(({ code }) => code), encoded).not.toContain(
        "UNSUPPORTED_CHARACTER_SET"
      );
    }
  });

  it("downloads binary GRF, ASCII PNG, and TrueType ~DY objects", async () => {
    const png =
      "89504E470D0A1A0A0000000D49484452000000010000000108000000003A7E9B55" +
      "0000000A49444154789C6360000000020001E221BC330000000049454E44AE426082";
    const font = notoSansCondensedTtf();
    const source =
      `~DYR:DOT.GRF,B,G,1,1,${String.fromCharCode(0x80)}` +
      `~DYR:ONE.PNG,A,P,67,,${png}` +
      `~DYR:DOWN.TTF,B,T,${font.length},,${binaryString(font)}` +
      "^CWZ,R:DOWN.TTF" +
      "^XA^PW80^LL30^FO1,1^IMR:DOT.GRF^FS" +
      "^FO3,1^IMR:ONE.PNG^FS^FO5,1^AZN,20,10^FDA^FS^XZ";
    const result = await renderZpl(source);
    expect(result.labels).toHaveLength(1);
    expect(getDot(result.labels[0].raster, 1, 1)).toBe(true);
    expect(getDot(result.labels[0].raster, 3, 1)).toBe(true);
    expect(result.diagnostics.map(({ code }) => code)).not.toContain(
      "FONT_SUBSTITUTED"
    );
  });

  it("renders raw and compressed binary ^GF streams containing command bytes", async () => {
    const source = Uint8Array.from([0x80, 0x5e, 0x7e, 0x2c]);
    const compressed = zlibSync(source);
    const result = await renderZpl(
      `^XA^PW20^LL10^FO1,1^GFB,4,4,1,${binaryString(source)}^FS` +
        `^FO10,1^GFC,${compressed.length},4,1,${binaryString(compressed)}^FS^XZ`
    );
    expect(getDot(result.labels[0].raster, 1, 1)).toBe(true);
    expect(getDot(result.labels[0].raster, 10, 1)).toBe(true);
    expect(result.diagnostics.map(({ code }) => code)).not.toEqual(
      expect.arrayContaining(["UNKNOWN_COMMAND", "INVALID_COMMAND"])
    );
  });

  it("decodes BMP and PCX ~DY graphics for ^IM recall", async () => {
    const bmp = oneDotBmp();
    const pcx = oneDotPcx();
    const result = await renderZpl(
      `~DYR:DOT.BMP,A,B,${bmp.length},,${hex(bmp)}` +
        `~DYR:DOT.PCX,A,X,${pcx.length},,${hex(pcx)}` +
        "^XA^PW8^LL4^FO1,1^IMR:DOT.BMP^FS^FO4,1^IMR:DOT.PCX^FS^XZ"
    );
    expect(getDot(result.labels[0].raster, 1, 1)).toBe(true);
    expect(getDot(result.labels[0].raster, 4, 1)).toBe(true);
  });

  it("implements persistent ^CV validation banners and unchecked filtering", async () => {
    const result = await renderZpl(
      "^XA^PW448^LL160^CVN^FO10,10^B2N,70,N,N,N^FD12A456^FS" +
        "^CVY^FO220,10^B2N,70,N,N,N^FD12A456^FS^XZ"
    );
    const barcodes = result.labels[0].highlightRegions.filter(
      ({ type }) => type === "barcode"
    );
    expect(barcodes).toHaveLength(2);
    expect(barcodes[1]).toMatchObject({ width: 156, height: 30 });
    expect(result.diagnostics.map(({ code }) => code)).toContain(
      "INVALID_BARCODE_DATA"
    );
  });

  it("extends ^MNV variable-length media through the last printed dot", async () => {
    const direct = await renderZpl(
      "^XA^PW20^LL10^MNV^FO1,15^GB2,3,1^FS^XZ"
    );
    expect(direct.labels[0].height).toBe(18);
    expect(getDot(direct.labels[0].raster, 1, 17)).toBe(true);

    const capped = await renderZpl(
      "^XA^PW20^LL10^ML16^MNV^FO1,15^GB2,3,1^FS^XZ"
    );
    expect(capped.labels[0].height).toBe(16);

    const session = createRenderSession();
    const setup = await session.render("^MNV^ML30");
    expect(setup.labels).toHaveLength(0);
    const inherited = await session.render(
      "^XA^PW20^LL10^FO1,20^GB2,4,1^FS^XZ"
    );
    expect(inherited.labels[0].height).toBe(24);
  });

  it("falls through ^FL linked bitmap fonts for missing glyphs", async () => {
    const result = await renderZpl(
      "~DBR:BASE.FNT,N,5,8,5,4,1,TEST," +
        "#0041.5.8.0.5.8.FF818181FF" +
        "~DBR:EXT.FNT,N,5,8,5,4,1,TEST," +
        "#0042.5.8.0.5.8.FE8181FE80" +
        "^FLR:EXT.FNT,R:BASE.FNT,1^CWZ,R:BASE.FNT" +
        "^XA^PW40^LL20^FO1,1^AZN,10,8^FDAB^FS^XZ"
    );
    expect(result.diagnostics.map(({ code }) => code)).not.toContain(
      "FONT_SUBSTITUTED"
    );
    expect(bounds(result.labels[0].raster).maxX).toBeGreaterThanOrEqual(12);
  });

  it("segments ^FM PDF417 data across declared printer origins", () => {
    const data = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".repeat(4);
    const document = parseDocument(
      `^XA^FM10,20,150,20,290,20^B7N,2,0,5,10,N^FD${data}^FS^XZ`
    );
    const layout = interpretLabel(document.labels[0]);
    const barcodes = layout.fields.filter((field) => field.kind === "barcode");
    expect(barcodes).toHaveLength(3);
    expect(barcodes.map(({ x, y }) => [x, y])).toEqual([
      [10, 20],
      [150, 20],
      [290, 20],
    ]);
    expect(layout.diagnostics.map(({ code }) => code)).not.toContain(
      "STRUCTURED_APPEND_METADATA_APPROXIMATED"
    );
  });

  it("applies ^PA Arabic shaping and bidirectional ordering", () => {
    expect(
      shapeAndOrderText("אבג", { bidirectional: true })
    ).toBe("גבא");
    expect(
      [...shapeAndOrderText("بب", { shaping: true, bidirectional: true })].map(
        (character) => character.codePointAt(0)
      )
    ).toEqual([0xfe90, 0xfe91]);
  });
});
