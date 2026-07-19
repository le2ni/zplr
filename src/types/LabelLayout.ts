import { Orientation } from "./Orientation";
import { SourceSpan, ZplDiagnostic } from "./ZplDocument";

export interface LayoutFont {
  readonly key: string;
  readonly height: number;
  readonly width: number;
  readonly orientation: Orientation;
}

export interface LayoutFieldBlock {
  readonly width: number;
  readonly maxLines: number;
  readonly lineSpacing: number;
  readonly justification: "L" | "C" | "R" | "J";
  readonly hangingIndent: number;
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

interface BaseBarcodeLayoutField extends BaseLayoutField {
  readonly kind: "barcode";
  readonly data: string;
  readonly moduleWidth: number;
  readonly height: number;
  readonly printInterpretationBelow: boolean;
  readonly printInterpretationAbove: boolean;
  readonly interpretationFont: LayoutFont;
}

export interface Code39LayoutField extends BaseBarcodeLayoutField {
  readonly symbology: "B3";
  readonly ratio: number;
  readonly mod43CheckDigit: boolean;
}

export interface Code128LayoutField extends BaseBarcodeLayoutField {
  readonly symbology: "BC";
  readonly uccCheckDigit: boolean;
  readonly mode: "N" | "A";
}

export interface QrLayoutField extends BaseBarcodeLayoutField {
  readonly symbology: "BQ";
  readonly model: "2";
  readonly magnification: number;
  readonly reliability: "H" | "Q" | "M" | "L";
  readonly mask: number;
  readonly inputMode: "A" | "M";
  readonly characterMode?: "N" | "A" | "B";
}

export type BarcodeLayoutField =
  | Code39LayoutField
  | Code128LayoutField
  | QrLayoutField;

export type LayoutField =
  | TextLayoutField
  | BoxLayoutField
  | CircleLayoutField
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
}
