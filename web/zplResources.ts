import { strToU8, zlibSync } from "fflate";
import { crc16Ccitt } from "../src/core/graphicDecoder";
import { parseDocument, type SourceSpan, type ZplCommandNode } from "../src/index.web";
import {
  sourceEditTransaction,
  sourceOffsetAfterEdits,
  type SourceEdit,
  type SourceEditTransaction,
} from "./visualEditorSource";

export type DitherMode = "threshold" | "bayer" | "floyd-steinberg";

export interface BitmapConversionOptions {
  threshold: number;
  dither: DitherMode;
  invert?: boolean;
}

export interface MonochromeBitmap {
  width: number;
  height: number;
  bytesPerRow: number;
  data: Uint8Array;
}

export interface ZplResourceReference {
  command: string;
  span: SourceSpan;
}

export interface ZplResource {
  id: string;
  name: string;
  kind: "graphic" | "font" | "object";
  bytes?: number;
  definition: ZplCommandNode;
  references: ZplResourceReference[];
}

const bayer4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
] as const;

function luminance(data: Uint8ClampedArray | Uint8Array, index: number): number {
  const alpha = data[index + 3]! / 255;
  const red = data[index]! * alpha + 255 * (1 - alpha);
  const green = data[index + 1]! * alpha + 255 * (1 - alpha);
  const blue = data[index + 2]! * alpha + 255 * (1 - alpha);
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

export function rgbaToMonochrome(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
  options: BitmapConversionOptions,
): MonochromeBitmap {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || rgba.length !== width * height * 4) {
    throw new Error("RGBA data does not match the requested bitmap dimensions.");
  }
  const threshold = Math.max(0, Math.min(255, Math.round(options.threshold)));
  const bytesPerRow = Math.ceil(width / 8);
  const output = new Uint8Array(bytesPerRow * height);
  const values = new Float32Array(width * height);
  for (let pixel = 0; pixel < values.length; pixel++) values[pixel] = luminance(rgba, pixel * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = y * width + x;
      let cutoff = threshold;
      if (options.dither === "bayer") cutoff += (bayer4[(y % 4) * 4 + (x % 4)]! - 7.5) * 8;
      const black = values[pixel]! < cutoff;
      if (options.dither === "floyd-steinberg") {
        const quantized = black ? 0 : 255;
        const error = values[pixel]! - quantized;
        if (x + 1 < width) values[pixel + 1] += error * 7 / 16;
        if (y + 1 < height) {
          if (x > 0) values[pixel + width - 1] += error * 3 / 16;
          values[pixel + width] += error * 5 / 16;
          if (x + 1 < width) values[pixel + width + 1] += error / 16;
        }
      }
      if (black !== Boolean(options.invert)) output[y * bytesPerRow + Math.floor(x / 8)]! |= 0x80 >> (x % 8);
    }
  }
  return { width, height, bytesPerRow, data: output };
}

function base64(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index]!;
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    output += alphabet[first >> 2];
    output += alphabet[((first & 3) << 4) | ((second ?? 0) >> 4)];
    output += second === undefined ? "=" : alphabet[((second & 15) << 2) | ((third ?? 0) >> 6)];
    output += third === undefined ? "=" : alphabet[third & 63];
  }
  return output;
}

export function z64Payload(bytes: Uint8Array): string {
  const encoded = base64(zlibSync(bytes, { level: 9 }));
  return `:Z64:${encoded}:${crc16Ccitt(encoded)}`;
}

