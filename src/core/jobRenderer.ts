import { parseDocument } from "./documentParser";
import {
  decodeDownloadData,
  decodeGraphic,
  GraphicDecodeError,
  validateGraphicGeometry,
} from "./graphicDecoder";
import { decodePng } from "./pngDecoder";
import { decodeBmp, decodePcx } from "./imageDecoder";
import {
  normalizeResourceName,
  type InterpretResourceContext,
  type StoredGraphic,
} from "./interpreter";
import {
  renderDocumentWithPlatform,
  resolveRenderLimits,
  type DocumentRenderResult,
} from "./renderDocument";
import type { CanvasLike, CanvasPlatform } from "@/helper/rendering/canvas";
import type {
  DownloadedBitmapFont,
  DownloadedFontSource,
  FontProvider,
  MonochromeRaster,
  RenderJobOptions,
  RenderJobResult,
  RenderLimits,
  ZplRenderSession,
} from "@/types/RenderJob";
import type {
  ZplCommandNode,
  ZplDiagnostic,
  ZplDocument,
  ZplLabelNode,
  ZplSyntaxState,
} from "@/types/ZplDocument";
import { zplDpiConversion } from "./zplNumbers";
import { parseFieldNumber } from "./fieldNumber";

const PERSISTENT_COMMANDS = new Set([
  "BY",
  "CF",
  "CI",
  "CV",
  "FW",
  "LH",
  "LL",
  "LR",
  "LS",
  "LT",
  "ML",
  "MN",
  "MC",
  "MU",
  "PO",
  "PA",
  "PW",
  "SE",
]);

const DOWNLOAD_OBJECT_EXTENSIONS: Readonly<Record<string, string>> = {
  T: "TTF",
  E: "TTE",
  P: "PNG",
  B: "BMP",
  X: "PCX",
  G: "GRF",
  NRD: "NRD",
  PAC: "PAC",
  C: "WML",
  F: "HTM",
  H: "GET",
};

const MAX_SERIALIZATION_FIELD_SIZE = 3 * 1024;
const RESOURCE_CONTEXT_ID: unique symbol = Symbol("resource-context-id");

type ResourceContextCommand = ZplCommandNode & {
  [RESOURCE_CONTEXT_ID]?: number;
};

interface StoredFormat {
  commands: ZplCommandNode[];
  bytes: number;
  definitionSpan: { start: number; end: number };
  documentId: number;
}

interface RtcOffset {
  months: number;
  days: number;
  years: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface RtcState {
  mode: "S" | "T" | number;
  language: number;
  offsets: Map<2 | 3, RtcOffset>;
  fixed?: Date;
}

interface StoredObject {
  data: Uint8Array;
  kind:
    | "opentype"
    | "bitmap-font"
    | DownloadedFontSource["format"]
    | "encoding"
    | "binary";
}

interface StoredPersistentCommand {
  command: ZplCommandNode;
  documentId: number;
  bytes: number;
}

interface SessionState {
  syntax: ZplSyntaxState;
  graphics: Map<string, StoredGraphic>;
  formats: Map<string, StoredFormat>;
  persistent: Map<string, StoredPersistentCommand>;
  fontAliases: Map<string, string>;
  resourceBytes: number;
  retainedRaster?: MonochromeRaster;
  rtc: RtcState;
  memoryAliases: Map<string, string>;
  objects: Map<string, StoredObject>;
  bitmapFonts: Map<string, DownloadedBitmapFont>;
  encodings: Map<string, ReadonlyMap<number, number>>;
  fontLinks: Map<string, string[]>;
  nextDocumentId: number;
}

function newState(): SessionState {
  return {
    syntax: { formatPrefix: "^", controlPrefix: "~", delimiter: "," },
    graphics: new Map(),
    formats: new Map(),
    persistent: new Map(),
    fontAliases: new Map(),
    resourceBytes: 0,
    rtc: {
      mode: "S",
      language: 1,
      offsets: new Map(),
    },
    memoryAliases: new Map([
      ["A", "A"],
      ["B", "B"],
      ["E", "E"],
      ["R", "R"],
    ]),
    objects: new Map(),
    bitmapFonts: new Map(),
    encodings: new Map(),
    fontLinks: new Map(),
    nextDocumentId: 0,
  };
}

function sessionResourceName(
  value: string,
  extension: "GRF" | "ZPL",
  state: SessionState
): string {
  return normalizeResourceName(value, extension, state.memoryAliases);
}

function aliasedPathUsing(
  value: string,
  memoryAliases: ReadonlyMap<string, string>
): string {
  let normalized = value.trim().toUpperCase();
  if (!normalized.includes(":")) normalized = `R:${normalized}`;
  const mapped = memoryAliases.get(normalized[0]);
  return mapped
    ? `${mapped}:${normalized.slice(normalized.indexOf(":") + 1)}`
    : normalized;
}

function aliasedPath(value: string, state: SessionState): string {
  return aliasedPathUsing(value, state.memoryAliases);
}

function changeMemoryAliases(command: ZplCommandNode, state: SessionState): void {
  const logical = ["B", "E", "R", "A"] as const;
  const requested = logical.map((letter, index) =>
    (command.parameters[index]?.trim().toUpperCase().replace(/:$/, "") || letter)
  );
  if (requested.some((value) => value !== "NONE" && !logical.includes(value as typeof logical[number]))) {
    return;
  }
  const multiple = command.parameters[4]?.trim().toUpperCase() === "M";
  const active = requested.filter((value) => value !== "NONE");
  if (!multiple && new Set(active).size !== active.length) {
    for (const letter of logical) state.memoryAliases.set(letter, letter);
    return;
  }
  logical.forEach((letter, index) => {
    state.memoryAliases.set(letter, requested[index]);
  });
}

function cloneRaster(raster: MonochromeRaster): MonochromeRaster {
  return {
    width: raster.width,
    height: raster.height,
    stride: raster.stride,
    bitOrder: "msb-first",
    data: raster.data.slice(),
  };
}

function clockNow(options: RenderJobOptions): Date {
  const value =
    typeof options.clock === "function"
      ? options.clock()
      : options.clock ?? new Date();
  return new Date(value.getTime());
}

function rightmostNumber(value: string): RegExpExecArray | undefined {
  const matches = [...value.matchAll(/\d+/g)];
  return matches[matches.length - 1];
}

function serializeNumber(
  value: string,
  increment: string,
  leadingZeros: boolean,
  step: number
): string {
  const match = rightmostNumber(value);
  if (!match || match.index === undefined) return value;
  const digits = match[0].slice(-12);
  const digitsStart = match.index + match[0].length - digits.length;
  const start = BigInt(digits || "0");
  let delta: bigint;
  try {
    delta = BigInt(increment.trim() || "1");
  } catch {
    delta = 1n;
  }
  const next = start + delta * BigInt(step);
  const sign = next < 0 ? "-" : "";
  const absolute = (next < 0 ? -next : next).toString();
  const rendered = leadingZeros
    ? sign + absolute.padStart(digits.length, "0")
    : next.toString();
  return value.slice(0, digitsStart) + rendered + value.slice(digitsStart + digits.length);
}

function serializationAlphabet(mask: string): string | undefined {
  if (mask === "D") return "0123456789";
  if (mask === "d") return "0123456789";
  if (mask === "H") return "0123456789ABCDEF";
  if (mask === "h") return "0123456789abcdef";
  if (mask === "O") return "01234567";
  if (mask === "o") return "01234567";
  if (mask === "A") return "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (mask === "a") return "abcdefghijklmnopqrstuvwxyz";
  if (mask === "N") return "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (mask === "n") return "0123456789abcdefghijklmnopqrstuvwxyz";
  return undefined;
}

function serializeMasked(
  value: string,
  mask: string,
  increment: string,
  step: number
): string {
  const characters = [...value];
  const masks = [...mask];
  const increments = [...increment];
  const start = characters.length - masks.length;
  const positions: Array<{
    characterIndex: number;
    maskIndex: number;
    alphabet: string;
  }> = [];
  for (let maskIndex = 0; maskIndex < masks.length; maskIndex++) {
    const alphabet = serializationAlphabet(masks[maskIndex]);
    const characterIndex = start + maskIndex;
    if (alphabet && characterIndex >= 0 && characterIndex < characters.length) {
      positions.push({ characterIndex, maskIndex, alphabet });
    }
  }
  if (positions.length === 0 || step === 0) return value;

  let current = 0n;
  let addition = 0n;
  let multiplier = 1n;
  for (let index = positions.length - 1; index >= 0; index--) {
    const position = positions[index];
    const base = BigInt(position.alphabet.length);
    const currentDigit = Math.max(
      0,
      position.alphabet.indexOf(characters[position.characterIndex])
    );
    current += BigInt(currentDigit) * multiplier;
    const incrementIndex = increments.length - masks.length + position.maskIndex;
    const incrementCharacter = increments[incrementIndex];
    const incrementDigit =
      incrementCharacter === "%"
        ? 0
        : Math.max(0, position.alphabet.indexOf(incrementCharacter ?? ""));
    addition += BigInt(incrementDigit) * multiplier;
    multiplier *= base;
  }
  if (!increment.trim()) addition = 1n;
  let next = (current + addition * BigInt(step)) % multiplier;
  if (next < 0) next += multiplier;
  for (let index = positions.length - 1; index >= 0; index--) {
    const position = positions[index];
    const base = BigInt(position.alphabet.length);
    const digit = Number(next % base);
    next /= base;
    characters[position.characterIndex] = position.alphabet[digit];
  }
  return characters.join("");
}

function serializationFieldSize(command: ZplCommandNode): number {
  return (
    (command.parameters[0]?.length ?? 0) +
    (command.parameters[1]?.length ?? 0)
  );
}

const RTC_LOCALES = [
  "en", "es", "fr", "de", "it", "nb", "pt", "sv", "da", "es",
  "nl", "fi", "ja", "ko", "zh-CN", "zh-TW", "ru", "pl",
] as const;

function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

function dayOfYear(date: Date): number {
  const day = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
  const start = Date.UTC(date.getUTCFullYear(), 0, 1);
  return Math.floor((day - start) / 86_400_000) + 1;
}

function rtcToken(date: Date, token: string, language: number): string | undefined {
  const locale = RTC_LOCALES[Math.min(18, Math.max(1, language)) - 1] ?? "en";
  const hour = date.getUTCHours();
  const ordinal = dayOfYear(date);
  if (token === "a") {
    return new Intl.DateTimeFormat(locale, {
      weekday: "short",
      timeZone: "UTC",
    }).format(date);
  }
  if (token === "A") {
    return new Intl.DateTimeFormat(locale, {
      weekday: "long",
      timeZone: "UTC",
    }).format(date);
  }
  if (token === "b") {
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      timeZone: "UTC",
    }).format(date);
  }
  if (token === "B") {
    return new Intl.DateTimeFormat(locale, {
      month: "long",
      timeZone: "UTC",
    }).format(date);
  }
  if (token === "d") return pad(date.getUTCDate());
  if (token === "H") return pad(hour);
  if (token === "I") return pad(hour % 12 || 12);
  if (token === "j") return pad(ordinal, 3);
  if (token === "m") return pad(date.getUTCMonth() + 1);
  if (token === "M") return pad(date.getUTCMinutes());
  if (token === "p") return hour < 12 ? "AM" : "PM";
  if (token === "S") return pad(date.getUTCSeconds());
  if (token === "w") return pad(date.getUTCDay());
  if (token === "y") return pad(date.getUTCFullYear() % 100);
  if (token === "Y") return String(date.getUTCFullYear());
  if (token === "U") return pad(Math.floor((ordinal - 1 + 7 - date.getUTCDay()) / 7));
  if (token === "W") {
    const mondayDay = (date.getUTCDay() + 6) % 7;
    return pad(Math.floor((ordinal - 1 + 7 - mondayDay) / 7));
  }
  return undefined;
}

