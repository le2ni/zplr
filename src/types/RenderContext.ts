import { BarcodeCommand } from "./CommandClass";
import { FieldBlock } from "@/commands/FieldBlock";
import type { SourceSpan } from "./ZplDocument";

export type HighlightRegionType =
  | "box"
  | "circle"
  | "ellipse"
  | "barcode"
  | "origin"
  | "text";

export interface HighlightRegion {
  type: HighlightRegionType;
  commandIndex: number; // Index of the command that created this region
  /** Exact source range for modern renderer regions, including expanded formats. */
  sourceSpan?: SourceSpan;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
}

export interface HighlightTracking {
  // The command index to highlight (if any)
  highlightedCommandIndex?: number;
  // The current command being processed
  currentCommandIndex: number;
  // Collection of all bounding boxes for interactive highlighting
  regions: HighlightRegion[];
  // Track the starting command index for the current field (FieldOrigin)
  currentFieldStartIndex?: number;
  // Track the command index of the FieldData command
  fieldDataCommandIndex?: number;
}

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  x: number;
  y: number;
  fieldX: number;
  fieldY: number;
  barcodeCommand: BarcodeCommand | undefined;
  barcodeDefaults: {
    moduleWidth: number;
    ratio: number;
    height: number;
  };
  fieldBlock: FieldBlock;
  fieldData: string | undefined;
  fontKey: string;
  charHeight: number;
  charWidth: number | undefined;
  rotation: number;
  labelReversePrint: boolean;
  // Platform-specific canvas factory for creating temporary canvases
  createCanvas: (width?: number, height?: number) => any;
  // Platform-specific method to draw canvas to canvas
  drawCanvasToCanvas: (
    targetCtx: CanvasRenderingContext2D,
    sourceCanvas: any,
    x: number,
    y: number
  ) => void;
  // Highlight tracking
  highlight: HighlightTracking;
}
