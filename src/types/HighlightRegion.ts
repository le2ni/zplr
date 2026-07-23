import type { SourceSpan } from "./ZplDocument";

export type HighlightRegionType =
  | "box"
  | "circle"
  | "ellipse"
  | "barcode"
  | "origin"
  | "text";

/** A source-text insertion point measured from the glyphs rendered by the printer engine. */
export interface TextCaretStop {
  /** UTF-16 offset in the field data, matching DOM selection offsets. */
  readonly offset: number;
  /** First endpoint of the caret line in label dots. */
  readonly x: number;
  readonly y: number;
  /** Second endpoint of the caret line in label dots. */
  readonly endX: number;
  readonly endY: number;
}

/** Source-linked geometry for a field rendered into a label raster. */
export interface HighlightRegion {
  readonly type: HighlightRegionType;
  readonly sourceSpan: SourceSpan;
  readonly x: number;
  readonly y: number;
  readonly width?: number;
  readonly height?: number;
  readonly radius?: number;
  /** Exact caret geometry for text whose source-to-glyph mapping is unambiguous. */
  readonly textCaretStops?: readonly TextCaretStop[];
}
