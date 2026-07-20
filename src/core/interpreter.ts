import { Orientation } from "@/types/Orientation";
import {
  BarcodeLayoutField,
  BitmapLayoutField,
  BoxLayoutField,
  CircleLayoutField,
  DiagonalLayoutField,
  EllipseLayoutField,
  ExtendedBarcodeLayoutField,
  GraphicSymbolLayoutField,
  LabelLayout,
  LayoutField,
  LayoutFieldBlock,
  LayoutFont,
  LayoutOrigin,
  QrLayoutField,
  TextLayoutField,
} from "@/types/LabelLayout";
import {
  SourceSpan,
  ZplCommandNode,
  ZplDiagnostic,
  ZplLabelNode,
} from "@/types/ZplDocument";
import {
  decodeBinaryGraphic,
  decodeGraphic,
  GraphicDecodeError,
} from "./graphicDecoder";
import { isResidentFontKey, residentFontMetrics } from "./bitmapFont";
import {
  MICRO_PDF417_VERSIONS,
  microPdf417DataCapacity,
  pdf417DataCapacity,
  structuredPdf417Parts,
  type StructuredPdf417Part,
} from "./pdf417Structured";

interface BarcodeDefaults {
  moduleWidth: number;
  ratio: number;
  height: number;
}

interface LabelState {
  defaultFont: LayoutFont;
  defaultOrientation: Orientation;
  barcodeDefaults: BarcodeDefaults;
  homeX: number;
  homeY: number;
  reverse: boolean;
  characterSet: number;
  characterSetNode?: ZplCommandNode;
  characterRemap: ReadonlyMap<number, number>;
  measurementUnit: "D" | "I" | "M";
  dotConversion: number;
  encoding?: ReadonlyMap<number, number>;
  advancedText: {
    defaultGlyph: boolean;
    bidirectional: boolean;
    shaping: boolean;
    openType: boolean;
  };
  codeValidation: boolean;
  fontByName?: string;
}

type PendingGraphic =
  | Omit<BoxLayoutField, "x" | "y" | "orientation" | "reverse" | "sourceSpan">
  | Omit<CircleLayoutField, "x" | "y" | "orientation" | "reverse" | "sourceSpan">
  | Omit<EllipseLayoutField, "x" | "y" | "orientation" | "reverse" | "sourceSpan">
  | Omit<DiagonalLayoutField, "x" | "y" | "orientation" | "reverse" | "sourceSpan">
  | Omit<BitmapLayoutField, "x" | "y" | "orientation" | "reverse" | "sourceSpan">;

interface PendingCode39 {
  symbology: "B3";
  commandIndex: number;
  orientation: Orientation;
  height: number;
  mod43CheckDigit: boolean;
  printInterpretationBelow: boolean;
  printInterpretationAbove: boolean;
  moduleWidth: number;
  ratio: number;
  interpretationFont: LayoutFont;
}

interface PendingCode128 {
  symbology: "BC";
  commandIndex: number;
  orientation: Orientation;
  height: number;
  printInterpretationBelow: boolean;
  printInterpretationAbove: boolean;
  uccCheckDigit: boolean;
  mode: "N" | "U" | "A" | "D";
  moduleWidth: number;
  interpretationFont: LayoutFont;
}

interface PendingQr {
  symbology: "BQ";
  commandIndex: number;
  model: "1" | "2";
  magnification: number;
  reliability: "H" | "Q" | "M" | "L";
  mask: number;
}

interface PendingExtendedBarcode {
  symbology: ExtendedBarcodeLayoutField["symbology"];
  encoder: string;
  matrix: boolean;
  commandIndex: number;
  orientation: Orientation;
  moduleWidth: number;
  height: number;
  ratio?: number;
  printInterpretationBelow: boolean;
  printInterpretationAbove: boolean;
  interpretationFont: LayoutFont;
  overallHeight?: number;
  encoderOptions: Record<string, string | number | boolean>;
}

type PendingBarcode =
  | PendingCode39
  | PendingCode128
  | PendingQr
  | PendingExtendedBarcode;

interface FieldState {
  x: number;
  y: number;
  originCommandIndex?: number;
  font?: LayoutFont;
  block?: LayoutFieldBlock;
  reverse: boolean;
  hexIndicator?: string;
  data?: string;
  dataCommandIndex?: number;
  graphic?: PendingGraphic;
  symbol?: Omit<
    GraphicSymbolLayoutField,
    "code" | "x" | "y" | "reverse" | "sourceSpan"
  >;
  barcode?: PendingBarcode;
  spanStart?: number;
  spanEnd?: number;
  labelReverse?: boolean;
  unsupportedSelection?: ZplCommandNode;
  characterSetNode?: ZplCommandNode;
  typeset?: boolean;
  direction?: "H" | "V" | "R";
  characterGap?: number;
  originJustification?: "L" | "R" | "A";
  multipleOrigins?: Array<{ x: number; y: number } | undefined>;
}

export interface StoredGraphic {
  data: Uint8Array;
  bytesPerRow: number;
  width: number;
  height: number;
}

export interface InterpretOptions {
  dpi?: 150 | 200 | 300 | 600;
  labelIndex?: number;
  graphics?: ReadonlyMap<string, StoredGraphic>;
  maxGraphicBytes?: number;
  fontAliases?: ReadonlyMap<string, string>;
  hasFontProvider?: boolean;
  memoryAliases?: ReadonlyMap<string, string>;
  encodings?: ReadonlyMap<string, ReadonlyMap<number, number>>;
}

function newField(): FieldState {
  return { x: 0, y: 0, reverse: false };
}

function semanticDiagnostic(
  code: string,
  message: string,
  node: ZplCommandNode | undefined,
  labelIndex: number,
  severity: "warning" | "error" = "warning"
): ZplDiagnostic {
  return {
    code,
    message,
    severity,
    phase: "semantic",
    span: node?.span,
    command: node?.code,
    labelIndex,
  };
}

function trimmed(value: string | undefined): string {
  return value?.trim() ?? "";
}

function numberValue(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
  integer = false
): number {
  const normalized = trimmed(value);
  if (normalized === "") return fallback;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return fallback;
  const clamped = Math.min(Math.max(parsed, min), max);
  return integer ? Math.trunc(clamped) : clamped;
}

function optionalNumber(
  value: string | undefined,
  min: number,
  max: number,
  integer = false
): number | undefined {
  if (trimmed(value) === "") return undefined;
  return numberValue(value, min, min, max, integer);
}

function orientationValue(
  value: string | undefined,
  fallback: Orientation
): Orientation {
  const orientation = trimmed(value) as Orientation;
  return ["N", "R", "I", "B"].includes(orientation)
    ? orientation
    : fallback;
}

function yesNo(value: string | undefined, fallback: boolean): boolean {
  const normalized = trimmed(value);
  if (normalized === "Y") return true;
  if (normalized === "N") return false;
  return fallback;
}

export function normalizeResourceName(
  value: string,
  defaultExtension: "GRF" | "ZPL" | "DAT" = "GRF",
  memoryAliases?: ReadonlyMap<string, string>
): string {
  let normalized = value.trim().toUpperCase();
  if (!normalized.includes(":")) normalized = `R:${normalized}`;
  if (!/\.[A-Z0-9]+$/.test(normalized)) normalized += `.${defaultExtension}`;
  const drive = normalized[0];
  const mapped = memoryAliases?.get(drive);
  if (mapped) normalized = `${mapped}:${normalized.slice(normalized.indexOf(":") + 1)}`;
  return normalized;
}

function fontRatio(
  key: string,
  dpi: 150 | 200 | 300 | 600,
  fallback: LayoutFont
): number {
  const resident = residentFontMetrics(key, dpi);
  if (resident) return resident.width / resident.height;
  if (key === "0") return 12 / 15;
  return fallback.height > 0 ? fallback.width / fallback.height : 0.6;
}

function resolveDimensions(
  key: string,
  heightValue: number | undefined,
  widthValue: number | undefined,
  fallback: LayoutFont,
  dpi: 150 | 200 | 300 | 600
): Pick<LayoutFont, "height" | "width"> {
  let height = heightValue && heightValue > 0 ? heightValue : undefined;
  let width = widthValue && widthValue > 0 ? widthValue : undefined;
  const ratio = fontRatio(key, dpi, fallback);

  if (height && !width) width = Math.max(1, Math.round(height * ratio));
  if (width && !height) height = Math.max(1, Math.round(width / ratio));
  if (!height) height = fallback.height;
  if (!width) width = fallback.width;
  const resident = residentFontMetrics(key, dpi);
  if (resident) {
    const heightMultiplier = Math.min(
      10,
      Math.max(1, Math.round(height / resident.height))
    );
    const widthMultiplier = Math.min(
      10,
      Math.max(1, Math.round(width / resident.width))
    );
    height = resident.height * heightMultiplier;
    width = resident.width * widthMultiplier;
  }
  return { height, width };
}

function touchField(
  field: FieldState,
  node: ZplCommandNode,
  labelReverse: boolean
): void {
  field.labelReverse ??= labelReverse;
  field.spanStart = Math.min(field.spanStart ?? node.span.start, node.span.start);
  field.spanEnd = Math.max(field.spanEnd ?? node.span.end, node.span.end);
}

function decodeHexFieldData(
  data: string,
  indicator: string | undefined,
  characterSet: number,
  remap: ReadonlyMap<number, number>,
  encoding: ReadonlyMap<number, number> | undefined,
  node: ZplCommandNode,
  diagnostics: ZplDiagnostic[],
  labelIndex: number
): string {
  if (!indicator) {
    return [...data]
      .map((character) => {
        const codePoint = character.codePointAt(0) ?? 0;
        const mapped = codePoint <= 255 ? remap.get(codePoint) : undefined;
        return mapped === undefined
          ? character
          : decodeFieldBytes([mapped], characterSet, new Map(), encoding);
      })
      .join("");
  }
  let result = "";
  let encoded: number[] = [];
  const flushEncoded = () => {
    if (encoded.length === 0) return;
    try {
      result += decodeFieldBytes(encoded, characterSet, remap, encoding);
    } catch {
      diagnostics.push(
        semanticDiagnostic(
          "INVALID_ENCODED_FIELD_DATA",
          `Field hexadecimal bytes are not valid for ^CI${characterSet}.`,
          node,
          labelIndex,
          "error"
        )
      );
      result += "\uFFFD";
    }
    encoded = [];
  };
  for (let index = 0; index < data.length; index++) {
    if (data[index] !== indicator) {
      flushEncoded();
      const codePoint = data.codePointAt(index) ?? 0;
      const mapped = codePoint <= 255 ? remap.get(codePoint) : undefined;
      result +=
        mapped === undefined
          ? data[index]
          : decodeFieldBytes([mapped], characterSet, new Map(), encoding);
      continue;
    }

    const hex = data.slice(index + 1, index + 3);
    if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
      encoded.push(Number.parseInt(hex, 16));
      index += 2;
    } else {
      flushEncoded();
      diagnostics.push(
        semanticDiagnostic(
          "INVALID_HEX_ESCAPE",
          `Expected two hexadecimal digits after ${indicator}.`,
          node,
          labelIndex,
          "error"
        )
      );
      result += indicator;
    }
  }
  flushEncoded();
  return result;
}

