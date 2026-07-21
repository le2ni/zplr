import { describe, expect, it } from "vitest";
import { parseDocument } from "./documentParser";
import {
  findCommandAtOffset,
  findHighlightRegionAtPoint,
} from "./sourceNavigation";
import type { HighlightRegion } from "@/types/HighlightRegion";
import { createRenderSession, renderZpl } from "../index.node";

describe("source navigation", () => {
  it("finds canonical commands by their UTF-16 source ranges", () => {
    const source = "~DGR:DOT.GRF,1,1,80^XA^FO4,5^GB10,8,1^FS^XZ";
    const document = parseDocument(source);

    expect(findCommandAtOffset(document, source.indexOf("DG") + 1)?.canonical).toBe(
      "~DG"
    );
    expect(findCommandAtOffset(document, source.indexOf("FO") + 1)?.canonical).toBe(
      "^FO"
    );
    expect(findCommandAtOffset(document, -1)).toBeUndefined();
    expect(findCommandAtOffset(document, source.length)).toBeUndefined();
  });

  it("returns the top-most rectangular, circular, and origin region", () => {
    const regions: HighlightRegion[] = [
      {
        type: "box",
        sourceSpan: { start: 0, end: 3 },
        x: 0,
        y: 0,
        width: 20,
        height: 20,
      },
      {
        type: "circle",
        sourceSpan: { start: 3, end: 6 },
        x: 10,
        y: 10,
        radius: 4,
      },
      {
        type: "origin",
        sourceSpan: { start: 6, end: 9 },
        x: 40,
        y: 40,
      },
      {
        type: "ellipse",
        sourceSpan: { start: 9, end: 12 },
        x: 60,
        y: 60,
        width: 20,
        height: 10,
      },
    ];

    expect(findHighlightRegionAtPoint(regions, 10, 10)?.type).toBe("circle");
    expect(findHighlightRegionAtPoint(regions, 40, 40)?.type).toBe("origin");
    expect(findHighlightRegionAtPoint(regions, 70, 65)?.type).toBe("ellipse");
    expect(findHighlightRegionAtPoint(regions, 60, 60)).toBeUndefined();
    expect(findHighlightRegionAtPoint(regions, 20, 0)).toBeUndefined();
    expect(findHighlightRegionAtPoint(regions, 100, 100)).toBeUndefined();
    expect(findHighlightRegionAtPoint(regions, Number.NaN, 0)).toBeUndefined();
  });

  it("links rendered geometry back to an end-exclusive source span", async () => {
    const source = "^XA^PW80^LL40^FO4,5^GB10,8,1^FS^XZ";
    const result = await renderZpl(source);
    const region = result.labels[0].highlightRegions.find(({ type }) => type === "box");
    expect(region?.sourceSpan).toEqual({
      start: source.indexOf("^FO"),
      end: source.indexOf("^XZ"),
    });
    expect(findCommandAtOffset(result.document, region!.sourceSpan.start)?.canonical).toBe("^FO");
    expect(findCommandAtOffset(result.document, region!.sourceSpan.end)?.canonical).toBe("^XZ");
  });

  it("rebases recalled formats from earlier session sources to the current ^XF", async () => {
    const session = createRenderSession();
    await session.render("^XA^DFR:F.ZPL^FO10,10^GB5,5,1^FS^XZ");

    const source = "^XA^PW30^LL30^XFR:F.ZPL^XZ";
    const result = await session.render(source);
    const region = result.labels[0].highlightRegions.find(
      ({ type }) => type === "box"
    );
    const recallSpan = {
      start: source.indexOf("^XF"),
      end: source.indexOf("^XZ"),
    };

    expect(region?.sourceSpan).toEqual(recallSpan);
    expect(region!.sourceSpan.end).toBeLessThanOrEqual(source.length);
    expect(
      findCommandAtOffset(result.document, region!.sourceSpan.start)?.canonical
    ).toBe("^XF");
  });

  it("does not expose inherited persistent spans from an earlier source", async () => {
    const session = createRenderSession({ width: 80, height: 40 });
    await session.render("^XA^FXabcdefghijklmnopqrstuv^CI999^XZ");

    const source = "^XA^FO1,1^FDx^FS^XZ";
    const result = await session.render(source);
    const diagnostic = result.diagnostics.find(
      ({ code }) => code === "UNSUPPORTED_CHARACTER_SET"
    );

    expect(diagnostic).toBeDefined();
    expect(diagnostic?.span).toBeUndefined();
    for (const candidate of result.diagnostics) {
      if (!candidate.span) continue;
      expect(candidate.span.start).toBeGreaterThanOrEqual(0);
      expect(candidate.span.end).toBeLessThanOrEqual(source.length);
    }
  });
});
