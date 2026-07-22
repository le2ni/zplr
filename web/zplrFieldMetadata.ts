import type { SourceSpan } from "../src/index.web";
import {
  sourceEditTransaction,
  type SourceEdit,
  type SourceEditTransaction,
  type VisualBounds,
  type VisualField,
} from "./visualEditorSource";

const base64UrlAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const lockPattern = /(.)FXZPLR-LOCK-1:([A-Za-z0-9_-]+)\1FS/g;
const hiddenPattern = /(.)FXZPLR-HIDDEN-1:([A-Za-z0-9_-]+)\1FS/g;
let metadataSequence = 0;

export interface HiddenVisualField {
  readonly id: string;
  readonly kind: VisualField["kind"];
  readonly labelIndex: number;
  readonly bounds: VisualBounds;
  readonly source: string;
  readonly markerSpan: SourceSpan;
}

interface HiddenPayload {
  v: 1;
  id: string;
  kind: VisualField["kind"];
  labelIndex: number;
  bounds: VisualBounds;
  source: string;
}

function encodeBase64Url(bytes: Uint8Array): string {
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index]!;
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    output += base64UrlAlphabet[first >> 2];
    output += base64UrlAlphabet[((first & 3) << 4) | ((second ?? 0) >> 4)];
    if (second !== undefined) output += base64UrlAlphabet[((second & 15) << 2) | ((third ?? 0) >> 6)];
    if (third !== undefined) output += base64UrlAlphabet[third & 63];
  }
  return output;
}

function decodeBase64Url(value: string): Uint8Array | undefined {
  if (!value || !/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) return undefined;
  const output: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const character of value) {
    const digit = base64UrlAlphabet.indexOf(character);
    if (digit < 0) return undefined;
    buffer = (buffer << 6) | digit;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output.push((buffer >> bits) & 0xff);
      buffer &= bits === 0 ? 0 : (1 << bits) - 1;
    }
  }
  if (buffer !== 0) return undefined;
  return Uint8Array.from(output);
}

function metadataId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "");
  }
  metadataSequence += 1;
  return `${Date.now().toString(36)}${metadataSequence.toString(36)}`;
}

function nextNonWhitespace(source: string, offset: number): number {
  let cursor = offset;
  while (cursor < source.length && /\s/.test(source[cursor]!)) cursor++;
  return cursor;
}

export function lockedVisualFieldStarts(source: string): ReadonlySet<number> {
  const starts = new Set<number>();
  for (const match of source.matchAll(lockPattern)) {
    starts.add(nextNonWhitespace(source, match.index! + match[0].length));
  }
  return starts;
}

function lockMarkerForField(source: string, field: VisualField): SourceSpan | undefined {
  for (const match of source.matchAll(lockPattern)) {
    const end = match.index! + match[0].length;
    if (nextNonWhitespace(source, end) === field.sourceSpan.start) {
      return { start: match.index!, end };
    }
  }
  return undefined;
}

export function sourceEditForFieldLock(
  source: string,
  field: VisualField,
  locked: boolean,
): SourceEdit | undefined {
  const marker = lockMarkerForField(source, field);
  if (!locked) {
    if (!marker) return undefined;
    let end = marker.end;
    if (source[end] === "\r" && source[end + 1] === "\n") end += 2;
    else if (source[end] === "\n") end += 1;
    return { start: marker.start, end, text: "" };
  }
  if (marker) return undefined;
  const prefix = field.commands[0]?.prefix ?? "^";
  return {
    start: field.sourceSpan.start,
    end: field.sourceSpan.start,
    text: `${prefix}FXZPLR-LOCK-1:${metadataId()}${prefix}FS\n`,
    selectOriginAt: field.sourceSpan.start,
  };
}

function hiddenPayload(field: VisualField, source: string): HiddenPayload {
  return {
    v: 1,
    id: metadataId(),
    kind: field.kind,
    labelIndex: field.labelIndex,
    bounds: { ...field.bounds },
    source: source.slice(field.sourceSpan.start, field.sourceSpan.end),
  };
}

export function sourceEditForHideField(source: string, field: VisualField): SourceEdit | undefined {
  if (field.locked) return undefined;
  const prefix = field.commands[0]?.prefix ?? "^";
  const payload = encodeBase64Url(new TextEncoder().encode(JSON.stringify(hiddenPayload(field, source))));
  return {
    start: field.sourceSpan.start,
    end: field.sourceSpan.end,
    text: `${prefix}FXZPLR-HIDDEN-1:${payload}${prefix}FS`,
  };
}

export function sourceTransactionForHideFields(
  source: string,
  fields: readonly VisualField[],
): SourceEditTransaction | undefined {
  if (fields.length === 0) return undefined;
  const edits = fields.flatMap((field) => {
    const edit = sourceEditForHideField(source, field);
    return edit ? [edit] : [];
  });
  return edits.length === fields.length ? sourceEditTransaction(edits) : undefined;
}

function validBounds(value: unknown): value is VisualBounds {
  if (!value || typeof value !== "object") return false;
  const bounds = value as Partial<VisualBounds>;
  return [bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite) &&
    bounds.width! >= 0 && bounds.height! >= 0;
}

function parseHiddenPayload(encoded: string): HiddenPayload | undefined {
  const bytes = decodeBase64Url(encoded);
  if (!bytes) return undefined;
  try {
    const value = JSON.parse(new TextDecoder().decode(bytes)) as Partial<HiddenPayload>;
    if (
      value.v !== 1 ||
      typeof value.id !== "string" ||
      typeof value.source !== "string" ||
      typeof value.labelIndex !== "number" ||
      !Number.isInteger(value.labelIndex) ||
      value.labelIndex < 0 ||
      !validBounds(value.bounds) ||
      !["text", "barcode", "qr", "box", "circle", "ellipse", "graphic"].includes(value.kind ?? "")
    ) return undefined;
    return value as HiddenPayload;
  } catch {
    return undefined;
  }
}

export function collectHiddenVisualFields(source: string): HiddenVisualField[] {
  const hidden: HiddenVisualField[] = [];
  for (const match of source.matchAll(hiddenPattern)) {
    const payload = parseHiddenPayload(match[2]!);
    if (!payload) continue;
    hidden.push({
      id: payload.id,
      kind: payload.kind,
      labelIndex: payload.labelIndex,
      bounds: payload.bounds,
      source: payload.source,
      markerSpan: { start: match.index!, end: match.index! + match[0].length },
    });
  }
  return hidden;
}

export function sourceEditForUnhideField(field: HiddenVisualField): SourceEdit {
  return {
    start: field.markerSpan.start,
    end: field.markerSpan.end,
    text: field.source,
    selectOriginAt: field.markerSpan.start,
  };
}