const CP850_HIGH =
  "ÇüéâäàåçêëèïîìÄÅÉæÆôöòûùÿÖÜø£Ø×ƒáíóúñÑªº¿®¬½¼¡«»░▒▓│┤ÁÂÀ©╣║╗╝¢¥┐└┴┬├─┼ãÃ╚╔╩╦╠═╬¤ðÐÊËÈıÍÎÏ┘┌█▄¦Ì▀ÓßÔÒõÕµþÞÚÛÙýÝ¯´\u00AD±‗¾¶§÷¸°¨·¹³²■\u00A0";
const CP1252_CONTROLS =
  "€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008DŽ\u008F\u0090‘’“”•–—˜™š›œ\u009DžŸ";

const INTERNATIONAL_REPLACEMENTS: readonly Readonly<Record<number, string>>[] = [
  {},
  {},
  { 35: "£" },
  { 35: "£", 64: "¾", 91: "ĳ", 92: "½", 93: "|", 123: "¨", 124: "ƒ", 125: "¼", 126: "´" },
  { 35: "£", 91: "Æ", 92: "Ø", 93: "Å", 123: "æ", 124: "ø", 125: "å" },
  { 64: "É", 91: "Ä", 92: "Ö", 93: "Å", 94: "Ü", 96: "é", 123: "ä", 124: "ö", 125: "å", 126: "ü" },
  { 64: "§", 91: "Ä", 92: "Ö", 93: "Ü", 123: "ä", 124: "ö", 125: "ü", 126: "ß" },
  { 35: "£", 64: "à", 91: "°", 92: "ç", 93: "§", 123: "é", 124: "ù", 125: "è", 126: "¨" },
  { 35: "£", 64: "à", 91: "°", 92: "ç", 93: "§", 123: "é", 124: "ù", 125: "è", 126: "¨" },
  { 35: "£", 64: "§", 91: "°", 92: "ç", 93: "é", 96: "ù", 123: "à", 124: "ò", 125: "è", 126: "ì" },
  { 35: "£", 64: "§", 91: "¡", 92: "Ñ", 93: "¿", 123: "°", 124: "ñ", 125: "ç" },
  {},
  { 92: "¥", 126: "‾" },
];

const ZEBRA_CONTROL_GLYPHS: Readonly<Record<number, string>> = {
  21: "€",
};

function decodeTableBytes(
  bytes: readonly number[],
  characterSet: number,
  encoding: ReadonlyMap<number, number>
): string {
  let result = "";
  for (let index = 0; index < bytes.length; ) {
    if (characterSet === 26 && bytes[index] <= 0x7f) {
      result += String.fromCharCode(bytes[index++]);
      continue;
    }
    const pairMode = characterSet === 14 || characterSet === 26;
    const input = pairMode
      ? ((bytes[index] ?? 0) << 8) | (bytes[index + 1] ?? 0)
      : bytes[index];
    const mapped = encoding.get(input);
    result += mapped === undefined ? "\uFFFD" : String.fromCodePoint(mapped);
    index += pairMode ? 2 : 1;
  }
  return result;
}

function decodeFieldBytes(
  input: readonly number[],
  characterSet: number,
  remap: ReadonlyMap<number, number> = new Map(),
  encoding?: ReadonlyMap<number, number>
): string {
  const bytes = input.map((byte) => remap.get(byte) ?? byte);
  if ([14, 24, 26].includes(characterSet) && encoding) {
    return decodeTableBytes(bytes, characterSet, encoding);
  }
  const decoderName =
    characterSet === 15
      ? "shift_jis"
      : characterSet === 16
      ? "euc-jp"
      : characterSet === 17 || characterSet === 29
      ? "utf-16be"
      : characterSet === 30
      ? "utf-16le"
      : characterSet === 31
      ? "windows-1250"
      : characterSet === 33
      ? "windows-1251"
      : characterSet === 34
      ? "windows-1253"
      : characterSet === 35
      ? "windows-1254"
      : characterSet === 36
      ? "windows-1255"
      : characterSet === 27
      ? "windows-1252"
      : characterSet === 28
      ? "utf-8"
      : characterSet === 26
      ? "gb18030"
      : undefined;
  if (decoderName) {
    return new TextDecoder(decoderName, { fatal: true }).decode(
      Uint8Array.from(bytes)
    );
  }
  return bytes
    .map((byte) => {
      const control = ZEBRA_CONTROL_GLYPHS[byte];
      if (control) return control;
      const replacement = INTERNATIONAL_REPLACEMENTS[characterSet]?.[byte];
      if (replacement) return replacement;
      if (byte < 0x80) return String.fromCharCode(byte);
      return CP850_HIGH[byte - 0x80] ?? "\uFFFD";
    })
    .join("");
}

function fieldNumberValues(
  commands: readonly ZplCommandNode[]
): Map<string, string> {
  const values = new Map<string, string>();
  for (let index = 0; index < commands.length; index++) {
    if (commands[index].code !== "FN") continue;
    const number = trimmed(commands[index].parameters[0]).match(/^\d+/)?.[0];
    if (!number) continue;
    for (let cursor = index + 1; cursor < commands.length; cursor++) {
      const command = commands[cursor];
      if (["FD", "FV"].includes(command.code)) {
        values.set(number, command.rawParameters);
        break;
      }
      if (command.code === "SN") {
        values.set(number, command.parameters[0] ?? "1");
        break;
      }
      if (command.code === "FS" || command.code === "FN") break;
    }
  }
  return values;
}

function concatenateFieldData(
  data: string,
  indicator: string,
  values: ReadonlyMap<string, string>
): string {
  if (!indicator) return data;
  let result = "";
  let cursor = 0;
  while (cursor < data.length) {
    const start = data.indexOf(indicator, cursor);
    if (start < 0) return result + data.slice(cursor);
    const end = data.indexOf(indicator, start + indicator.length);
    if (end < 0) return result + data.slice(cursor);
    result += data.slice(cursor, start);
    const descriptor = data.slice(start + indicator.length, end);
    const parts = descriptor.split(",").map((part) => part.trim());
    const source = /^\d+$/.test(parts[0] ?? "")
      ? values.get(parts[0])
      : undefined;
    if (source === undefined) {
      result += data.slice(start, end + indicator.length);
    } else if (parts.length === 1) {
      result += source;
    } else {
      const direction = parts[1]?.toLowerCase();
      const position = Number.parseInt(parts[2] ?? "", 10);
      const count = Number.parseInt(parts[3] ?? "", 10);
      if (
        (direction === "f" || direction === "b") &&
        position > 0 &&
        count >= 0
      ) {
        if (direction === "f") {
          result += source.slice(position - 1, position - 1 + count);
        } else {
          const last = source.length - position;
          result += source.slice(Math.max(0, last - count + 1), last + 1);
        }
      }
    }
    cursor = end + indicator.length;
  }
  return result;
}

function applyEncodingTable(
  value: string,
  mapping: ReadonlyMap<number, number> | undefined
): string {
  if (!mapping) return value;
  return [...value]
    .map((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      const mapped = mapping.get(codePoint);
      return mapped === undefined ? character : String.fromCodePoint(mapped);
    })
    .join("");
}

function parseQrData(
  data: string,
  barcode: PendingQr,
  node: ZplCommandNode | undefined,
  diagnostics: ZplDiagnostic[],
  labelIndex: number
): Pick<
  QrLayoutField,
  | "data"
  | "reliability"
  | "inputMode"
  | "characterMode"
  | "segments"
  | "structuredAppend"
