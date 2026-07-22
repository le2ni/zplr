import {
  parseDocument,
  type HighlightRegion,
  type HighlightRegionType,
  type PrintDensity,
  type SourceSpan,
  type ZplCommandNode,
  type ZplLabelNode,
} from "../src/index.web";

export type VisualElementKind = "text" | "barcode" | "qr" | "box" | "line";

export interface SourceEdit {
  start: number;
  end: number;
  text: string;
  selectOriginAt?: number;
}

export interface VisualBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VisualFieldContent {
  value: string;
  prefix: string;
  commandSpan: SourceSpan;
}

export interface VisualFieldOrigin {
  command: ZplCommandNode;
  region: HighlightRegion;
}

export interface VisualField {
  id: string;
  kind: "text" | "barcode" | "qr" | "box" | "circle" | "ellipse" | "graphic";
  labelIndex: number;
  region: HighlightRegion;
  bounds: VisualBounds;
  sourceSpan: SourceSpan;
  commands: readonly ZplCommandNode[];
  origin?: VisualFieldOrigin;
  content?: VisualFieldContent;
  movable: boolean;
}

const zplDecimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

function numericParameter(value: string | undefined): number | undefined {
  const normalized = value?.trim() ?? "";
  if (!zplDecimal.test(normalized)) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function allLabelsWithIndexes(source: string): Array<{ label: ZplLabelNode; index: number }> {
  return parseDocument(source).labels.map((label, index) => ({ label, index }));
}

function containingLabel(
  labels: readonly { label: ZplLabelNode; index: number }[],
  span: SourceSpan,
): { label: ZplLabelNode; index: number } | undefined {
  return labels.find(({ label }) => span.start >= label.span.start && span.end <= label.span.end);
}

function commandAtSpan(label: ZplLabelNode, span: SourceSpan): ZplCommandNode | undefined {
  return label.commands.find((command) => command.span.start === span.start && command.span.end === span.end);
}

function commandsInSpan(label: ZplLabelNode, span: SourceSpan): ZplCommandNode[] {
  return label.commands.filter((command) => command.span.start >= span.start && command.span.end <= span.end);
}

function finiteParameter(command: ZplCommandNode, index: number): number | undefined {
  return numericParameter(command.parameters[index]);
}

function fieldKind(region: HighlightRegion, commands: readonly ZplCommandNode[]): VisualField["kind"] {
  if (commands.some(({ canonical }) => canonical === "^BQ")) return "qr";
  if (commands.some(({ canonical }) => canonical.startsWith("^B") && canonical !== "^BY")) return "barcode";
  if (region.type === "text") return "text";
  if (region.type === "box") {
    const graphicBox = commands.find(({ canonical }) => canonical === "^GB");
    if (graphicBox && Number(graphicBox.parameters[1]) <= Math.max(1, Number(graphicBox.parameters[2]))) return "graphic";
    return "box";
  }
  if (region.type === "circle") return "circle";
  if (region.type === "ellipse") return "ellipse";
  return "graphic";
}

function fieldContent(commands: readonly ZplCommandNode[], kind: VisualField["kind"]): VisualFieldContent | undefined {
  const command = commands.find(({ canonical }) => canonical === "^FD");
  if (!command) return undefined;
  const raw = command.rawParameters;
  const prefixMatch = kind === "qr" ? raw.match(/^(?:QA|QM),/i) : undefined;
  const prefix = prefixMatch?.[0] ?? "";
  return {
    value: raw.slice(prefix.length),
    prefix,
    commandSpan: { ...command.span },
  };
}

export function visualBounds(region: HighlightRegion): VisualBounds {
  if (region.type === "circle" && region.radius !== undefined) {
    return {
      x: region.x - region.radius,
      y: region.y - region.radius,
      width: region.radius * 2,
      height: region.radius * 2,
    };
  }
  return {
    x: region.x,
    y: region.y,
    width: Math.max(1, region.width ?? 1),
    height: Math.max(1, region.height ?? 1),
  };
}

/** Build source-aware visual fields from one rendered label's hit regions. */
export function collectVisualFields(source: string, regions: readonly HighlightRegion[]): VisualField[] {
  const labels = allLabelsWithIndexes(source);
  const origins = regions.filter(({ type }) => type === "origin");

  return regions.flatMap((region, regionIndex) => {
    if (region.type === "origin") return [];
    const owner = containingLabel(labels, region.sourceSpan);
    if (!owner) return [];
    const commands = commandsInSpan(owner.label, region.sourceSpan);
    const originRegion = origins.findLast((candidate) =>
      candidate.sourceSpan.start >= region.sourceSpan.start &&
      candidate.sourceSpan.end <= region.sourceSpan.end
    );
    const originCommand = originRegion ? commandAtSpan(owner.label, originRegion.sourceSpan) : undefined;
    const editableOrigin = originRegion && originCommand &&
      (originCommand.canonical === "^FO" || originCommand.canonical === "^FT") &&
      finiteParameter(originCommand, 0) !== undefined && finiteParameter(originCommand, 1) !== undefined
      ? { command: originCommand, region: originRegion }
      : undefined;
    const kind = fieldKind(region, commands);
    const stableOffset = editableOrigin?.command.span.start ?? region.sourceSpan.start;
    return [{
      id: `${stableOffset}:${region.type}:${regionIndex}`,
      kind,
      labelIndex: owner.index,
      region,
      bounds: visualBounds(region),
      sourceSpan: { ...region.sourceSpan },
      commands,
      origin: editableOrigin,
      content: fieldContent(commands, kind),
      movable: editableOrigin !== undefined,
    }];
  });
}

function conversionScale(label: ZplLabelNode, commandIndex: number, printDensity: PrintDensity): number {
  let unit: "D" | "I" | "M" = "D";
  let dotConversion = 1;
  for (const command of label.commands) {
    if (command.index > commandIndex) break;
    if (command.canonical !== "^MU") continue;
    const requested = command.parameters[0]?.trim().toUpperCase();
    if (!requested) unit = "D";
    else if (requested === "D" || requested === "I" || requested === "M") unit = requested;
    const base = numericParameter(command.parameters[1]);
    const desired = numericParameter(command.parameters[2]);
    if (base !== undefined && desired !== undefined &&
      [150, 200, 300, 600].includes(base) && [150, 200, 300, 600].includes(desired) && desired >= base) {
      dotConversion = desired / base;
    }
  }
  if (unit === "I") return printDensity * 25.4;
  if (unit === "M") return printDensity;
  return dotConversion;
}

function insertionOffsets(label: ZplLabelNode, printDensity: PrintDensity): {
  homeX: number;
  homeY: number;
  shiftX: number;
  top: number;
} {
  let unit: "D" | "I" | "M" = "D";
  let dotConversion = 1;
  let homeX = 0;
  let homeY = 0;
  let shiftX = 0;
  let top = 0;
  const scale = () => unit === "I" ? printDensity * 25.4 : unit === "M" ? printDensity : dotConversion;
  const dots = (value: string | undefined): number | undefined => {
    const normalized = value?.trim();
    if (!normalized) return undefined;
    const parsed = numericParameter(normalized);
    return parsed !== undefined ? Math.round(parsed * scale()) : undefined;
  };

  for (const command of label.commands) {
    if (command.canonical === "^MU") {
      const requested = command.parameters[0]?.trim().toUpperCase();
      if (!requested) unit = "D";
      else if (requested === "D" || requested === "I" || requested === "M") unit = requested;
      const base = numericParameter(command.parameters[1]);
      const desired = numericParameter(command.parameters[2]);
      if (base !== undefined && desired !== undefined &&
        [150, 200, 300, 600].includes(base) && [150, 200, 300, 600].includes(desired) && desired >= base) {
        dotConversion = desired / base;
      }
    } else if (command.canonical === "^LH") {
      homeX = Math.max(0, Math.min(32_000, dots(command.parameters[0]) ?? homeX));
      homeY = Math.max(0, Math.min(32_000, dots(command.parameters[1]) ?? homeY));
    } else if (command.canonical === "^LS") {
      shiftX = -Math.max(-9_999, Math.min(9_999, dots(command.parameters[0]) ?? 0));
    } else if (command.canonical === "^LT") {
      top = Math.max(-9_999, Math.min(9_999, dots(command.parameters[0]) ?? 0));
    }
  }
  return { homeX, homeY, shiftX, top };
}

function labelTransforms(label: ZplLabelNode): { mirror: boolean; rotate180: boolean } {
  let mirror = false;
  let rotate180 = false;
  for (const command of label.commands) {
    if (command.canonical === "^PM") mirror = command.parameters[0]?.trim().toUpperCase() !== "N";
    else if (command.canonical === "^PO") rotate180 = command.parameters[0]?.trim().toUpperCase() === "I";
  }
  return { mirror, rotate180 };
}

function formatCoordinate(value: number): string {
  const rounded = Math.round(value * 1_000) / 1_000;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function commandReplacement(command: ZplCommandNode, parameters: readonly string[]): string {
  return `${command.prefix}${command.code}${parameters.join(command.delimiter)}`;
}

function findOriginContext(source: string, originSpan: SourceSpan): {
  label: ZplLabelNode;
  command: ZplCommandNode;
} | undefined {
  for (const label of parseDocument(source).labels) {
    const command = commandAtSpan(label, originSpan);
    if (command && (command.canonical === "^FO" || command.canonical === "^FT")) return { label, command };
  }
  return undefined;
}

/** Create one undoable source edit that moves a rendered origin by a visual-dot delta. */
export function sourceEditForMove(
  source: string,
  originSpan: SourceSpan,
  visualDeltaX: number,
  visualDeltaY: number,
  printDensity: PrintDensity,
): SourceEdit | undefined {
  const context = findOriginContext(source, originSpan);
  if (!context) return undefined;
  const currentX = finiteParameter(context.command, 0);
  const currentY = finiteParameter(context.command, 1);
  if (currentX === undefined || currentY === undefined) return undefined;

  const { mirror, rotate180 } = labelTransforms(context.label);
  const sourceDeltaX = visualDeltaX * (mirror ? -1 : 1) * (rotate180 ? -1 : 1);
  const sourceDeltaY = visualDeltaY * (rotate180 ? -1 : 1);
  const scale = conversionScale(context.label, context.command.index, printDensity);
  const nextX = Math.max(0, Math.min(32_000, currentX + sourceDeltaX / scale));
  const nextY = Math.max(0, Math.min(32_000, currentY + sourceDeltaY / scale));
  const parameters = [formatCoordinate(nextX), formatCoordinate(nextY), ...context.command.parameters.slice(2)];
  return {
    start: context.command.span.start,
    end: context.command.span.end,
    text: commandReplacement(context.command, parameters),
    selectOriginAt: context.command.span.start,
  };
}

export function sourceEditForContent(
  source: string,
  content: VisualFieldContent,
  value: string,
): SourceEdit | undefined {
  const document = parseDocument(source);
  const command = document.labels
    .flatMap(({ commands }) => commands)
    .find((candidate) => candidate.span.start === content.commandSpan.start && candidate.span.end === content.commandSpan.end);
  if (!command || command.canonical !== "^FD") return undefined;
  const singleLineValue = value.replace(/[\r\n]+/g, " ");
  return {
    start: command.span.start,
    end: command.span.end,
    text: `${command.prefix}${command.code}${content.prefix}${singleLineValue}`,
  };
}

function expandedFieldSpan(source: string, span: SourceSpan): SourceSpan {
  let start = span.start;
  let end = span.end;
  while (start > 0 && (source[start - 1] === " " || source[start - 1] === "\t")) start--;
  if (start > 0 && source[start - 1] === "\n") start--;
  while (end < source.length && (source[end] === " " || source[end] === "\t")) end++;
  if (start === span.start && source[end] === "\n") end++;
  return { start, end };
}

export function sourceEditForDelete(source: string, span: SourceSpan): SourceEdit | undefined {
  if (span.start < 0 || span.end <= span.start || span.end > source.length) return undefined;
  const expanded = expandedFieldSpan(source, span);
  return { start: expanded.start, end: expanded.end, text: "" };
}

function offsetFieldSource(
  source: string,
  field: VisualField,
  printDensity: PrintDensity,
  offset: number,
): { text: string; originOffset: number } | undefined {
  if (!field.origin) return undefined;
  const movedOrigin = sourceEditForMove(source, field.origin.command.span, offset, offset, printDensity);
  if (!movedOrigin) return undefined;
  const fieldSource = source.slice(field.sourceSpan.start, field.sourceSpan.end);
  const relativeStart = movedOrigin.start - field.sourceSpan.start;
  const relativeEnd = movedOrigin.end - field.sourceSpan.start;
  if (relativeStart < 0 || relativeEnd > fieldSource.length) return undefined;
  return {
    text: `${fieldSource.slice(0, relativeStart)}${movedOrigin.text}${fieldSource.slice(relativeEnd)}`,
    originOffset: relativeStart,
  };
}

export function sourceEditForDuplicate(
  source: string,
  field: VisualField,
  printDensity: PrintDensity,
  offset = 20,
): SourceEdit | undefined {
  const copy = offsetFieldSource(source, field, printDensity, offset);
  if (!copy) return undefined;
  const separator = "\n";
  return {
    start: field.sourceSpan.end,
    end: field.sourceSpan.end,
    text: `${separator}${copy.text}`,
    selectOriginAt: field.sourceSpan.end + separator.length + copy.originOffset,
  };
}

/** Paste a copied visual field into a label with a visual-dot offset. */
export function sourceEditForPaste(
  targetSource: string,
  targetLabelIndex: number,
  copiedSource: string,
  copiedField: VisualField,
  printDensity: PrintDensity,
  offset = 20,
): SourceEdit | undefined {
  const copy = offsetFieldSource(copiedSource, copiedField, printDensity, offset);
  const targetLabel = parseDocument(targetSource).labels[targetLabelIndex];
  if (!copy || !targetLabel) return undefined;
  const endCommand = targetLabel.commands.findLast(({ canonical }) => canonical === "^XZ");
  const insertionPoint = endCommand?.span.start ?? targetLabel.span.end;
  const leading = insertionPoint > 0 && targetSource[insertionPoint - 1] !== "\n" ? "\n" : "";
  const trailing = targetSource[insertionPoint] === "\n" ? "" : "\n";
  return {
    start: insertionPoint,
    end: insertionPoint,
    text: `${leading}${copy.text}${trailing}`,
    selectOriginAt: insertionPoint + leading.length + copy.originOffset,
  };
}

/**
 * Swap two adjacent visual fields to change their paint order.
 *
 * Only whitespace may sit between the fields. Moving a field across another
 * ZPL command could change inherited formatting or coordinate state, so the
 * visual editor deliberately leaves those cases to the source editor.
 */
export function sourceEditForLayerSwap(
  source: string,
  selected: VisualField,
  adjacent: VisualField,
): SourceEdit | undefined {
  if (selected.labelIndex !== adjacent.labelIndex || selected.id === adjacent.id) return undefined;
  const first = selected.sourceSpan.start < adjacent.sourceSpan.start ? selected : adjacent;
  const second = first === selected ? adjacent : selected;
  if (
    first.sourceSpan.start < 0 ||
    first.sourceSpan.end <= first.sourceSpan.start ||
    first.sourceSpan.end > second.sourceSpan.start ||
    second.sourceSpan.end <= second.sourceSpan.start ||
    second.sourceSpan.end > source.length
  ) return undefined;

  const separator = source.slice(first.sourceSpan.end, second.sourceSpan.start);
  if (separator.trim() !== "") return undefined;
  const firstSource = source.slice(first.sourceSpan.start, first.sourceSpan.end);
  const secondSource = source.slice(second.sourceSpan.start, second.sourceSpan.end);
  const selectedOffset = (selected.origin?.command.span.start ?? selected.sourceSpan.start) - selected.sourceSpan.start;
  const selectedStart = selected === first
    ? first.sourceSpan.start + secondSource.length + separator.length
    : first.sourceSpan.start;

  return {
    start: first.sourceSpan.start,
    end: second.sourceSpan.end,
    text: `${secondSource}${separator}${firstSource}`,
    selectOriginAt: selectedStart + selectedOffset,
  };
}

function formatCommand(prefix: string, delimiter: string, code: string, ...parameters: Array<string | number>): string {
  return `${prefix}${code}${parameters.join(delimiter)}`;
}

function elementSnippet(
  kind: VisualElementKind,
  prefix: string,
  delimiter: string,
  x: string | number,
  y: string | number,
  coordinateScale: number,
): string {
  const origin = formatCommand(prefix, delimiter, "FO", x, y);
  const dots = (value: number) => formatCoordinate(value / coordinateScale);
  if (kind === "text") {
    return `${origin}\n${prefix}A0N${delimiter}${dots(36)}${delimiter}${dots(36)}\n${prefix}FDText${prefix}FS`;
  }
  if (kind === "barcode") {
    return `${origin}\n${formatCommand(prefix, delimiter, "BY", dots(2), 3, dots(80))}\n${prefix}BCN${delimiter}${dots(80)}${delimiter}Y${delimiter}N${delimiter}N\n${prefix}FD1234567890${prefix}FS`;
  }
  if (kind === "qr") {
    return `${origin}\n${prefix}BQN${delimiter}2${delimiter}5\n${prefix}FDQA,https://example.com${prefix}FS`;
  }
  if (kind === "line") {
    return `${origin}\n${formatCommand(prefix, delimiter, "GB", dots(200), dots(4), dots(4), "B", 0)}${prefix}FS`;
  }
  return `${origin}\n${formatCommand(prefix, delimiter, "GB", dots(200), dots(100), dots(4), "B", 0)}${prefix}FS`;
}

/** Insert a visual-toolbox element immediately before the selected label's ^XZ. */
export function sourceEditForInsert(
  source: string,
  labelIndex: number,
  kind: VisualElementKind,
  x: number,
  y: number,
  printDensity: PrintDensity = 8,
  renderedSize?: { width: number; height: number },
): SourceEdit | undefined {
  const label = parseDocument(source).labels[labelIndex];
  if (!label) return undefined;
  const endCommand = label.commands.findLast(({ canonical }) => canonical === "^XZ");
  const insertionPoint = endCommand?.span.start ?? label.span.end;
  const prefix = endCommand?.prefix ?? label.commands.at(-1)?.prefix ?? "^";
  const delimiter = endCommand?.delimiter ?? label.commands.at(-1)?.delimiter ?? ",";
  const scale = conversionScale(label, endCommand?.index ?? label.commands.at(-1)?.index ?? 0, printDensity);
  const transforms = labelTransforms(label);
  let sourceX = Math.round(x);
  let sourceY = Math.round(y);
  if (renderedSize && transforms.rotate180) {
    sourceX = renderedSize.width - 1 - sourceX;
    sourceY = renderedSize.height - 1 - sourceY;
  }
  if (renderedSize && transforms.mirror) sourceX = renderedSize.width - 1 - sourceX;
  const offsets = insertionOffsets(label, printDensity);
  const safeX = formatCoordinate(Math.max(0, Math.min(32_000, sourceX - offsets.homeX - offsets.shiftX)) / scale);
  const safeY = formatCoordinate(Math.max(0, Math.min(32_000, sourceY - offsets.homeY - offsets.top)) / scale);
  const snippet = elementSnippet(kind, prefix, delimiter, safeX, safeY, scale);
  const leading = insertionPoint > 0 && source[insertionPoint - 1] !== "\n" ? "\n" : "";
  const trailing = source[insertionPoint] === "\n" ? "" : "\n";
  return {
    start: insertionPoint,
    end: insertionPoint,
    text: `${leading}${snippet}${trailing}`,
    selectOriginAt: insertionPoint + leading.length,
  };
}

export function visualFieldLabel(kind: VisualField["kind"], regionType?: HighlightRegionType): string {
  if (kind === "qr") return "QR code";
  if (kind === "barcode") return "Barcode";
  if (kind === "text") return "Text";
  if (kind === "circle") return "Circle";
  if (kind === "ellipse") return "Ellipse";
  if (kind === "box") return "Box";
  return regionType === "box" ? "Graphic / line" : "Graphic";
}
