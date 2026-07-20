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

    const legacyDensity = await renderZpl("^XA^PW1^LL1^XZ", { dpi: 300 });
    expect(legacyDensity.labels[0].printDensity).toBe(12);
    expect(legacyDensity.labels[0].diagnostics.map(({ code }) => code)).toContain(
      "DEPRECATED_DPI_OPTION"
    );

    const explicitDensity = await renderZpl("^XA^PW1^LL1^XZ", {
      printDensity: 24,
      dpi: 200,
    });
    expect(explicitDensity.labels[0].printDensity).toBe(24);
    expect(
      explicitDensity.labels[0].diagnostics.find(
        ({ code }) => code === "DEPRECATED_DPI_OPTION"
      )?.message
    ).toContain("was ignored");
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
    expect(recursion?.relatedSpans).toHaveLength(1);

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

  it("persists valid ^SZ selections and ignores invalid selections", async () => {
    const session = createRenderSession();
    expect(
      (await session.render("^SZ1")).diagnostics.map(({ code }) => code)
    ).not.toContain("PARTIALLY_SUPPORTED_COMMAND");
    expect(
      (await session.render("^SZ9")).diagnostics.map(({ code }) => code)
    ).not.toContain("PARTIALLY_SUPPORTED_COMMAND");
    const rendered = await session.render(
      "^XA^PW12^LL8^FO2,3^GB2,2,1^FS^SZ2^XZ"
    );
    expect(getDot(rendered.labels[0].raster, 2, 3)).toBe(true);
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
});