> | undefined {
  let input = data;
  let structuredAppend: QrLayoutField["structuredAppend"];
  const divided = /^D(\d{2})(\d{2})([0-9A-Fa-f]{2}),/.exec(input);
  if (divided) {
    const symbol = Number(divided[1]);
    const total = Number(divided[2]);
    if (symbol < 1 || symbol > 16 || total < 2 || total > 16 || symbol > total) {
      diagnostics.push(
        semanticDiagnostic(
          "INVALID_QR_STRUCTURED_APPEND",
          "QR structured append requires a symbol number from 01 to the declared total and a total from 02 to 16.",
          node,
          labelIndex,
          "error"
        )
      );
      return undefined;
    }
    structuredAppend = {
      index: symbol - 1,
      total,
      parity: Number.parseInt(divided[3], 16),
    };
    input = input.slice(divided[0].length);
  }

  const match = /^([HQML])([AM]),/.exec(input);
  if (!match) {
    diagnostics.push(
      semanticDiagnostic(
        "INVALID_QR_FIELD_DATA",
        "QR field data must begin with an optional DiiJJxx, structured-append header followed by an error-correction level and A, or M, input mode.",
        node,
        labelIndex,
        "error"
      )
    );
    return undefined;
  }

  const reliability = match[1] as "H" | "Q" | "M" | "L";
  const inputMode = match[2] as "A" | "M";
  let payload = input.slice(3);
  let characterMode: "N" | "A" | "B" | "K" | undefined;
  let segments: QrLayoutField["segments"];

  if (inputMode === "M") {
    const parsed: Array<{ mode: "N" | "A" | "B" | "K"; data: string }> = [];
    let cursor = 0;
    while (cursor < payload.length) {
      const requestedMode = payload[cursor++] as "N" | "A" | "B" | "K";
      if (!["N", "A", "B", "K"].includes(requestedMode)) {
        diagnostics.push(
          semanticDiagnostic(
            "INVALID_QR_CHARACTER_MODE",
            "QR manual input requires each segment to begin with N, A, B, or K character mode.",
            node,
            labelIndex,
            "error"
          )
        );
        return undefined;
      }

      let segmentData = "";
      if (requestedMode === "B") {
        const length = payload.slice(cursor, cursor + 4);
        if (!/^\d{4}$/.test(length)) {
          diagnostics.push(
            semanticDiagnostic(
              "INVALID_QR_BYTE_LENGTH",
              "QR manual byte input requires a four-digit byte count.",
              node,
              labelIndex,
              "error"
            )
          );
          return undefined;
        }
        cursor += 4;
        const byteCount = Number(length);
        segmentData = payload.slice(cursor, cursor + byteCount);
        cursor += segmentData.length;
        if (
          segmentData.length !== byteCount ||
          [...segmentData].some((character) => (character.codePointAt(0) ?? 0) > 255)
        ) {
          diagnostics.push(
            semanticDiagnostic(
              segmentData.length !== byteCount
                ? "INVALID_QR_BYTE_LENGTH"
                : "INVALID_QR_BYTE_DATA",
              segmentData.length !== byteCount
                ? "QR manual byte input does not match its declared byte count."
                : "QR manual byte input supports 8-bit character values only.",
              node,
              labelIndex,
              "error"
            )
          );
          return undefined;
        }
      } else {
        const separator = payload.indexOf(",", cursor);
        const end = separator < 0 ? payload.length : separator;
        segmentData = payload.slice(cursor, end);
        cursor = end;
      }

      if (segmentData.length === 0) {
        diagnostics.push(
          semanticDiagnostic(
            "INVALID_QR_FIELD_DATA",
            "QR manual input segments cannot be empty.",
            node,
            labelIndex,
            "error"
          )
        );
        return undefined;
      }
      if (requestedMode === "N" && !/^\d+$/.test(segmentData)) {
        diagnostics.push(
          semanticDiagnostic(
            "INVALID_QR_NUMERIC_DATA",
            "QR manual numeric input can contain digits only.",
            node,
            labelIndex,
            "error"
          )
        );
        return undefined;
      }
      if (requestedMode === "A" && !/^[0-9A-Z $%*+\-./:]+$/.test(segmentData)) {
        diagnostics.push(
          semanticDiagnostic(
            "INVALID_QR_ALPHANUMERIC_DATA",
            "QR manual alphanumeric input contains unsupported characters.",
            node,
            labelIndex,
            "error"
          )
        );
        return undefined;
      }
      parsed.push({ mode: requestedMode, data: segmentData });

      if (cursor < payload.length) {
        if (payload[cursor] !== ",") {
          diagnostics.push(
            semanticDiagnostic(
              parsed[parsed.length - 1]?.mode === "B"
                ? "INVALID_QR_BYTE_LENGTH"
                : "INVALID_QR_FIELD_DATA",
              parsed[parsed.length - 1]?.mode === "B"
                ? "QR manual byte input does not match its declared byte count."
                : "QR manual mixed-mode segments must be separated by commas.",
              node,
              labelIndex,
              "error"
            )
          );
          return undefined;
        }
        cursor++;
      }
    }
    segments = parsed;
    characterMode = parsed.length === 1 ? parsed[0].mode : undefined;
    payload = parsed.map((segment) => segment.data).join("");
  }

  if (payload.length === 0) {
    diagnostics.push(
      semanticDiagnostic(
        "INVALID_QR_FIELD_DATA",
        "QR field data payload is empty.",
        node,
        labelIndex,
        "error"
      )
    );
    return undefined;
  }

  return {
    data: payload,
    reliability: reliability ?? barcode.reliability,
    inputMode,
    characterMode,
    segments,
    structuredAppend,
  };
}