function applyRtcOffset(date: Date, offset: RtcOffset | undefined): Date {
  const result = new Date(date.getTime());
  if (!offset) return result;
  result.setUTCFullYear(result.getUTCFullYear() + offset.years);
  result.setUTCMonth(result.getUTCMonth() + offset.months);
  result.setUTCDate(result.getUTCDate() + offset.days);
  result.setUTCHours(result.getUTCHours() + offset.hours);
  result.setUTCMinutes(result.getUTCMinutes() + offset.minutes);
  result.setUTCSeconds(result.getUTCSeconds() + offset.seconds);
  return result;
}

function formatRtcField(
  value: string,
  indicators: readonly string[],
  rtc: RtcState,
  sourceDate: Date
): string {
  const clocks = [
    sourceDate,
    applyRtcOffset(sourceDate, rtc.offsets.get(2)),
    applyRtcOffset(sourceDate, rtc.offsets.get(3)),
  ];
  let result = "";
  for (let index = 0; index < value.length; index++) {
    const clockIndex = indicators.findIndex(
      (indicator) => indicator !== "" && value[index] === indicator
    );
    const token = value[index + 1];
    if (clockIndex < 0 || !token) {
      result += value[index];
      continue;
    }
    const replacement = rtcToken(clocks[clockIndex], token, rtc.language);
    if (replacement === undefined) result += value[index];
    else {
      result += replacement;
      index++;
    }
  }
  return result;
}

function rtcIndicator(
  value: string | undefined,
  forbidden: ReadonlySet<string>,
  used: ReadonlySet<string> = new Set()
): string {
  if (!value || forbidden.has(value) || used.has(value)) return "";
  const code = value.charCodeAt(0);
  return code >= 0x20 && code <= 0x7e ? value : "";
}

function applyRtcCommand(
  command: ZplCommandNode,
  rtc: RtcState,
  options: RenderJobOptions
): void {
  const args = command.parameters;
  if (command.code === "SL") {
    const mode = args[0]?.trim().toUpperCase() || "S";
    const tolerance = decimalInteger(mode);
    rtc.mode =
      mode === "S" || mode === "T"
        ? mode
        : tolerance >= 0 && tolerance <= 999
        ? tolerance
        : "S";
    const language = decimalInteger(args[1]);
    if (language >= 1 && language <= 18) rtc.language = language;
  } else if (command.code === "KL") {
    const language = decimalInteger(args[0]);
    if (language >= 1 && language <= 18) rtc.language = language;
  } else if (command.code === "SO") {
    const clock = decimalInteger(args[0]);
    if (clock === 2 || clock === 3) {
      rtc.offsets.set(clock, {
        months: boundedInteger(args[1], 0, -32_000, 32_000),
        days: boundedInteger(args[2], 0, -32_000, 32_000),
        years: boundedInteger(args[3], 0, -32_000, 32_000),
        hours: boundedInteger(args[4], 0, -32_000, 32_000),
        minutes: boundedInteger(args[5], 0, -32_000, 32_000),
        seconds: boundedInteger(args[6], 0, -32_000, 32_000),
      });
    }
  } else if (command.code === "ST") {
    const current = rtc.fixed ?? clockNow(options);
    const month = boundedInteger(args[0], current.getUTCMonth() + 1, 1, 12);
    const day = boundedInteger(args[1], current.getUTCDate(), 1, 31);
    const year = boundedInteger(args[2], current.getUTCFullYear(), 1998, 2097);
    let hour = boundedInteger(args[3], current.getUTCHours(), 0, 23);
    const minute = boundedInteger(args[4], current.getUTCMinutes(), 0, 59);
    const second = boundedInteger(args[5], current.getUTCSeconds(), 0, 59);
    const requestedFormat = args[6]?.trim().toUpperCase();
    const meridiem =
      requestedFormat === "A" || requestedFormat === "P"
        ? requestedFormat
        : "M";
    if (meridiem === "P" && hour < 12) hour += 12;
    if (meridiem === "A" && hour === 12) hour = 0;
    rtc.fixed = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  }
}

function dynamicLabel(
  label: ZplLabelNode,
  state: SessionState,
  options: RenderJobOptions,
  fieldValues: ReadonlyMap<string, string>,
  serialStep: number,
  labelStart: Date,
  commitRtc: boolean
): ZplLabelNode {
  const rtc: RtcState = {
    ...state.rtc,
    fixed: state.rtc.fixed ? new Date(state.rtc.fixed.getTime()) : undefined,
    offsets: new Map(state.rtc.offsets),
  };
  const output: ZplCommandNode[] = [];
  let indicators: string[] | undefined;
  let lastDataIndex = -1;
  let firstFieldOriginSeen = false;
  let queuedTime: Date | undefined;
  let pendingFieldValue:
    | { command: ZplCommandNode; value: string; resolved: boolean }
    | undefined;

  const fieldClock = (): Date => {
    if (rtc.fixed) return new Date(rtc.fixed.getTime());
    if (rtc.mode === "S") return new Date(labelStart.getTime());
    queuedTime ??= clockNow(options);
    if (rtc.mode === "T") return new Date(queuedTime.getTime());
    const toleranceMilliseconds = Math.max(1, rtc.mode) * 1_000;
    return queuedTime.getTime() - labelStart.getTime() > toleranceMilliseconds
      ? new Date(queuedTime.getTime())
      : new Date(labelStart.getTime());
  };

  const finishPendingFieldValue = () => {
    if (!pendingFieldValue || pendingFieldValue.resolved) {
      pendingFieldValue = undefined;
      return;
    }
    const value = indicators
      ? formatRtcField(
          pendingFieldValue.value,
          indicators,
          rtc,
          fieldClock()
        )
      : pendingFieldValue.value;
    output.push(replacementDataCommand(pendingFieldValue.command, value));
    lastDataIndex = output.length - 1;
    pendingFieldValue = undefined;
  };

  for (const original of label.commands) {
    const command = cloneCommand(original);
    if (command.capability !== "supported" && command.capability !== "partial") {
      output.push(command);
      continue;
    }
    if (command.code === "FO") firstFieldOriginSeen = true;
    if (command.code !== "SL" || !firstFieldOriginSeen) {
      applyRtcCommand(command, rtc, options);
    }

    if (command.code === "FN") {
      finishPendingFieldValue();
      const number = fieldNumber(command.parameters[0]);
      const value = number ? fieldValues.get(number) : undefined;
      pendingFieldValue = value === undefined
        ? undefined
        : { command, value, resolved: false };
    }

    const args = command.parameters;

    if (command.code === "FC") {
      const forbidden = new Set(["^", "~", command.prefix, command.delimiter]);
      const primary =
        rtcIndicator(args[0]?.[0] || "%", forbidden) ||
        rtcIndicator("%", forbidden);
      const used = new Set(primary ? [primary] : []);
      const secondary = rtcIndicator(args[1]?.[0], forbidden, used);
      if (secondary) used.add(secondary);
      const tertiary = rtcIndicator(args[2]?.[0], forbidden, used);
      indicators = [primary, secondary, tertiary];
      output.push(command);
      continue;
    }
    if (command.code === "FS") {
      finishPendingFieldValue();
      indicators = undefined;
      lastDataIndex = -1;
      output.push(command);
      continue;
    }

    if (
      pendingFieldValue &&
      !pendingFieldValue.resolved &&
      (command.code === "FD" || command.code === "FV" || command.code === "SN")
    ) {
      const value = indicators
        ? formatRtcField(pendingFieldValue.value, indicators, rtc, fieldClock())
        : pendingFieldValue.value;
      output.push(replacementDataCommand(command, value));
      pendingFieldValue.resolved = true;
      lastDataIndex = output.length - 1;
      continue;
    }
    if (command.code === "SF" && pendingFieldValue && !pendingFieldValue.resolved) {
      finishPendingFieldValue();
    }

    if (command.code === "SN") {
      const serialized = serializeNumber(
        args[0] || "1",
        args[1] || "1",
        (args[2]?.trim().toUpperCase() || "N") === "Y",
        serialStep
      );
      const value = indicators
        ? formatRtcField(serialized, indicators, rtc, fieldClock())
        : serialized;
      output.push(replacementDataCommand(command, value));
      lastDataIndex = output.length - 1;
      continue;
    }
    if (command.code === "FD" || command.code === "FV") {
      const value = indicators
        ? formatRtcField(command.rawParameters, indicators, rtc, fieldClock())
        : command.rawParameters;
      output.push(
        value === command.rawParameters
          ? command
          : replacementDataCommand(command, value)
      );
      lastDataIndex = output.length - 1;
      continue;
    }
    if (command.code === "SF") {
      if (
        lastDataIndex >= 0 &&
        serializationFieldSize(command) <= MAX_SERIALIZATION_FIELD_SIZE
      ) {
        const data = output[lastDataIndex];
        const value = serializeMasked(
          data.rawParameters,
          args[0] ?? "",
          args[1] ?? "",
          serialStep
        );
        output[lastDataIndex] = replacementDataCommand(data, value);
      }
      continue;
    }
    output.push(command);
  }
  finishPendingFieldValue();
  if (commitRtc) state.rtc = rtc;
  return cloneLabel(label, output);
}

function semanticDiagnostic(
  code: string,
  message: string,
  node?: ZplCommandNode,
  severity: "info" | "warning" | "error" = "error",
  relatedSpans?: readonly { start: number; end: number }[]
): ZplDiagnostic {
  return {
    code,
    message,
    severity,
    phase: "semantic",
    span: node?.span,
    command: node?.canonical,
    relatedSpans,
  };
}

function limits(options: RenderJobOptions): RenderLimits {
  return resolveRenderLimits(options.limits);
}

