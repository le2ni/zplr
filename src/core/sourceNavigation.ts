import type { HighlightRegion } from "@/types/HighlightRegion";
import type { ZplCommandNode, ZplDocument } from "@/types/ZplDocument";

/** Return the most specific parsed command containing a UTF-16 source offset. */
export function findCommandAtOffset(
  document: ZplDocument,
  offset: number
): ZplCommandNode | undefined {
  if (!Number.isInteger(offset) || offset < 0 || offset >= document.source.length) {
    return undefined;
  }

  for (const item of document.items) {
    if (item.kind === "command") {
      if (offset >= item.span.start && offset < item.span.end) return item;
      continue;
    }

    if (offset < item.span.start || offset >= item.span.end) continue;
    return item.commands.find(
      (command) => offset >= command.span.start && offset < command.span.end
    );
  }

  return undefined;
}

function contains(region: HighlightRegion, x: number, y: number): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;

  if (region.type === "circle" && region.radius !== undefined) {
    const dx = x - region.x;
    const dy = y - region.y;
    return dx * dx + dy * dy <= region.radius * region.radius;
  }

  if (region.type === "origin") {
    const dx = x - region.x;
    const dy = y - region.y;
    return dx * dx + dy * dy <= 20 * 20;
  }

  if (
    region.type === "ellipse" &&
    region.width !== undefined &&
    region.height !== undefined &&
    region.width > 0 &&
    region.height > 0
  ) {
    const radiusX = region.width / 2;
    const radiusY = region.height / 2;
    const normalizedX = (x - region.x - radiusX) / radiusX;
    const normalizedY = (y - region.y - radiusY) / radiusY;
    return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
  }

  return (
    region.width !== undefined &&
    region.height !== undefined &&
    x >= region.x &&
    x < region.x + region.width &&
    y >= region.y &&
    y < region.y + region.height
  );
}

/** Return the top-most source-linked region containing a label coordinate. */
export function findHighlightRegionAtPoint(
  regions: readonly HighlightRegion[],
  x: number,
  y: number
): HighlightRegion | undefined {
  for (let index = regions.length - 1; index >= 0; index--) {
    if (contains(regions[index], x, y)) return regions[index];
  }
  return undefined;
}