export function interpretLabel(
  label: ZplLabelNode,
  options: InterpretOptions = {}
): LabelLayout {
  const labelIndex = options.labelIndex ?? 0;
  const dpi = options.dpi ?? 300;
  const fields: LayoutField[] = [];
  const origins: LayoutOrigin[] = [];
  const diagnostics: ZplDiagnostic[] = [];
  const settings = {
    width: undefined as number | undefined,
    height: undefined as number | undefined,
    shiftX: 0,
    top: 0,
    rotate180: false,
    mirror: false,
    reverse: false,
  };
  const labelState: LabelState = {
    defaultFont: { key: "A", height: 9, width: 5, orientation: "N" },
    defaultOrientation: "N",
    barcodeDefaults: { moduleWidth: 2, ratio: 3, height: 10 },
    homeX: 0,
    homeY: 0,
    reverse: false,
    characterSet: 0,
    characterRemap: new Map(),
    measurementUnit: "D",
    dotConversion: 1,
    advancedText: {
      defaultGlyph: false,
      bidirectional: false,
      shaping: false,
      openType: false,
    },
    codeValidation: false,
  };
  const fnValues = fieldNumberValues(label.commands);
  const dotsPerMillimeter =
    dpi === 150 ? 6 : dpi === 200 ? 8 : dpi === 300 ? 12 : 24;
  const measurementScale = (): number => {
    if (labelState.measurementUnit === "I") return dotsPerMillimeter * 25.4;
    if (labelState.measurementUnit === "M") return dotsPerMillimeter;
    return labelState.dotConversion;
  };
  const dotValue = (
    value: string | undefined,
    fallback: number,
    min: number,
    max: number,
    integer = true
  ): number => {
    const normalized = trimmed(value);
    if (normalized === "") return fallback;
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return fallback;
    const scaled = parsed * measurementScale();
    const clamped = Math.min(Math.max(scaled, min), max);
    return integer ? Math.round(clamped) : clamped;
  };
  const optionalDot = (
    value: string | undefined,
    min: number,
    max: number,
    integer = true
  ): number | undefined =>
    trimmed(value) === "" ? undefined : dotValue(value, min, min, max, integer);
  let field = newField();

  const finalizeField = (separator?: ZplCommandNode, unterminated = false) => {
    if (separator) touchField(field, separator, labelState.reverse);
    const hasContent =
      field.data !== undefined ||
      field.graphic !== undefined ||
      field.symbol !== undefined ||
      field.barcode !== undefined;
    if (!hasContent) {
      field = newField();
      return;
    }

    if (unterminated) {
      diagnostics.push(
        semanticDiagnostic(
          "UNTERMINATED_FIELD",
          "The final field was rendered without an FS terminator.",
          label.commands[label.commands.length - 1],
          labelIndex
        )
      );
    }

    const sourceSpan: SourceSpan = {
      start: field.spanStart ?? separator?.span.start ?? label.span.start,
      end: field.spanEnd ?? separator?.span.end ?? label.span.end,
    };
    const reverse = field.reverse || Boolean(field.labelReverse);

    if (field.data !== undefined && field.characterSetNode) {
      diagnostics.push(
        semanticDiagnostic(
          "UNSUPPORTED_CHARACTER_SET",
          `${field.characterSetNode.code}${field.characterSetNode.rawParameters} character-set mapping was not applied to this field.`,
          field.characterSetNode,
          labelIndex
        )
      );
    }

    if (field.unsupportedSelection) {
      diagnostics.push(
        semanticDiagnostic(
          "UNSUPPORTED_FIELD_SELECTION",
          `${field.unsupportedSelection.code} fields are not rendered by this profile.`,
          field.unsupportedSelection,
          labelIndex
        )
      );
    } else if (field.symbol) {
      const symbolCode = field.data?.trim().toUpperCase()[0];
      if (!symbolCode || !["A", "B", "C", "D", "E"].includes(symbolCode)) {
        diagnostics.push(
          semanticDiagnostic(
            "INVALID_GRAPHIC_SYMBOL",
            "^GS field data must select graphic symbol A, B, C, D, or E.",
            separator,
            labelIndex,
            "error"
          )
        );
      } else {
        fields.push({
          ...field.symbol,
          code: symbolCode as "A" | "B" | "C" | "D" | "E",
          x: field.x,
          y: field.y,
          reverse,
          sourceSpan,
        });
      }
    } else if (field.graphic) {
      fields.push({
        ...field.graphic,
        x: field.x,
        y: field.y,
        orientation: "N",
        reverse,
        sourceSpan,
      } as LayoutField);
    } else if (field.barcode) {
      if (
        "printInterpretationBelow" in field.barcode &&
        (field.barcode.printInterpretationBelow ||
          field.barcode.printInterpretationAbove) &&
        field.barcode.interpretationFont.key !== "0" &&
        !isResidentFontKey(field.barcode.interpretationFont.key) &&
        !field.barcode.interpretationFont.name
      ) {
        diagnostics.push(
          semanticDiagnostic(
            "FONT_SUBSTITUTED",
            `Font ${
              field.barcode.interpretationFont.name ??
              field.barcode.interpretationFont.key
            } uses the deterministic fallback font.`,
            label.commands[field.barcode.commandIndex],
            labelIndex
          )
        );
      }
      const dataNode =
        field.dataCommandIndex === undefined
          ? undefined
          : label.commands[field.dataCommandIndex];
      if (field.data === undefined) {
        diagnostics.push(
          semanticDiagnostic(
            "MISSING_BARCODE_DATA",
            "A barcode command requires field data before FS.",
            dataNode ?? separator,
            labelIndex,
            "error"
          )
        );
      } else if (field.barcode.symbology === "B3") {
        const barcode = field.barcode;
        fields.push({
          kind: "barcode",
          symbology: "B3",
          data: field.data,
          x: field.x,
          y: field.y,
          orientation: barcode.orientation,
          reverse,
          commandIndex: barcode.commandIndex,
          sourceSpan,
          moduleWidth: barcode.moduleWidth,
          ratio: barcode.ratio,
          height: barcode.height,
          mod43CheckDigit: barcode.mod43CheckDigit,
          printInterpretationBelow: barcode.printInterpretationBelow,
          printInterpretationAbove: barcode.printInterpretationAbove,
          interpretationFont: barcode.interpretationFont,
          validation: labelState.codeValidation,
        });
      } else if (field.barcode.symbology === "BC") {
        const barcode = field.barcode;
        fields.push({
          kind: "barcode",
          symbology: "BC",
          data: field.data,
          x: field.x,
          y: field.y,
          orientation: barcode.orientation,
          reverse,
          commandIndex: barcode.commandIndex,
          sourceSpan,
          moduleWidth: barcode.moduleWidth,
          height: barcode.height,
          uccCheckDigit: barcode.uccCheckDigit,
          mode: barcode.mode,
          printInterpretationBelow: barcode.printInterpretationBelow,
          printInterpretationAbove: barcode.printInterpretationAbove,
          interpretationFont: barcode.interpretationFont,
          validation: labelState.codeValidation,
        });
      } else if (field.barcode.symbology === "BQ") {
        const barcode = field.barcode;
        const qrData = parseQrData(
          field.data,
          barcode,
          dataNode,
          diagnostics,
          labelIndex
        );
        if (qrData) {
          fields.push({
            kind: "barcode",
            symbology: "BQ",
            ...qrData,
            model: barcode.model,
            x: field.x,
            y: field.y,
            orientation: "N",
            reverse,
            commandIndex: barcode.commandIndex,
            sourceSpan,
            moduleWidth: barcode.magnification,
            height: 0,
            magnification: barcode.magnification,
            mask: barcode.mask,
            printInterpretationBelow: false,
            printInterpretationAbove: false,
            interpretationFont: { ...labelState.defaultFont },
            validation: labelState.codeValidation,
          });
        }
      } else {
        const barcode = field.barcode;
        const structured = Boolean(
          field.multipleOrigins &&
            (barcode.symbology === "B7" || barcode.symbology === "BF")
        );
        let parts: StructuredPdf417Part[] = [
          {
            source: field.data,
            encodedData: field.data,
            raw: false,
            index: 0,
            total: 1,
          },
        ];
        if (structured) {
          const capacity =
            barcode.symbology === "B7"
              ? pdf417DataCapacity(
                  Number(barcode.encoderOptions.eclevel ?? 0),
                  Number(barcode.encoderOptions.columns ?? 0),
                  Number(barcode.encoderOptions.rows ?? 0)
                )
              : microPdf417DataCapacity(
                  Number(barcode.encoderOptions.zplMode ?? 0)
                );
          try {
            parts = structuredPdf417Parts(
              field.data,
              capacity,
              barcode.symbology === "BF" ? "micropdf417" : "pdf417"
            );
          } catch (error) {
            diagnostics.push(
              semanticDiagnostic(
                "STRUCTURED_APPEND_ENCODING_FAILED",
                error instanceof Error
                  ? error.message
                  : "The PDF417 structured-append data could not be encoded.",
                label.commands[barcode.commandIndex],
                labelIndex,
                "error"
              )
            );
            parts = [];
          }
        }
        if (
          structured &&
          field.multipleOrigins &&
          parts.length > field.multipleOrigins.length
        ) {
          diagnostics.push(
            semanticDiagnostic(
              "INSUFFICIENT_STRUCTURED_APPEND_ORIGINS",
              `^FM supplied ${field.multipleOrigins.length} locations for ${parts.length} required symbols.`,
              label.commands[barcode.commandIndex],
              labelIndex,
              "error"
            )
          );
        } else {
          parts.forEach((part, index) => {
            const location = structured ? field.multipleOrigins?.[index] : undefined;
            if (structured && !location) return;
            fields.push({
              kind: "barcode",
              symbology: barcode.symbology,
              encoder: barcode.encoder,
              matrix: barcode.matrix,
              data: part.encodedData,
              x: location?.x ?? field.x,
              y: location?.y ?? field.y,
              orientation: barcode.orientation,
              reverse,
              commandIndex: barcode.commandIndex,
              sourceSpan,
              moduleWidth: barcode.moduleWidth,
              height: barcode.height,
              ratio: barcode.ratio,
              overallHeight: barcode.overallHeight,
              printInterpretationBelow: barcode.printInterpretationBelow,
              printInterpretationAbove: barcode.printInterpretationAbove,
              interpretationFont: barcode.interpretationFont,
              validation: labelState.codeValidation,
              encoderOptions: {
                ...barcode.encoderOptions,
                ...(part.raw ? { raw: true } : {}),
                ...(structured
                  ? {
                      zplSegmentIndex: part.index + 1,
                      zplSegmentTotal: part.total,
                    }
                  : {}),
              },
            });
          });
        }
      }
    } else if (field.data !== undefined) {
      const font = field.font ?? labelState.defaultFont;
      const commandIndex = field.dataCommandIndex ?? field.originCommandIndex ?? 0;
      if (
        font.key !== "0" &&
        !isResidentFontKey(font.key) &&
        !font.name
      ) {
        diagnostics.push(
          semanticDiagnostic(
            "FONT_SUBSTITUTED",
            `Font ${font.name ?? font.key} uses the deterministic fallback font.`,
            label.commands[commandIndex],
            labelIndex
          )
        );
      }
      const textField: TextLayoutField = {
        kind: "text",
        data: field.data,
        x: field.x,
        y: field.typeset ? field.y - font.height : field.y,
        orientation: font.orientation,
        reverse,
        commandIndex,
        sourceSpan,
        font: { ...font },
        block: field.block ? { ...field.block } : undefined,
        typeset: field.typeset,
        direction: field.direction ?? "H",
        characterGap: field.characterGap ?? 0,
        originJustification: field.originJustification ?? "L",
        advancedText: { ...labelState.advancedText },
      };
      fields.push(textField);
    }

    field = newField();
  };

  for (const node of label.commands) {
    const args = node.parameters;
    if (
      node.code !== "GS" &&
      (["A", "A@", "GB", "GC", "GD", "GE", "GF", "XG", "IM"].includes(node.code) ||
        node.code.startsWith("B"))
    ) {
      field.symbol = undefined;
    }
    switch (node.code) {
      case "XA":
      case "XZ":
      case "CC":
      case "CD":
      case "CT":
      case "FX":
      case "DF":
      case "XF":
      case "ID":
      case "CW":
        break;
      case "MU": {
        const unit = trimmed(args[0]).toUpperCase();
        if (["D", "I", "M"].includes(unit)) {
          labelState.measurementUnit = unit as "D" | "I" | "M";
        }
        const base = Number(args[1]);
        const desired = Number(args[2]);
        labelState.dotConversion =
          Number.isFinite(base) &&
          Number.isFinite(desired) &&
          base > 0 &&
          desired > 0
            ? desired / base
            : 1;
        break;
      }
      case "SE": {
        const name = normalizeResourceName(
          trimmed(args[0]),
          "DAT",
          options.memoryAliases
        );
        labelState.encoding = options.encodings?.get(name);
        if (!labelState.encoding) {
          diagnostics.push(
            semanticDiagnostic(
              "MISSING_ENCODING_RESOURCE",
              `Encoding table ${name} is not present in this render session.`,
              node,
              labelIndex,
              "error"
            )
          );
        }
        break;
      }
      case "PA":
        labelState.advancedText = {
          defaultGlyph: trimmed(args[0]) === "1",
          bidirectional: trimmed(args[1]) === "1",
          shaping: trimmed(args[2]) === "1",
          openType: trimmed(args[3]) === "1",
        };
        break;
      case "CV":
        labelState.codeValidation = yesNo(args[0], false);
        break;
      case "PW":
        settings.width = dotValue(args[0], settings.width ?? 0, 1, 32000);
        break;
      case "LL":
        settings.height = dotValue(args[0], settings.height ?? 0, 1, 32000);
        break;
      case "LS":
        settings.shiftX = -dotValue(args[0], 0, -9999, 9999);
        break;
      case "LT":
        settings.top = dotValue(args[0], 0, -9999, 9999);
        break;
      case "PO":
        settings.rotate180 = trimmed(args[0]) === "I";
        break;
      case "PM":
        settings.mirror = yesNo(args[0], true);
        break;
      case "CF": {
        const keyCandidate = trimmed(args[0]);
        const key = /^[A-Z0-9]$/.test(keyCandidate)
          ? keyCandidate
          : keyCandidate === ""
          ? labelState.defaultFont.key
          : "A";
        const dimensions = resolveDimensions(
          key,
          optionalDot(args[1], 0, 32000),
          optionalDot(args[2], 0, 32000),
          labelState.defaultFont,
          dpi
        );
        labelState.defaultFont = {
          key,
          name: options.fontAliases?.get(key),
          ...dimensions,
          orientation: labelState.defaultOrientation,
        };
        break;
      }
      case "FW":
        labelState.defaultOrientation = orientationValue(
          args[0],
          labelState.defaultOrientation
        );
        labelState.defaultFont = {
          ...labelState.defaultFont,
          orientation: labelState.defaultOrientation,
        };
        break;
      case "LH":
        labelState.homeX = dotValue(args[0], 0, 0, 32000);
        labelState.homeY = dotValue(args[1], 0, 0, 32000);
        break;
      case "LR":
        labelState.reverse = yesNo(args[0], true);
        break;
      case "BY":
        labelState.barcodeDefaults = {
          moduleWidth: numberValue(
            trimmed(args[0]) === ""
              ? undefined
              : String(dotValue(args[0], labelState.barcodeDefaults.moduleWidth, 1, 10)),
            labelState.barcodeDefaults.moduleWidth,
            1,
            10,
            true
          ),
          ratio:
            Math.round(
              numberValue(
                args[1],
                labelState.barcodeDefaults.ratio,
                2,
                3
              ) * 10
            ) / 10,
          height: numberValue(
            trimmed(args[2]) === ""
              ? undefined
              : String(dotValue(args[2], labelState.barcodeDefaults.height, 1, 32000)),
            labelState.barcodeDefaults.height,
            1,
            32000,
            true
          ),
        };
        break;
      case "FO":
        field.x =
          labelState.homeX +
          settings.shiftX +
          dotValue(args[0], 0, 0, 32000);
        field.y =
          labelState.homeY +
          settings.top +
          dotValue(args[1], 0, 0, 32000);
        field.typeset = false;
        field.originJustification =
          trimmed(args[2]) === "1"
            ? "R"
            : trimmed(args[2]) === "2"
            ? "A"
            : "L";
        field.originCommandIndex = node.index;
        touchField(field, node, labelState.reverse);
        origins.push({
          x: field.x,
          y: field.y,
          commandIndex: node.index,
          sourceSpan: { ...node.span },
        });
        break;
      case "FT":
        field.x =
          labelState.homeX +
          settings.shiftX +
          dotValue(args[0], field.x, 0, 32000);
        field.y =
          labelState.homeY +
          settings.top +
          dotValue(args[1], field.y, 0, 32000);
        field.typeset = true;
        field.originJustification =
          trimmed(args[2]) === "1"
            ? "R"
            : trimmed(args[2]) === "2"
            ? "A"
            : "L";
        field.originCommandIndex = node.index;
        touchField(field, node, labelState.reverse);
        origins.push({
          x: field.x,
          y: field.y,
          commandIndex: node.index,
          sourceSpan: { ...node.span },
        });
        break;
      case "A": {
        const fontAndOrientation = trimmed(args[0]);
        const key = fontAndOrientation[0] || labelState.defaultFont.key;
        const orientation = orientationValue(
          fontAndOrientation[1],
          labelState.defaultOrientation
        );
        field.font = {
          key,
          name: options.fontAliases?.get(key),
          ...resolveDimensions(
            key,
            optionalDot(args[1], 0, 32000),
            optionalDot(args[2], 0, 32000),
            labelState.defaultFont,
            dpi
          ),
          orientation,
        };
        field.unsupportedSelection = undefined;
        field.barcode = undefined;
        field.graphic = undefined;
        touchField(field, node, labelState.reverse);
        break;
      }
      case "A@": {
        const orientation = orientationValue(args[0], labelState.defaultOrientation);
        const requestedName = trimmed(args[3]);
        if (requestedName) labelState.fontByName = requestedName;
        const name = labelState.fontByName;
        const key = name ? "@" : labelState.defaultFont.key;
        field.font = {
          key,
          ...(name
            ? { name }
            : labelState.defaultFont.name
            ? { name: labelState.defaultFont.name }
            : {}),
          ...resolveDimensions(
            name ? "0" : key,
            optionalDot(args[1], 0, 32000),
            optionalDot(args[2], 0, 32000),
            labelState.defaultFont,
            dpi
          ),
          orientation,
        };
        field.unsupportedSelection = undefined;
        field.barcode = undefined;
        field.graphic = undefined;
        touchField(field, node, labelState.reverse);
        break;
      }
      case "FB":
        field.block = {
          width: dotValue(args[0], 0, 0, 32000),
          maxLines: numberValue(args[1], 1, 1, 9999, true),
          lineSpacing: dotValue(args[2], 0, -9999, 9999),
          justification: ["L", "C", "R", "J"].includes(trimmed(args[3]))
            ? (trimmed(args[3]) as "L" | "C" | "R" | "J")
            : "L",
          hangingIndent: dotValue(args[4], 0, 0, 9999),
          mode: "FB",
        };
        touchField(field, node, labelState.reverse);
        break;
      case "TB": {
        const orientation = orientationValue(
          args[0],
          field.font?.orientation ?? labelState.defaultOrientation
        );
        field.font = {
          ...(field.font ?? labelState.defaultFont),
          orientation,
        };
        field.block = {
          width: dotValue(args[1], 1, 1, 32000),
          height: dotValue(args[2], 1, 1, 32000),
          maxLines: 9999,
          lineSpacing: 0,
          justification:
            field.originJustification === "R" ? "R" : "L",
          hangingIndent: 0,
          mode: "TB",
        };
        touchField(field, node, labelState.reverse);
        break;
      }
      case "FP": {
        const direction = trimmed(args[0]).toUpperCase();
        field.direction = ["H", "V", "R"].includes(direction)
          ? (direction as "H" | "V" | "R")
          : "H";
        field.characterGap = dotValue(args[1], 0, 0, 9999);
        touchField(field, node, labelState.reverse);
        break;
      }
      case "FM": {
        const locations: Array<{ x: number; y: number } | undefined> = [];
        for (let index = 0; index + 1 < args.length && locations.length < 60; index += 2) {
          if (
            trimmed(args[index]).toLowerCase() === "e" ||
            trimmed(args[index + 1]).toLowerCase() === "e"
          ) {
            locations.push(undefined);
          } else {
            locations.push({
              x:
                labelState.homeX +
                settings.shiftX +
                dotValue(args[index], 0, 0, 32000),
              y:
                labelState.homeY +
                settings.top +
                dotValue(args[index + 1], 0, 0, 32000),
            });
          }
        }
        field.multipleOrigins = locations;
        touchField(field, node, labelState.reverse);
        break;
      }
      case "FR":
        field.reverse = true;
        touchField(field, node, labelState.reverse);
        break;
      case "FH":
        field.hexIndicator = node.rawParameters[0] || "_";
        touchField(field, node, labelState.reverse);
        break;
      case "FN": {
        const number = trimmed(args[0]).match(/^\d+/)?.[0];
        const inherited = number ? fnValues.get(number) : undefined;
        if (inherited !== undefined) {
          field.font ??= { ...labelState.defaultFont };
          field.characterSetNode ??= labelState.characterSetNode;
          field.data = inherited;
          field.dataCommandIndex = node.index;
          touchField(field, node, labelState.reverse);
        }
        break;
      }
      case "FE":
        // ^FE applies only when it immediately precedes ^FD. The ^FD case
        // intentionally performs the expansion so intervening commands cancel it.
        break;
      case "FD":
      case "FV":
        field.font ??= { ...labelState.defaultFont };
        field.characterSetNode ??= labelState.characterSetNode;
        {
          const previous = label.commands[node.index - 1];
          const concatenated =
            node.code === "FD" && previous?.code === "FE"
              ? concatenateFieldData(
                  node.rawParameters,
                  previous.rawParameters[0] || "#",
                  fnValues
                )
              : node.rawParameters;
        field.data = applyEncodingTable(
          decodeHexFieldData(
            concatenated,
            field.hexIndicator,
            labelState.characterSet,
            labelState.characterRemap,
            labelState.encoding,
            node,
            diagnostics,
            labelIndex
          ),
          labelState.encoding
        );
        }
        field.dataCommandIndex = node.index;
        touchField(field, node, labelState.reverse);
        break;
      case "GB": {
        const thickness = dotValue(args[2], 1, 1, 32000);
        field.graphic = {
          kind: "box",
          width: dotValue(args[0], thickness, 0, 32000) || thickness,
          height: dotValue(args[1], thickness, 0, 32000) || thickness,
          thickness,
          color: trimmed(args[3]) === "W" ? "W" : "B",
          rounding: numberValue(args[4], 0, 0, 8, true),
          commandIndex: node.index,
        };
        field.barcode = undefined;
        field.unsupportedSelection = undefined;
        touchField(field, node, labelState.reverse);
        break;
      }
      case "GC": {
        const diameter = dotValue(args[0], 3, 3, 4095);
        field.graphic = {
          kind: "circle",
          diameter,
          thickness: dotValue(args[1], 1, 1, 4095),
          color: trimmed(args[2]) === "W" ? "W" : "B",
          commandIndex: node.index,
        };
        field.barcode = undefined;
        field.unsupportedSelection = undefined;
        touchField(field, node, labelState.reverse);
        break;
      }
      case "GE": {
        field.graphic = {
          kind: "ellipse",
          width: dotValue(args[0], 3, 3, 32000),
          height: dotValue(args[1], 3, 3, 32000),
          thickness: dotValue(args[2], 1, 1, 32000),
          color: trimmed(args[3]) === "W" ? "W" : "B",
          commandIndex: node.index,
        };
        field.barcode = undefined;
        field.unsupportedSelection = undefined;
        touchField(field, node, labelState.reverse);
        break;
      }
      case "GD": {
        field.graphic = {
          kind: "diagonal",
          width: dotValue(args[0], 3, 3, 32000),
          height: dotValue(args[1], 3, 3, 32000),
          thickness: dotValue(args[2], 1, 1, 32000),
          color: trimmed(args[3]) === "W" ? "W" : "B",
          direction: trimmed(args[4]) === "L" ? "L" : "R",
          commandIndex: node.index,
        };
        field.barcode = undefined;
        field.unsupportedSelection = undefined;
        touchField(field, node, labelState.reverse);
        break;
      }
      case "GF": {
        const format = trimmed(args[0])[0] || "A";
        if (!["A", "B", "C"].includes(format)) {
          diagnostics.push(
            semanticDiagnostic(
              "UNSUPPORTED_GRAPHIC_FORMAT",
              `Graphic field format ${format} is invalid; use A, B, or C.`,
              node,
              labelIndex
            )
          );
          break;
        }
        try {
          const transmittedBytes = numberValue(args[1], 0, 1, 32000000, true);
          const expectedBytes = numberValue(args[2], numberValue(args[1], 0, 0, 32000000, true), 1, 32000000, true);
          const bytesPerRow = numberValue(args[3], 0, 1, 32000, true);
          const source = args.slice(4).join(node.delimiter);
          const decoded =
            format === "A"
              ? decodeGraphic(
                  source,
                  bytesPerRow,
                  expectedBytes,
                  options.maxGraphicBytes ?? 16 * 1024 * 1024
                )
              : decodeBinaryGraphic(
                  source,
                  bytesPerRow,
                  transmittedBytes,
                  expectedBytes,
                  format === "C",
                  options.maxGraphicBytes ?? 16 * 1024 * 1024
                );
          field.graphic = {
            kind: "bitmap",
            ...decoded,
            scaleX: 1,
            scaleY: 1,
            commandIndex: node.index,
          };
          field.barcode = undefined;
          field.unsupportedSelection = undefined;
          touchField(field, node, labelState.reverse);
        } catch (error) {
          diagnostics.push(
            semanticDiagnostic(
              error instanceof GraphicDecodeError ? error.code : "INVALID_GRAPHIC_DATA",
              error instanceof Error ? error.message : "Graphic data could not be decoded.",
              node,
              labelIndex,
              "error"
            )
          );
        }
        break;
      }
      case "GS": {
        const dimensions = resolveDimensions(
          "0",
          optionalDot(args[1], 0, 32000),
          optionalDot(args[2], 0, 32000),
          field.font ?? labelState.defaultFont,
          dpi
        );
        field.symbol = {
          kind: "symbol",
          orientation: orientationValue(args[0], labelState.defaultOrientation),
          height: dimensions.height,
          width: dimensions.width,
          commandIndex: node.index,
        };
        field.barcode = undefined;
        field.graphic = undefined;
        field.unsupportedSelection = undefined;
        touchField(field, node, labelState.reverse);
        break;
      }
      case "XG": {
        const name = normalizeResourceName(
          trimmed(args[0]),
          "GRF",
          options.memoryAliases
        );
        const graphic = options.graphics?.get(name);
        if (!graphic) {
          diagnostics.push(
            semanticDiagnostic(
              "MISSING_GRAPHIC_RESOURCE",
              `Graphic ${name} is not present in this render session.`,
              node,
              labelIndex,
              "error"
            )
          );
          break;
        }
        field.graphic = {
          kind: "bitmap",
          ...graphic,
          scaleX: numberValue(args[1], 1, 1, 10, true),
          scaleY: numberValue(args[2], 1, 1, 10, true),
          commandIndex: node.index,
        };
        field.barcode = undefined;
        field.unsupportedSelection = undefined;
        touchField(field, node, labelState.reverse);
        break;
      }
      case "IM": {
        const name = normalizeResourceName(
          trimmed(args[0]),
          "GRF",
          options.memoryAliases
        );
        const graphic = options.graphics?.get(name);
        if (!graphic) {
          diagnostics.push(
            semanticDiagnostic(
              "MISSING_GRAPHIC_RESOURCE",
              `Graphic ${name} is not present in this render session.`,
              node,
              labelIndex,
              "error"
            )
          );
          break;
        }
        field.graphic = {
          kind: "bitmap",
          ...graphic,
          scaleX: 1,
          scaleY: 1,
          commandIndex: node.index,
        };
        field.barcode = undefined;
        field.unsupportedSelection = undefined;
        touchField(field, node, labelState.reverse);
        break;
      }
      case "IL": {
        const name = normalizeResourceName(
          trimmed(args[0]),
          "GRF",
          options.memoryAliases
        );
        const graphic = options.graphics?.get(name);
        if (!graphic) {
          diagnostics.push(
            semanticDiagnostic(
              "MISSING_GRAPHIC_RESOURCE",
              `Image ${name} is not present in this render session.`,
              node,
              labelIndex,
              "error"
            )
          );
          break;
        }
        fields.push({
          kind: "bitmap",
          ...graphic,
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: 1,
          orientation: "N",
          reverse: labelState.reverse,
          commandIndex: node.index,
          sourceSpan: { ...node.span },
        });
        break;
      }
      case "B0":
      case "BO": {
        const defaultMagnification =
          dpi === 150 ? 1 : dpi === 200 ? 2 : dpi === 300 ? 3 : 6;
        const size = numberValue(args[3], 0, 0, 300, true);
        const automaticFormat = size < 101;
        const format =
          size >= 101 && size <= 104
            ? "compact"
            : size >= 201 && size <= 232
            ? "full"
            : size === 300
            ? "rune"
            : "compact";
        const layers =
          size >= 101 && size <= 104
            ? size - 100
            : size >= 201 && size <= 232
            ? size - 200
            : 0;
        const symbolCount = numberValue(args[5], 1, 1, 26, true);
        field.barcode = {
          symbology: node.code as "B0" | "BO",
          encoder: format === "rune" ? "aztecrune" : "azteccode",
          matrix: true,
          commandIndex: node.index,
          orientation: orientationValue(args[0], labelState.defaultOrientation),
          moduleWidth: numberValue(
            args[1],
            defaultMagnification,
            1,
            10,
            true
          ),
          height: numberValue(
            args[1],
            defaultMagnification,
            1,
            10,
            true
          ),
          printInterpretationBelow: false,
          printInterpretationAbove: false,
          interpretationFont: { ...(field.font ?? labelState.defaultFont) },
          encoderOptions: {
            format,
            layers,
            zplAutoFormat: automaticFormat,
            zplFixedSize: layers > 0,
            eclevel:
              size >= 1 && size <= 99
                ? Math.min(95, Math.max(5, size))
                : 23,
            readerinit: yesNo(args[4], false),
            zplEci: yesNo(args[2], false),
            zplStructuredCount: symbolCount,
            zplStructuredId: trimmed(args[6]).slice(0, 24),
          },
        };
        field.graphic = undefined;
        field.unsupportedSelection = undefined;
        touchField(field, node, labelState.reverse);
        break;
      }
      case "B1":
        field.barcode = {
          symbology: "B1",
          encoder: "code11",
          matrix: false,
          commandIndex: node.index,
          orientation: orientationValue(args[0], labelState.defaultOrientation),
          moduleWidth: labelState.barcodeDefaults.moduleWidth,
          ratio: labelState.barcodeDefaults.ratio,
          height: dotValue(args[2], labelState.barcodeDefaults.height, 1, 32000),
          printInterpretationBelow: yesNo(args[3], true),
          printInterpretationAbove: yesNo(args[4], false),
          interpretationFont: { ...(field.font ?? labelState.defaultFont) },
          encoderOptions: { zplCheckCount: yesNo(args[1], false) ? 1 : 2 },
        };
        field.graphic = undefined;
        field.unsupportedSelection = undefined;
        touchField(field, node, labelState.reverse);
        break;
      case "B2":
        field.barcode = {
          symbology: "B2",
          encoder: "interleaved2of5",
          matrix: false,
          commandIndex: node.index,
          orientation: orientationValue(args[0], labelState.defaultOrientation),
          moduleWidth: labelState.barcodeDefaults.moduleWidth,
          ratio: labelState.barcodeDefaults.ratio,
          height: dotValue(args[1], labelState.barcodeDefaults.height, 1, 32000),
          printInterpretationBelow: yesNo(args[2], true),
          printInterpretationAbove: yesNo(args[3], false),
          interpretationFont: { ...(field.font ?? labelState.defaultFont) },
          encoderOptions: {
            zplMod10: yesNo(args[4], false),
            zplBearerBars: trimmed(args[5]) || "N",
          },
        };
        field.graphic = undefined;
        field.unsupportedSelection = undefined;
        touchField(field, node, labelState.reverse);
        break;
      case "B4": {
        const interpretation = trimmed(args[2]) || "N";
        const requestedStartingMode = trimmed(args[3]).toUpperCase();
        const startingMode = ["0", "1", "2", "3", "4", "5", "A"].includes(
          requestedStartingMode
        )
          ? requestedStartingMode
          : "A";
        const rowHeight = dotValue(
          args[1],
          labelState.barcodeDefaults.height,
          1,
          32000
        );
        field.barcode = {
          symbology: "B4",
          encoder: "code49",
          matrix: true,
          commandIndex: node.index,
          orientation: orientationValue(args[0], labelState.defaultOrientation),
          moduleWidth: labelState.barcodeDefaults.moduleWidth,
          height: labelState.barcodeDefaults.moduleWidth,
          printInterpretationBelow: interpretation === "B",
          printInterpretationAbove: interpretation === "A",
          interpretationFont: { ...(field.font ?? labelState.defaultFont) },
          encoderOptions: {
            rowheight: rowHeight,
            zplStartingMode: startingMode,
          },
        };
        field.graphic = undefined;
        field.unsupportedSelection = undefined;
        touchField(field, node, labelState.reverse);
        break;
      }
      case "B5":
        field.barcode = {
          symbology: "B5",
          encoder: "planet",
          matrix: false,
          commandIndex: node.index,
          orientation: orientationValue(args[0], labelState.defaultOrientation),
          moduleWidth: labelState.barcodeDefaults.moduleWidth,
          height: dotValue(args[1], labelState.barcodeDefaults.height, 1, 9999),
          printInterpretationBelow: yesNo(args[2], false),
          printInterpretationAbove: yesNo(args[3], false),
          interpretationFont: { ...(field.font ?? labelState.defaultFont) },
          encoderOptions: {},
        };
        field.graphic = undefined;
        field.unsupportedSelection = undefined;
        touchField(field, node, labelState.reverse);
        break;
      case "B3":
        field.barcode = {
          symbology: "B3",
          commandIndex: node.index,
          orientation: orientationValue(args[0], labelState.defaultOrientation),
          mod43CheckDigit: yesNo(args[1], false),
          height: numberValue(
            args[2],
            labelState.barcodeDefaults.height,
            1,
            32000,
            true
          ),
          printInterpretationBelow: yesNo(args[3], true),
          printInterpretationAbove: yesNo(args[4], false),
          moduleWidth: labelState.barcodeDefaults.moduleWidth,
          ratio: labelState.barcodeDefaults.ratio,
          interpretationFont: {
            ...(field.font ?? labelState.defaultFont),
          },
        };
        field.graphic = undefined;
        field.unsupportedSelection = undefined;
        touchField(field, node, labelState.reverse);
        break;
      case "BC": {
        const modeCandidate = trimmed(args[5]);
        field.barcode = {
          symbology: "BC",
          commandIndex: node.index,
          orientation: orientationValue(args[0], labelState.defaultOrientation),
          height: numberValue(
            args[1],
            labelState.barcodeDefaults.height,
            1,
            32000,
            true
          ),
          printInterpretationBelow: yesNo(args[2], true),
          printInterpretationAbove: yesNo(args[3], false),
          uccCheckDigit: yesNo(args[4], false),
          mode: ["N", "U", "A", "D"].includes(modeCandidate)
            ? (modeCandidate as "N" | "U" | "A" | "D")
            : "N",
          moduleWidth: labelState.barcodeDefaults.moduleWidth,
          interpretationFont: {
            ...(field.font ?? labelState.defaultFont),
          },
        };
        field.graphic = undefined;
        field.unsupportedSelection = undefined;
        touchField(field, node, labelState.reverse);
        break;
      }
      case "BZ": {
        const postalType = numberValue(args[4], 0, 0, 3, true);
        field.barcode = {
          symbology: "BZ",
          encoder:
            postalType === 1
              ? "planet"
              : postalType === 3
              ? "onecode"
              : "postnet",
          matrix: false,
          commandIndex: node.index,
          orientation: orientationValue(args[0], labelState.defaultOrientation),
          moduleWidth: labelState.barcodeDefaults.moduleWidth,
          ratio: labelState.barcodeDefaults.ratio,
          height: dotValue(args[1], labelState.barcodeDefaults.height, 1, 32000),
          printInterpretationBelow: yesNo(args[2], false),
          printInterpretationAbove: yesNo(args[3], false),
          interpretationFont: { ...(field.font ?? labelState.defaultFont) },
          encoderOptions: { zplPostalType: postalType },
        };
        if (postalType === 2) {
          diagnostics.push(
            semanticDiagnostic(
              "RESERVED_POSTAL_BARCODE_TYPE",
              "Postal barcode type 2 is reserved; POSTNET was used.",
              node,
              labelIndex
            )
          );
        }
        field.graphic = undefined;
        field.unsupportedSelection = undefined;
        touchField(field, node, labelState.reverse);
        break;
      }
      case "BQ": {
        const model = trimmed(args[1]) === "1" ? "1" : "2";
        const defaultMagnification =
          dpi === 150 ? 1 : dpi === 200 ? 2 : dpi === 300 ? 3 : 6;
        const reliabilityCandidate = trimmed(args[3]);
        field.barcode = {
          symbology: "BQ",
          commandIndex: node.index,
          model,
          magnification: numberValue(
            args[2],
            defaultMagnification,
            1,
            100,
            true
          ),
          reliability: ["H", "Q", "M", "L"].includes(reliabilityCandidate)
            ? (reliabilityCandidate as "H" | "Q" | "M" | "L")
            : reliabilityCandidate === ""
            ? "Q"
            : "M",
          mask: numberValue(args[4], 7, 0, 7, true),
        };
        field.graphic = undefined;
        field.unsupportedSelection = undefined;
        touchField(field, node, labelState.reverse);
        break;
      }
      case "B7": {
        const explicitRowHeight = trimmed(args[1]) !== "";
        field.barcode = {
          symbology: "B7",
          encoder: "pdf417",
          matrix: true,
          commandIndex: node.index,
          orientation: orientationValue(args[0], labelState.defaultOrientation),
          moduleWidth: Math.max(1, labelState.barcodeDefaults.moduleWidth),
          height: explicitRowHeight
            ? numberValue(args[1], 1, 1, 32000, true)
            : 1,
          overallHeight: explicitRowHeight
            ? undefined
            : labelState.barcodeDefaults.height,
          printInterpretationBelow: false,
          printInterpretationAbove: false,
          interpretationFont: { ...(field.font ?? labelState.defaultFont) },
          encoderOptions: {
            eclevel: numberValue(args[2], 0, 0, 8, true),
            fixedeclevel: true,
            columns:
              trimmed(args[3]) === ""
                ? 0
                : numberValue(args[3], 1, 1, 30, true),
            rows:
              trimmed(args[4]) === ""
                ? 0
                : numberValue(args[4], 3, 3, 90, true),
            compact: yesNo(args[5], false),
            rowmult: 1,
          },
        };
        field.graphic = undefined;
        field.unsupportedSelection = undefined;
        touchField(field, node, labelState.reverse);
        break;
      }
      case "BA":
        field.barcode = {
          symbology: "BA",
          encoder: "code93ext",
          matrix: false,
          commandIndex: node.index,
          orientation: orientationValue(args[0], labelState.defaultOrientation),
          moduleWidth: labelState.barcodeDefaults.moduleWidth,
          height: dotValue(args[1], labelState.barcodeDefaults.height, 1, 32000),
          printInterpretationBelow: yesNo(args[2], true),
          printInterpretationAbove: yesNo(args[3], false),
          interpretationFont: { ...(field.font ?? labelState.defaultFont) },
          encoderOptions: {
            includecheck: true,
            zplPrintCheck: yesNo(args[4], false),
          },
        };
        field.graphic = undefined;
        field.unsupportedSelection = undefined;
        touchField(field, node, labelState.reverse);
        break;
      case "BB": {
        const mode = ["A", "E", "F"].includes(trimmed(args[5]))
          ? trimmed(args[5])
          : "F";
        const explicitHeight = trimmed(args[1]) !== "";
        const columnsSpecified = trimmed(args[3]) !== "";
        const rowsSpecified =
          trimmed(args[4]) !== "" && trimmed(args[4]) !== "0";
        const requestedColumns = numberValue(
          args[3],
          8,
          mode === "A" ? 2 : 4,
          62,
          true
        );
        field.barcode = {
          symbology: "BB",
          encoder: "codablockf",
          matrix: true,
          commandIndex: node.index,
          orientation: orientationValue(args[0], labelState.defaultOrientation),
          moduleWidth: labelState.barcodeDefaults.moduleWidth,
          height: labelState.barcodeDefaults.moduleWidth,
          ratio: labelState.barcodeDefaults.ratio,
          overallHeight: explicitHeight ? undefined : labelState.barcodeDefaults.height,
          printInterpretationBelow: false,
          printInterpretationAbove: false,
          interpretationFont: { ...(field.font ?? labelState.defaultFont) },
          encoderOptions: {
            rowheight: dotValue(args[1], 8, 2, 32000),
            columns: requestedColumns,
            rows: numberValue(args[4], 0, 0, mode === "A" ? 22 : 44, true),
            parsefnc: mode === "E",
            zplMode: mode,
            zplSecurity: yesNo(args[2], true),
            zplColumnsSpecified: columnsSpecified,
            zplRowsSpecified: rowsSpecified,
          },
        };
        field.graphic = undefined;
        field.unsupportedSelection = undefined;
        touchField(field, node, labelState.reverse);
        break;
      }
      case "BD": {
        const mode = numberValue(args[0], 2, 2, 6, true);
        const symbolNumber = numberValue(args[1], 1, 1, 8, true);
        const symbolTotal = numberValue(args[2], 1, 1, 8, true);
        const maxicodeScale =
          dpi === 150 ? 1 : dpi === 200 ? 2 : dpi === 300 ? 3 : 6;
        field.barcode = {
          symbology: "BD",
          encoder: "maxicode",
          matrix: true,
          commandIndex: node.index,
          orientation: "N",
          moduleWidth: maxicodeScale,
          height: maxicodeScale,
          printInterpretationBelow: false,
          printInterpretationAbove: false,
          interpretationFont: { ...(field.font ?? labelState.defaultFont) },
          encoderOptions: {
            mode,
            sam: symbolTotal > 1 ? symbolNumber * 10 + symbolTotal : 0,
            zplMode: mode,
          },
        };
        field.graphic = undefined;
        field.unsupportedSelection = undefined;
        touchField(field, node, labelState.reverse);
        break;
      }
      case "BF": {
        const mode = numberValue(args[2], 0, 0, 33, true);
        field.barcode = {
          symbology: "BF",
          encoder: "micropdf417",
          matrix: true,
          commandIndex: node.index,
          orientation: orientationValue(args[0], labelState.defaultOrientation),
          moduleWidth: Math.max(1, labelState.barcodeDefaults.moduleWidth),
          height: dotValue(args[1], labelState.barcodeDefaults.height, 1, 9999),
          printInterpretationBelow: false,
          printInterpretationAbove: false,
          interpretationFont: { ...(field.font ?? labelState.defaultFont) },
          encoderOptions: {
            version: MICRO_PDF417_VERSIONS[mode],
            rowmult: 1,
            zplMode: mode,
          },
        };
        field.graphic = undefined;
        field.unsupportedSelection = undefined;
        touchField(field, node, labelState.reverse);
        break;
      }
      case "BI":
      case "BJ":
        field.barcode = {
          symbology: node.code as "BI" | "BJ",
          encoder: node.code === "BI" ? "industrial2of5" : "code2of5",
          matrix: false,
          commandIndex: node.index,
          orientation: orientationValue(args[0], labelState.defaultOrientation),
          moduleWidth: labelState.barcodeDefaults.moduleWidth,
          ratio: labelState.barcodeDefaults.ratio,
          height: dotValue(args[1], labelState.barcodeDefaults.height, 1, 32000),
          printInterpretationBelow: yesNo(args[2], true),
          printInterpretationAbove: yesNo(args[3], false),
          interpretationFont: { ...(field.font ?? labelState.defaultFont) },
          encoderOptions: {},
        };
        field.graphic = undefined;
        field.unsupportedSelection = undefined;
        touchField(field, node, labelState.reverse);
        break;
      case "BK":
        field.barcode = {
          symbology: "BK",
          encoder: "rationalizedCodabar",
          matrix: false,
          commandIndex: node.index,
          orientation: orientationValue(args[0], labelState.defaultOrientation),
          moduleWidth: labelState.barcodeDefaults.moduleWidth,
          ratio: labelState.barcodeDefaults.ratio,
          height: dotValue(args[2], labelState.barcodeDefaults.height, 1, 32000),
          printInterpretationBelow: yesNo(args[3], true),
          printInterpretationAbove: yesNo(args[4], false),
          interpretationFont: { ...(field.font ?? labelState.defaultFont) },
          encoderOptions: {
            zplStart: /^[ABCD]$/.test(trimmed(args[5])) ? trimmed(args[5]) : "A",
            zplStop: /^[ABCD]$/.test(trimmed(args[6])) ? trimmed(args[6]) : "A",
          },
        };
        field.graphic = undefined;
        field.unsupportedSelection = undefined;
        touchField(field, node, labelState.reverse);
        break;
      case "BL":
        field.barcode = {
          symbology: "BL",
          encoder: "code39",
          matrix: false,
          commandIndex: node.index,
          orientation: orientationValue(args[0], labelState.defaultOrientation),
          moduleWidth: labelState.barcodeDefaults.moduleWidth,
          ratio: labelState.barcodeDefaults.ratio,
          height: dotValue(args[1], labelState.barcodeDefaults.height, 1, 32000),
          printInterpretationBelow: true,
          printInterpretationAbove: yesNo(args[2], false),
          interpretationFont: { ...(field.font ?? labelState.defaultFont) },
          encoderOptions: { includecheck: true, includecheckintext: false },
        };
        field.graphic = undefined;
        field.unsupportedSelection = undefined;
        touchField(field, node, labelState.reverse);
        break;
      case "BM": {
        const selection = ["A", "B", "C", "D"].includes(trimmed(args[1]))
          ? trimmed(args[1])
          : "B";
        field.barcode = {
          symbology: "BM",
          encoder: "msi",
          matrix: false,
          commandIndex: node.index,
          orientation: orientationValue(args[0], labelState.defaultOrientation),
          moduleWidth: labelState.barcodeDefaults.moduleWidth,
          ratio: labelState.barcodeDefaults.ratio,
          height: dotValue(args[2], labelState.barcodeDefaults.height, 1, 32000),
          printInterpretationBelow: yesNo(args[3], true),
          printInterpretationAbove: yesNo(args[4], false),
          interpretationFont: { ...(field.font ?? labelState.defaultFont) },
          encoderOptions: {
            includecheck: selection !== "A",
            checktype:
              selection === "C"
                ? "mod1010"
                : selection === "D"
                ? "mod1110"
                : "mod10",
            includecheckintext: yesNo(args[5], false),
          },
        };
        field.graphic = undefined;
        field.unsupportedSelection = undefined;
        touchField(field, node, labelState.reverse);
        break;
      }
      case "BP":
        field.barcode = {
          symbology: "BP",
          encoder: "plessey",
          matrix: false,
          commandIndex: node.index,
          orientation: orientationValue(args[0], labelState.defaultOrientation),
          moduleWidth: labelState.barcodeDefaults.moduleWidth,
          ratio: labelState.barcodeDefaults.ratio,
          height: dotValue(args[2], labelState.barcodeDefaults.height, 1, 32000),
          printInterpretationBelow: yesNo(args[3], true),
          printInterpretationAbove: yesNo(args[4], false),
          interpretationFont: { ...(field.font ?? labelState.defaultFont) },
          encoderOptions: { includecheckintext: yesNo(args[1], false) },
        };
        field.graphic = undefined;
        field.unsupportedSelection = undefined;
        touchField(field, node, labelState.reverse);
        break;
      case "BR": {
        const type = numberValue(args[1], 1, 1, 12, true);
        let encoder = "databaromni";
        let matrix = false;
        const segmentCandidate = numberValue(args[5], 22, 2, 22, true);
        const segments = segmentCandidate % 2 === 0 ? segmentCandidate : segmentCandidate - 1;
        if (type === 2) encoder = "databartruncated";
        else if (type === 3) {
          encoder = "databarstacked";
          matrix = true;
        } else if (type === 4) {
          encoder = "databarstackedomni";
          matrix = true;
        } else if (type === 5) encoder = "databarlimited";
        else if (type === 6) {
          encoder = segments < 22 ? "databarexpandedstacked" : "databarexpanded";
          matrix = segments < 22;
        } else if (type === 7) encoder = "upca";
        else if (type === 8) encoder = "upce";
        else if (type === 9) encoder = "ean13";
        else if (type === 10) encoder = "ean8";
        else if (type === 11 || type === 12) {
          encoder = "gs1-128composite";
          matrix = true;
        }
        field.barcode = {
          symbology: "BR",
          encoder,
          matrix,
          commandIndex: node.index,
          orientation: orientationValue(args[0], "R"),
          moduleWidth: numberValue(
            args[2],
            dpi === 600 ? 6 : dpi === 300 ? 3 : 2,
            1,
            10,
            true
          ),
          height: dotValue(args[4], 25, 1, 32000),
          printInterpretationBelow: false,
          printInterpretationAbove: false,
          interpretationFont: { ...(field.font ?? labelState.defaultFont) },
          encoderOptions: {
            segments,
            sepheight: numberValue(args[3], 1, 1, 2, true),
            ccversion: type === 12 ? "c" : "b",
            zplType: type,
          },
        };
        field.graphic = undefined;
        field.unsupportedSelection = undefined;
        touchField(field, node, labelState.reverse);
        break;
      }
      case "BS":
        field.barcode = {
          symbology: "BS",
          encoder: "ean2",
          matrix: false,
          commandIndex: node.index,
          orientation: orientationValue(args[0], labelState.defaultOrientation),
          moduleWidth: labelState.barcodeDefaults.moduleWidth,
          height: dotValue(args[1], labelState.barcodeDefaults.height, 1, 32000),
          printInterpretationBelow: yesNo(args[2], true),
          printInterpretationAbove: yesNo(args[3], true),
          interpretationFont: { ...(field.font ?? labelState.defaultFont) },
          encoderOptions: {},
        };
        field.graphic = undefined;
        field.unsupportedSelection = undefined;
        touchField(field, node, labelState.reverse);
        break;
      case "BT": {
        const defaultLinearHeight = dpi === 600 ? 120 : dpi === 300 ? 60 : 40;
        const defaultModule = dpi === 600 ? 4 : 2;
        field.barcode = {
          symbology: "BT",
          encoder: "tlc39",
          matrix: true,
          commandIndex: node.index,
          orientation: orientationValue(args[0], labelState.defaultOrientation),
          moduleWidth: numberValue(args[1], defaultModule, 1, 10, true),
          ratio: numberValue(args[2], 2, 2, 3),
          height: dotValue(args[3], defaultLinearHeight, 1, 9999),
          printInterpretationBelow: false,
          printInterpretationAbove: false,
          interpretationFont: { ...(field.font ?? labelState.defaultFont) },
          encoderOptions: {
            zplMicroModule: numberValue(args[4], defaultModule, 1, 10, true),
            zplMicroRowHeight: numberValue(args[5], dpi === 600 ? 8 : 4, 1, 255, true),
          },
        };
        field.graphic = undefined;
        field.unsupportedSelection = undefined;
        touchField(field, node, labelState.reverse);
        break;
      }
      case "BX": {
        const requestedQuality = numberValue(args[2], 0, 0, 200, true);
        const quality = [0, 50, 80, 100, 140, 200].includes(requestedQuality)
          ? requestedQuality
          : 0;
        const requestedColumns = numberValue(args[3], 0, 0, 32000, true);
        const requestedRows = numberValue(args[4], 0, 0, 32000, true);
        const columns = requestedColumns > 144 ? 0 : requestedColumns;
        const rows = requestedRows > 144 ? 0 : requestedRows;
        const explicitModule =
          trimmed(args[1]) !== "" && Number(trimmed(args[1])) !== 0;
        const aspect = numberValue(args[7], 1, 1, 2, true);
        const module = explicitModule
          ? dotValue(args[1], 1, 1, 32000)
          : 1;
        field.barcode = {
          symbology: "BX",
          encoder: aspect === 2 ? "datamatrixrectangular" : "datamatrix",
          matrix: true,
          commandIndex: node.index,
          orientation: orientationValue(args[0], labelState.defaultOrientation),
          moduleWidth: module,
          height: module,
          printInterpretationBelow: false,
          printInterpretationAbove: false,
          interpretationFont: { ...(field.font ?? labelState.defaultFont) },
          encoderOptions: {
            columns,
            rows,
            zplQuality: quality,
            zplFormat: numberValue(args[5], 6, 0, 6, true),
            zplEscape: trimmed(args[6]).slice(0, 1) || "_",
            zplAspect: aspect,
            zplAutoModule: !explicitModule,
            zplTargetHeight: labelState.barcodeDefaults.height,
          },
        };
        field.graphic = undefined;
        field.unsupportedSelection = undefined;
        touchField(field, node, labelState.reverse);
        break;
      }
      case "B8":
      case "B9":
      case "BE":
      case "BU": {
        field.barcode = {
          symbology: node.code as "B8" | "B9" | "BE" | "BU",
          encoder:
            node.code === "B8"
              ? "ean8"
              : node.code === "B9"
              ? "upce"
              : node.code === "BE"
              ? "ean13"
              : "upca",
          matrix: false,
          commandIndex: node.index,
          orientation: orientationValue(args[0], labelState.defaultOrientation),
          moduleWidth: labelState.barcodeDefaults.moduleWidth,
          height: dotValue(args[1], labelState.barcodeDefaults.height, 1, 32000),
          printInterpretationBelow: yesNo(args[2], true),
          printInterpretationAbove: yesNo(args[3], false),
          interpretationFont: { ...(field.font ?? labelState.defaultFont) },
          encoderOptions: {
            zplPrintCheck:
              node.code === "B9" || node.code === "BU"
                ? yesNo(args[4], true)
                : true,
          },
        };
        field.graphic = undefined;
        field.unsupportedSelection = undefined;
        touchField(field, node, labelState.reverse);
        break;
      }
      case "FS":
        finalizeField(node);
        break;
      case "CI": {
        const requested = trimmed(args[0]) || "0";
        const selected = Number.parseInt(requested, 10);
        const accepted =
          (selected >= 0 && selected <= 17) ||
          selected === 24 ||
          selected === 26 ||
          (selected >= 27 && selected <= 31) ||
          (selected >= 33 && selected <= 36);
        if (accepted) {
          labelState.characterSet = selected;
          labelState.characterSetNode = undefined;
        } else {
          labelState.characterSetNode = node;
        }
        const remap = new Map<number, number>();
        if (selected >= 0 && selected <= 13) {
          for (let index = 1; index + 1 < args.length && remap.size < 256; index += 2) {
            const source = Number.parseInt(trimmed(args[index]), 10);
            const destination = Number.parseInt(trimmed(args[index + 1]), 10);
            if (
              source >= 0 &&
              source <= 255 &&
              destination >= 0 &&
              destination <= 255 &&
              destination !== 32
            ) {
              remap.set(destination, source);
            }
          }
        }
        labelState.characterRemap = remap;
        break;
      }
      default:
        if (node.capability === "unknown") {
          diagnostics.push(
            semanticDiagnostic(
              "UNKNOWN_COMMAND",
              `${node.canonical} is not recognized by this renderer.`,
              node,
              labelIndex
            )
          );
        }
        if (node.code.startsWith("B") && node.capability === "unsupported") {
          field.unsupportedSelection = node;
          field.barcode = undefined;
          field.graphic = undefined;
          touchField(field, node, labelState.reverse);
        }
        break;
    }
  }

  finalizeField(undefined, true);
  for (const layoutField of fields) {
    Object.freeze(layoutField.sourceSpan);
    if (layoutField.kind === "text") {
      Object.freeze(layoutField.font);
      if (layoutField.block) Object.freeze(layoutField.block);
    } else if (layoutField.kind === "barcode") {
      Object.freeze(layoutField.interpretationFont);
      if ("encoderOptions" in layoutField) Object.freeze(layoutField.encoderOptions);
    }
    Object.freeze(layoutField);
  }
  for (const origin of origins) {
    Object.freeze(origin.sourceSpan);
    Object.freeze(origin);
  }
  return Object.freeze({
    fields: Object.freeze(fields),
    origins: Object.freeze(origins),
    diagnostics: Object.freeze(diagnostics),
    settings: Object.freeze(settings),
  });
}