function optionFieldValues(
  options: RenderJobOptions,
  diagnostics: ZplDiagnostic[]
): ReadonlyMap<string, string> {
  const values = new Map<string, string>();
  for (const [requested, value] of Object.entries(options.fieldValues ?? {})) {
    const number = fieldNumber(requested);
    if (!number || typeof value !== "string") {
      diagnostics.push(
        semanticDiagnostic(
          "INVALID_FIELD_VALUE_KEY",
          `Render field value ${JSON.stringify(requested)} was ignored; keys must be integers from 0 through 9999 and values must be strings.`,
          undefined,
          "warning"
        )
      );
      continue;
    }
    values.set(number, value);
  }
  return values;
}

function decimalInteger(value: string | undefined): number {
  const source = value?.trim() ?? "";
  if (!/^-?\d+$/.test(source)) return Number.NaN;
  const parsed = Number(source);
  return Number.isSafeInteger(parsed) ? parsed : Number.NaN;
}

function boundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  const parsed = decimalInteger(value);
  return parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

function fieldNumber(value: string | undefined): string | undefined {
  return parseFieldNumber(value)?.number;
}

function cloneCommand(command: ZplCommandNode): ZplCommandNode {
  return {
    ...command,
    parameters: [...command.parameters],
    span: { ...command.span },
  };
}

function cloneLabel(
  label: ZplLabelNode,
  commands: readonly ZplCommandNode[]
): ZplLabelNode {
  const cloned = commands.map(cloneCommand);
  cloned.forEach((command, index) => (command.index = index));
  return {
    kind: "label",
    explicit: label.explicit,
    commands: cloned,
    span: { ...label.span },
  };
}

function replacementDataCommand(
  source: ZplCommandNode,
  value: string
): ZplCommandNode {
  return {
    ...cloneCommand(source),
    code: "FD",
    canonical: "^FD",
    prefixKind: "format",
    rawParameters: value,
    parameters: [value],
    capability: "supported",
  };
}

function fieldAssignments(commands: readonly ZplCommandNode[]): Map<string, string> {
  const assignments = new Map<string, string>();
  for (let index = 0; index < commands.length; index++) {
    if (commands[index].canonical !== "^FN") continue;
    const field = fieldNumber(commands[index].parameters[0]);
    if (!field) continue;
    for (let cursor = index + 1; cursor < commands.length; cursor++) {
      if (
        commands[cursor].canonical === "^FD" ||
        commands[cursor].canonical === "^FV"
      ) {
        assignments.set(field, commands[cursor].rawParameters);
        break;
      }
      if (
        commands[cursor].canonical === "^FS" ||
        commands[cursor].canonical === "^FN"
      ) break;
    }
  }
  return assignments;
}

function invocationAssignmentIndexes(commands: readonly ZplCommandNode[]): Set<number> {
  const indexes = new Set<number>();
  for (let index = 0; index < commands.length; index++) {
    if (commands[index].canonical !== "^FN") continue;
    if (!fieldNumber(commands[index].parameters[0])) continue;
    for (let cursor = index; cursor < commands.length; cursor++) {
      indexes.add(cursor);
      if (commands[cursor].canonical === "^FS") break;
    }
  }
  return indexes;
}

function applyAssignments(
  commands: readonly ZplCommandNode[],
  assignments: ReadonlyMap<string, string>
): ZplCommandNode[] {
  const output: ZplCommandNode[] = [];
  let pending:
    | { command: ZplCommandNode; value: string | undefined; resolved: boolean }
    | undefined;

  const finishPending = () => {
    if (pending?.value !== undefined && !pending.resolved) {
      output.push(replacementDataCommand(pending.command, pending.value));
    }
    pending = undefined;
  };

  for (let index = 0; index < commands.length; index++) {
    const command = commands[index];
    if (command.canonical === "^FN") {
      finishPending();
      const field = fieldNumber(command.parameters[0]);
      pending = {
        command,
        value: field ? assignments.get(field) : undefined,
        resolved: false,
      };
      continue;
    }

    if (
      pending &&
      !pending.resolved &&
      (command.canonical === "^FD" || command.canonical === "^FV")
    ) {
      output.push(
        pending.value === undefined
          ? cloneCommand(command)
          : replacementDataCommand(command, pending.value)
      );
      pending.resolved = true;
      continue;
    }

    if (command.canonical === "^FS") finishPending();
    output.push(cloneCommand(command));
  }
  finishPending();
  return output;
}

function utf8ByteLength(value: string): number {
  let bytes = 0;
  for (let index = 0; index < value.length; index++) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit <= 0x7f) {
      bytes++;
    } else if (codeUnit <= 0x7ff) {
      bytes += 2;
    } else if (
      codeUnit >= 0xd800 &&
      codeUnit <= 0xdbff &&
      index + 1 < value.length &&
      value.charCodeAt(index + 1) >= 0xdc00 &&
      value.charCodeAt(index + 1) <= 0xdfff
    ) {
      bytes += 4;
      index++;
    } else {
      bytes += 3;
    }
  }
  return bytes;
}

function resourceCost(name: string, payloadBytes: number): number {
  return utf8ByteLength(name) + Math.max(1, payloadBytes);
}

function disabledResource(name: string): boolean {
  return name.startsWith("NONE:");
}

function namedResourceCost(state: SessionState, name: string): number {
  const graphic = state.graphics.get(name);
  const format = state.formats.get(name);
  const object = state.objects.get(name);
  return (
    (graphic ? resourceCost(name, graphic.data.byteLength) : 0) +
    (format ? resourceCost(name, format.bytes) : 0) +
    (object ? resourceCost(name, object.data.byteLength) : 0)
  );
}

function clearNamedResource(state: SessionState, name: string): void {
  state.resourceBytes -= namedResourceCost(state, name);
  state.graphics.delete(name);
  state.formats.delete(name);
  state.objects.delete(name);
  state.bitmapFonts.delete(name);
  state.encodings.delete(name);
}

function replaceNamedResource(
  state: SessionState,
  name: string,
  bytes: number,
  store: () => void
): void {
  clearNamedResource(state, name);
  store();
  state.resourceBytes += bytes;
}

function expandFormats(
  label: ZplLabelNode,
  state: SessionState,
  currentDocumentId: number,
  maxDepth: number,
  maxCommands: number,
  diagnostics: ZplDiagnostic[],
  externalAssignments: ReadonlyMap<string, string>,
  onCommand?: (command: ZplCommandNode) => void
): ZplLabelNode {
  const assignments = fieldAssignments(label.commands);
  for (const [number, value] of externalAssignments) assignments.set(number, value);
  const assignmentIndexes = invocationAssignmentIndexes(label.commands);
  let expandedCommands = 0;
  let commandLimitReached = false;
  let commandLimitReported = false;

  const reportCommandLimit = (command: ZplCommandNode): void => {
    commandLimitReached = true;
    if (commandLimitReported) return;
    commandLimitReported = true;
    diagnostics.push(
      semanticDiagnostic(
        "EXPANDED_COMMAND_LIMIT_EXCEEDED",
        `Expanded command stream exceeded the ${maxCommands}-command limit.`,
        command
      )
    );
  };

  const expand = (
    commands: readonly ZplCommandNode[],
    depth: number,
    active: ReadonlySet<string>,
    anchor?: { start: number; end: number }
  ): ZplCommandNode[] => {
    if (depth > maxDepth) {
      const sourceCommand = commands[0];
      const diagnosticCommand = sourceCommand
        ? {
            ...cloneCommand(sourceCommand),
            span: { ...(anchor ?? sourceCommand.span) },
          }
        : undefined;
      diagnostics.push(
        semanticDiagnostic(
          "TEMPLATE_DEPTH_EXCEEDED",
          `Stored-format expansion exceeded ${maxDepth} levels.`,
          diagnosticCommand
        )
      );
      return [];
    }
    const output: ZplCommandNode[] = [];
    for (const originalCommand of commands) {
      const command = anchor
        ? { ...cloneCommand(originalCommand), span: { ...anchor } }
        : originalCommand;
      if (commandLimitReached) return output;
      if (command.canonical !== "^XF") {
        if (expandedCommands >= maxCommands) {
          reportCommandLimit(command);
          return output;
        }
        const expanded = cloneCommand(command);
        onCommand?.(expanded);
        output.push(expanded);
        expandedCommands++;
        continue;
      }
      const name = sessionResourceName(command.parameters[0] ?? "", "ZPL", state);
      const stored = state.formats.get(name);
      if (active.has(name)) {
        diagnostics.push(
          semanticDiagnostic(
            "RECURSIVE_STORED_FORMAT",
            `Stored format ${name} recursively recalls itself.`,
            command,
            "error",
            stored?.documentId === currentDocumentId
              ? [stored.definitionSpan]
              : undefined
          )
        );
        continue;
      }
      if (!stored) {
        diagnostics.push(
          semanticDiagnostic(
            "MISSING_STORED_FORMAT",
            `Stored format ${name} is not present in this render session.`,
            command
          )
        );
        continue;
      }
      const nextActive = new Set(active);
      nextActive.add(name);
      // Stored commands from another render point into another source buffer.
      // Anchor every expanded command to the current recall in that case.
      const nextAnchor =
        stored.documentId === currentDocumentId
          ? undefined
          : anchor ?? command.span;
      output.push(
        ...expand(
          applyAssignments(stored.commands, assignments),
          depth + 1,
          nextActive,
          nextAnchor
        )
      );
      if (commandLimitReached) return output;
    }
    return output;
  };

  const hasRecall = label.commands.some(
    (command) => command.canonical === "^XF"
  );
  const invocation = hasRecall
    ? label.commands.filter((_, index) => !assignmentIndexes.has(index))
    : label.commands;
  return cloneLabel(label, expand(invocation, 0, new Set()));
}

function deleteResources(pattern: string, state: SessionState): void {
  let normalized = (pattern.trim() || "R:*.*").toUpperCase();
  if (!normalized.includes(":")) normalized = `R:${normalized}`;
  const mapped = state.memoryAliases.get(normalized[0]);
  if (mapped) normalized = `${mapped}:${normalized.slice(normalized.indexOf(":") + 1)}`;
  if (!/\.[A-Z0-9*?]+$/.test(normalized)) normalized += ".GRF";
  const escaped = [...normalized]
    .map((character) => {
      if (character === "*") return ".*";
      if (character === "?") return ".";
      return /[.+^${}()|[\]\\]/.test(character) ? `\\${character}` : character;
    })
    .join("");
  const matcher = new RegExp(`^${escaped}$`);
  for (const [name, graphic] of state.graphics) {
    if (!matcher.test(name)) continue;
    state.graphics.delete(name);
    state.resourceBytes -= resourceCost(name, graphic.data.byteLength);
  }
  for (const [name, format] of state.formats) {
    if (!matcher.test(name)) continue;
    state.formats.delete(name);
    state.resourceBytes -= resourceCost(name, format.bytes);
  }
  for (const [name, object] of state.objects) {
    if (!matcher.test(name)) continue;
    state.objects.delete(name);
    state.bitmapFonts.delete(name);
    state.encodings.delete(name);
    state.resourceBytes -= resourceCost(name, object.data.byteLength);
  }
}