export function normalizedResourceName(value: string, extension: "GRF" | "TTF"): string {
  const withoutPath = value.trim().toUpperCase().replace(/^.*:/, "").replace(/\.[A-Z0-9]+$/, "");
  const name = withoutPath.replace(/[^A-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 32) || (extension === "GRF" ? "IMAGE" : "FONT");
  return `R:${name}.${extension}`;
}

export function storedGraphicDefinition(name: string, bitmap: MonochromeBitmap): string {
  const resourceName = normalizedResourceName(name, "GRF");
  return `~DG${resourceName},${bitmap.data.length},${bitmap.bytesPerRow},${z64Payload(bitmap.data)}`;
}

export function downloadedFontDefinition(name: string, bytes: Uint8Array): string {
  const resourceName = normalizedResourceName(name, "TTF");
  return `~DY${resourceName},A,T,${bytes.length},,${z64Payload(bytes)}`;
}

function labelInsertion(source: string, labelIndex: number): { point: number; prefix: string; delimiter: string } | undefined {
  const label = parseDocument(source).labels[labelIndex];
  if (!label) return undefined;
  const end = label.commands.findLast(({ canonical }) => canonical === "^XZ");
  return {
    point: end?.span.start ?? label.span.end,
    prefix: end?.prefix ?? label.commands.at(-1)?.prefix ?? "^",
    delimiter: end?.delimiter ?? label.commands.at(-1)?.delimiter ?? ",",
  };
}

function insertionText(source: string, point: number, value: string): string {
  const leading = point > 0 && source[point - 1] !== "\n" ? "\n" : "";
  const trailing = source[point] === "\n" ? "" : "\n";
  return `${leading}${value}${trailing}`;
}

export function sourceTransactionForStoredGraphic(
  source: string,
  labelIndex: number,
  bitmap: MonochromeBitmap,
  name: string,
  x: number,
  y: number,
): SourceEditTransaction | undefined {
  const label = parseDocument(source).labels[labelIndex];
  const insertion = labelInsertion(source, labelIndex);
  if (!label || !insertion) return undefined;
  const resourceName = normalizedResourceName(name, "GRF");
  const definitionPoint = label.span.start;
  const definition: SourceEdit = {
    start: definitionPoint,
    end: definitionPoint,
    text: insertionText(source, definitionPoint, storedGraphicDefinition(resourceName, bitmap)),
  };
  const use = `${insertion.prefix}FO${Math.max(0, Math.round(x))}${insertion.delimiter}${Math.max(0, Math.round(y))}` +
    `${insertion.prefix}XG${resourceName}${insertion.delimiter}1${insertion.delimiter}1${insertion.prefix}FS`;
  const usage: SourceEdit = {
    start: insertion.point,
    end: insertion.point,
    text: insertionText(source, insertion.point, use),
  };
  const edits = [definition, usage];
  const usageStart = sourceOffsetAfterEdits(insertion.point, [definition]);
  const selectedOrigin = usageStart + usage.text.indexOf(`${insertion.prefix}FO`);
  return sourceEditTransaction(edits, {
    origins: [selectedOrigin],
    primary: selectedOrigin,
    kinds: ["graphic"],
  });
}

export function sourceEditForInlineGraphic(
  source: string,
  labelIndex: number,
  bitmap: MonochromeBitmap,
  x: number,
  y: number,
): SourceEdit | undefined {
  const insertion = labelInsertion(source, labelIndex);
  if (!insertion) return undefined;
  const total = bitmap.data.length;
  const use = `${insertion.prefix}FO${Math.max(0, Math.round(x))}${insertion.delimiter}${Math.max(0, Math.round(y))}` +
    `${insertion.prefix}GFA${insertion.delimiter}${total}${insertion.delimiter}${total}${insertion.delimiter}${bitmap.bytesPerRow}${insertion.delimiter}${z64Payload(bitmap.data)}` +
    `${insertion.prefix}FS`;
  const text = insertionText(source, insertion.point, use);
  return {
    start: insertion.point,
    end: insertion.point,
    text,
    selectOriginAt: insertion.point + text.indexOf(`${insertion.prefix}FO`),
  };
}

export function sourceEditForExistingGraphic(
  source: string,
  labelIndex: number,
  name: string,
  x: number,
  y: number,
): SourceEdit | undefined {
  const insertion = labelInsertion(source, labelIndex);
  if (!insertion) return undefined;
  const use = `${insertion.prefix}FO${Math.max(0, Math.round(x))}${insertion.delimiter}${Math.max(0, Math.round(y))}` +
    `${insertion.prefix}XG${name}${insertion.delimiter}1${insertion.delimiter}1${insertion.prefix}FS`;
  const text = insertionText(source, insertion.point, use);
  return { start: insertion.point, end: insertion.point, text, selectOriginAt: insertion.point + text.indexOf(`${insertion.prefix}FO`) };
}

export function sourceTransactionForDownloadedFont(
  source: string,
  bytes: Uint8Array,
  name: string,
  identifier = "Z",
  selectedFieldSpan?: SourceSpan,
): SourceEditTransaction | undefined {
  const label = parseDocument(source).labels[0];
  if (!label) return undefined;
  const safeIdentifier = /^[A-Z0-9]$/i.test(identifier) ? identifier.toUpperCase() : "Z";
  const resourceName = normalizedResourceName(name, "TTF");
  const definition = `${downloadedFontDefinition(resourceName, bytes)}\n^CW${safeIdentifier},${resourceName}\n`;
  const selectedOrigin = selectedFieldSpan
    ? sourceOffsetAfterEdits(selectedFieldSpan.start, [{ start: label.span.start, end: label.span.start, text: definition }])
    : undefined;
  return sourceEditTransaction(
    [{ start: label.span.start, end: label.span.start, text: definition }],
    selectedOrigin === undefined ? {} : { origins: [selectedOrigin], primary: selectedOrigin },
  );
}

export function fontIdentifierForResource(source: string, name: string): string | undefined {
  const command = allCommands(source).find((candidate) => candidate.canonical === "^CW" &&
    resourceKey(candidate.parameters[1] ?? "") === resourceKey(name));
  const identifier = command?.parameters[0]?.trim();
  return identifier && /^[A-Z0-9]$/i.test(identifier) ? identifier.toUpperCase() : undefined;
}

export function sourceEditForApplyFont(
  source: string,
  fieldSpan: SourceSpan,
  resourceNameValue: string,
): SourceEdit | undefined {
  const identifier = fontIdentifierForResource(source, resourceNameValue);
  if (!identifier) return undefined;
  const commands = allCommands(source).filter(({ span }) => span.start >= fieldSpan.start && span.end <= fieldSpan.end);
  const font = commands.find(({ canonical }) => canonical === "^A@" || /^\^A(?:[A-Z0-9])?$/.test(canonical));
  if (font) {
    const parameters = font.canonical === "^A@"
      ? font.parameters.slice(0, 3)
      : [font.parameters[0]?.slice(1) ?? "", ...font.parameters.slice(1)];
    while (parameters.at(-1) === "") parameters.pop();
    return {
      start: font.span.start,
      end: font.span.end,
      text: `${font.prefix}A${identifier}${parameters.join(font.delimiter)}`,
    };
  }
  const content = commands.find(({ canonical }) => canonical === "^FD" || canonical === "^FV");
  if (!content) return undefined;
  return {
    start: content.span.start,
    end: content.span.start,
    text: `${content.prefix}A${identifier}N${content.delimiter}30${content.delimiter}30`,
  };
}

function allCommands(source: string): ZplCommandNode[] {
  const document = parseDocument(source);
  const commands = document.items.flatMap((item) => item.kind === "label" ? item.commands : [item]);
  const seen = new Set<number>();
  return commands.filter((command) => !seen.has(command.span.start) && seen.add(command.span.start));
}

function resourceKey(value: string): string {
  return value.trim().toUpperCase();
}

function resourceName(command: ZplCommandNode): string | undefined {
  const value = command.parameters[0]?.trim();
  return value || undefined;
}

function referenceName(command: ZplCommandNode): string | undefined {
  if (command.canonical === "^XG" || command.canonical === "^IL" || command.canonical === "^IM") return command.parameters[0]?.trim();
  if (command.canonical === "^A@") return command.parameters[3]?.trim();
  if (command.canonical === "^CW") return command.parameters[1]?.trim();
  return undefined;
}

export function collectZplResources(source: string): ZplResource[] {
  const commands = allCommands(source);
  const references = commands.filter((command) => referenceName(command));
  return commands.flatMap((command) => {
    if (command.canonical !== "~DG" && command.canonical !== "~DY") return [];
    const name = resourceName(command);
    if (!name) return [];
    const extension = name.split(".").at(-1)?.toUpperCase();
    const kind = command.canonical === "~DG" || extension === "GRF" ? "graphic" : extension === "TTF" || extension === "TTE" ? "font" : "object";
    const bytesAt = command.canonical === "~DG" ? 1 : 3;
    const bytes = Number.parseInt(command.parameters[bytesAt] ?? "", 10);
    return [{
      id: `${command.span.start}:${name}`,
      name,
      kind,
      bytes: Number.isFinite(bytes) ? bytes : undefined,
      definition: command,
      references: references.flatMap((reference) => resourceKey(referenceName(reference) ?? "") === resourceKey(name)
        ? [{ command: reference.canonical, span: { ...reference.span } }]
        : []),
    } satisfies ZplResource];
  });
}

function replaceCommandParameter(command: ZplCommandNode, index: number, value: string): SourceEdit {
  const parameters = [...command.parameters];
  while (parameters.length <= index) parameters.push("");
  parameters[index] = value;
  return {
    start: command.span.start,
    end: command.span.end,
    text: `${command.prefix}${command.code}${parameters.join(command.delimiter)}`,
  };
}

export function sourceTransactionForResourceRename(
  source: string,
  resource: ZplResource,
  requestedName: string,
): SourceEditTransaction | undefined {
  const extension = resource.kind === "font" ? "TTF" : "GRF";
  const nextName = normalizedResourceName(requestedName, extension);
  if (resourceKey(nextName) === resourceKey(resource.name)) return undefined;
  const commands = allCommands(source);
  const definition = commands.find(({ span }) => span.start === resource.definition.span.start);
  if (!definition) return undefined;
  const edits: SourceEdit[] = [replaceCommandParameter(definition, 0, nextName)];
  for (const command of commands) {
    if (resourceKey(referenceName(command) ?? "") !== resourceKey(resource.name)) continue;
    const parameter = command.canonical === "^A@" ? 3 : command.canonical === "^CW" ? 1 : 0;
    edits.push(replaceCommandParameter(command, parameter, nextName));
  }
  return sourceEditTransaction(edits);
}

export function sourceEditForResourceDelete(source: string, resource: ZplResource): SourceEdit {
  let start = resource.definition.span.start;
  let end = resource.definition.span.end;
  if (source[end] === "\r" && source[end + 1] === "\n") end += 2;
  else if (source[end] === "\n") end += 1;
  else if (start > 0 && source[start - 1] === "\n") start -= 1;
  return { start, end, text: "" };
}

export async function imageFileToMonochrome(
  file: Blob,
  maximumWidth: number,
  options: BitmapConversionOptions,
): Promise<{ bitmap: MonochromeBitmap; rgba: ImageData }> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;
    await image.decode();
    const width = Math.max(1, Math.min(4_096, Math.round(Math.min(image.naturalWidth, maximumWidth || image.naturalWidth))));
    const height = Math.max(1, Math.min(4_096, Math.round(image.naturalHeight * width / image.naturalWidth)));
    if (width * height > 5_000_000) throw new Error("The converted image exceeds the 5 megapixel editor limit.");
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("The browser could not create an image conversion canvas.");
    context.fillStyle = "white";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const rgba = context.getImageData(0, 0, width, height);
    return { bitmap: rgbaToMonochrome(rgba.data, width, height, options), rgba };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function monochromeImageData(bitmap: MonochromeBitmap): ImageData {
  const output = new Uint8ClampedArray(bitmap.width * bitmap.height * 4);
  for (let y = 0; y < bitmap.height; y++) {
    for (let x = 0; x < bitmap.width; x++) {
      const black = (bitmap.data[y * bitmap.bytesPerRow + Math.floor(x / 8)]! & (0x80 >> (x % 8))) !== 0;
      const offset = (y * bitmap.width + x) * 4;
      output[offset] = output[offset + 1] = output[offset + 2] = black ? 0 : 255;
      output[offset + 3] = 255;
    }
  }
  return new ImageData(output, bitmap.width, bitmap.height);
}

/** Convenience for text fixtures and already-loaded font files. */
export function stringBytes(value: string): Uint8Array {
  return strToU8(value);
}
