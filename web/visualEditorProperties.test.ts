import { describe, expect, it } from "vitest";
import { parseDocument, type HighlightRegion, type HighlightRegionType } from "../src/index.web";
import {
  sourceEditForBarcodeType,
  sourceEditForVisualProperty,
  visualBarcodeCommand,
  visualBarcodeTypes,
  visualPropertyGroups,
} from "./visualEditorProperties";
import { collectVisualFields, type SourceEdit, type VisualField } from "./visualEditorSource";

function applyEdit(source: string, edit: SourceEdit | undefined): string {
  if (!edit) throw new Error("Expected a source edit.");
  return `${source.slice(0, edit.start)}${edit.text}${source.slice(edit.end)}`;
}

function fieldFor(source: string, type: HighlightRegionType): VisualField {
  const commands = parseDocument(source).labels[0]?.commands ?? [];
  const origin = commands.find(({ canonical }) => canonical === "^FO");
  const fieldEnd = commands.find(({ canonical }) => canonical === "^FS");
  if (!origin || !fieldEnd) throw new Error("Expected one complete field.");
  const regions: HighlightRegion[] = [
    { type: "origin", sourceSpan: origin.span, x: 10, y: 20 },
    { type, sourceSpan: { start: origin.span.start, end: fieldEnd.span.end }, x: 10, y: 20, width: 100, height: 40 },
  ];
  const field = collectVisualFields(source, regions)[0];
  if (!field) throw new Error("Expected a visual field.");
  return field;
}

describe("visual editor metadata properties", () => {
  it("exposes every documented graphic-box parameter and edits its source slot", () => {
    const source = "^XA^FO10,20^GB100,40,2,B,0^FS^XZ";
    const group = visualPropertyGroups(fieldFor(source, "box")).find(({ command }) => command.canonical === "^GB");

    expect(group).toMatchObject({
      definition: {
        title: "Graphic Box",
        summary: expect.stringContaining("draw boxes and lines"),
      },
    });
    expect(group?.parameters.map(({ label, value, inputKind }) => ({ label, value, inputKind }))).toEqual([
      { label: "Box width (in dots)", value: "100", inputKind: "number" },
      { label: "Box height (in dots)", value: "40", inputKind: "number" },
      { label: "Border thickness (in dots)", value: "2", inputKind: "number" },
      { label: "Line color", value: "B", inputKind: "select" },
      { label: "Degree of corner-rounding", value: "0", inputKind: "number" },
    ]);
    expect(group?.parameters[0]?.definition.documentation).toContain("box width (in dots)");

    const width = group?.parameters[0];
    expect(width).toBeDefined();
    expect(applyEdit(source, sourceEditForVisualProperty(source, width!, "180")))
      .toContain("^GB180,40,2,B,0");
  });

  it("edits adjacent font selectors with the same component boundaries as IntelliSense", () => {
    const source = "^XA^FO10,20^A0N,30,40^FDText^FS^XZ";
    const group = visualPropertyGroups(fieldFor(source, "text")).find(({ command }) => command.canonical === "^A");
    const orientation = group?.parameters.find(({ definition }) => definition.key === "o");
    const height = group?.parameters.find(({ definition }) => definition.key === "h");
    expect(orientation?.value).toBe("N");
    expect(height?.value).toBe("30");
    expect(applyEdit(source, sourceEditForVisualProperty(source, orientation!, "R")))
      .toContain("^A0R,30,40");
    expect(applyEdit(source, sourceEditForVisualProperty(source, height!, "55")))
      .toContain("^A0N,55,40");
    const font = group?.parameters.find(({ definition }) => definition.key === "f");
    expect(applyEdit(source, sourceEditForVisualProperty(source, font!, "")))
      .toContain("^A,30,40");

    const omitted = "^XA^FO10,20^A,30,40^FDText^FS^XZ";
    const omittedGroup = visualPropertyGroups(fieldFor(omitted, "text")).find(({ command }) => command.canonical === "^A");
    const omittedOrientation = omittedGroup?.parameters.find(({ definition }) => definition.key === "o");
    expect(applyEdit(omitted, sourceEditForVisualProperty(omitted, omittedOrientation!, "R")))
      .toContain("^AAR,30,40");
  });

  it("switches barcode symbology with documented defaults while preserving field data", () => {
    const source = "^XA^FO10,20^BY2,3,80^BCN,80,Y,N,N^FD123456^FS^XZ";
    const field = fieldFor(source, "barcode");
    const barcode = visualBarcodeCommand(field);
    expect(barcode?.canonical).toBe("^BC");
    const changed = applyEdit(source, sourceEditForBarcodeType(source, barcode!.span, "^B3"));
    expect(changed).toContain("^B3N,N,100,Y,N");
    expect(changed).toContain("^FD123456^FS");

    for (const barcodeType of visualBarcodeTypes) {
      if (barcodeType.canonical === barcode?.canonical) continue;
      expect(
        sourceEditForBarcodeType(source, barcode!.span, barcodeType.canonical),
        barcodeType.canonical,
      ).toBeDefined();
    }
  });

  it("preserves custom delimiters and rejects invalid documented values", () => {
    const source = "^XA^CD;^FO10;20^GB100;40;2;B;0^FS^XZ";
    const group = visualPropertyGroups(fieldFor(source, "box")).find(({ command }) => command.canonical === "^GB");
    const width = group?.parameters.find(({ definition }) => definition.key === "w");
    const color = group?.parameters.find(({ definition }) => definition.key === "c");
    expect(applyEdit(source, sourceEditForVisualProperty(source, width!, "180")))
      .toContain("^GB180;40;2;B;0");
    expect(sourceEditForVisualProperty(source, color!, "purple")).toBeUndefined();
  });
});