function eraseDownloadedGraphics(state: SessionState): void {
  for (const [name, graphic] of state.graphics) {
    state.resourceBytes -= resourceCost(name, graphic.data.byteLength);
  }
  state.graphics.clear();
}

function wildcardMatcher(pattern: string): RegExp {
  const escaped = [...pattern]
    .map((character) => {
      if (character === "*") return "(.*)";
      if (character === "?") return "(.)";
      return /[.+^${}()|[\]\\]/.test(character) ? `\\${character}` : character;
    })
    .join("");
  return new RegExp(`^${escaped}$`);
}

function normalizedTransferName(
  value: string,
  source: boolean,
  state: SessionState
): string {
  let normalized = value.trim().toUpperCase();
  if (!normalized) {
    if (!source) return "";
    normalized = "R:*.*";
  }
  if (!normalized.includes(":")) normalized = `R:${normalized}`;
  const mapped = state.memoryAliases.get(normalized[0]);
  if (mapped) normalized = `${mapped}:${normalized.slice(normalized.indexOf(":") + 1)}`;
  if (source && !normalized.includes(".")) normalized += ".*";
  return normalized;
}

function transferDestination(
  sourceName: string,
  sourcePattern: string,
  destinationPattern: string,
  captures: readonly string[]
): string | undefined {
  if (!destinationPattern) return undefined;
  const [sourceDevice, sourceObject = ""] = sourceName.split(":", 2);
  let [destinationDevice, destinationObject = ""] = destinationPattern.split(":", 2);
  destinationDevice ||= sourceDevice;
  if (!destinationObject) destinationObject = sourceObject;
  if (!destinationObject.includes(".")) {
    const extension = sourceObject.includes(".")
      ? sourceObject.slice(sourceObject.lastIndexOf("."))
      : "";
    destinationObject += extension;
  }
  let captureIndex = 0;
  destinationObject = destinationObject.replace(/[?*]/g, () => {
    const value = captures[captureIndex] ?? "";
    captureIndex++;
    return value;
  });
  if (sourcePattern.includes("*") && destinationObject.includes("*")) {
    destinationObject = destinationObject.replace("*", captures[0] ?? "");
  }
  return `${destinationDevice}:${destinationObject}`;
}

function transferResources(
  command: ZplCommandNode,
  state: SessionState,
  renderLimits: RenderLimits,
  diagnostics: ZplDiagnostic[]
): void {
  const rawSource = command.parameters[0]?.trim() ?? "";
  const rawDestination = command.parameters[1]?.trim() ?? "";
  if (!/^[ABER]:/i.test(rawSource) || !/^[ABER]:/i.test(rawDestination)) {
    return;
  }
  const sourcePattern = normalizedTransferName(
    rawSource,
    true,
    state
  );
  const destinationPattern = normalizedTransferName(
    rawDestination,
    false,
    state
  );
  if (!destinationPattern) return;
  const sourceDevice = sourcePattern.slice(0, sourcePattern.indexOf(":"));
  const destinationDevice = destinationPattern.slice(
    0,
    destinationPattern.indexOf(":")
  );
  if (sourceDevice === destinationDevice) return;
  const matcher = wildcardMatcher(sourcePattern);
  const multipleObjectTransfer = sourcePattern.includes("*");
  const graphics = [...state.graphics.entries()];
  const formats = [...state.formats.entries()];
  const objects = [...state.objects.entries()];

  const reserve = (
    destination: string,
    bytes: number,
    previous: number
  ): boolean => {
    if (state.resourceBytes - previous + bytes <= renderLimits.maxSessionBytes) {
      return true;
    }
    diagnostics.push(
      semanticDiagnostic(
        "SESSION_RESOURCE_LIMIT_EXCEEDED",
        `Transferring ${destination} would exceed the ${renderLimits.maxSessionBytes}-byte session limit.`,
        command
      )
    );
    return false;
  };

  for (const [name, graphic] of graphics) {
    const match = matcher.exec(name);
    if (!match) continue;
    const destination = transferDestination(
      name,
      sourcePattern,
      destinationPattern,
      match.slice(1)
    );
    if (!destination || disabledResource(destination)) continue;
    const previous = namedResourceCost(state, destination);
    const bytes = resourceCost(destination, graphic.data.byteLength);
    if (!reserve(destination, bytes, previous)) continue;
    replaceNamedResource(state, destination, bytes, () => {
      state.graphics.set(destination, {
        ...graphic,
        data: graphic.data.slice(),
      });
    });
  }
  for (const [name, format] of formats) {
    const match = matcher.exec(name);
    if (!match) continue;
    const destination = transferDestination(
      name,
      sourcePattern,
      destinationPattern,
      match.slice(1)
    );
    if (!destination || disabledResource(destination)) continue;
    const previous = namedResourceCost(state, destination);
    const bytes = resourceCost(destination, format.bytes);
    if (!reserve(destination, bytes, previous)) continue;
    replaceNamedResource(state, destination, bytes, () => {
      state.formats.set(destination, {
        ...format,
        commands: format.commands.map(cloneCommand),
        definitionSpan: { ...format.definitionSpan },
      });
    });
  }
  for (const [name, object] of objects) {
    if (multipleObjectTransfer && name.endsWith(".FNT")) continue;
    const match = matcher.exec(name);
    if (!match) continue;
    const destination = transferDestination(
      name,
      sourcePattern,
      destinationPattern,
      match.slice(1)
    );
    if (!destination || disabledResource(destination)) continue;
    const previous = namedResourceCost(state, destination);
    const bytes = resourceCost(destination, object.data.byteLength);
    if (!reserve(destination, bytes, previous)) continue;
    const bitmap = state.bitmapFonts.get(name);
    const encoding = state.encodings.get(name);
    const copiedData = object.data.slice();
    replaceNamedResource(state, destination, bytes, () => {
      state.objects.set(destination, { ...object, data: copiedData });
    });
    if (bitmap) {
      let offset = 0;
      state.bitmapFonts.set(destination, {
        ...bitmap,
        glyphs: new Map(
          [...bitmap.glyphs].map(([codePoint, glyph]) => {
            const end = offset + glyph.data.length;
            const copiedGlyph = {
              ...glyph,
              data: copiedData.subarray(offset, end),
            };
            offset = end;
            return [codePoint, copiedGlyph];
          })
        ),
      });
    }
    if (encoding) state.encodings.set(destination, new Map(encoding));
  }
}

function storeRenderedImage(
  command: ZplCommandNode,
  raster: MonochromeRaster,
  state: SessionState,
  renderLimits: RenderLimits,
  diagnostics: ZplDiagnostic[]
): boolean {
  const name = sessionResourceName(command.parameters[0] ?? "UNKNOWN", "GRF", state);
  if (disabledResource(name)) {
    return (command.parameters[1]?.trim().toUpperCase() || "Y") !== "N";
  }
  const previous = namedResourceCost(state, name);
  const bytes = resourceCost(name, raster.data.byteLength);
  if (raster.data.byteLength > renderLimits.maxGraphicBytes) {
    diagnostics.push(
      semanticDiagnostic(
        "GRAPHIC_LIMIT_EXCEEDED",
        `Storing ${name} requires ${raster.data.byteLength} bytes, exceeding the ${renderLimits.maxGraphicBytes}-byte graphic limit.`,
        command
      )
    );
  } else if (
    state.resourceBytes - previous + bytes >
    renderLimits.maxSessionBytes
  ) {
    diagnostics.push(
      semanticDiagnostic(
        "SESSION_RESOURCE_LIMIT_EXCEEDED",
        `Storing ${name} would exceed the ${renderLimits.maxSessionBytes}-byte session limit.`,
        command
      )
    );
  } else {
    replaceNamedResource(state, name, bytes, () => {
      state.graphics.set(name, {
        data: raster.data.slice(),
        bytesPerRow: raster.stride,
        width: raster.width,
        height: raster.height,
      });
    });
  }
  return (command.parameters[1]?.trim().toUpperCase() || "Y") !== "N";
}

function processDownloadGraphic(
  command: ZplCommandNode,
  state: SessionState,
  renderLimits: RenderLimits,
  diagnostics: ZplDiagnostic[]
): void {
  const name = sessionResourceName(command.parameters[0] ?? "", "GRF", state);
  if (disabledResource(name)) return;
  const expectedBytes = decimalInteger(command.parameters[1]);
  const bytesPerRow = decimalInteger(command.parameters[2]);
  try {
    const graphic = decodeGraphic(
      command.parameters.slice(3).join(command.delimiter),
      bytesPerRow,
      expectedBytes,
      renderLimits.maxGraphicBytes
    );
    const previous = namedResourceCost(state, name);
    const bytes = resourceCost(name, graphic.data.byteLength);
    if (state.resourceBytes - previous + bytes > renderLimits.maxSessionBytes) {
      diagnostics.push(
        semanticDiagnostic(
          "SESSION_RESOURCE_LIMIT_EXCEEDED",
          `Storing ${name} would exceed the ${renderLimits.maxSessionBytes}-byte session limit.`,
          command
        )
      );
      return;
    }
    replaceNamedResource(state, name, bytes, () => {
      state.graphics.set(name, graphic);
    });
  } catch (error) {
    diagnostics.push(
      semanticDiagnostic(
        error instanceof GraphicDecodeError ? error.code : "INVALID_GRAPHIC_DATA",
        error instanceof Error ? error.message : "Downloaded graphic could not be decoded.",
        command
      )
    );
  }
}

function objectPath(
  value: string,
  extension: string,
  state: SessionState
): string {
  let name = aliasedPath(value || "R:UNKNOWN", state);
  if (!/\.[A-Z0-9]+$/i.test(name)) name += `.${extension}`;
  return name.toUpperCase();
}

function storeObjectResource(
  name: string,
  object: StoredObject,
  state: SessionState,
  renderLimits: RenderLimits,
  command: ZplCommandNode,
  diagnostics: ZplDiagnostic[]
): boolean {
  if (disabledResource(name)) return false;
  const previous = namedResourceCost(state, name);
  const bytes = resourceCost(name, object.data.byteLength);
  if (
    state.resourceBytes - previous + bytes >
    renderLimits.maxSessionBytes
  ) {
    diagnostics.push(
      semanticDiagnostic(
        "SESSION_RESOURCE_LIMIT_EXCEEDED",
        `Storing ${name} would exceed the ${renderLimits.maxSessionBytes}-byte session limit.`,
        command
      )
    );
    return false;
  }
  replaceNamedResource(state, name, bytes, () => {
    state.objects.set(name, object);
  });
  return true;
}

