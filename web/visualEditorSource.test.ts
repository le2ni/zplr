import { describe, expect, it } from "vitest";
import { parseDocument, type HighlightRegion } from "../src/index.web";
import {
  collectVisualFields,
  sourceEditForContent,
  sourceEditForDelete,
  sourceEditForDuplicate,
  sourceEditForInsert,
  sourceEditForLayerSwap,
  sourceEditForMove,
  sourceEditForPaste,
  sourceEditForResize,
  visualResizeMode,
  visualBounds,
  type SourceEdit,
} from "./visualEditorSource";

function applyEdit(source: string, edit: SourceEdit | undefined): string {
  if (!edit) throw new Error("Expected a source edit.");
  return `${source.slice(0, edit.start)}${edit.text}${source.slice(edit.end)}`;
}

function commandSpan(source: string, canonical: string) {
  const command = parseDocument(source).labels[0]?.commands.find((candidate) => candidate.canonical === canonical);
  if (!command) throw new Error(`Missing ${canonical}.`);
  return command.span;
}

describe("visual editor source operations", () => {
  it("pairs rendered fields with their editable origins and field data", () => {
    const source = "^XA^FO10,20^A0N,30,30^FDHello^FS^XZ";
    const originSpan = commandSpan(source, "^FO");
    const fieldSpan = { start: originSpan.start, end: source.indexOf("^XZ") };
    const regions: HighlightRegion[] = [
      { type: "origin", sourceSpan: originSpan, x: 10, y: 20 },
      { type: "text", sourceSpan: fieldSpan, x: 10, y: 20, width: 75, height: 30 },
    ];

    expect(collectVisualFields(source, regions)).toMatchObject([{
      kind: "text",
      movable: true,
      bounds: { x: 10, y: 20, width: 75, height: 30 },
      content: { value: "Hello", prefix: "" },
      origin: { command: { canonical: "^FO" } },
    }]);
  });

  it("moves field origins in rendered coordinates", () => {
    const source = "^XA^FO10,20^FDHello^FS^XZ";
    const moved = applyEdit(source, sourceEditForMove(source, commandSpan(source, "^FO"), 15, -5, 8));
    expect(moved).toBe("^XA^FO25,15^FDHello^FS^XZ");
  });

  it("inverts mirror and rotation transforms while moving", () => {
    const mirrored = "^XA^PMY^FO50,60^FDX^FS^XZ";
    expect(applyEdit(mirrored, sourceEditForMove(mirrored, commandSpan(mirrored, "^FO"), 10, 5, 8)))
      .toContain("^FO40,65");

    const rotated = "^XA^POI^FO50,60^FDX^FS^XZ";
    expect(applyEdit(rotated, sourceEditForMove(rotated, commandSpan(rotated, "^FO"), 10, 5, 8)))
      .toContain("^FO40,55");

    const both = "^XA^PMY^POI^FO50,60^FDX^FS^XZ";
    expect(applyEdit(both, sourceEditForMove(both, commandSpan(both, "^FO"), 10, 5, 8)))
      .toContain("^FO60,55");
  });

  it("converts visual dots to the active physical measurement unit", () => {
    const source = "^XA^MUM^FO10,20^FDHello^FS^XZ";
    const moved = applyEdit(source, sourceEditForMove(source, commandSpan(source, "^FO"), 8, 16, 8));
    expect(moved).toContain("^FO11,22");
  });

  it("updates field data, field variables, and QR content without losing prefixes", () => {
    const source = "^XA^FO10,20^BQN,2,4^FDQA,old.example^FS^XZ";
    const origin = commandSpan(source, "^FO");
    const regions: HighlightRegion[] = [
      { type: "origin", sourceSpan: origin, x: 10, y: 20 },
      { type: "barcode", sourceSpan: { start: origin.start, end: source.indexOf("^XZ") }, x: 10, y: 20, width: 84, height: 84 },
    ];
    const field = collectVisualFields(source, regions)[0]!;
    expect(field.content).toMatchObject({ value: "old.example", prefix: "QA," });
    expect(applyEdit(source, sourceEditForContent(source, field.content!, "new.example")))
      .toContain("^FDQA,new.example^FS");

    const variableSource = "^XA^FO10,20^A0N,30,30^FVold,value^FS^XZ";
    const variableOrigin = commandSpan(variableSource, "^FO");
    const variableField = collectVisualFields(variableSource, [
      { type: "origin", sourceSpan: variableOrigin, x: 10, y: 20 },
      {
        type: "text",
        sourceSpan: { start: variableOrigin.start, end: commandSpan(variableSource, "^FS").end },
        x: 10,
        y: 20,
        width: 100,
        height: 30,
      },
    ])[0]!;
    expect(variableField.content).toMatchObject({ command: "^FV", value: "old,value" });
    expect(applyEdit(variableSource, sourceEditForContent(variableSource, variableField.content!, "new,value")))
      .toContain("^FVnew,value^FS");
  });

  it("resizes every source-backed scalable field type", () => {
    const cases = [
      {
        source: "^XA^FO10,20^A0N,30,30^FDText^FS^XZ",
        type: "text" as const,
        bounds: { width: 60, height: 30 },
        expected: "^A0N,60,60",
        mode: "free",
      },
      {
        source: "^XA^FO10,20^GB100,40,2,B,0^FS^XZ",
        type: "box" as const,
        bounds: { width: 100, height: 40 },
        expected: "^GB200,80,2,B,0",
        mode: "free",
      },
      {
        source: "^XA^FO10,20^BY2,3,80^BCN,80,Y,N,N^FD123^FS^XZ",
        type: "barcode" as const,
        bounds: { width: 120, height: 80 },
        expected: "^BY4,3,80^BCN,160,Y,N,N",
        mode: "free",
      },
      {
        source: "^XA^FO10,20^BQN,2,4^FDQA,hello^FS^XZ",
        type: "barcode" as const,
        bounds: { width: 84, height: 84 },
        expected: "^BQN,2,8",
        mode: "uniform",
      },
      {
        source: "^XA^FO10,20^GC40,2,B^FS^XZ",
        type: "circle" as const,
        bounds: { width: 40, height: 40 },
        expected: "^GC80,2,B",
        mode: "uniform",
      },
      {
        source: "^XA^FO10,20^GE60,30,2,B^FS^XZ",
        type: "ellipse" as const,
        bounds: { width: 60, height: 30 },
        expected: "^GE120,60,2,B",
        mode: "free",
      },
      {
        source: "^XA^FO10,20^GSN,30,40^FDA^FS^XZ",
        type: "box" as const,
        bounds: { width: 40, height: 30 },
        expected: "^GSN,60,80",
        mode: "free",
      },
      {
        source: "^XA^FO10,20^B0N,2,N,0,N,1,0^FDhello^FS^XZ",
        type: "barcode" as const,
        bounds: { width: 100, height: 100 },
        expected: "^B0N,4,N,0,N,1,0",
        mode: "uniform",
      },
    ];

    for (const example of cases) {
      const origin = commandSpan(example.source, "^FO");
      const end = commandSpan(example.source, "^FS");
      const field = collectVisualFields(example.source, [
        { type: "origin", sourceSpan: origin, x: 10, y: 20 },
        { type: example.type, sourceSpan: { start: origin.start, end: end.end }, x: 10, y: 20, ...example.bounds },
      ])[0]!;
      expect(visualResizeMode(field)).toBe(example.mode);
      const resized = applyEdit(example.source, sourceEditForResize(example.source, field, {
        x: 10,
        y: 20,
        width: example.bounds.width * 2,
        height: example.bounds.height * 2,
      }, 8));
      expect(resized).toContain(example.expected);
    }
  });

  it("treats rendered XG bitmap bounds as a scalable graphic", () => {
    const source = "^XA^FO10,20^XGR:LOGO.GRF,1,1^FS^XZ";
    const origin = commandSpan(source, "^FO");
    const end = commandSpan(source, "^FS");
    const field = collectVisualFields(source, [
      { type: "origin", sourceSpan: origin, x: 10, y: 20 },
      { type: "box", sourceSpan: { start: origin.start, end: end.end }, x: 10, y: 20, width: 50, height: 30 },
    ])[0]!;
    expect(field.kind).toBe("graphic");
    expect(visualResizeMode(field)).toBe("free");
    expect(applyEdit(source, sourceEditForResize(source, field, {
      x: 10,
      y: 20,
      width: 100,
      height: 60,
    }, 8))).toContain("^XGR:LOGO.GRF,2,2");
  });

  it("inserts toolbox elements before the selected label terminator", () => {
    const source = "^XA\n^PW400\n^XZ";
    const result = applyEdit(source, sourceEditForInsert(source, 0, "text", 30, 40));
    expect(result).toContain("^FO30,40\n^A0N,36,36\n^FDText^FS\n^XZ");
  });

  it("converts dropped visual coordinates to the active measurement unit", () => {
    const source = "^XA^MUM^XZ";
    const result = applyEdit(source, sourceEditForInsert(source, 0, "box", 80, 160, 8));
    expect(result).toContain("^FO10,20");
    expect(result).toContain("^GB25,12.5,0.5,B,0");
  });

  it("places dropped elements through label transforms and home offsets", () => {
    const mirrored = "^XA^PW100^LL80^PMY^XZ";
    expect(applyEdit(mirrored, sourceEditForInsert(mirrored, 0, "text", 20, 30, 8, { width: 100, height: 80 })))
      .toContain("^FO79,30");

    const rotatedWithHome = "^XA^PW100^LL80^POI^LH10,5^XZ";
    expect(applyEdit(rotatedWithHome, sourceEditForInsert(rotatedWithHome, 0, "text", 20, 30, 8, { width: 100, height: 80 })))
      .toContain("^FO69,44");
  });

  it("duplicates with an offset and deletes complete source-linked fields", () => {
    const source = "^XA\n^FO10,20^GB100,40,2^FS\n^XZ";
    const origin = commandSpan(source, "^FO");
    const field = collectVisualFields(source, [
      { type: "origin", sourceSpan: origin, x: 10, y: 20 },
      { type: "box", sourceSpan: { start: origin.start, end: source.indexOf("\n^XZ") }, x: 10, y: 20, width: 100, height: 40 },
    ])[0]!;

    const duplicated = applyEdit(source, sourceEditForDuplicate(source, field, 8));
    expect(duplicated).toContain("^FO30,40^GB100,40,2^FS");
    expect(applyEdit(source, sourceEditForDelete(source, field.sourceSpan))).toBe("^XA\n^XZ");

    const pasted = applyEdit(source, sourceEditForPaste(source, 0, source, field, 8, 40));
    expect(pasted).toContain("^FO50,60^GB100,40,2^FS\n^XZ");
  });

  it("swaps adjacent visual fields to change their source-backed layer order", () => {
    const source = "^XA\n^FO10,20^GB100,40,2^FS\n^FO30,40^GB80,20,2^FS\n^XZ";
    const commands = parseDocument(source).labels[0]!.commands;
    const origins = commands.filter(({ canonical }) => canonical === "^FO");
    const endings = commands.filter(({ canonical }) => canonical === "^FS");
    const fields = collectVisualFields(source, [
      { type: "origin", sourceSpan: origins[0]!.span, x: 10, y: 20 },
      { type: "box", sourceSpan: { start: origins[0]!.span.start, end: endings[0]!.span.end }, x: 10, y: 20, width: 100, height: 40 },
      { type: "origin", sourceSpan: origins[1]!.span, x: 30, y: 40 },
      { type: "box", sourceSpan: { start: origins[1]!.span.start, end: endings[1]!.span.end }, x: 30, y: 40, width: 80, height: 20 },
    ]);

    const edit = sourceEditForLayerSwap(source, fields[0]!, fields[1]!);
    const reordered = applyEdit(source, edit);
    expect(reordered.indexOf("^FO30,40")).toBeLessThan(reordered.indexOf("^FO10,20"));
    expect(edit?.selectOriginAt).toBe(reordered.indexOf("^FO10,20"));
  });

  it("does not move a layer across source commands that may change field state", () => {
    const source = "^XA^FO10,20^FDOne^FS^LH5,5^FO30,40^FDTwo^FS^XZ";
    const commands = parseDocument(source).labels[0]!.commands;
    const origins = commands.filter(({ canonical }) => canonical === "^FO");
    const endings = commands.filter(({ canonical }) => canonical === "^FS");
    const fields = collectVisualFields(source, [
      { type: "origin", sourceSpan: origins[0]!.span, x: 10, y: 20 },
      { type: "text", sourceSpan: { start: origins[0]!.span.start, end: endings[0]!.span.end }, x: 10, y: 20, width: 30, height: 10 },
      { type: "origin", sourceSpan: origins[1]!.span, x: 35, y: 45 },
      { type: "text", sourceSpan: { start: origins[1]!.span.start, end: endings[1]!.span.end }, x: 35, y: 45, width: 30, height: 10 },
    ]);

    expect(sourceEditForLayerSwap(source, fields[0]!, fields[1]!)).toBeUndefined();
  });

  it("normalizes circular hit regions to rectangular designer bounds", () => {
    expect(visualBounds({
      type: "circle",
      sourceSpan: { start: 0, end: 1 },
      x: 50,
      y: 60,
      radius: 10,
    })).toEqual({ x: 40, y: 50, width: 20, height: 20 });
  });
});
