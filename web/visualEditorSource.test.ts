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

  it("updates plain and QR field content without losing the QR prefix", () => {
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