function downloadDiagnostic(
  error: unknown,
  command: ZplCommandNode,
  diagnostics: ZplDiagnostic[]
): void {
  diagnostics.push(
    semanticDiagnostic(
      error instanceof GraphicDecodeError ? error.code : "INVALID_OBJECT_DATA",
      error instanceof Error ? error.message : "Downloaded object data is invalid.",
      command
    )
  );
}

function normalizeLegacyHexZeros(source: string): string {
  return /^\s*:(?:B64|Z64):/.test(source)
    ? source
    : source.replace(/[Oo]/g, "0");
}

function processDownloadEncoding(
  command: ZplCommandNode,
  state: SessionState,
  renderLimits: RenderLimits,
  diagnostics: ZplDiagnostic[]
): void {
  const name = objectPath(command.parameters[0] ?? "", "DAT", state);
  if (disabledResource(name)) return;
  const expectedBytes = decimalInteger(command.parameters[1]);
  try {
    const data = decodeDownloadData(
      command.parameters.slice(2).join(command.delimiter),
      expectedBytes,
      renderLimits.maxGraphicBytes
    );
    if (data.length % 4 !== 0) {
      throw new GraphicDecodeError(
        "INVALID_OBJECT_DATA",
        "Downloaded encoding data must contain complete four-byte mappings."
      );
    }
    if (
      !storeObjectResource(
        name,
        { data, kind: "encoding" },
        state,
        renderLimits,
        command,
        diagnostics
      )
    ) {
      return;
    }
    const mapping = new Map<number, number>();
    for (let offset = 0; offset + 3 < data.length; offset += 4) {
      const output = (data[offset] << 8) | data[offset + 1];
      const input = (data[offset + 2] << 8) | data[offset + 3];
      mapping.set(input, output);
    }
    state.encodings.set(name, mapping);
  } catch (error) {
    downloadDiagnostic(error, command, diagnostics);
  }
}

function processDownloadOutlineFont(
  command: ZplCommandNode,
  state: SessionState,
  renderLimits: RenderLimits,
  diagnostics: ZplDiagnostic[]
): void {
  const extension =
    command.code === "DT" ? "DAT" : "FNT";
  const name = objectPath(command.parameters[0] ?? "", extension, state);
  if (disabledResource(name)) return;
  const expectedBytes = decimalInteger(command.parameters[1]);
  try {
    const rawSource = command.parameters.slice(2).join(command.delimiter);
    const source =
      command.code === "DS" ? normalizeLegacyHexZeros(rawSource) : rawSource;
    const data = decodeDownloadData(
      source,
      expectedBytes,
      renderLimits.maxGraphicBytes
    );
    storeObjectResource(
      name,
      {
        data,
        kind:
          command.code === "DS"
            ? "intellifont"
            : command.code === "DT"
            ? "bounded-truetype"
            : "unbounded-truetype",
      },
      state,
      renderLimits,
      command,
      diagnostics
    );
  } catch (error) {
    downloadDiagnostic(error, command, diagnostics);
  }
}

function processDownloadBitmapFont(
  command: ZplCommandNode,
  state: SessionState,
  renderLimits: RenderLimits,
  diagnostics: ZplDiagnostic[]
): void {
  const name = objectPath(command.parameters[0] ?? "", "FNT", state);
  if (disabledResource(name)) return;
  const cellHeight = decimalInteger(command.parameters[2]);
  const cellWidth = decimalInteger(command.parameters[3]);
  const baseline = decimalInteger(command.parameters[4]);
  const spaceWidth = decimalInteger(command.parameters[5]);
  const expectedCharacters = decimalInteger(command.parameters[6]);
  const source = command.parameters.slice(8).join(command.delimiter);
  const glyphs = new Map<number, {
    codePoint: number;
    width: number;
    height: number;
    xOffset: number;
    yOffset: number;
    advance: number;
    bytesPerRow: number;
    data: Uint8Array;
  }>();
  const orientation = command.parameters[1]?.trim().toUpperCase();
  const copyright = command.parameters[7] ?? "";
  const matcher = /#([0-9A-Fa-f]{1,4})\.(-?\d+)\.(-?\d+)\.(-?\d+)\.(-?\d+)\.(-?\d+)\.([\s\S]*?)(?=#(?:[0-9A-Fa-f]{1,4})\.|$)/g;
  try {
    if (
      orientation !== "N" ||
      copyright.length < 1 ||
      copyright.length > 63 ||
      !Number.isSafeInteger(cellHeight) ||
      !Number.isSafeInteger(cellWidth) ||
      !Number.isSafeInteger(baseline) ||
      !Number.isSafeInteger(spaceWidth) ||
      !Number.isSafeInteger(expectedCharacters) ||
      cellHeight <= 0 ||
      cellWidth <= 0 ||
      baseline <= 0 ||
      baseline > cellHeight ||
      spaceWidth <= 0 ||
      spaceWidth > Math.min(32_000, renderLimits.maxDimension) ||
      expectedCharacters <= 0 ||
      expectedCharacters > 256 ||
      cellHeight > Math.min(32_000, renderLimits.maxDimension) ||
      cellWidth > Math.min(32_000, renderLimits.maxDimension)
    ) {
      throw new GraphicDecodeError(
        "INVALID_OBJECT_DATA",
        "Downloaded bitmap font header metrics are invalid."
      );
    }
    let totalBytes = 0;
    let matchedSource = false;
    for (const match of source.matchAll(matcher)) {
      if (!matchedSource && source.slice(0, match.index).trim() !== "") {
        throw new GraphicDecodeError(
          "INVALID_OBJECT_DATA",
          "Downloaded bitmap font contains data before its first glyph."
        );
      }
      matchedSource = true;
      const codePoint = Number.parseInt(match[1], 16);
      const height = Number.parseInt(match[2], 10);
      const width = Number.parseInt(match[3], 10);
      const xOffset = Number.parseInt(match[4], 10);
      const yOffset = Number.parseInt(match[5], 10);
      const advance = Number.parseInt(match[6], 10);
      if (
        !Number.isSafeInteger(codePoint) ||
        codePoint < 0 ||
        codePoint > 0xffff ||
        glyphs.has(codePoint) ||
        ![height, width, xOffset, yOffset, advance].every(Number.isSafeInteger) ||
        height <= 0 ||
        width <= 0 ||
        advance < 0 ||
        height > renderLimits.maxDimension ||
        width > renderLimits.maxDimension ||
        advance > renderLimits.maxDimension ||
        Math.abs(xOffset) > renderLimits.maxDimension ||
        Math.abs(yOffset) > renderLimits.maxDimension
      ) {
        throw new GraphicDecodeError(
          "INVALID_OBJECT_DATA",
          "Downloaded bitmap font glyph metrics are invalid or duplicated."
        );
      }
      const bytesPerRow = Math.ceil(width / 8);
      const expectedBytes = bytesPerRow * height;
      if (!Number.isSafeInteger(expectedBytes)) {
        throw new GraphicDecodeError(
          "GRAPHIC_LIMIT_EXCEEDED",
          "Downloaded bitmap font glyph dimensions exceed the graphic budget."
        );
      }
      totalBytes += expectedBytes;
      if (!Number.isSafeInteger(totalBytes) || totalBytes > renderLimits.maxGraphicBytes) {
        throw new GraphicDecodeError(
          "GRAPHIC_LIMIT_EXCEEDED",
          `Downloaded bitmap font exceeds the ${renderLimits.maxGraphicBytes}-byte graphic limit.`
        );
      }
      const data = decodeDownloadData(
        normalizeLegacyHexZeros(match[7]),
        expectedBytes,
        renderLimits.maxGraphicBytes
      );
      glyphs.set(codePoint, {
        codePoint,
        width,
        height,
        xOffset,
        yOffset,
        advance,
        bytesPerRow,
        data,
      });
    }
    if (!matchedSource || glyphs.size === 0) {
      throw new GraphicDecodeError(
        "INVALID_OBJECT_DATA",
        "Downloaded bitmap font does not contain any valid glyphs."
      );
    }
    if (glyphs.size !== expectedCharacters) {
      throw new GraphicDecodeError(
        "INVALID_OBJECT_DATA",
        `Bitmap font declared ${expectedCharacters} characters but supplied ${glyphs.size}.`
      );
    }
    const previous = namedResourceCost(state, name);
    const bytes = resourceCost(name, totalBytes);
    if (
      state.resourceBytes - previous + bytes >
      renderLimits.maxSessionBytes
    ) {
      diagnostics.push(
        semanticDiagnostic(
          "SESSION_RESOURCE_LIMIT_EXCEEDED",
          `Storing ${name} would exceed the ${renderLimits.maxSessionBytes}-byte session limit.`,
          command
        )
      );
      return;
    }
    const raw = new Uint8Array(totalBytes);
    let offset = 0;
    const storedGlyphs: typeof glyphs = new Map();
    for (const [codePoint, glyph] of glyphs) {
      raw.set(glyph.data, offset);
      const end = offset + glyph.data.length;
      storedGlyphs.set(codePoint, {
        ...glyph,
        data: raw.subarray(offset, end),
      });
      offset = end;
    }
    if (
      !storeObjectResource(
        name,
        { data: raw, kind: "bitmap-font" },
        state,
        renderLimits,
        command,
        diagnostics
      )
    ) {
      return;
    }
    state.bitmapFonts.set(name, {
      cellWidth,
      cellHeight,
      baseline,
      spaceWidth,
      glyphs: storedGlyphs,
    });
  } catch (error) {
    downloadDiagnostic(error, command, diagnostics);
  }
}

