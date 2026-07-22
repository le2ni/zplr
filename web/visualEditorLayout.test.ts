import { describe, expect, it } from "vitest";
import { parseDocument } from "../src/index.web";
import {
  snapMovingBounds,
  sourceTransactionForAlignment,
  sourceTransactionForDistribution,
  unionVisualBounds,
} from "./visualEditorLayout";
import type { SourceEditTransaction, VisualField } from "./visualEditorSource";

function field(id: string, x: number, y: number, width: number, height: number): VisualField {
  return {
    id,
    kind: "box",
    labelIndex: 0,
    region: { type: "box", x, y, width, height, sourceSpan: { start: 0, end: 1 } },
    bounds: { x, y, width, height },
    sourceSpan: { start: 0, end: 1 },
    commands: [],
    movable: false,
    locked: false,
  };
}

function movableField(
  source: string,
  index: number,
  x: number,
  y: number,
  width: number,
  height: number,
): VisualField {
  const command = parseDocument(source).labels[0]!.commands.filter(({ canonical }) => canonical === "^FO")[index]!;
  return {
    ...field(`field-${index}`, x, y, width, height),
    sourceSpan: { ...command.span },
    origin: {
      command,
      region: { type: "origin", x, y, sourceSpan: { ...command.span } },
    },
    movable: true,
  };
}

function applyTransaction(source: string, transaction: SourceEditTransaction): string {
  let result = source;
  for (const edit of [...transaction.edits].sort((left, right) => right.start - left.start)) {
    result = `${result.slice(0, edit.start)}${edit.text}${result.slice(edit.end)}`;
  }
  return result;
}

describe("visual editor layout", () => {
  it("computes a group selection boundary", () => {
    expect(unionVisualBounds([field("a", 10, 20, 30, 40), field("b", 50, 5, 20, 15)]))
      .toEqual({ x: 10, y: 5, width: 60, height: 55 });
  });

  it("snaps edges and centers with manual-guide priority", () => {
    const result = snapMovingBounds(
      { x: 10, y: 10, width: 20, height: 10 },
      8,
      7,
      [
        { axis: "x", position: 41, kind: "object" },
        { axis: "x", position: 40, kind: "manual" },
        { axis: "y", position: 22, kind: "label" },
      ],
      3,
    );
    expect(result).toMatchObject({ deltaX: 10, deltaY: 7 });
    expect(result.guides).toEqual([
      { axis: "x", position: 40, kind: "manual" },
      { axis: "y", position: 22, kind: "label" },
    ]);
  });

  it("refuses distribution when fields cannot be moved safely", () => {
    expect(sourceTransactionForDistribution("^XA^XZ", [
      field("a", 0, 0, 10, 10),
      field("b", 30, 0, 10, 10),
      field("c", 80, 0, 10, 10),
    ], "horizontal", 8)).toBeUndefined();
  });

  it("aligns several origins in one atomic source transaction", () => {
    const source = "^XA^FO10,20^GB10,10,1^FS^FO40,30^GB10,10,1^FS^FO90,50^GB10,10,1^FS^XZ";
    const fields = [
      movableField(source, 0, 10, 20, 10, 10),
      movableField(source, 1, 40, 30, 10, 10),
      movableField(source, 2, 90, 50, 10, 10),
    ];
    const transaction = sourceTransactionForAlignment(
      source,
      fields,
      "left",
      unionVisualBounds(fields)!,
      8,
      fields[1],
    )!;
    const edited = applyTransaction(source, transaction);
    expect(transaction.edits).toHaveLength(3);
    expect(edited.match(/\^FO10,/g)).toHaveLength(3);
    expect(edited).toContain("^FO10,30");
    expect(transaction.primarySelectOriginAt).toBeDefined();
  });

  it("distributes fields evenly without moving the outer pair", () => {
    const source = "^XA^FO0,20^GB10,10,1^FS^FO40,20^GB10,10,1^FS^FO100,20^GB10,10,1^FS^XZ";
    const fields = [
      movableField(source, 0, 0, 20, 10, 10),
      movableField(source, 1, 40, 20, 10, 10),
      movableField(source, 2, 100, 20, 10, 10),
    ];
    const transaction = sourceTransactionForDistribution(source, fields, "horizontal", 8)!;
    expect(applyTransaction(source, transaction)).toContain("^FO50,20");
  });
});
