import { parseDocument } from "./documentParser";
import {
  decodeDownloadData,
  decodeGraphic,
  GraphicDecodeError,
} from "./graphicDecoder";
import { decodePng } from "./pngDecoder";
import { decodeBmp, decodePcx } from "./imageDecoder";
import {
  normalizeResourceName,
  type StoredGraphic,
} from "./interpreter";
import {
  DEFAULT_LIMITS,
  renderDocumentWithPlatform,
  type DocumentRenderResult,
} from "./renderDocument";
import type { CanvasPlatform } from "./layoutRenderer";
import type { CanvasLike } from "@/helper/rendering/canvas";
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

const PERSISTENT_COMMANDS = new Set([
  "BY",
  "CF",
  "CI",
  "CV",
  "CW",
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
  "SZ",
]);

interface StoredFormat {
  commands: ZplCommandNode[];
  bytes: number;
  definitionSpan: { start: number; end: number };
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
  kind: "font" | "intellifont" | "encoding" | "binary";
}

interface SessionState {
  syntax: ZplSyntaxState;
  graphics: Map<string, StoredGraphic>;
  formats: Map<string, StoredFormat>;
  persistent: Map<string, ZplCommandNode>;
  fontAliases: Map<string, string>;
  resourceBytes: number;
  retainedRaster?: MonochromeRaster;
  rtc: RtcState;
  memoryAliases: Map<string, string>;
  objects: Map<string, StoredObject>;
  bitmapFonts: Map<string, DownloadedBitmapFont>;
  encodings: Map<string, ReadonlyMap<number, number>>;
  fontLinks: Map<string, string[]>;
  zplVersion: 1 | 2;
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
    zplVersion: 2,
  };
}

function sessionResourceName(
  value: string,
  extension: "GRF" | "ZPL",
  state: SessionState
): string {
  return normalizeResourceName(value, extension, state.memoryAliases);
}

function aliasedPath(value: string, state: SessionState): string {
  let normalized = value.trim().toUpperCase();
  if (!normalized.includes(":")) normalized = `R:${normalized}`;
  const mapped = state.memoryAliases.get(normalized[0]);
  return mapped
    ? `${mapped}:${normalized.slice(normalized.indexOf(":") + 1)}`
    : normalized;
}

function changeMemoryAliases(command: ZplCommandNode, state: SessionState): void {
  const logical = ["B", "E", "R", "A"] as const;
  const requested = logical.map((letter, index) => {
    const value = command.parameters[index]?.trim().toUpperCase().replace(/:$/, "");
    return value === "NONE" || ["A", "B", "E", "R"].includes(value ?? "")
      ? value!
      : letter;
  });
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

const RTC_LOCALES = [
  "en", "es", "fr", "de", "it", "nb", "pt", "sv", "da", "es",
  "nl", "fi", "ja", "ko", "zh-CN", "zh-TW", "ru", "pl",
] as const;

function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  return Math.floor((date.getTime() - start.getTime()) / 86_400_000) + 1;
}

function rtcToken(date: Date, token: string, language: number): string | undefined {
  const locale = RTC_LOCALES[Math.min(18, Math.max(1, language)) - 1] ?? "en";
  const hour = date.getHours();
  const ordinal = dayOfYear(date);
  if (token === "a") return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date);
  if (token === "A") return new Intl.DateTimeFormat(locale, { weekday: "long" }).format(date);
  if (token === "b") return new Intl.DateTimeFormat(locale, { month: "short" }).format(date);
  if (token === "B") return new Intl.DateTimeFormat(locale, { month: "long" }).format(date);
  if (token === "d") return pad(date.getDate());
  if (token === "H") return pad(hour);
  if (token === "I") return pad(hour % 12 || 12);
  if (token === "j") return pad(ordinal, 3);
  if (token === "m") return pad(date.getMonth() + 1);
  if (token === "M") return pad(date.getMinutes());
  if (token === "p") return hour < 12 ? "AM" : "PM";
  if (token === "S") return pad(date.getSeconds());
  if (token === "w") return pad(date.getDay());
  if (token === "y") return pad(date.getFullYear() % 100);
  if (token === "Y") return String(date.getFullYear());
  if (token === "U") return pad(Math.floor((ordinal - 1 + 7 - date.getDay()) / 7));
  if (token === "W") {
    const mondayDay = (date.getDay() + 6) % 7;
    return pad(Math.floor((ordinal - 1 + 7 - mondayDay) / 7));
  }
  return undefined;
}