function processDownloadObject(
  command: ZplCommandNode,
  state: SessionState,
  renderLimits: RenderLimits,
  diagnostics: ZplDiagnostic[]
): void {
  const format = command.parameters[1]?.trim().toUpperCase() ?? "";
  const extensionCode =
    command.parameters[2]?.trim().toUpperCase() ||
    (format === "P" ? "P" : "G");
  const extension = DOWNLOAD_OBJECT_EXTENSIONS[extensionCode];
  const name = objectPath(command.parameters[0] ?? "", extension ?? "GRF", state);
  if (disabledResource(name)) return;
  const expectedBytes = decimalInteger(command.parameters[3]);
  const bytesPerRow = decimalInteger(command.parameters[4]);
  const source = command.parameters.slice(5).join(command.delimiter);
  try {
    if (format === "C") {
      throw new GraphicDecodeError(
        "UNSUPPORTED_GRAPHIC_FORMAT",
        "~DY AR-compressed BAR-ONE payloads are not supported."
      );
    }
    if (!["A", "B", "P"].includes(format)) {
      throw new GraphicDecodeError(
        "UNSUPPORTED_GRAPHIC_FORMAT",
        "~DY download format must be A, B, C, or P."
      );
    }
    if ((extension ?? "GRF") === "GRF" && format === "A") {
      const graphic = decodeGraphic(
        source,
        bytesPerRow,
        expectedBytes,
        renderLimits.maxGraphicBytes
      );
      const previous = namedResourceCost(state, name);
      const storedBytes = resourceCost(name, graphic.data.byteLength);
      if (state.resourceBytes - previous + storedBytes > renderLimits.maxSessionBytes) {
        throw new GraphicDecodeError(
          "SESSION_RESOURCE_LIMIT_EXCEEDED",
          `Storing ${name} exceeds the session resource limit.`
        );
      }
      replaceNamedResource(state, name, storedBytes, () => {
        state.graphics.set(name, graphic);
      });
      return;
    }
    const bytes =
      format === "B"
        ? decodeRawDownloadData(
            source,
            expectedBytes,
            renderLimits.maxGraphicBytes
          )
        : decodeDownloadData(source, expectedBytes, renderLimits.maxGraphicBytes);
    if (bytes.length !== expectedBytes) {
      throw new Error(
        `Object declared ${expectedBytes} bytes but decoded ${bytes.length}.`
      );
    }
    if ((extension ?? "GRF") === "GRF") {
      const graphic = {
        data: bytes,
        bytesPerRow,
        ...validateGraphicGeometry(
          bytesPerRow,
          bytes.length,
          renderLimits.maxGraphicBytes
        ),
      };
      const previous = namedResourceCost(state, name);
      const storedBytes = resourceCost(name, graphic.data.byteLength);
      if (state.resourceBytes - previous + storedBytes > renderLimits.maxSessionBytes) {
        throw new GraphicDecodeError(
          "SESSION_RESOURCE_LIMIT_EXCEEDED",
          `Storing ${name} exceeds the session resource limit.`
        );
      }
      replaceNamedResource(state, name, storedBytes, () => {
        state.graphics.set(name, graphic);
      });
    } else if (extension && ["PNG", "BMP", "PCX"].includes(extension)) {
      const graphic =
        extension === "PNG"
          ? decodePng(bytes, renderLimits.maxGraphicBytes)
          : extension === "BMP"
          ? decodeBmp(bytes, renderLimits.maxGraphicBytes)
          : decodePcx(bytes, renderLimits.maxGraphicBytes);
      const previous = namedResourceCost(state, name);
      const storedBytes = resourceCost(name, graphic.data.byteLength);
      if (state.resourceBytes - previous + storedBytes > renderLimits.maxSessionBytes) {
        throw new GraphicDecodeError(
          "SESSION_RESOURCE_LIMIT_EXCEEDED",
          `Storing ${name} exceeds the session resource limit.`
        );
      }
      replaceNamedResource(state, name, storedBytes, () => {
        state.graphics.set(name, graphic);
      });
    } else {
      storeObjectResource(
        name,
        {
          data: bytes,
          kind:
            extension === "TTF"
              ? "opentype"
              : extension === "TTE"
              ? "truetype-extension"
              : "binary",
        },
        state,
        renderLimits,
        command,
        diagnostics
      );
    }
  } catch (error) {
    downloadDiagnostic(error, command, diagnostics);
  }
}

function decodeRawDownloadData(
  source: string,
  expectedBytes: number,
  maxBytes: number
): Uint8Array {
  if (!Number.isSafeInteger(expectedBytes) || expectedBytes < 0) {
    throw new GraphicDecodeError(
      "OBJECT_BYTE_COUNT_MISMATCH",
      `Downloaded object declares an invalid byte count: ${expectedBytes}.`
    );
  }
  if (expectedBytes > maxBytes) {
    throw new GraphicDecodeError(
      "GRAPHIC_LIMIT_EXCEEDED",
      `Downloaded object requires ${expectedBytes} bytes, exceeding the ${maxBytes}-byte limit.`
    );
  }

  const bytes = new Uint8Array(expectedBytes);
  let offset = 0;
  for (const character of source) {
    if (offset >= expectedBytes) {
      throw new GraphicDecodeError(
        "OBJECT_BYTE_COUNT_MISMATCH",
        `Object declared ${expectedBytes} bytes but supplied more data.`
      );
    }
    const value = character.charCodeAt(0);
    if (value > 0xff) {
      throw new GraphicDecodeError(
        "INVALID_OBJECT_DATA",
        "Raw downloaded object data must contain byte-valued characters only."
      );
    }
    bytes[offset++] = value;
  }
  if (offset !== expectedBytes) {
    throw new GraphicDecodeError(
      "OBJECT_BYTE_COUNT_MISMATCH",
      `Object declared ${expectedBytes} bytes but decoded ${offset}.`
    );
  }
  return bytes;
}

function fontLinkCost(base: string, links: readonly string[]): number {
  return (
    utf8ByteLength(base) +
    links.reduce((sum, link) => sum + utf8ByteLength(link) + 1, 1)
  );
}

function processFontLink(
  command: ZplCommandNode,
  state: SessionState,
  renderLimits: RenderLimits,
  diagnostics: ZplDiagnostic[]
): void {
  const requestedExtension = command.parameters[0]?.trim() ?? "";
  const requestedBase = command.parameters[1]?.trim() ?? "";
  if (!requestedExtension || !requestedBase) return;
  const extension = aliasedPath(requestedExtension, state);
  const base = aliasedPath(requestedBase, state);
  if (disabledResource(extension) || disabledResource(base)) return;
  const links = [...(state.fontLinks.get(base) ?? [])];
  const enabled = command.parameters[2]?.trim() === "1";
  const filtered = links.filter((name) => name !== extension);
  if (enabled) filtered.push(extension);
  const next = filtered.slice(-5);
  const previousBytes = links.length > 0 ? fontLinkCost(base, links) : 0;
  const nextBytes = next.length > 0 ? fontLinkCost(base, next) : 0;
  if (
    state.resourceBytes - previousBytes + nextBytes >
    renderLimits.maxSessionBytes
  ) {
    diagnostics.push(
      semanticDiagnostic(
        "SESSION_RESOURCE_LIMIT_EXCEEDED",
        `Updating font links for ${base} would exceed the ${renderLimits.maxSessionBytes}-byte session limit.`,
        command
      )
    );
    return;
  }
  if (next.length > 0) state.fontLinks.set(base, next);
  else state.fontLinks.delete(base);
  state.resourceBytes += nextBytes - previousBytes;
}

function processFontAlias(
  command: ZplCommandNode,
  state: SessionState,
  renderLimits: RenderLimits,
  diagnostics: ZplDiagnostic[]
): void {
  const identifier = command.parameters[0]?.trim().toUpperCase() ?? "";
  const requestedName = command.parameters[1]?.trim() ?? "";
  if (!/^[A-Z0-9]$/.test(identifier) || !requestedName) return;
  const name = aliasedPath(requestedName, state);
  const previousName = state.fontAliases.get(identifier);
  const previousBytes = previousName
    ? utf8ByteLength(identifier) + utf8ByteLength(previousName) + 1
    : 0;
  const nextBytes = utf8ByteLength(identifier) + utf8ByteLength(name) + 1;
  if (
    state.resourceBytes - previousBytes + nextBytes >
    renderLimits.maxSessionBytes
  ) {
    diagnostics.push(
      semanticDiagnostic(
        "SESSION_RESOURCE_LIMIT_EXCEEDED",
        `Assigning font identifier ${identifier} would exceed the ${renderLimits.maxSessionBytes}-byte session limit.`,
        command
      )
    );
    return;
  }
  state.fontAliases.set(identifier, name);
  state.resourceBytes += nextBytes - previousBytes;
}

function storePersistentCommand(
  command: ZplCommandNode,
  state: SessionState,
  documentId: number,
  renderLimits: RenderLimits,
  diagnostics: ZplDiagnostic[]
): void {
  let storedCommand = command;
  if (command.code === "MU") {
    const previous = state.persistent.get("MU")?.command;
    const previousUnit = previous?.parameters[0]?.trim().toUpperCase();
    const requestedUnit = command.parameters[0]?.trim().toUpperCase() ?? "";
    const unit =
      requestedUnit === ""
        ? "D"
        : ["D", "I", "M"].includes(requestedUnit)
          ? requestedUnit
          : previousUnit && ["D", "I", "M"].includes(previousUnit)
            ? previousUnit
            : "D";
    const conversion =
      zplDpiConversion(command.parameters[1], command.parameters[2]) ??
      zplDpiConversion(previous?.parameters[1], previous?.parameters[2]) ??
      { base: 150, desired: 150 };
    storedCommand = cloneCommand(command);
    storedCommand.parameters = [
      unit,
      String(conversion.base),
      String(conversion.desired),
    ];
    storedCommand.rawParameters = storedCommand.parameters.join(
      storedCommand.delimiter
    );
  }
  const bytes = Math.max(
    1,
    utf8ByteLength(storedCommand.canonical + storedCommand.rawParameters)
  );
  const previous = state.persistent.get(command.code)?.bytes ?? 0;
  if (state.resourceBytes - previous + bytes > renderLimits.maxSessionBytes) {
    diagnostics.push(
      semanticDiagnostic(
        "SESSION_RESOURCE_LIMIT_EXCEEDED",
        `Persisting ${command.canonical} would exceed the ${renderLimits.maxSessionBytes}-byte session limit.`,
        command
      )
    );
    return;
  }
  // Map iteration defines replay order, so an updated setting must move to the
  // point at which the printer received it. This matters for dependent settings
  // such as ^MU and ^PW.
  state.persistent.delete(command.code);
  state.persistent.set(command.code, {
    command: cloneCommand(storedCommand),
    documentId,
    bytes,
  });
  state.resourceBytes += bytes - previous;
}

