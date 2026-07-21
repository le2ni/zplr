import type { SourceSpan } from "./ZplDocument";

export type HighlightRegionType =
  | "box"
  | "circle"
  | "ellipse"
  | "barcode"
  | "origin"
  | "text";

/** Source-linked geometry for a field rendered into a label raster. */
export interface HighlightRegion {
  readonly type: HighlightRegionType;
  readonly sourceSpan: SourceSpan;
  readonly x: number;
  readonly y: number;
  readonly width?: number;
  readonly height?: number;
  readonly radius?: number;
}
