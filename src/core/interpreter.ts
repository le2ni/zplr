import { Orientation } from "@/types/Orientation";
import {
  BarcodeLayoutField,
  BoxLayoutField,
  CircleLayoutField,
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
  characterSetNode?: ZplCommandNode;
}

type PendingGraphic =
  | Omit<BoxLayoutField, "x" | "y" | "orientation" | "reverse" | "sourceSpan">
  | Omit<CircleLayoutField, "x" | "y" | "orientation" | "reverse" | "sourceSpan">;

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

type PendingBarcode = PendingCode39 | PendingCode128 | PendingQr;

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
  barcode?: PendingBarcode;
  spanStart?: number;
  spanEnd?: number;
  labelReverse?: boolean;
  unsupportedSelection?: ZplCommandNode;
  characterSetNode?: ZplCommandNode;
}

export interface InterpretOptions {
  dpi?: 150 | 200 | 300 | 600;
  labelIndex?: number;
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

function fontRatio(key: string): number {
  return key === "A" ? 5 / 9 : 0.6;
}

function resolveDimensions(
  key: string,
  heightValue: number | undefined,
  widthValue: number | undefined,
  fallback: LayoutFont
): Pick<LayoutFont, "height" | "width"> {
  let height = heightValue && heightValue > 0 ? heightValue : undefined;
  let width = widthValue && widthValue > 0 ? widthValue : undefined;
  const ratio = fontRatio(key);

  if (height && !width) width = Math.max(1, Math.round(height * ratio));
  if (width && !height) height = Math.max(1, Math.round(width / ratio));
  if (!height) height = fallback.height;
  if (!width) width = fallback.width;
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
  node: ZplCommandNode,
  diagnostics: ZplDiagnostic[],
  labelIndex: number
): string {
  if (!indicator) return data;
  let result = "";
  for (let index = 0; index < data.length; index++) {
    if (data[index] !== indicator) {
      result += data[index];
      continue;
    }

    const hex = data.slice(index + 1, index + 3);
    if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
      result += String.fromCharCode(Number.parseInt(hex, 16));
      index += 2;
    } else {
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
  return result;
}

function parseQrData(
  data: string,
  barcode: PendingQr,
  node: ZplCommandNode | undefined,
  diagnostics: ZplDiagnostic[],
  labelIndex: number
): Pick<QrLayoutField, "data" | "reliability" | "inputMode" | "characterMode"> | undefined {
  const match = /^([HQML])([AM]),/.exec(data);
  if (!match) {
    diagnostics.push(
      semanticDiagnostic(
        "INVALID_QR_FIELD_DATA",
        "QR field data must begin with an error-correction level and A, or M, input mode.",
        node,
        labelIndex,
        "error"
      )
    );
    return undefined;
  }

  const reliability = match[1] as "H" | "Q" | "M" | "L";
  const inputMode = match[2] as "A" | "M";
  let payload = data.slice(3);
  let characterMode: "N" | "A" | "B" | undefined;

  if (inputMode === "M") {
    const requestedMode = payload[0];
    if (requestedMode === "K") {
      diagnostics.push(
        semanticDiagnostic(
          "UNSUPPORTED_QR_CHARACTER_MODE",
          "QR Kanji manual input is not supported.",
          node,
          labelIndex
        )
      );
      return undefined;
    }
    if (!["N", "A", "B"].includes(requestedMode)) {
      diagnostics.push(
        semanticDiagnostic(
          "INVALID_QR_CHARACTER_MODE",
          "QR manual input requires N, A, B, or K character mode.",
          node,
          labelIndex,
          "error"
        )
      );
      return undefined;
    }
    characterMode = requestedMode as "N" | "A" | "B";
    payload = payload.slice(1);
    if (characterMode === "N" && !/^\d+$/.test(payload)) {
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
    if (characterMode === "A" && !/^[0-9A-Z $%*+\-./:]+$/.test(payload)) {
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
    if (characterMode === "B") {
      const length = payload.slice(0, 4);
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
      payload = payload.slice(4);
      if ([...payload].some((character) => (character.codePointAt(0) ?? 0) > 255)) {
        diagnostics.push(
          semanticDiagnostic(
            "INVALID_QR_BYTE_DATA",
            "QR manual byte input supports 8-bit character values only.",
            node,
            labelIndex,
            "error"
          )
        );
        return undefined;
      }
      if (payload.length !== Number(length)) {
        diagnostics.push(
          semanticDiagnostic(
            "INVALID_QR_BYTE_LENGTH",
            "QR manual byte input does not match its declared byte count.",
            node,
            labelIndex,
            "error"
          )
        );
        return undefined;
      }
    }
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
  const labelState: LabelState = {
    defaultFont: { key: "A", height: 9, width: 5, orientation: "N" },
    defaultOrientation: "N",
    barcodeDefaults: { moduleWidth: 2, ratio: 3, height: 10 },
    homeX: 0,
    homeY: 0,
    reverse: false,
  };
  let field = newField();

  const finalizeField = (separator?: ZplCommandNode, unterminated = false) => {
    if (separator) touchField(field, separator, labelState.reverse);
    const hasContent =
      field.data !== undefined || field.graphic !== undefined || field.barcode !== undefined;
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
    const reverse = (field.labelReverse ?? labelState.reverse) || field.reverse;

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
        if (
          (barcode.printInterpretationBelow ||
            barcode.printInterpretationAbove) &&
          !["A", "0"].includes(barcode.interpretationFont.key)
        ) {
          diagnostics.push(
            semanticDiagnostic(
              "FONT_SUBSTITUTED",
              `Font ${barcode.interpretationFont.key} is rendered with a documented fallback font.`,
              label.commands[barcode.commandIndex],
              labelIndex
            )
          );
        }
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
        });
      } else if (field.barcode.symbology === "BC") {
        const barcode = field.barcode;
        if (barcode.mode === "U" || barcode.mode === "D") {
          diagnostics.push(
            semanticDiagnostic(
              "UNSUPPORTED_CODE128_MODE",
              `Code 128 mode ${barcode.mode} is not supported.`,
              label.commands[barcode.commandIndex],
              labelIndex
            )
          );
        } else {
          if (
            (barcode.printInterpretationBelow ||
              barcode.printInterpretationAbove) &&
            !["A", "0"].includes(barcode.interpretationFont.key)
          ) {
            diagnostics.push(
              semanticDiagnostic(
                "FONT_SUBSTITUTED",
                `Font ${barcode.interpretationFont.key} is rendered with a documented fallback font.`,
                label.commands[barcode.commandIndex],
                labelIndex
              )
            );
          }
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
          });
        }
      } else {
        const barcode = field.barcode;
        if (barcode.model === "1") {
          diagnostics.push(
            semanticDiagnostic(
              "UNSUPPORTED_QR_MODEL",
              "QR Model 1 is not supported.",
              label.commands[barcode.commandIndex],
              labelIndex
            )
          );
        } else {
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
              model: "2",
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
            });
          }
        }
      }
    } else if (field.data !== undefined) {
      const font = field.font ?? labelState.defaultFont;
      const commandIndex = field.dataCommandIndex ?? field.originCommandIndex ?? 0;
      if (!["A", "0"].includes(font.key)) {
        diagnostics.push(
          semanticDiagnostic(
            "FONT_SUBSTITUTED",
            `Font ${font.key} is rendered with a documented fallback font.`,
            label.commands[commandIndex],
            labelIndex
          )
        );
      }
      const textField: TextLayoutField = {
        kind: "text",
        data: field.data,
        x: field.x,
        y: field.y,
        orientation: font.orientation,
        reverse,
        commandIndex,
        sourceSpan,
        font: { ...font },
        block: field.block ? { ...field.block } : undefined,
      };
      fields.push(textField);
    }

    field = newField();
  };

  for (const node of label.commands) {
    const args = node.parameters;
    switch (node.code) {
      case "XA":
      case "XZ":
      case "CC":
      case "CD":
      case "CT":
      case "FX":
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
          optionalNumber(args[1], 0, 32000),
          optionalNumber(args[2], 0, 32000),
          labelState.defaultFont
        );
        labelState.defaultFont = {
          key,
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
        labelState.homeX = numberValue(args[0], 0, 0, 32000, true);
        labelState.homeY = numberValue(args[1], 0, 0, 32000, true);
        break;
      case "LR":
        labelState.reverse = yesNo(args[0], true);
        break;
      case "BY":
        labelState.barcodeDefaults = {
          moduleWidth: numberValue(
            args[0],
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
            args[2],
            labelState.barcodeDefaults.height,
            1,
            32000,
            true
          ),
        };
        break;
      case "FO":
        field.x =
          labelState.homeX + numberValue(args[0], 0, 0, 32000, true);
        field.y =
          labelState.homeY + numberValue(args[1], 0, 0, 32000, true);
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
          ...resolveDimensions(
            key,
            optionalNumber(args[1], 0, 32000),
            optionalNumber(args[2], 0, 32000),
            labelState.defaultFont
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
          width: numberValue(args[0], 0, 0, 32000, true),
          maxLines: numberValue(args[1], 1, 1, 9999, true),
          lineSpacing: numberValue(args[2], 0, -9999, 9999, true),
          justification: ["L", "C", "R", "J"].includes(trimmed(args[3]))
            ? (trimmed(args[3]) as "L" | "C" | "R" | "J")
            : "L",
          hangingIndent: numberValue(args[4], 0, 0, 9999, true),
        };
        touchField(field, node, labelState.reverse);
        break;
      case "FR":
        field.reverse = true;
        touchField(field, node, labelState.reverse);
        break;
      case "FH":
        field.hexIndicator = node.rawParameters[0] || "_";
        touchField(field, node, labelState.reverse);
        break;
      case "FD":
        field.font ??= { ...labelState.defaultFont };
        field.characterSetNode ??= labelState.characterSetNode;
        field.data = decodeHexFieldData(
          node.rawParameters,
          field.hexIndicator,
          node,
          diagnostics,
          labelIndex
        );
        field.dataCommandIndex = node.index;
        touchField(field, node, labelState.reverse);
        break;
      case "GB": {
        const thickness = numberValue(args[2], 1, 1, 32000, true);
        field.graphic = {
          kind: "box",
          width: numberValue(args[0], thickness, 0, 32000, true) || thickness,
          height: numberValue(args[1], thickness, 0, 32000, true) || thickness,
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
        const diameter = numberValue(args[0], 3, 3, 4095, true);
        field.graphic = {
          kind: "circle",
          diameter,
          thickness: numberValue(args[1], 1, 1, 4095, true),
          color: trimmed(args[2]) === "W" ? "W" : "B",
          commandIndex: node.index,
        };
        field.barcode = undefined;
        field.unsupportedSelection = undefined;
        touchField(field, node, labelState.reverse);
        break;
      }
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
            10,
            true
          ),
          reliability: ["H", "Q", "M", "L"].includes(reliabilityCandidate)
            ? (reliabilityCandidate as "H" | "Q" | "M" | "L")
            : reliabilityCandidate === ""
            ? "Q"
            : "M",
          mask: numberValue(args[4], 7, 1, 7, true),
        };
        field.graphic = undefined;
        field.unsupportedSelection = undefined;
        touchField(field, node, labelState.reverse);
        break;
      }
      case "FS":
        finalizeField(node);
        break;
      case "CI":
        labelState.characterSetNode = node;
        break;
      case "B4":
      case "A@":
        field.unsupportedSelection = node;
        field.barcode = undefined;
        field.graphic = undefined;
        touchField(field, node, labelState.reverse);
        break;
      default:
        diagnostics.push(
          semanticDiagnostic(
            "UNKNOWN_COMMAND",
            `${node.code} is not recognized by this renderer.`,
            node,
            labelIndex
          )
        );
        if (node.code.startsWith("B")) {
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
  });
}