function applyRtcOffset(date: Date, offset: RtcOffset | undefined): Date {
  const result = new Date(date.getTime());
  if (!offset) return result;
  result.setFullYear(result.getFullYear() + offset.years);
  result.setMonth(result.getMonth() + offset.months);
  result.setDate(result.getDate() + offset.days);
  result.setHours(result.getHours() + offset.hours);
  result.setMinutes(result.getMinutes() + offset.minutes);
  result.setSeconds(result.getSeconds() + offset.seconds);
  return result;
}

function formatRtcField(
  value: string,
  indicators: readonly string[],
  rtc: RtcState,
  labelStart: Date,
  options: RenderJobOptions
): string {
  const sourceDate = rtc.fixed
    ? new Date(rtc.fixed.getTime())
    : rtc.mode === "S"
    ? new Date(labelStart.getTime())
    : clockNow(options);
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

function dynamicLabel(
  label: ZplLabelNode,
  state: SessionState,
  options: RenderJobOptions,
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

  for (const original of label.commands) {
    const command = cloneCommand(original);
    const args = command.parameters;
    if (command.code === "SL") {
      const mode = args[0]?.trim().toUpperCase() || "S";
      rtc.mode = mode === "S" || mode === "T" ? mode : Math.max(0, Number(mode) || 0);
      const language = Number.parseInt(args[1] ?? "", 10);
      if (language >= 1 && language <= 18) rtc.language = language;
    } else if (command.code === "KL") {
      const language = Number.parseInt(args[0] ?? "", 10);
      if (language >= 1 && language <= 18) rtc.language = language;
    } else if (command.code === "SO") {
      const clock = Number(args[0]);
      if (clock === 2 || clock === 3) {
        rtc.offsets.set(clock, {
          months: Number(args[1]) || 0,
          days: Number(args[2]) || 0,
          years: Number(args[3]) || 0,
          hours: Number(args[4]) || 0,
          minutes: Number(args[5]) || 0,
          seconds: Number(args[6]) || 0,
        });
      }
    } else if (command.code === "ST") {
      const current = rtc.fixed ?? clockNow(options);
      let hour = Number(args[3] ?? current.getHours());
      const meridiem = args[6]?.trim().toUpperCase();
      if (meridiem === "P" && hour < 12) hour += 12;
      if (meridiem === "A" && hour === 12) hour = 0;
      rtc.fixed = new Date(
        Number(args[2] ?? current.getFullYear()),
        Math.max(0, Number(args[0] ?? current.getMonth() + 1) - 1),
        Number(args[1] ?? current.getDate()),
        hour,
        Number(args[4] ?? current.getMinutes()),
        Number(args[5] ?? current.getSeconds())
      );
    }

    if (command.code === "FC") {
      indicators = [
        command.rawParameters[0] || "%",
        args[1]?.[0] || "",
        args[2]?.[0] || "",
      ];
      output.push(command);
      continue;
    }
    if (command.code === "FS") {
      indicators = undefined;
      lastDataIndex = -1;
      output.push(command);
      continue;
    }

    if (command.code === "SN") {
      const serialized = serializeNumber(
        args[0] || "1",
        args[1] || "1",
        (args[2]?.trim().toUpperCase() || "N") === "Y",
        serialStep
      );
      const value = indicators
        ? formatRtcField(serialized, indicators, rtc, labelStart, options)
        : serialized;
      output.push(replacementDataCommand(command, value));
      lastDataIndex = output.length - 1;
      continue;
    }
    if (command.code === "FD" || command.code === "FV") {
      const value = indicators
        ? formatRtcField(command.rawParameters, indicators, rtc, labelStart, options)
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
      if (lastDataIndex >= 0) {
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
  return { ...DEFAULT_LIMITS, ...options.limits };
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
    if (commands[index].code !== "FN") continue;
    const field = commands[index].parameters[0]?.trim();
    if (!field) continue;
    for (let cursor = index + 1; cursor < commands.length; cursor++) {
      if (commands[cursor].code === "FD" || commands[cursor].code === "FV") {
        assignments.set(field, commands[cursor].rawParameters);
        break;
      }
      if (commands[cursor].code === "FS" || commands[cursor].code === "FN") break;
    }
  }
  return assignments;
}

function invocationAssignmentIndexes(commands: readonly ZplCommandNode[]): Set<number> {
  const indexes = new Set<number>();
  for (let index = 0; index < commands.length; index++) {
    if (commands[index].code !== "FN") continue;
    for (let cursor = index; cursor < commands.length; cursor++) {
      indexes.add(cursor);
      if (commands[cursor].code === "FS") break;
    }
  }
  return indexes;
}

function applyAssignments(
  commands: readonly ZplCommandNode[],
  assignments: ReadonlyMap<string, string>
): ZplCommandNode[] {
  const output: ZplCommandNode[] = [];
  for (let index = 0; index < commands.length; index++) {
    const command = commands[index];
    if (command.code !== "FN") {
      output.push(cloneCommand(command));
      continue;
    }
    const field = command.parameters[0]?.trim();
    const value = field ? assignments.get(field) : undefined;
    const next = commands[index + 1];
    if (next?.code === "FD" || next?.code === "FV") {
      output.push(value === undefined ? cloneCommand(next) : replacementDataCommand(next, value));
      index++;
    } else if (value !== undefined) {
      output.push(replacementDataCommand(command, value));
    }
  }
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

function expandFormats(
  label: ZplLabelNode,
  state: SessionState,
  maxDepth: number,
  maxCommands: number,
  diagnostics: ZplDiagnostic[]
): ZplLabelNode {
  const assignments = fieldAssignments(label.commands);
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
    active: ReadonlySet<string>
  ): ZplCommandNode[] => {
    if (depth > maxDepth) {
      diagnostics.push(
        semanticDiagnostic(
          "TEMPLATE_DEPTH_EXCEEDED",
          `Stored-format expansion exceeded ${maxDepth} levels.`
        )
      );
      return [];
    }
    const output: ZplCommandNode[] = [];
    for (const command of commands) {
      if (commandLimitReached) return output;
      if (command.code !== "XF") {
        if (expandedCommands >= maxCommands) {
          reportCommandLimit(command);
          return output;
        }
        output.push(cloneCommand(command));
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
            stored ? [stored.definitionSpan] : undefined
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
      output.push(
        ...expand(
          applyAssignments(stored.commands, assignments),
          depth + 1,
          nextActive
        )
      );
      if (commandLimitReached) return output;
    }
    return output;
  };

  const hasRecall = label.commands.some((command) => command.code === "XF");
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
    state.resourceBytes -= graphic.data.byteLength;
  }
  for (const [name, format] of state.formats) {
    if (!matcher.test(name)) continue;
    state.formats.delete(name);
    state.resourceBytes -= format.bytes;
  }
  for (const [name, object] of state.objects) {
    if (!matcher.test(name)) continue;
    state.objects.delete(name);
    state.bitmapFonts.delete(name);
    state.encodings.delete(name);
    state.resourceBytes -= object.data.byteLength;
  }
}

function eraseDownloadedGraphics(state: SessionState): void {
  for (const graphic of state.graphics.values()) {
    state.resourceBytes -= graphic.data.byteLength;
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
  const sourcePattern = normalizedTransferName(
    command.parameters[0] ?? "",
    true,
    state
  );
  const destinationPattern = normalizedTransferName(
    command.parameters[1] ?? "",
    false,
    state
  );
  if (!destinationPattern) return;
  const matcher = wildcardMatcher(sourcePattern);
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
    if (!destination) continue;
    const previous = state.graphics.get(destination)?.data.byteLength ?? 0;
    if (!reserve(destination, graphic.data.byteLength, previous)) continue;
    state.graphics.set(destination, {
      ...graphic,
      data: graphic.data.slice(),
    });
    state.resourceBytes += graphic.data.byteLength - previous;
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
    if (!destination) continue;
    const previous = state.formats.get(destination)?.bytes ?? 0;
    if (!reserve(destination, format.bytes, previous)) continue;
    state.formats.set(destination, {
      ...format,
      commands: format.commands.map(cloneCommand),
      definitionSpan: { ...format.definitionSpan },
    });
    state.resourceBytes += format.bytes - previous;
  }
  for (const [name, object] of objects) {
    const match = matcher.exec(name);
    if (!match) continue;
    const destination = transferDestination(
      name,
      sourcePattern,
      destinationPattern,
      match.slice(1)
    );
    if (!destination) continue;
    const previous = state.objects.get(destination)?.data.byteLength ?? 0;
    if (!reserve(destination, object.data.byteLength, previous)) continue;
    state.objects.set(destination, { ...object, data: object.data.slice() });
    const bitmap = state.bitmapFonts.get(name);
    if (bitmap) state.bitmapFonts.set(destination, bitmap);
    const encoding = state.encodings.get(name);
    if (encoding) state.encodings.set(destination, new Map(encoding));
    state.resourceBytes += object.data.byteLength - previous;
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
  const previous = state.graphics.get(name)?.data.byteLength ?? 0;
  if (
    state.resourceBytes - previous + raster.data.byteLength >
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
    state.graphics.set(name, {
      data: raster.data.slice(),
      bytesPerRow: raster.stride,
      width: raster.width,
      height: raster.height,
    });
    state.resourceBytes += raster.data.byteLength - previous;
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
  const expectedBytes = Number.parseInt(command.parameters[1] ?? "", 10);
  const bytesPerRow = Number.parseInt(command.parameters[2] ?? "", 10);
  try {
    const graphic = decodeGraphic(
      command.parameters.slice(3).join(command.delimiter),
      bytesPerRow,
      expectedBytes,
      renderLimits.maxGraphicBytes
    );
    const previous = state.graphics.get(name)?.data.byteLength ?? 0;
    if (state.resourceBytes - previous + graphic.data.byteLength > renderLimits.maxSessionBytes) {
      diagnostics.push(
        semanticDiagnostic(
          "SESSION_RESOURCE_LIMIT_EXCEEDED",
          `Storing ${name} would exceed the ${renderLimits.maxSessionBytes}-byte session limit.`,
          command
        )
      );
      return;
    }
    state.graphics.set(name, graphic);
    state.resourceBytes += graphic.data.byteLength - previous;
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
  const previous = state.objects.get(name)?.data.byteLength ?? 0;
  if (
    state.resourceBytes - previous + object.data.byteLength >
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
  state.objects.set(name, object);
  state.resourceBytes += object.data.byteLength - previous;
  state.bitmapFonts.delete(name);
  state.encodings.delete(name);
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

function processDownloadEncoding(
  command: ZplCommandNode,
  state: SessionState,
  renderLimits: RenderLimits,
  diagnostics: ZplDiagnostic[]
): void {
  const name = objectPath(command.parameters[0] ?? "", "DAT", state);
  const expectedBytes = Number.parseInt(command.parameters[1] ?? "", 10);
  try {
    const data = decodeDownloadData(
      command.parameters.slice(2).join(command.delimiter),
      expectedBytes,
      renderLimits.maxGraphicBytes
    );
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
  const extension = command.code === "DS" ? "FNT" : "TTF";
  const name = objectPath(command.parameters[0] ?? "", extension, state);
  const expectedBytes = Number.parseInt(command.parameters[1] ?? "", 10);
  try {
    const source = command.parameters
      .slice(2)
      .join(command.delimiter)
      .replace(command.code === "DS" ? /[Oo]/g : /$^/, "0");
    const data = decodeDownloadData(
      source,
      expectedBytes,
      renderLimits.maxGraphicBytes
    );
    storeObjectResource(
      name,
      { data, kind: command.code === "DS" ? "intellifont" : "font" },
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
  const cellHeight = Number.parseInt(command.parameters[2] ?? "", 10);
  const cellWidth = Number.parseInt(command.parameters[3] ?? "", 10);
  const baseline = Number.parseInt(command.parameters[4] ?? "", 10);
  const spaceWidth = Number.parseInt(command.parameters[5] ?? "", 10);
  const expectedCharacters = Number.parseInt(command.parameters[6] ?? "", 10);
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
  const chunks: Uint8Array[] = [];
  const matcher = /#([0-9A-Fa-f]{1,6})\.(-?\d+)\.(-?\d+)\.(-?\d+)\.(-?\d+)\.(-?\d+)\.([\s\S]*?)(?=#(?:[0-9A-Fa-f]{1,6})\.|$)/g;
  try {
    for (const match of source.matchAll(matcher)) {
      const codePoint = Number.parseInt(match[1], 16);
      const height = Number.parseInt(match[2], 10);
      const width = Number.parseInt(match[3], 10);
      const xOffset = Number.parseInt(match[4], 10);
      const yOffset = Number.parseInt(match[5], 10);
      const advance = Number.parseInt(match[6], 10);
      const bytesPerRow = Math.ceil(width / 8);
      const expectedBytes = bytesPerRow * height;
      const data = decodeDownloadData(
        match[7].replace(/[Oo]/g, "0"),
        expectedBytes,
        renderLimits.maxGraphicBytes
      );
      chunks.push(data);
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
    if (
      !Number.isFinite(cellHeight) ||
      !Number.isFinite(cellWidth) ||
      glyphs.size === 0
    ) {
      throw new Error("Downloaded bitmap font header or glyph data is invalid.");
    }
    if (Number.isFinite(expectedCharacters) && glyphs.size !== expectedCharacters) {
      throw new Error(
        `Bitmap font declared ${expectedCharacters} characters but supplied ${glyphs.size}.`
      );
    }
    const raw = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      raw.set(chunk, offset);
      offset += chunk.length;
    }
    if (
      !storeObjectResource(
        name,
        { data: raw, kind: "font" },
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
      glyphs,
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
  const format = command.parameters[1]?.trim().toUpperCase() || "A";
  const extensionCode = command.parameters[2]?.trim().toUpperCase() || "G";
  const extension =
    extensionCode === "T"
      ? "TTF"
      : extensionCode === "E"
      ? "TTE"
      : extensionCode === "P"
      ? "PNG"
      : extensionCode === "B"
      ? "BMP"
      : extensionCode === "X"
      ? "PCX"
      : extensionCode === "G"
      ? "GRF"
      : extensionCode;
  const name = objectPath(command.parameters[0] ?? "", extension, state);
  const expectedBytes = Number.parseInt(command.parameters[3] ?? "", 10);
  const bytesPerRow = Number.parseInt(command.parameters[4] ?? "", 10);
  const source = command.parameters.slice(5).join(command.delimiter);
  try {
    if (extension === "GRF" && format === "A") {
      const graphic = decodeGraphic(
        source,
        bytesPerRow,
        expectedBytes,
        renderLimits.maxGraphicBytes
      );
      const previous = state.graphics.get(name)?.data.byteLength ?? 0;
      if (state.resourceBytes - previous + graphic.data.byteLength > renderLimits.maxSessionBytes) {
        throw new Error(`Storing ${name} exceeds the session resource limit.`);
      }
      state.graphics.set(name, graphic);
      state.resourceBytes += graphic.data.byteLength - previous;
      return;
    }
    const bytes =
      format === "B" || format === "C"
        ? Uint8Array.from([...source].map((character) => character.charCodeAt(0) & 0xff))
        : decodeDownloadData(source, expectedBytes, renderLimits.maxGraphicBytes);
    if (bytes.length !== expectedBytes) {
      throw new Error(
        `Object declared ${expectedBytes} bytes but decoded ${bytes.length}.`
      );
    }
    if (extension === "GRF") {
      const graphic =
        {
          data: bytes,
          bytesPerRow,
          width: bytesPerRow * 8,
          height: Math.ceil(bytes.length / bytesPerRow),
        };
      const previous = state.graphics.get(name)?.data.byteLength ?? 0;
      if (state.resourceBytes - previous + graphic.data.byteLength > renderLimits.maxSessionBytes) {
        throw new Error(`Storing ${name} exceeds the session resource limit.`);
      }
      state.graphics.set(name, graphic);
      state.resourceBytes += graphic.data.byteLength - previous;
    } else if (["PNG", "BMP", "PCX"].includes(extension)) {
      const graphic =
        extension === "PNG"
          ? decodePng(bytes, renderLimits.maxGraphicBytes)
          : extension === "BMP"
          ? decodeBmp(bytes, renderLimits.maxGraphicBytes)
          : decodePcx(bytes, renderLimits.maxGraphicBytes);
      const previous = state.graphics.get(name)?.data.byteLength ?? 0;
      if (state.resourceBytes - previous + graphic.data.byteLength > renderLimits.maxSessionBytes) {
        throw new Error(`Storing ${name} exceeds the session resource limit.`);
      }
      state.graphics.set(name, graphic);
      state.resourceBytes += graphic.data.byteLength - previous;
    } else {
      storeObjectResource(
        name,
        {
          data: bytes,
          kind: extension === "TTF" || extension === "TTE" ? "font" : "binary",
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

function processFontLink(command: ZplCommandNode, state: SessionState): void {
  const extension = aliasedPath(command.parameters[0] ?? "", state);
  const base = aliasedPath(command.parameters[1] ?? "", state);
  if (!extension || !base) return;
  const links = [...(state.fontLinks.get(base) ?? [])];
  const enabled = command.parameters[2]?.trim() === "1";
  const filtered = links.filter((name) => name !== extension);
  if (enabled) filtered.push(extension);
  if (filtered.length > 0) state.fontLinks.set(base, filtered.slice(-5));
  else state.fontLinks.delete(base);
}

function sessionFontProvider(
  state: SessionState,
  fallback?: FontProvider
): FontProvider | undefined {
  if (state.objects.size === 0 && !fallback) return undefined;

  const resolveStoredFont = async (
    requestedName: string,
    storedName: string,
    object: StoredObject
  ): Promise<ArrayBuffer | Uint8Array | undefined> => {
    if (object.kind === "font") return object.data;
    if (object.kind !== "intellifont") return undefined;
    const source: DownloadedFontSource = {
      name: storedName,
      format: "intellifont",
      data: object.data.slice(),
    };
    return fallback?.resolveFont(requestedName, source);
  };

  return {
    async resolveFont(name: string) {
      const resolved = aliasedPath(name, state);
      const direct = state.objects.get(resolved);
      if (direct?.kind === "font" || direct?.kind === "intellifont") {
        return resolveStoredFont(name, resolved, direct);
      }
      const objectName = resolved.slice(resolved.indexOf(":") + 1);
      const basename = objectName.replace(/\.[A-Z0-9]+$/i, "");
      for (const [candidate, object] of state.objects) {
        if (object.kind !== "font" && object.kind !== "intellifont") continue;
        const candidateName = candidate.slice(candidate.indexOf(":") + 1);
        if (candidateName.replace(/\.[A-Z0-9]+$/i, "") === basename) {
          return resolveStoredFont(name, candidate, object);
        }
      }
      return fallback?.resolveFont(name);
    },
  };
}

function processJobCommand(
  command: ZplCommandNode,
  state: SessionState,
  renderLimits: RenderLimits,
  diagnostics: ZplDiagnostic[]
): void {
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
  } else if (command.code === "ID") {
    deleteResources(command.parameters[0] ?? "R:*.*", state);
  } else if (command.code === "TO") {
    transferResources(command, state, renderLimits, diagnostics);
  } else if (command.code === "CM") {
    changeMemoryAliases(command, state);
  } else if (command.code === "FL") {
    processFontLink(command, state);
  } else if (command.code === "CW") {
    const identifier = command.parameters[0]?.trim().toUpperCase();
    const name = command.parameters[1]?.trim();
    if (identifier && name) state.fontAliases.set(identifier, aliasedPath(name, state));
  } else if (command.code === "SZ") {
    const version = command.parameters[0]?.trim();
    if (version === "1" || version === "2") {
      state.zplVersion = Number(version) as 1 | 2;
    }
  }
  if (
    PERSISTENT_COMMANDS.has(command.code) &&
    (command.code !== "SZ" ||
      ["1", "2"].includes(command.parameters[0]?.trim()))
  ) {
    state.persistent.set(command.code, cloneCommand(command));
  }
}

function storeFormat(
  label: ZplLabelNode,
  state: SessionState,
  renderLimits: RenderLimits,
  diagnostics: ZplDiagnostic[]
): boolean {
  const download = label.commands.find((command) => command.code === "DF");
  if (!download) return false;
  const name = sessionResourceName(download.parameters[0] ?? "", "ZPL", state);
  const commands = label.commands.filter(
    (command) => !["XA", "XZ", "DF"].includes(command.code)
  );
  const bytes = commands.reduce(
    (sum, command) =>
      sum + utf8ByteLength(command.canonical + command.rawParameters),
    0
  );
  const previous = state.formats.get(name)?.bytes ?? 0;
  if (state.resourceBytes - previous + bytes > renderLimits.maxSessionBytes) {
    diagnostics.push(
      semanticDiagnostic(
        "SESSION_RESOURCE_LIMIT_EXCEEDED",
        `Storing ${name} would exceed the ${renderLimits.maxSessionBytes}-byte session limit.`,
        download
      )
    );
    return true;
  }
  state.formats.set(name, {
    commands: commands.map(cloneCommand),
    bytes,
    definitionSpan: { ...download.span },
  });
  state.resourceBytes += bytes - previous;
  return true;
}

function withPersistentState(label: ZplLabelNode, state: SessionState): ZplLabelNode {
  const start = label.commands[0]?.code === "XA" ? [label.commands[0]] : [];
  const rest = label.commands.slice(start.length);
  const inherited = [...state.persistent.values()].map(cloneCommand);
  return cloneLabel(label, [...start, ...inherited, ...rest]);
}

function updatePersistentState(label: ZplLabelNode, state: SessionState): void {
  for (const command of label.commands) {
    if (PERSISTENT_COMMANDS.has(command.code)) {
      if (
        command.code === "SZ" &&
        !["1", "2"].includes(command.parameters[0]?.trim())
      ) {
        continue;
      }
      state.persistent.set(command.code, cloneCommand(command));
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
    .find((candidate) => candidate.code === "PQ");
  const quantity = Math.max(
    1,
    Math.min(99_999_999, Number.parseInt(command?.parameters[0] ?? "1", 10) || 1)
  );
  const requestedReplicates = Number.parseInt(command?.parameters[2] ?? "0", 10);
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
  const renderLimits = limits(options);
  const jobDiagnostics = strictDiagnostics(document.diagnostics, options.strict);
  const labels: DocumentRenderResult<TCanvas>[] = [];
  let sourceLabelIndex = 0;
  let generatedLabels = 0;

  for (const item of document.items) {
    if (item.kind === "command") {
      processJobCommand(item, state, renderLimits, jobDiagnostics);
      continue;
    }

    const currentLabelIndex = sourceLabelIndex++;
    const localSemanticDiagnostics: ZplDiagnostic[] = [];

    for (const command of item.commands) {
      if (
        command.canonical === "~DG" ||
        command.canonical === "~DB" ||
        command.canonical === "~DE" ||
        command.canonical === "~DS" ||
        command.canonical === "~DT" ||
        command.canonical === "~DU" ||
        command.canonical === "~DY" ||
        command.canonical === "~EG" ||
        command.code === "ID" ||
        command.code === "TO" ||
        command.code === "CM" ||
        command.code === "FL" ||
        command.code === "CW" ||
        command.code === "SZ"
      ) {
        processJobCommand(
          command,
          state,
          renderLimits,
          localSemanticDiagnostics
        );
      }
    }
    jobDiagnostics.push(
      ...localSemanticDiagnostics.map((diagnostic) => ({
        ...diagnostic,
        labelIndex: currentLabelIndex,
      }))
    );
    const formatDiagnostics: ZplDiagnostic[] = [];
    if (storeFormat(item, state, renderLimits, formatDiagnostics)) {
      jobDiagnostics.push(
        ...formatDiagnostics.map((diagnostic) => ({
          ...diagnostic,
          labelIndex: currentLabelIndex,
        }))
      );
      continue;
    }

    const expansionDiagnostics: ZplDiagnostic[] = [];
    const expanded = expandFormats(
      item,
      state,
      renderLimits.maxTemplateDepth,
      renderLimits.maxExpandedCommands,
      expansionDiagnostics
    );
    jobDiagnostics.push(
      ...expansionDiagnostics.map((diagnostic) => ({
        ...diagnostic,
        labelIndex: currentLabelIndex,
      }))
    );
    const plan = printQuantity(expanded);
    const available = Math.max(0, renderLimits.maxLabels - generatedLabels);
    const quantity = Math.min(plan.quantity, available);
    if (quantity < plan.quantity) {
      jobDiagnostics.push({
        ...semanticDiagnostic(
          "LABEL_QUANTITY_LIMIT_EXCEEDED",
          `^PQ requested ${plan.quantity} labels, exceeding the ${renderLimits.maxLabels}-label job limit.`,
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
      const dynamic = dynamicLabel(
        expanded,
        state,
        options,
        serialStep,
        labelStart,
        copyIndex === quantity - 1
      );
      const inherited = withPersistentState(dynamic, state);
      const labelDocument: ZplDocument = {
        kind: "document",
        source: document.source,
        profile: document.profile,
        items: [inherited],
        labels: [inherited],
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

      const imageSave = [...inherited.commands]
        .reverse()
        .find((command) => command.code === "IS");
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

      const mapClear = [...inherited.commands]
        .reverse()
        .find((command) => command.code === "MC");
      if (
        normalizedRendered[0] &&
        (mapClear?.parameters[0]?.trim().toUpperCase() || "Y") === "N"
      ) {
        state.retainedRaster = cloneRaster(normalizedRendered[0].raster);
      } else {
        state.retainedRaster = undefined;
      }
      generatedLabels++;
    }
    updatePersistentState(expanded, state);
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