function fontProviderForResources(
  memoryAliases: ReadonlyMap<string, string>,
  objects: ReadonlyMap<string, StoredObject>,
  bitmapFonts: ReadonlyMap<string, DownloadedBitmapFont>,
  fallback?: FontProvider
): FontProvider | undefined {
  if (objects.size === 0 && !fallback) return undefined;

  const resolveStoredFont = async (
    requestedName: string,
    storedName: string,
    object: StoredObject
  ): Promise<ArrayBuffer | Uint8Array | undefined> => {
    // ~DB resources are resolved by the deterministic bitmap-font path. Their
    // printer bytes are not OpenType and must never be sent to the outline
    // parser when a glyph is absent.
    if (object.kind === "bitmap-font" || bitmapFonts.has(storedName)) {
      return undefined;
    }
    if (object.kind === "opentype") return object.data;
    if (
      object.kind !== "intellifont" &&
      object.kind !== "bounded-truetype" &&
      object.kind !== "unbounded-truetype" &&
      object.kind !== "truetype-extension"
    ) {
      return undefined;
    }
    const source: DownloadedFontSource = {
      name: storedName,
      format: object.kind,
      data: object.data.slice(),
    };
    return fallback?.resolveFont(requestedName, source);
  };

  return {
    async resolveFont(name: string) {
      const resolved = aliasedPathUsing(name, memoryAliases);
      const direct = objects.get(resolved);
      if (
        direct &&
        [
          "opentype",
          "bitmap-font",
          "intellifont",
          "bounded-truetype",
          "unbounded-truetype",
          "truetype-extension",
        ].includes(direct.kind)
      ) {
        return resolveStoredFont(name, resolved, direct);
      }
      const objectName = resolved.slice(resolved.indexOf(":") + 1);
      const basename = objectName.replace(/\.[A-Z0-9]+$/i, "");
      const device = resolved.slice(0, resolved.indexOf(":"));
      for (const [candidate, object] of objects) {
        if (
          ![
            "opentype",
            "bitmap-font",
            "intellifont",
            "bounded-truetype",
            "unbounded-truetype",
            "truetype-extension",
          ].includes(object.kind)
        ) continue;
        if (candidate.slice(0, candidate.indexOf(":")) !== device) continue;
        const candidateName = candidate.slice(candidate.indexOf(":") + 1);
        if (candidateName.replace(/\.[A-Z0-9]+$/i, "") === basename) {
          return resolveStoredFont(name, candidate, object);
        }
      }
      return fallback?.resolveFont(name);
    },
  };
}

function sessionFontProvider(
  state: SessionState,
  fallback?: FontProvider
): FontProvider | undefined {
  return fontProviderForResources(
    state.memoryAliases,
    state.objects,
    state.bitmapFonts,
    fallback
  );
}

function processJobCommand(
  command: ZplCommandNode,
  state: SessionState,
  documentId: number,
  renderLimits: RenderLimits,
  diagnostics: ZplDiagnostic[],
  options: RenderJobOptions
): void {
  if (command.capability !== "supported" && command.capability !== "partial") {
    return;
  }
  if (command.canonical === "~DG") {
    processDownloadGraphic(command, state, renderLimits, diagnostics);
  } else if (command.canonical === "~DB") {
    processDownloadBitmapFont(command, state, renderLimits, diagnostics);
  } else if (command.canonical === "~DE") {
    processDownloadEncoding(command, state, renderLimits, diagnostics);
  } else if (["~DS", "~DT", "~DU"].includes(command.canonical)) {
    processDownloadOutlineFont(command, state, renderLimits, diagnostics);
  } else if (command.canonical === "~DY") {
    processDownloadObject(command, state, renderLimits, diagnostics);
  } else if (command.canonical === "~EG") {
    eraseDownloadedGraphics(state);
  } else if (command.canonical === "^ID") {
    deleteResources(command.parameters[0] ?? "R:*.*", state);
  } else if (command.canonical === "^TO") {
    transferResources(command, state, renderLimits, diagnostics);
  } else if (command.canonical === "^CM") {
    changeMemoryAliases(command, state);
  } else if (command.canonical === "^FL") {
    processFontLink(command, state, renderLimits, diagnostics);
  } else if (command.canonical === "^CW") {
    processFontAlias(command, state, renderLimits, diagnostics);
  } else if (["^KL", "^SL", "^SO", "^ST"].includes(command.canonical)) {
    applyRtcCommand(command, state.rtc, options);
  }
  if (PERSISTENT_COMMANDS.has(command.code)) {
    storePersistentCommand(
      command,
      state,
      documentId,
      renderLimits,
      diagnostics
    );
  }
}

function hasJobEffect(command: ZplCommandNode): boolean {
  if (command.capability !== "supported" && command.capability !== "partial") {
    return false;
  }
  return (
    command.canonical === "~DG" ||
    command.canonical === "~DB" ||
    command.canonical === "~DE" ||
    command.canonical === "~DS" ||
    command.canonical === "~DT" ||
    command.canonical === "~DU" ||
    command.canonical === "~DY" ||
    command.canonical === "~EG" ||
    command.canonical === "^ID" ||
    command.canonical === "^TO" ||
    command.canonical === "^CM" ||
    command.canonical === "^FL" ||
    command.canonical === "^CW"
  );
}

function commandReadsResources(command: ZplCommandNode): boolean {
  return ["SE", "CF", "A", "A@", "XG", "IM", "IL"].includes(
    command.code
  );
}

function snapshotInterpretResources(
  state: SessionState,
  fallback?: FontProvider
): InterpretResourceContext {
  const memoryAliases = new Map(state.memoryAliases);
  const objects = new Map(state.objects);
  const bitmapFonts = new Map(state.bitmapFonts);
  const fontLinks = new Map(
    [...state.fontLinks].map(([name, links]) => [name, [...links]] as const)
  );
  const fontProvider = fontProviderForResources(
    memoryAliases,
    objects,
    bitmapFonts,
    fallback
  );
  return {
    graphics: new Map(state.graphics),
    fontAliases: new Map(state.fontAliases),
    memoryAliases,
    encodings: new Map(state.encodings),
    fontResources: {
      bitmapFonts,
      fontLinks,
      memoryAliases,
      ...(fontProvider ? { fontProvider } : {}),
    },
  };
}

function createResourceTimeline(
  state: SessionState,
  documentId: number,
  renderLimits: RenderLimits,
  diagnostics: ZplDiagnostic[],
  options: RenderJobOptions
): {
  readonly contexts: ReadonlyMap<number, InterpretResourceContext>;
  readonly onCommand: (command: ZplCommandNode) => void;
  readonly attachInherited: (label: ZplLabelNode) => void;
} {
  const contexts = new Map<number, InterpretResourceContext>();
  let nextId = 0;
  let initial = [...state.persistent.values()].some(({ command }) =>
    commandReadsResources(command)
  )
    ? snapshotInterpretResources(state, options.fontProvider)
    : undefined;
  let current = initial;

  const onCommand = (command: ZplCommandNode): void => {
    const id = nextId++;
    (command as ResourceContextCommand)[RESOURCE_CONTEXT_ID] = id;
    if (commandReadsResources(command)) {
      current ??= snapshotInterpretResources(state, options.fontProvider);
      contexts.set(id, current);
    }
    if (hasJobEffect(command)) {
      processJobCommand(
        command,
        state,
        documentId,
        renderLimits,
        diagnostics,
        options
      );
      current = undefined;
    }
  };

  const attachInherited = (label: ZplLabelNode): void => {
    for (const command of label.commands) {
      if (
        (command as ResourceContextCommand)[RESOURCE_CONTEXT_ID] !== undefined
      ) {
        continue;
      }
      const id = nextId++;
      (command as ResourceContextCommand)[RESOURCE_CONTEXT_ID] = id;
      if (commandReadsResources(command)) {
        initial ??= snapshotInterpretResources(state, options.fontProvider);
        contexts.set(id, initial);
      }
    }
  };

  return { contexts, onCommand, attachInherited };
}

function timelineResources(
  contexts: ReadonlyMap<number, InterpretResourceContext>,
  command: ZplCommandNode
): InterpretResourceContext | undefined {
  const id = (command as ResourceContextCommand)[RESOURCE_CONTEXT_ID];
  return id === undefined ? undefined : contexts.get(id);
}

function storeFormat(
  label: ZplLabelNode,
  state: SessionState,
  documentId: number,
  renderLimits: RenderLimits,
  diagnostics: ZplDiagnostic[]
): boolean {
  const download = label.commands.find((command) => command.canonical === "^DF");
  if (!download) return false;
  const name = sessionResourceName(download.parameters[0] ?? "", "ZPL", state);
  if (disabledResource(name)) return true;
  const commands = label.commands.filter(
    (command) => !["^XA", "^XZ", "^DF"].includes(command.canonical)
  );
  const bytes = commands.reduce(
    (sum, command) =>
      sum + utf8ByteLength(command.canonical + command.rawParameters),
    0
  );
  const previous = namedResourceCost(state, name);
  const storedBytes = resourceCost(name, bytes);
  if (state.resourceBytes - previous + storedBytes > renderLimits.maxSessionBytes) {
    diagnostics.push(
      semanticDiagnostic(
        "SESSION_RESOURCE_LIMIT_EXCEEDED",
        `Storing ${name} would exceed the ${renderLimits.maxSessionBytes}-byte session limit.`,
        download
      )
    );
    return true;
  }
  replaceNamedResource(state, name, storedBytes, () => {
    state.formats.set(name, {
      commands: commands.map(cloneCommand),
      bytes,
      definitionSpan: { ...download.span },
      documentId,
    });
  });
  return true;
}

function withPersistentState(
  label: ZplLabelNode,
  state: SessionState,
  documentId: number
): ZplLabelNode {
  const start = label.commands[0]?.canonical === "^XA" ? [label.commands[0]] : [];
  const rest = label.commands.slice(start.length);
  const anchor = label.commands[0]?.span.start ?? label.span.start;
  const inherited = [...state.persistent.values()].map((stored) => {
    const command = cloneCommand(stored.command);
    if (stored.documentId !== documentId) {
      command.span = { start: anchor, end: anchor };
    }
    return command;
  });
  return cloneLabel(label, [...start, ...inherited, ...rest]);
}

function updatePersistentState(
  label: ZplLabelNode,
  state: SessionState,
  documentId: number,
  renderLimits: RenderLimits,
  diagnostics: ZplDiagnostic[]
): void {
  for (const command of label.commands) {
    if (
      (command.capability === "supported" || command.capability === "partial") &&
      PERSISTENT_COMMANDS.has(command.code)
    ) {
      storePersistentCommand(
        command,
        state,
        documentId,
        renderLimits,
        diagnostics
      );
    }
  }
}

function strictDiagnostics(
  diagnostics: readonly ZplDiagnostic[],
  strict: boolean | undefined
): ZplDiagnostic[] {
  if (!strict) return diagnostics.map((diagnostic) => ({ ...diagnostic }));
  return diagnostics.map((diagnostic) =>
    diagnostic.code === "UNKNOWN_COMMAND" ||
    diagnostic.code === "INVALID_COMMAND_PREFIX" ||
    diagnostic.code === "UNSUPPORTED_COMMAND"
      ? { ...diagnostic, severity: "error" }
      : { ...diagnostic }
  );
}

