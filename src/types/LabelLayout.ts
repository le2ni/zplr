import { Orientation } from "./Orientation";
import type {
  DownloadedBitmapFont,
  FontProvider,
} from "./RenderJob";
import { SourceSpan, ZplDiagnostic } from "./ZplDocument";

/** Resource view captured when a downloaded font is selected. */
export interface LayoutFontResources {
  readonly bitmapFonts: ReadonlyMap<string, DownloadedBitmapFont>;
  readonly fontLinks: ReadonlyMap<string, readonly string[]>;
  readonly memoryAliases: ReadonlyMap<string, string>;
  readonly fontProvider?: FontProvider;
}

export interface LayoutFont {
  readonly key: string;
  readonly name?: string;
  readonly height: number;
  readonly width: number;
  readonly orientation: Orientation;
  /** Internal render-session snapshot used to preserve command ordering. */
  readonly resources?: LayoutFontResources;
}

export interface LayoutFieldBlock {
  readonly width: number;
  readonly maxLines: number;
  readonly lineSpacing: number;
  readonly justification: "L" | "C" | "R" | "J";
  readonly hangingIndent: number;
  /** ^TB clips at an explicit block height; ^FB has no height parameter. */
  readonly height?: number;
  readonly mode?: "FB" | "TB";
}

interface BaseLayoutField {
  readonly x: number;
  readonly y: number;
  readonly orientation: Orientation;
  readonly reverse: boolean;
  readonly commandIndex: number;
  readonly sourceSpan: SourceSpan;
}

export interface TextLayoutField extends BaseLayoutField {
  readonly kind: "text";
  readonly data: string;
  readonly font: LayoutFont;
  readonly block?: LayoutFieldBlock;
  readonly typeset?: boolean;
  /** ^FP character-flow direction. */
  readonly direction?: "H" | "V" | "R";
  readonly characterGap?: number;
  /** ^FO/^FT z positions the field relative to its declared origin. */
  readonly originJustification?: "L" | "R" | "A";
  readonly advancedText?: Readonly<{
    defaultGlyph: boolean;
    bidirectional: boolean;
    shaping: boolean;
    openType: boolean;
  }>;
}

export interface BoxLayoutField extends BaseLayoutField {
  readonly kind: "box";
  readonly width: number;
  readonly height: number;
  readonly thickness: number;
  readonly color: "B" | "W";
  readonly rounding: number;
}

export interface CircleLayoutField extends BaseLayoutField {
  readonly kind: "circle";
  readonly diameter: number;
  readonly thickness: number;
  readonly color: "B" | "W";
}

export interface EllipseLayoutField extends BaseLayoutField {
  readonly kind: "ellipse";
  readonly width: number;
  readonly height: number;
  readonly thickness: number;
  readonly color: "B" | "W";
}

export interface DiagonalLayoutField extends BaseLayoutField {
  readonly kind: "diagonal";
  readonly width: number;
  readonly height: number;
  readonly thickness: number;
  readonly color: "B" | "W";
  readonly direction: "L" | "R";
}

export interface BitmapLayoutField extends BaseLayoutField {
  readonly kind: "bitmap";
  readonly width: number;
  readonly height: number;
  readonly bytesPerRow: number;
  readonly data: Uint8Array;
  readonly scaleX: number;
  readonly scaleY: number;
}

export interface GraphicSymbolLayoutField extends BaseLayoutField {
  readonly kind: "symbol";
  readonly code: "A" | "B" | "C" | "D" | "E";
  readonly width: number;
  readonly height: number;
}

interface BaseBarcodeLayoutField extends BaseLayoutField {
  readonly kind: "barcode";
  readonly data: string;
  readonly moduleWidth: number;
  readonly height: number;
  readonly printInterpretationBelow: boolean;
  readonly printInterpretationAbove: boolean;
  readonly interpretationFont: LayoutFont;
  /** Persistent ^CV switch in effect when this field is terminated. */
  readonly validation?: boolean;
}

export interface Code39LayoutField extends BaseBarcodeLayoutField {
  readonly symbology: "B3";
  readonly ratio: number;
  readonly mod43CheckDigit: boolean;
}

export interface Code128LayoutField extends BaseBarcodeLayoutField {
  readonly symbology: "BC";
  readonly uccCheckDigit: boolean;
  readonly mode: "N" | "U" | "A" | "D";
}

export interface QrInputSegment {
  readonly mode: "N" | "A" | "B" | "K";
  readonly data: string;
}

export interface QrStructuredAppend {
  /** Zero-based symbol index stored in the QR structured-append header. */
  readonly index: number;
  readonly total: number;
  readonly parity: number;
}

export interface QrLayoutField extends BaseBarcodeLayoutField {
  readonly symbology: "BQ";
  readonly model: "1" | "2";
  readonly magnification: number;
  readonly reliability: "H" | "Q" | "M" | "L";
  readonly mask: number;
  readonly inputMode: "A" | "M";
  readonly characterMode?: "N" | "A" | "B" | "K";
  readonly segments?: readonly QrInputSegment[];
  readonly structuredAppend?: QrStructuredAppend;
}

export type ExtendedBarcodeSymbology =
  | "B0"
  | "B1"
  | "B2"
  | "B4"
  | "B5"
  | "B7"
  | "B8"
  | "B9"
  | "BA"
  | "BB"
  | "BD"
  | "BE"
  | "BF"
  | "BI"
  | "BJ"
  | "BK"
  | "BL"
  | "BM"
  | "BO"
  | "BP"
  | "BR"
  | "BS"
  | "BT"
  | "BU"
  | "BX"
  | "BZ";

export interface ExtendedBarcodeLayoutField extends BaseBarcodeLayoutField {
  readonly symbology: ExtendedBarcodeSymbology;
  /** BWIPP/bwip-js encoder selected after applying the ZPL command parameters. */
  readonly encoder: string;
  /** True when the encoder returns a module matrix instead of alternating runs. */
  readonly matrix: boolean;
  /** Wide-to-narrow ratio inherited from ^BY for variable-ratio linear symbols. */
  readonly ratio?: number;
  /** ^B7 overall height inherited from ^BY when no row height is supplied. */
  readonly overallHeight?: number;
  readonly encoderOptions: Readonly<Record<string, string | number | boolean>>;
}

export type BarcodeLayoutField =
  | Code39LayoutField
  | Code128LayoutField
  | QrLayoutField
  | ExtendedBarcodeLayoutField;

export type LayoutField =
  | TextLayoutField
  | BoxLayoutField
  | CircleLayoutField
  | EllipseLayoutField
  | DiagonalLayoutField
  | BitmapLayoutField
  | GraphicSymbolLayoutField
  | BarcodeLayoutField;

export interface LayoutOrigin {
  readonly x: number;
  readonly y: number;
  readonly commandIndex: number;
  readonly sourceSpan: SourceSpan;
}

export interface LabelLayout {
  fields: readonly LayoutField[];
  origins: readonly LayoutOrigin[];
  diagnostics: readonly ZplDiagnostic[];
  settings?: Readonly<{
    width?: number;
    height?: number;
    shiftX: number;
    top: number;
    rotate180: boolean;
    mirror: boolean;
    reverse: boolean;
  }>;
}
