import { describe, expect, it } from "vitest";
import {
  collectHiddenVisualFields,
  lockedVisualFieldStarts,
  sourceEditForFieldLock,
  sourceEditForHideField,
  sourceEditForUnhideField,
} from "./zplrFieldMetadata";
import type { VisualField } from "./visualEditorSource";

function apply(source: string, edit: { start: number; end: number; text: string }): string {
  return `${source.slice(0, edit.start)}${edit.text}${source.slice(edit.end)}`;
}

function visualField(source: string, prefix = "^"): VisualField {
  const start = source.indexOf(`${prefix}FO`);
  const end = source.indexOf(`${prefix}XZ`);
  return {
    id: "field",
    kind: "text",
    labelIndex: 0,
    region: { type: "text", x: 1, y: 2, width: 20, height: 10, sourceSpan: { start, end } },
    bounds: { x: 1, y: 2, width: 20, height: 10 },
    sourceSpan: { start, end },
    commands: [{ prefix } as VisualField["commands"][number]],
    movable: true,
    locked: false,
  };
}

describe("source-backed visual field metadata", () => {
  it("locks and unlocks a field with a reversible source marker", () => {
    const source = "^XA\n^FO1,2^FDHello^FS\n^XZ";
    const field = visualField(source);
    const lock = sourceEditForFieldLock(source, field, true)!;
    const locked = apply(source, lock);
    expect(locked).toContain("^FXZPLR-LOCK-1:");
    expect(lockedVisualFieldStarts(locked)).toContain(field.sourceSpan.start + lock.text.length);

    const shifted = { ...field, sourceSpan: { start: field.sourceSpan.start + lock.text.length, end: field.sourceSpan.end + lock.text.length } };
    const unlock = sourceEditForFieldLock(locked, shifted, false)!;
    expect(apply(locked, unlock)).toBe(source);
  });

  it("round-trips hidden field source and geometry", () => {
    const source = "^XA\n^FO1,2^FDHello^FS\n^XZ";
    const hiddenSource = apply(source, sourceEditForHideField(source, visualField(source))!);
    const hidden = collectHiddenVisualFields(hiddenSource)[0]!;
    expect(hidden).toMatchObject({ kind: "text", labelIndex: 0, bounds: { x: 1, y: 2, width: 20, height: 10 } });
    expect(apply(hiddenSource, sourceEditForUnhideField(hidden))).toBe(source);
  });

  it("uses the active custom format prefix", () => {
    const source = "^XA^CC!!FO1,2!FDHello!FS!XZ";
    const field = visualField(source, "!");
    const locked = apply(source, sourceEditForFieldLock(source, field, true)!);
    expect(locked).toContain("!FXZPLR-LOCK-1:");
    expect(locked).toContain("!FS\n!FO1,2");
  });
});
