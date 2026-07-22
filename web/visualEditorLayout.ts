import type { PrintDensity } from "../src/index.web";
import {
  sourceEditForMove,
  sourceOffsetAfterEdits,
  sourceEditTransaction,
  type SourceEditTransaction,
  type VisualBounds,
  type VisualField,
} from "./visualEditorSource";

export type VisualAlignment =
  | "left"
  | "center"
  | "right"
  | "top"
  | "middle"
  | "bottom";

export function unionVisualBounds(fields: readonly VisualField[]): VisualBounds | undefined {
  if (fields.length === 0) return undefined;
  const left = Math.min(...fields.map(({ bounds }) => bounds.x));
  const top = Math.min(...fields.map(({ bounds }) => bounds.y));
  const right = Math.max(...fields.map(({ bounds }) => bounds.x + bounds.width));
  const bottom = Math.max(...fields.map(({ bounds }) => bounds.y + bounds.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}

export function sourceTransactionForMoveFields(
  source: string,
  fields: readonly VisualField[],
  deltaFor: (field: VisualField) => { x: number; y: number },
  printDensity: PrintDensity,
  primary?: VisualField,
): SourceEditTransaction | undefined {
  if (fields.length === 0 || fields.some((field) => !field.origin || field.locked)) return undefined;
  const edits = fields.flatMap((field) => {
    const delta = deltaFor(field);
    const edit = sourceEditForMove(
      source,
      field.origin!.command.span,
      delta.x,
      delta.y,
      printDensity,
    );
    return edit ? [edit] : [];
  });
  if (edits.length !== fields.length) return undefined;
  const origins = fields.map((field) => sourceOffsetAfterEdits(field.origin!.command.span.start, edits));
  const primaryOffset = primary?.origin
    ? sourceOffsetAfterEdits(primary.origin.command.span.start, edits)
    : origins.at(-1);
  return sourceEditTransaction(edits, {
    origins,
    primary: primaryOffset,
    kinds: fields.map(({ kind }) => kind),
  });
}

export function sourceTransactionForAlignment(
  source: string,
  fields: readonly VisualField[],
  alignment: VisualAlignment,
  target: VisualBounds,
  printDensity: PrintDensity,
  primary?: VisualField,
): SourceEditTransaction | undefined {
  return sourceTransactionForMoveFields(source, fields, (field) => {
    if (alignment === "left") return { x: target.x - field.bounds.x, y: 0 };
    if (alignment === "center") {
      return { x: target.x + target.width / 2 - (field.bounds.x + field.bounds.width / 2), y: 0 };
    }
    if (alignment === "right") {
      return { x: target.x + target.width - (field.bounds.x + field.bounds.width), y: 0 };
    }
    if (alignment === "top") return { x: 0, y: target.y - field.bounds.y };
    if (alignment === "middle") {
      return { x: 0, y: target.y + target.height / 2 - (field.bounds.y + field.bounds.height / 2) };
    }
    return { x: 0, y: target.y + target.height - (field.bounds.y + field.bounds.height) };
  }, printDensity, primary);
}

export function sourceTransactionForDistribution(
  source: string,
  fields: readonly VisualField[],
  axis: "horizontal" | "vertical",
  printDensity: PrintDensity,
  primary?: VisualField,
): SourceEditTransaction | undefined {
  if (fields.length < 3) return undefined;
  const ordered = [...fields].sort((left, right) => axis === "horizontal"
    ? left.bounds.x - right.bounds.x
    : left.bounds.y - right.bounds.y);
  const first = ordered[0]!;
  const last = ordered.at(-1)!;
  const totalSize = ordered.reduce((sum, field) => sum + (axis === "horizontal" ? field.bounds.width : field.bounds.height), 0);
  const outerStart = axis === "horizontal" ? first.bounds.x : first.bounds.y;
  const outerEnd = axis === "horizontal"
    ? last.bounds.x + last.bounds.width
    : last.bounds.y + last.bounds.height;
  const gap = (outerEnd - outerStart - totalSize) / (ordered.length - 1);
  let cursor = outerStart;
  const deltas = new Map<VisualField, { x: number; y: number }>();
  for (const field of ordered) {
    const position = axis === "horizontal" ? field.bounds.x : field.bounds.y;
    deltas.set(field, axis === "horizontal"
      ? { x: cursor - position, y: 0 }
      : { x: 0, y: cursor - position });
    cursor += (axis === "horizontal" ? field.bounds.width : field.bounds.height) + gap;
  }
  return sourceTransactionForMoveFields(source, fields, (field) => deltas.get(field)!, printDensity, primary);
}

export interface SnapGuide {
  axis: "x" | "y";
  position: number;
  kind: "label" | "object" | "manual";
}

export interface ManualGuide {
  id: string;
  axis: "x" | "y";
  position: number;
}

export interface SnapResult {
  deltaX: number;
  deltaY: number;
  guides: readonly SnapGuide[];
}

function axisSnap(
  moving: readonly number[],
  candidates: readonly SnapGuide[],
  rawDelta: number,
  tolerance: number,
): { delta: number; guide?: SnapGuide } {
  let best: { adjustment: number; guide: SnapGuide; priority: number } | undefined;
  for (const guide of candidates) {
    for (const point of moving) {
      const adjustment = guide.position - (point + rawDelta);
      if (Math.abs(adjustment) > tolerance) continue;
      const priority = guide.kind === "manual" ? 0 : guide.kind === "object" ? 1 : 2;
      if (!best || Math.abs(adjustment) < Math.abs(best.adjustment) ||
        (Math.abs(adjustment) === Math.abs(best.adjustment) && priority < best.priority)) {
        best = { adjustment, guide, priority };
      }
    }
  }
  return best ? { delta: rawDelta + best.adjustment, guide: best.guide } : { delta: rawDelta };
}

export function snapMovingBounds(
  bounds: VisualBounds,
  rawDeltaX: number,
  rawDeltaY: number,
  candidates: readonly SnapGuide[],
  tolerance: number,
): SnapResult {
  const x = axisSnap(
    [bounds.x, bounds.x + bounds.width / 2, bounds.x + bounds.width],
    candidates.filter((guide) => guide.axis === "x"),
    rawDeltaX,
    tolerance,
  );
  const y = axisSnap(
    [bounds.y, bounds.y + bounds.height / 2, bounds.y + bounds.height],
    candidates.filter((guide) => guide.axis === "y"),
    rawDeltaY,
    tolerance,
  );
  return {
    deltaX: x.delta,
    deltaY: y.delta,
    guides: [x.guide, y.guide].filter((guide): guide is SnapGuide => guide !== undefined),
  };
}