function uniqueDiagnostics(diagnostics: readonly ZplDiagnostic[]): ZplDiagnostic[] {
  const seen = new Set<string>();
  return diagnostics.filter((diagnostic) => {
    const key = `${diagnostic.code}:${diagnostic.labelIndex ?? ""}:${
      diagnostic.span?.start ?? ""
    }:${diagnostic.span?.end ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function printQuantity(label: ZplLabelNode): {
  quantity: number;
  replicates: number;
  command?: ZplCommandNode;
} {
  const command = [...label.commands]
    .reverse()
    .find((candidate) => candidate.canonical === "^PQ");
  const quantity = Math.max(
    1,
    Math.min(99_999_999, decimalInteger(command?.parameters[0] ?? "1") || 1)
  );
  const requestedReplicates = decimalInteger(command?.parameters[2] ?? "0");
  return {
    quantity,
    replicates: Math.max(1, requestedReplicates || 1),
    command,
  };
}

async function renderParsedDocument<TCanvas extends CanvasLike>(
  document: ZplDocument,
  options: RenderJobOptions,
  platform: CanvasPlatform<TCanvas>,
  state: SessionState
): Promise<RenderJobResult<TCanvas>> {
  const documentId = state.nextDocumentId++;
  const renderLimits = limits(options);
  const jobDiagnostics = strictDiagnostics(document.diagnostics, options.strict);
  const fieldValues = optionFieldValues(options, jobDiagnostics);
  const labels: DocumentRenderResult<TCanvas>[] = [];
  let sourceLabelIndex = 0;
  let generatedLabels = 0;
  const pixelBudget = { remaining: renderLimits.maxPixels };

  for (const item of document.items) {
    if (item.kind === "command") {
      processJobCommand(
        item,
        state,
        documentId,
        renderLimits,
        jobDiagnostics,
        options
      );
      continue;
    }

    const currentLabelIndex = sourceLabelIndex++;
    const formatDiagnostics: ZplDiagnostic[] = [];
    if (
      storeFormat(
        item,
        state,
        documentId,
        renderLimits,
        formatDiagnostics
      )
    ) {
      jobDiagnostics.push(
        ...formatDiagnostics.map((diagnostic) => ({
          ...diagnostic,
          labelIndex: currentLabelIndex,
        }))
      );
      continue;
    }

    const expansionDiagnostics: ZplDiagnostic[] = [];
    const localSemanticDiagnostics: ZplDiagnostic[] = [];
    const resourceTimeline = createResourceTimeline(
      state,
      documentId,
      renderLimits,
      localSemanticDiagnostics,
      options
    );
    const expanded = expandFormats(
      item,
      state,
      documentId,
      renderLimits.maxTemplateDepth,
      renderLimits.maxExpandedCommands,
      expansionDiagnostics,
      fieldValues,
      resourceTimeline.onCommand
    );
    jobDiagnostics.push(
      ...expansionDiagnostics.map((diagnostic) => ({
        ...diagnostic,
        labelIndex: currentLabelIndex,
      }))
    );
    for (const command of expanded.commands) {
      if (
        command.canonical === "^SF" &&
        serializationFieldSize(command) > MAX_SERIALIZATION_FIELD_SIZE
      ) {
        localSemanticDiagnostics.push(
          semanticDiagnostic(
            "INVALID_SERIALIZATION_FIELD",
            `^SF mask and increment strings exceed the ${MAX_SERIALIZATION_FIELD_SIZE}-character combined limit; serialization was ignored.`,
            command
          )
        );
      }
    }
    const prepared = withPersistentState(expanded, state, documentId);
    resourceTimeline.attachInherited(prepared);
    const resourceContexts = resourceTimeline.contexts;
    jobDiagnostics.push(
      ...localSemanticDiagnostics.map((diagnostic) => ({
        ...diagnostic,
        labelIndex: currentLabelIndex,
      }))
    );
    const plan = printQuantity(expanded);
    const available = Math.max(0, renderLimits.maxLabels - generatedLabels);
    const quantity = Math.min(plan.quantity, available);
    if (quantity < plan.quantity) {
      const subject = plan.command
        ? `^PQ requested ${plan.quantity} label${plan.quantity === 1 ? "" : "s"}`
        : `This format would generate ${plan.quantity} label${
            plan.quantity === 1 ? "" : "s"
          }`;
      jobDiagnostics.push({
        ...semanticDiagnostic(
          "LABEL_QUANTITY_LIMIT_EXCEEDED",
          `${subject}, but only ${available} of the ${renderLimits.maxLabels}-label job limit ${
            available === 1 ? "remains" : "remain"
          }.`,
          plan.command
        ),
        labelIndex: currentLabelIndex,
      });
    }
    const labelStart = state.rtc.fixed
      ? new Date(state.rtc.fixed.getTime())
      : clockNow(options);
    const effectiveFontProvider = sessionFontProvider(state, options.fontProvider);

    for (let copyIndex = 0; copyIndex < quantity; copyIndex++) {
      const serialStep = Math.floor(copyIndex / plan.replicates);
      const renderedLabel = dynamicLabel(
        prepared,
        state,
        options,
        fieldValues,
        serialStep,
        labelStart,
        copyIndex === quantity - 1
      );
      const labelDocument: ZplDocument = {
        kind: "document",
        source: document.source,
        profile: document.profile,
        items: [renderedLabel],
        labels: [renderedLabel],
        syntax: document.syntax,
        diagnostics: [
          ...document.diagnostics
            .filter((diagnostic) => diagnostic.labelIndex === currentLabelIndex)
            .map((diagnostic) => ({ ...diagnostic, labelIndex: 0 })),
          ...localSemanticDiagnostics.map((diagnostic) => ({
            ...diagnostic,
            labelIndex: 0,
          })),
          ...expansionDiagnostics.map((diagnostic) => ({
            ...diagnostic,
            labelIndex: 0,
          })),
        ],
      };
      const rendered = await renderDocumentWithPlatform(
        labelDocument,
        options,
        platform,
        {
          graphics: state.graphics,
          fontAliases: state.fontAliases,
          fontProvider: effectiveFontProvider,
          initialRaster: state.retainedRaster,
          memoryAliases: state.memoryAliases,
          bitmapFonts: state.bitmapFonts,
          fontLinks: state.fontLinks,
          encodings: state.encodings,
          resourcesAt: (command) =>
            timelineResources(resourceContexts, command),
          pixelBudget,
        }
      );
      const normalizedRendered = rendered.map((label) => ({
        ...label,
        diagnostics: strictDiagnostics(
          label.diagnostics.map((diagnostic) => ({
            ...diagnostic,
            labelIndex: currentLabelIndex,
          })),
          options.strict
        ),
      }));

      const imageSave = [...renderedLabel.commands]
        .reverse()
        .find((command) => command.canonical === "^IS");
      let printImage = true;
      if (imageSave && normalizedRendered[0]) {
        const imageDiagnostics: ZplDiagnostic[] = [];
        printImage = storeRenderedImage(
          imageSave,
          normalizedRendered[0].raster,
          state,
          renderLimits,
          imageDiagnostics
        );
        jobDiagnostics.push(
          ...imageDiagnostics.map((diagnostic) => ({
            ...diagnostic,
            labelIndex: currentLabelIndex,
          }))
        );
      }
      if (printImage) labels.push(...normalizedRendered);
      else {
        jobDiagnostics.push(
          ...normalizedRendered.flatMap((label) => label.diagnostics)
        );
      }

      const mapClear = [...renderedLabel.commands]
        .reverse()
        .find((command) => command.canonical === "^MC");
      if (
        normalizedRendered[0] &&
        (mapClear?.parameters[0]?.trim().toUpperCase() || "Y") === "N"
      ) {
        const previous = state.retainedRaster
          ? Math.max(1, state.retainedRaster.data.byteLength)
          : 0;
        const bytes = Math.max(
          1,
          normalizedRendered[0].raster.data.byteLength
        );
        if (
          state.resourceBytes - previous + bytes >
          renderLimits.maxSessionBytes
        ) {
          jobDiagnostics.push({
            ...semanticDiagnostic(
              "SESSION_RESOURCE_LIMIT_EXCEEDED",
              `Retaining the label raster would exceed the ${renderLimits.maxSessionBytes}-byte session limit.`,
              mapClear
            ),
            labelIndex: currentLabelIndex,
          });
        } else {
          state.retainedRaster = cloneRaster(normalizedRendered[0].raster);
          state.resourceBytes += bytes - previous;
        }
      } else {
        if (state.retainedRaster) {
          state.resourceBytes -= Math.max(
            1,
            state.retainedRaster.data.byteLength
          );
        }
        state.retainedRaster = undefined;
      }
      generatedLabels++;
    }
    const persistenceDiagnostics: ZplDiagnostic[] = [];
    updatePersistentState(
      expanded,
      state,
      documentId,
      renderLimits,
      persistenceDiagnostics
    );
    jobDiagnostics.push(
      ...persistenceDiagnostics.map((diagnostic) => ({
        ...diagnostic,
        labelIndex: currentLabelIndex,
      }))
    );
  }

  const labelDiagnostics = labels.flatMap((label) => label.diagnostics);
  const diagnostics = uniqueDiagnostics(
    strictDiagnostics([...jobDiagnostics, ...labelDiagnostics], options.strict)
  );
  return {
    document,
    labels,
    diagnostics,
  };
}

class RenderSession<TCanvas extends CanvasLike>
  implements ZplRenderSession<TCanvas>
{
  private state = newState();
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly platform: CanvasPlatform<TCanvas>,
    private readonly baseOptions: RenderJobOptions = {}
  ) {}

  private options(options: RenderJobOptions): RenderJobOptions {
    return {
      ...this.baseOptions,
      ...options,
      limits:
        this.baseOptions.limits || options.limits
          ? { ...this.baseOptions.limits, ...options.limits }
          : undefined,
    };
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation, operation);
    this.queue = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }

  render(source: string, options: RenderJobOptions = {}): Promise<RenderJobResult<TCanvas>> {
    return this.enqueue(async () => {
      options = this.options(options);
      const document = parseDocument(source, {
        profile: options.profile,
        initialSyntax: this.state.syntax,
      });
      this.state.syntax = { ...document.syntax };
      return renderParsedDocument(document, options, this.platform, this.state);
    });
  }

  renderDocument(
    document: ZplDocument,
    options: RenderJobOptions = {}
  ): Promise<RenderJobResult<TCanvas>> {
    return this.enqueue(() => {
      options = this.options(options);
      this.state.syntax = { ...document.syntax };
      return renderParsedDocument(document, options, this.platform, this.state);
    });
  }

  reset(): Promise<void> {
    return this.enqueue(async () => {
      this.state = newState();
    });
  }
}

export function createRenderSessionWithPlatform<TCanvas extends CanvasLike>(
  platform: CanvasPlatform<TCanvas>,
  options: RenderJobOptions = {}
): ZplRenderSession<TCanvas> {
  return new RenderSession(platform, options);
}

export async function renderZplWithPlatform<TCanvas extends CanvasLike>(
  source: string,
  options: RenderJobOptions,
  platform: CanvasPlatform<TCanvas>
): Promise<RenderJobResult<TCanvas>> {
  return createRenderSessionWithPlatform(platform).render(source, options);
}
