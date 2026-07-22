import { describe, expect, it } from "vitest";
import {
  createRenderSession,
  renderZpl,
} from "@/index.node";
import { notoSansCondensedTtf } from "@/assets/notoSansCondensed.generated";
import type { DownloadedFontSource } from "@/types/RenderJob";
import { getDot } from "./raster";

describe("modern render jobs", () => {
  it("resolves dimensions from options, source commands, and the 4x6 fallback", async () => {
    const sourceSized = await renderZpl("^XA^PW31^LL17^FO0,0^GB1,1,1^FS^XZ");
    expect(sourceSized.labels[0]).toMatchObject({ width: 31, height: 17 });
    expect(sourceSized.labels[0].diagnostics.map(({ code }) => code)).not.toContain(
      "FALLBACK_LABEL_WIDTH"
    );

    const overridden = await renderZpl("^XA^PW31^LL17^XZ", {
      width: 12,
      height: 13,
      printDensity: 12,
    });
    expect(overridden.labels[0]).toMatchObject({
      width: 12,
      height: 13,
      printDensity: 12,
    });

    const fallback = await renderZpl("^XA^XZ");
    expect(fallback.labels[0]).toMatchObject({ width: 813, height: 1219 });
    expect(fallback.labels[0].diagnostics.map(({ code }) => code)).toEqual(
      expect.arrayContaining(["FALLBACK_LABEL_WIDTH", "FALLBACK_LABEL_HEIGHT"])
    );

    const explicitDensity = await renderZpl("^XA^PW1^LL1^XZ", {
      printDensity: 24,
    });
    expect(explicitDensity.labels[0].printDensity).toBe(24);
  });

  it("preserves persistent settings across FIFO-serialized session calls", async () => {
    const session = createRenderSession({ printDensity: 6 });
    const first = session.render("^XA^PW24^LL16^FO1,1^GB2,2,1^FS^XZ");
    const second = session.render("^XA^FO3,3^GB2,2,1^FS^XZ");

    expect((await first).labels[0]).toMatchObject({
      width: 24,
      height: 16,
      printDensity: 6,
    });
    expect((await second).labels[0]).toMatchObject({
      width: 24,
      height: 16,
      printDensity: 6,
    });

    await session.reset();
    const afterReset = await session.render("^XA^XZ", {
      fallbackSize: { width: 7, height: 9, unit: "dots" },
    });
    expect(afterReset.labels[0]).toMatchObject({ width: 7, height: 9 });
  });

  it("uses a late ^LL for the next label but not the current label", async () => {
    const session = createRenderSession();
    const current = await session.render(
      "^XA^PW10^LL10^FO1,1^GB2,2,1^FS^LL20^XZ"
    );
    expect(current.labels[0].height).toBe(10);

    const next = await session.render("^XA^PW10^FO1,15^GB2,2,1^FS^XZ");
    expect(next.labels[0].height).toBe(20);
    expect(getDot(next.labels[0].raster, 1, 15)).toBe(true);
  });

  it("replays updated persistent settings in chronological order", async () => {
    const session = createRenderSession({ height: 1, printDensity: 8 });
    await session.render("^XA^PW20^XZ");
    await session.render("^XA^MUI^XZ");
    await session.render("^XA^PW1^XZ");

    const inherited = await session.render("^XA^XZ");
    expect(inherited.labels[0].width).toBe(203);
  });

  it("retains ^MU conversion when a later command only changes its unit", async () => {
    const session = createRenderSession({ printDensity: 12 });
    await session.render("^XA^MUD,150,300^XZ");
    await session.render("^XA^MUI^XZ");
    await session.render("^XA^MUD^XZ");

    const inherited = await session.render(
      "^XA^PW10^LL5^FO1,1^GB1,1,1^FS^XZ"
    );
    expect(inherited.labels[0]).toMatchObject({ width: 20, height: 10 });
    expect(getDot(inherited.labels[0].raster, 2, 2)).toBe(true);
  });

  it("downloads, recalls, and deletes graphics without host filesystem access", async () => {
    const session = createRenderSession();
    expect((await session.render("~DGR:DOT.GRF,1,1,80")).labels).toHaveLength(0);

    const recalled = await session.render(
      "^XA^PW12^LL8^FO2,3^XGR:DOT.GRF,1,1^FS^XZ"
    );
    expect(getDot(recalled.labels[0].raster, 2, 3)).toBe(true);

    await session.render("^IDR:DOT.GRF");
    const missing = await session.render(
      "^XA^PW12^LL8^FO2,3^XGR:DOT.GRF,1,1^FS^XZ"
    );
    expect(missing.diagnostics.map(({ code }) => code)).toContain(
      "MISSING_GRAPHIC_RESOURCE"
    );

    await session.render("~DGR:A.GRF,1,1,80~DGR:B.GRF,1,1,80");
    await session.render("^ID");
    const deletedByDefaultPattern = await session.render(
      "^XA^PW12^LL8^FO2,3^XGR:A.GRF,1,1^FS^XZ"
    );
    expect(deletedByDefaultPattern.diagnostics.map(({ code }) => code)).toContain(
      "MISSING_GRAPHIC_RESOURCE"
    );
  });

  it("uses UNKNOWN when a downloaded or recalled resource omits its object name", async () => {
    const session = createRenderSession();
    await session.render("~DG,1,1,80");

    const explicit = await session.render(
      "^XA^PW8^LL8^FO2,3^XGR:UNKNOWN.GRF,1,1^FS^XZ"
    );
    expect(getDot(explicit.labels[0].raster, 2, 3)).toBe(true);

    const omitted = await session.render(
      "^XA^PW8^LL8^FO4,5^XG,1,1^FS^XZ"
    );
    expect(getDot(omitted.labels[0].raster, 4, 5)).toBe(true);
    expect(omitted.diagnostics.map(({ code }) => code)).not.toContain(
      "MISSING_GRAPHIC_RESOURCE"
    );
  });

  it("rejects numeric download fields with trailing garbage", async () => {
    const result = await renderZpl("~DGR:BAD.GRF,1x,1,80");
    expect(result.diagnostics.map(({ code }) => code)).toContain(
      "INVALID_GRAPHIC_DIMENSIONS"
    );
  });

  it("ignores incomplete font-link commands without allocating session state", async () => {
    const result = await renderZpl("^XA^FL,,1^XZ", {
      limits: { maxSessionBytes: 1 },
    });
    expect(result.diagnostics.map(({ code }) => code)).not.toContain(
      "SESSION_RESOURCE_LIMIT_EXCEEDED"
    );
  });

  it("does not store downloads in disabled memory devices", async () => {
    const result = await renderZpl(
      "^CMNONE,E,R,A~DGB:DOT.GRF,1,1,80" +
        "^XA^PW8^LL8^XGB:DOT.GRF,1,1^FS^XZ"
    );

    expect(result.diagnostics.map(({ code }) => code)).toContain(
      "MISSING_GRAPHIC_RESOURCE"
    );
    expect(getDot(result.labels[0].raster, 0, 0)).toBe(false);
  });

  it("replaces objects that reuse a printer filename across resource kinds", async () => {
    const session = createRenderSession();
    await session.render("~DGR:SAME.GRF,1,1,80");
    await session.render(
      "^XA^DFR:SAME.GRF^FO1,1^GB2,2,1^FS^XZ"
    );

    const replacedGraphic = await session.render(
      "^XA^PW8^LL8^XGR:SAME.GRF,1,1^FS^XZ"
    );
    expect(replacedGraphic.diagnostics.map(({ code }) => code)).toContain(
      "MISSING_GRAPHIC_RESOURCE"
    );

    await session.render("~DGR:SAME.GRF,1,1,80");
    const replacedFormat = await session.render(
      "^XA^PW8^LL8^XFR:SAME.GRF^XZ"
    );
    expect(replacedFormat.diagnostics.map(({ code }) => code)).toContain(
      "MISSING_STORED_FORMAT"
    );
  });

  it("stores and expands formats across a job and across session calls", async () => {
    const session = createRenderSession();
    const definition =
      "^XA^DFR:CARD.ZPL^FO1,1^GB8,8,1^FS^FO2,2^FN1^FS^XZ";
    const invocation =
      "^XA^PW20^LL12^XFR:CARD.ZPL^FN1^FDOK^FS^XZ";

    const sameJob = await renderZpl(definition + invocation);
    expect(sameJob.labels).toHaveLength(1);
    expect(getDot(sameJob.labels[0].raster, 1, 1)).toBe(true);

    expect((await session.render(definition)).labels).toHaveLength(0);
    const later = await session.render(invocation);
    expect(later.labels).toHaveLength(1);
    expect(getDot(later.labels[0].raster, 1, 1)).toBe(true);
    expect(later.diagnostics.map(({ code }) => code)).not.toContain(
      "MISSING_STORED_FORMAT"
    );

    await session.render("^ID");
    const deleted = await session.render(invocation);
    expect(deleted.diagnostics.map(({ code }) => code)).toContain(
      "MISSING_STORED_FORMAT"
    );
  });

  it("overrides stored ^FN defaults across intervening field commands", async () => {
    const session = createRenderSession();
    await session.render(
      "^XA^DFR:FORM.ZPL^FO1,1^FN1^AAN,9,5^FDDEFAULT^FS^XZ"
    );

    const recalled = await session.render(
      "^XA^PW30^LL14^XFR:FORM.ZPL^FN1^FDB^FS^XZ"
    );
    const expected = await renderZpl(
      "^XA^PW30^LL14^FO1,1^AAN,9,5^FDB^FS^XZ"
    );
    expect(recalled.labels[0].raster.data).toEqual(
      expected.labels[0].raster.data
    );
  });

  it("applies per-render field values to named fields and stored formats", async () => {
    const direct = await renderZpl(
      '^XA^PW80^LL30^FO1,1^A0N,12,8^FN001"Name"^FDDEFAULT^FS^XZ',
      { fieldValues: { "1": "B" } }
    );
    const expected = await renderZpl(
      "^XA^PW80^LL30^FO1,1^A0N,12,8^FDB^FS^XZ"
    );
    expect(direct.labels[0].raster.data).toEqual(expected.labels[0].raster.data);

    const stored = await renderZpl(
      '^XA^DFR:F.ZPL^FO1,1^A0N,12,8^FN1"Name"^FDDEFAULT^FS^XZ' +
        "^XA^PW80^LL30^XFR:F.ZPL^XZ",
      { fieldValues: { "001": "B" } }
    );
    expect(stored.labels[0].raster.data).toEqual(expected.labels[0].raster.data);
  });

  it("keeps option field values opaque and reports invalid keys", async () => {
    const result = await renderZpl(
      "^XA^PW100^LL30^FO1,1^A0N,12,8^FN1^FS^XZ",
      { fieldValues: { "1": "VALUE^XZ~JA", nope: "ignored" } }
    );
    expect(result.labels).toHaveLength(1);
    expect(result.labels[0].raster.data.some((byte) => byte !== 0)).toBe(true);
    expect(result.diagnostics.map(({ code }) => code)).toContain(
      "INVALID_FIELD_VALUE_KEY"
    );
  });

  it("resolves stored formats after preceding in-format resource commands", async () => {
    const definition =
      "^XA^DFR:CARD.ZPL^FO1,1^GB2,2,1^FS^XZ";
    const deleted = await renderZpl(
      definition +
        "^XA^PW8^LL8^IDR:CARD.ZPL^XFR:CARD.ZPL^XZ"
    );
    expect(deleted.diagnostics.map(({ code }) => code)).toContain(
      "MISSING_STORED_FORMAT"
    );
    expect(deleted.labels[0].raster.data.every((byte) => byte === 0)).toBe(
      true
    );

    const transferred = await renderZpl(
      definition +
        "^XA^PW8^LL8^TOR:CARD.ZPL,E:COPY.ZPL^XFE:COPY.ZPL^XZ"
    );
    expect(transferred.diagnostics.map(({ code }) => code)).not.toContain(
      "MISSING_STORED_FORMAT"
    );
    expect(getDot(transferred.labels[0].raster, 1, 1)).toBe(true);
  });

  it("applies stored session commands on recall rather than definition", async () => {
    const result = await renderZpl(
      "~DBR:VALID.FNT,N,5,8,5,4,1,TEST,#0041.1.8.0.1.8.80" +
        "^CWZ,R:VALID.FNT" +
        "^XA^DFR:F.ZPL^CWZ,R:MISSING.TTF" +
        "^FO1,1^AZN,10,8^FDA^FS^XZ" +
        "^XA^PW30^LL20^FO1,1^AZN,10,8^FDA^FS^XZ" +
        "^XA^PW30^LL20^XFR:F.ZPL^XZ"
    );
    expect(result.labels).toHaveLength(2);
    expect(
      result.diagnostics
        .filter(({ code }) => code === "FONT_SUBSTITUTED")
        .map(({ labelIndex }) => labelIndex)
    ).toEqual([2]);
  });

  it("diagnoses recursion, malformed input, and allocation limits without throwing", async () => {
    const session = createRenderSession({
      limits: { maxDimension: 16, maxPixels: 128 },
    });
    await session.render("^XA^DFR:LOOP.ZPL^XFR:LOOP.ZPL^XZ");
    const recursive = await session.render(
      "^XA^PW8^LL8^XFR:LOOP.ZPL^XZ"
    );
    const recursion = recursive.diagnostics.find(
      ({ code }) => code === "RECURSIVE_STORED_FORMAT"
    );
    expect(recursion?.span).toEqual({
      start: recursive.document.source.indexOf("^XF"),
      end: recursive.document.source.indexOf("^XZ"),
    });
    expect(recursion?.relatedSpans).toBeUndefined();

    const oversized = await session.render("^XA^PW17^LL8^XZ");
    expect(oversized.labels[0].raster.data).toHaveLength(0);
    expect(oversized.diagnostics.map(({ code }) => code)).toContain(
      "LABEL_LIMIT_EXCEEDED"
    );

    const malformed = await session.render("text^XA^FOoops^GFZ,1,1,1,00");
    expect(malformed.diagnostics.some(({ severity }) => severity === "error")).toBe(
      true
    );
  });

  it("bounds temporary field rasters by the configured pixel limit", async () => {
    const result = await renderZpl(
      "^XA^PW8^LL8^FO0,0^A0N,32000,32000^FDX^FS" +
        "^FO0,0^B3N,N,32000^FDABCDEFGHIJ^FS" +
        "^FO1,1^GB2,2,1^FS^XZ",
      { limits: { maxDimension: 32_768, maxPixels: 128 } }
    );

    expect(
      result.diagnostics.filter(({ code }) => code === "LABEL_LIMIT_EXCEEDED")
    ).toHaveLength(2);
    expect(getDot(result.labels[0].raster, 1, 1)).toBe(true);
  });

  it("reports the remaining cumulative label budget accurately", async () => {
    const implicit = await renderZpl(
      "^XA^PW1^LL1^XZ^XA^PW1^LL1^XZ",
      { limits: { maxLabels: 1 } }
    );
    expect(
      implicit.diagnostics.find(
        ({ code }) => code === "LABEL_QUANTITY_LIMIT_EXCEEDED"
      )?.message
    ).toBe(
      "This format would generate 1 label, but only 0 of the 1-label job limit remain."
    );

    const cumulative = await renderZpl(
      "^XA^PW1^LL1^XZ^XA^PW1^LL1^PQ2^XZ",
      { limits: { maxLabels: 2 } }
    );
    expect(
      cumulative.diagnostics.find(
        ({ code }) => code === "LABEL_QUANTITY_LIMIT_EXCEEDED"
      )?.message
    ).toBe(
      "^PQ requested 2 labels, but only 1 of the 2-label job limit remains."
    );
  });

  it("applies maxPixels to the whole render call", async () => {
    const result = await renderZpl("^XA^PW8^LL8^PQ3^GB8,8,1^FS^XZ", {
      limits: { maxPixels: 128, maxLabels: 3 },
    });
    expect(result.labels).toHaveLength(3);
    expect(result.labels.map((label) => label.raster.data.length)).toEqual([8, 8, 0]);
    expect(result.labels[2].diagnostics.map(({ code }) => code)).toContain(
      "LABEL_LIMIT_EXCEEDED"
    );
  });

  it("preserves changed syntax characters across session calls", async () => {
    const session = createRenderSession();
    expect((await session.render("^CC!!CD;")).labels).toHaveLength(0);
    const result = await session.render(
      "!XA!PW14!LL9!FO2;2!GB3;3;1!FS!XZ"
    );
    expect(result.labels).toHaveLength(1);
    expect(result.labels[0]).toMatchObject({ width: 14, height: 9 });
    expect(getDot(result.labels[0].raster, 2, 2)).toBe(true);
  });

  it("diagnoses wrong command prefixes without executing them", async () => {
    const result = await renderZpl(
      "^XA~DFR:WRONG.ZPL~PQ3~PMY^PW10^LL10^FO1,1^GB2,2,1^FS^XZ"
    );

    expect(result.labels).toHaveLength(1);
    expect(getDot(result.labels[0].raster, 1, 1)).toBe(true);
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "INVALID_COMMAND_PREFIX", command: "~DF" }),
        expect.objectContaining({ code: "INVALID_COMMAND_PREFIX", command: "~PQ" }),
        expect.objectContaining({ code: "NON_RENDERING_COMMAND", command: "~PM" }),
      ])
    );
  });

  it("keeps wrong-prefix sizing and field-variable commands inert", async () => {
    const result = await renderZpl(
      "^XA~PW2~LL2~FN1~FDX^FO1,1^FN1^FS^XZ",
      { fallbackSize: { width: 10, height: 10, unit: "dots" } }
    );

    expect(result.labels[0]).toMatchObject({ width: 10, height: 10 });
    expect(
      result.labels[0].highlightRegions.some(({ type }) => type === "text")
    ).toBe(false);
    expect(
      result.diagnostics.filter(({ code }) => code === "INVALID_COMMAND_PREFIX")
    ).toHaveLength(4);
  });

  it("loads ^A@ and ^CW fonts through the asynchronous provider once per name", async () => {
    const requested: string[] = [];
    const provider = {
      async resolveFont(name: string) {
        requested.push(name);
        return notoSansCondensedTtf();
      },
    };
    const direct = await renderZpl(
      "^XA^PW120^LL40^FO2,2^A@N,24,12,R:CUSTOM.TTF^FDABBA^FS^XZ",
      { fontProvider: provider }
    );
    expect(direct.diagnostics.map(({ code }) => code)).not.toContain(
      "FONT_SUBSTITUTED"
    );
    expect(requested).toEqual(["R:CUSTOM.TTF"]);

    const mapped = await renderZpl(
      "^CWZ,R:CUSTOM.TTF^XA^PW120^LL40^FO2,2^AZN,24,12^FDABBA^FS^XZ",
      { fontProvider: provider }
    );
    expect(mapped.labels).toHaveLength(1);
    expect(mapped.labels[0]).toMatchObject({ width: 120, height: 40 });
    expect(mapped.diagnostics.map(({ code }) => code)).not.toContain(
      "FONT_SUBSTITUTED"
    );
    expect(requested).toEqual(["R:CUSTOM.TTF", "R:CUSTOM.TTF"]);
  });

  it("rejects out-of-range ~DB baseline and space metrics", async () => {
    const glyph = "#0041.1.8.0.1.8.80";
    const result = await renderZpl(
      `~DBR:BASE.FNT,N,5,8,0,4,1,TEST,${glyph}` +
        `~DBR:SPACE.FNT,N,5,8,5,0,1,TEST,${glyph}` +
        `~DBR:HUGE.FNT,N,5,8,5,32001,1,TEST,${glyph}`
    );
    expect(
      result.diagnostics.filter(({ code }) => code === "INVALID_OBJECT_DATA")
    ).toHaveLength(3);
  });

  it("substitutes unresolved custom fonts with one stable warning", async () => {
    const result = await renderZpl(
      "^XA^PW120^LL40^FO2,2^A@N,24,12,R:MISSING.TTF^FDABBA^FS^XZ",
      { fontProvider: { async resolveFont() { return undefined; } } }
    );
    expect(
      result.diagnostics.filter(({ code }) => code === "FONT_SUBSTITUTED")
    ).toHaveLength(1);
    expect(result.labels[0].raster.data.some((byte) => byte !== 0)).toBe(true);
  });

  it("routes downloaded Intellifont bytes through the host font provider", async () => {
    const requests: Array<{
      name: string;
      source?: DownloadedFontSource;
    }> = [];
    const result = await renderZpl(
      "~DSR:LEGACY.FNT,2,OOFF" +
        "^XA^PW120^LL40^FO2,2^A@N,24,12,R:LEGACY.FNT^FDABBA^FS^XZ",
      {
        fontProvider: {
          async resolveFont(name: string, source?: DownloadedFontSource) {
            requests.push({ name, source });
            return notoSansCondensedTtf();
          },
        },
      }
    );

    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({
      name: "R:LEGACY.FNT",
      source: {
        name: "R:LEGACY.FNT",
        format: "intellifont",
      },
    });
    expect(Array.from(requests[0].source?.data ?? [])).toEqual([0, 255]);
    expect(result.diagnostics.map(({ code }) => code)).not.toContain(
      "FONT_SUBSTITUTED"
    );
    expect(result.diagnostics.map(({ code }) => code)).not.toContain(
      "PARTIALLY_SUPPORTED_COMMAND"
    );
  });

  it("routes legacy TrueType downloads through the provider with correct formats", async () => {
    const sources: DownloadedFontSource[] = [];
    const result = await renderZpl(
      "~DTR:BOUND,1,00~DUR:UNBOUND,1,00" +
        "^XA^PW80^LL30^FO1,1^A@N,12,8,R:BOUND.DAT^FDA^FS" +
        "^FO20,1^A@N,12,8,R:UNBOUND.FNT^FDB^FS^XZ",
      {
        fontProvider: {
          async resolveFont(_name, source) {
            if (source) sources.push(source);
            return notoSansCondensedTtf();
          },
        },
      }
    );

    expect(sources.map(({ name, format }) => ({ name, format }))).toEqual([
      { name: "R:BOUND.DAT", format: "bounded-truetype" },
      { name: "R:UNBOUND.FNT", format: "unbounded-truetype" },
    ]);
    expect(result.diagnostics.map(({ code }) => code)).not.toContain(
      "FONT_SUBSTITUTED"
    );
  });

  it("enforces graphic, session-resource, template-depth, and expansion limits", async () => {
    const graphicLimited = createRenderSession({
      limits: { maxGraphicBytes: 1 },
    });
    const graphic = await graphicLimited.render("~DGR:TWO.GRF,2,1,FFFF");
    expect(graphic.diagnostics.map(({ code }) => code)).toContain(
      "GRAPHIC_LIMIT_EXCEEDED"
    );

    const resourceLimited = createRenderSession({
      limits: { maxSessionBytes: 1 },
    });
    const resource = await resourceLimited.render("~DGR:TWO.GRF,2,1,FFFF");
    expect(resource.diagnostics.map(({ code }) => code)).toContain(
      "SESSION_RESOURCE_LIMIT_EXCEEDED"
    );

    const emptyLimited = createRenderSession({
      limits: { maxSessionBytes: 0 },
    });
    const empty = await emptyLimited.render("~DER:EMPTY.DAT,0,");
    expect(empty.diagnostics.map(({ code }) => code)).toContain(
      "SESSION_RESOURCE_LIMIT_EXCEEDED"
    );
    const missingEmpty = await emptyLimited.render(
      "^XA^PW8^LL8^SER:EMPTY.DAT^FO0,0^FDX^FS^XZ"
    );
    expect(missingEmpty.diagnostics.map(({ code }) => code)).toContain(
      "MISSING_ENCODING_RESOURCE"
    );

    const metadataLimited = await renderZpl(
      "^CWZ,R:FONT.TTF^FLR:EXT.TTF,R:FONT.TTF,1^PW8",
      { limits: { maxSessionBytes: 0 } }
    );
    expect(
      metadataLimited.diagnostics.filter(
        ({ code }) => code === "SESSION_RESOURCE_LIMIT_EXCEEDED"
      )
    ).toHaveLength(3);

    const retainedLimited = await renderZpl(
      "^XA^FO0,0^GB8,8,1^FS^MCN^XZ",
      {
        width: 8,
        height: 8,
        limits: { maxSessionBytes: 4 },
      }
    );
    expect(retainedLimited.diagnostics.map(({ code }) => code)).toContain(
      "SESSION_RESOURCE_LIMIT_EXCEEDED"
    );

    const utf8Limited = createRenderSession({
      limits: { maxSessionBytes: 7 },
    });
    const utf8Format = await utf8Limited.render(
      "^XA^DFR:UTF8.ZPL^FDé^FS^XZ"
    );
    expect(utf8Format.diagnostics.map(({ code }) => code)).toContain(
      "SESSION_RESOURCE_LIMIT_EXCEEDED"
    );

    const templateLimited = createRenderSession({
      limits: { maxTemplateDepth: 1, maxExpandedCommands: 100 },
    });
    await templateLimited.render(
      "^XA^DFR:B.ZPL^FO1,1^GB2,2,1^FS^XZ" +
        "^XA^DFR:A.ZPL^XFR:B.ZPL^XZ"
    );
    const depth = await templateLimited.render(
      "^XA^PW10^LL10^XFR:A.ZPL^XZ"
    );
    expect(depth.diagnostics.map(({ code }) => code)).toContain(
      "TEMPLATE_DEPTH_EXCEEDED"
    );

    const expanded = await renderZpl(
      "^XA^DFR:BIG.ZPL^FO1,1^GB2,2,1^FS^FO5,5^GB2,2,1^FS^XZ" +
        "^XA^PW10^LL10^XFR:BIG.ZPL^XZ",
      { limits: { maxExpandedCommands: 8 } }
    );
    expect(expanded.diagnostics.map(({ code }) => code)).toContain(
      "EXPANDED_COMMAND_LIMIT_EXCEEDED"
    );

    const direct = await renderZpl(
      "^XA^PW10^LL10^FO1,1^GB2,2,1^FS^XZ",
      { limits: { maxExpandedCommands: 2 } }
    );
    expect(direct.diagnostics.map(({ code }) => code)).toContain(
      "EXPANDED_COMMAND_LIMIT_EXCEEDED"
    );
  });

  it("enforces graphic limits for downloaded row geometry and whole bitmap fonts", async () => {
    const rawGraphic = await renderZpl(
      `~DYR:RAW,B,G,1,100000,${String.fromCharCode(0x80)}`,
      { limits: { maxGraphicBytes: 8 } }
    );
    expect(rawGraphic.diagnostics.map(({ code }) => code)).toContain(
      "GRAPHIC_LIMIT_EXCEEDED"
    );

    const bitmapFont = await renderZpl(
      "~DBR:TINY.FNT,N,5,8,5,4,2,TEST," +
        "#0041.1.8.0.1.8.80" +
        "#0042.1.8.0.1.8.80",
      { limits: { maxGraphicBytes: 1 } }
    );
    expect(bitmapFont.diagnostics.map(({ code }) => code)).toContain(
      "GRAPHIC_LIMIT_EXCEEDED"
    );
  });

  it("enforces the graphic limit for ^IS image saves", async () => {
    const result = await renderZpl(
      "^XA^PW16^LL8^GB16,8,1^FS^ISR:SAVED.GRF,Y^XZ",
      { limits: { maxGraphicBytes: 1, maxSessionBytes: 100 } }
    );
    expect(result.diagnostics.map(({ code }) => code)).toContain(
      "GRAPHIC_LIMIT_EXCEEDED"
    );
  });

  it("falls back to safe defaults for invalid runtime limit values", async () => {
    const result = await renderZpl("^XA^PW8^LL8^GB1,1,1^FS^XZ", {
      limits: {
        maxDimension: Number.NaN,
        maxPixels: -1,
        maxLabels: Number.POSITIVE_INFINITY,
      },
    });
    expect(result.labels).toHaveLength(1);
    expect(result.labels[0].raster.data.length).toBeGreaterThan(0);
    expect(result.diagnostics.map(({ code }) => code)).not.toContain(
      "LABEL_LIMIT_EXCEEDED"
    );
  });
});
