import type * as Monaco from "monaco-editor";
import {
  findCommandAtOffset,
  parseDocument,
  type CommandCapability,
  type SourceSpan,
  type ZplCommandNode,
  type ZplSyntaxState,
} from "../src/index.web";
import {
  zplCommandDefinitions,
  zplLanguageCoverage,
  type ZplCommandDefinition,
  type ZplCommandSignature,
  type ZplParameterDefinition,
} from "./zplCommandMetadata.generated";

export { zplCommandDefinitions, zplLanguageCoverage };

const commandDefinitionMap: Readonly<Record<string, ZplCommandDefinition>> = zplCommandDefinitions;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function localizeZpl(value: string, syntax: ZplSyntaxState): string {
  return value
    .replace(/\^(?=(?:A@|[A-Z0-9]{1,2}))/g, syntax.formatPrefix)
    .replace(/~(?=[A-Z0-9]{2})/g, syntax.controlPrefix)
    .replaceAll(",", syntax.delimiter);
}

function syntaxAtOffset(model: Monaco.editor.ITextModel, offset: number): ZplSyntaxState {
  return parseDocument(model.getValue().slice(0, offset)).syntax;
}

function commandPattern(
  capabilities: readonly CommandCapability[],
  predicate: (capability: CommandCapability) => boolean
): RegExp {
  const alternatives = capabilities
    .filter(predicate)
    .map(({ canonical }) => escapeRegExp(canonical))
    .sort((left, right) => right.length - left.length || left.localeCompare(right));
  return alternatives.length > 0 ? new RegExp(`(?:${alternatives.join("|")})`) : /(?!)$/;
}

function commandAt(model: Monaco.editor.ITextModel, position: Monaco.Position): ZplCommandNode | undefined {
  const offset = model.getOffsetAt(position);
  const document = parseDocument(model.getValue());
  return findCommandAtOffset(document, Math.min(offset, Math.max(0, model.getValueLength() - 1)));
}

function rangeForSpan(
  monaco: typeof Monaco,
  model: Monaco.editor.ITextModel,
  span: { start: number; end: number }
): Monaco.Range {
  const start = model.getPositionAt(span.start);
  const end = model.getPositionAt(span.end);
  return new monaco.Range(start.lineNumber, start.column, end.lineNumber, end.column);
}

function flattenCommands(source: string): ZplCommandNode[] {
  return parseDocument(source).items
    .flatMap((item) => (item.kind === "label" ? item.commands : [item]))
    .sort((left, right) => left.span.start - right.span.start);
}

function editDistance(left: string, right: string): number {
  const rows = Array.from({ length: left.length + 1 }, (_, row) => {
    const values = new Array<number>(right.length + 1).fill(0);
    values[0] = row;
    return values;
  });
  for (let column = 0; column <= right.length; column++) rows[0]![column] = column;
  for (let row = 1; row <= left.length; row++) {
    for (let column = 1; column <= right.length; column++) {
      const substitution = rows[row - 1]![column - 1]! + (left[row - 1] === right[column - 1] ? 0 : 1);
      rows[row]![column] = Math.min(
        rows[row - 1]![column]! + 1,
        rows[row]![column - 1]! + 1,
        substitution,
      );
      if (row > 1 && column > 1 && left[row - 1] === right[column - 2] && left[row - 2] === right[column - 1]) {
        rows[row]![column] = Math.min(rows[row]![column]!, rows[row - 2]![column - 2]! + 1);
      }
    }
  }
  return rows[left.length]![right.length]!;
}

export function suggestZplCommands(
  command: string,
  capabilities: readonly CommandCapability[],
  limit = 3,
): CommandCapability[] {
  const normalized = command.trim().toUpperCase();
  const prefix = normalized[0];
  const code = normalized.slice(1);
  return capabilities
    .map((capability) => {
      const literalDistance = editDistance(code, capability.code);
      const visualDistance = editDistance(code.replaceAll("0", "O"), capability.code.replaceAll("0", "O"));
      return {
        capability,
        distance: Math.min(literalDistance, visualDistance + 0.05),
        prefixPenalty: capability.prefix === prefix ? 0 : 0.35,
        statusPenalty: capability.status === "supported" ? 0 : capability.status === "partial" ? 0.05 : 0.1,
      };
    })
    .filter(({ distance }) => distance <= Math.max(1, Math.min(2, code.length)))
    .sort((left, right) =>
      left.distance + left.prefixPenalty + left.statusPenalty - (right.distance + right.prefixPenalty + right.statusPenalty) ||
      left.capability.canonical.localeCompare(right.capability.canonical)
    )
    .slice(0, limit)
    .map(({ capability }) => capability);
}

interface ResourceRule {
  parameter: number;
  definitions: readonly string[];
}

const resourceReferences: Readonly<Record<string, ResourceRule>> = {
  "^XF": { parameter: 0, definitions: ["^DF"] },
  "^XG": { parameter: 0, definitions: ["~DG", "~DY", "^IS"] },
  "^IL": { parameter: 0, definitions: ["~DG", "~DY", "^IS"] },
  "^IM": { parameter: 0, definitions: ["~DG", "~DY", "^IS"] },
  "^A@": { parameter: 3, definitions: ["~DT", "~DU", "~DY"] },
  "^CW": { parameter: 1, definitions: ["~DT", "~DU", "~DY"] },
  "^SE": { parameter: 0, definitions: ["~DE"] },
};

function normalizedResourceName(value: string | undefined): string {
  return (value ?? "").trim().replace(/^['"]|['"]$/g, "").toUpperCase();
}

function withoutDevice(value: string): string {
  return value.replace(/^[A-Z0-9]:/, "");
}

function sameResource(left: string, right: string): boolean {
  return left === right || withoutDevice(left) === withoutDevice(right);
}

function resourceIdentity(command: ZplCommandNode): { name: string; definitions: readonly string[]; declaration: boolean } | undefined {
  const reference = resourceReferences[command.canonical];
  if (reference) {
    const name = normalizedResourceName(command.parameters[reference.parameter]);
    return name ? { name, definitions: reference.definitions, declaration: false } : undefined;
  }
  const referenceRules = Object.values(resourceReferences);
  if (!referenceRules.some(({ definitions }) => definitions.includes(command.canonical))) return undefined;
  const name = normalizedResourceName(command.parameters[0]);
  return name ? { name, definitions: [command.canonical], declaration: true } : undefined;
}

function resourceParameterIndex(command: ZplCommandNode): number {
  return resourceReferences[command.canonical]?.parameter ?? 0;
}

function parameterSpan(command: ZplCommandNode, parameterIndex: number): SourceSpan | undefined {
  const value = command.parameters[parameterIndex];
  if (value === undefined) return undefined;
  let start = command.span.end - command.rawParameters.length;
  for (let index = 0; index < parameterIndex; index++) {
    start += (command.parameters[index]?.length ?? 0) + command.delimiter.length;
  }
  return { start, end: start + value.length };
}

export interface ZplResourceNavigation {
  name: string;
  reference: SourceSpan;
  definition: SourceSpan;
}

function relatedResourceCommands(
  commands: readonly ZplCommandNode[],
  name: string,
  declarationKinds: readonly string[],
  includeDeclaration: boolean,
): ZplCommandNode[] {
  return commands.filter((command) => {
    const commandIdentity = resourceIdentity(command);
    if (!commandIdentity || !sameResource(name, commandIdentity.name)) return false;
    const isDeclaration = declarationKinds.includes(command.canonical);
    if (isDeclaration) return includeDeclaration;
    return resourceReferences[command.canonical]?.definitions.some((definition) => declarationKinds.includes(definition)) ?? false;
  });
}

export function findZplResourceDefinition(source: string, offset: number): ZplResourceNavigation | undefined {
  const commands = flattenCommands(source);
  const selected = findCommandAtOffset(parseDocument(source), Math.max(0, Math.min(offset, source.length - 1)));
  if (!selected) return undefined;
  const identity = resourceIdentity(selected);
  if (!identity || identity.declaration) return undefined;
  const candidates = commands.filter((command) =>
    identity.definitions.includes(command.canonical) &&
    sameResource(identity.name, normalizedResourceName(command.parameters[0]))
  );
  const definition = candidates.sort((left, right) => {
    const leftAfter = left.span.start > selected.span.start ? 1 : 0;
    const rightAfter = right.span.start > selected.span.start ? 1 : 0;
    return leftAfter - rightAfter || Math.abs(left.span.start - selected.span.start) - Math.abs(right.span.start - selected.span.start);
  })[0];
  return definition ? { name: identity.name, reference: selected.span, definition: definition.span } : undefined;
}

export function findZplResourceReferences(source: string, offset: number, includeDeclaration = false): SourceSpan[] {
  const commands = flattenCommands(source);
  const selected = findCommandAtOffset(parseDocument(source), Math.max(0, Math.min(offset, source.length - 1)));
  if (!selected) return [];
  const identity = resourceIdentity(selected);
  if (!identity) return [];
  const declarationKinds = identity.declaration ? identity.definitions : resourceReferences[selected.canonical]!.definitions;
  return relatedResourceCommands(commands, identity.name, declarationKinds, includeDeclaration).map(({ span }) => span);
}

export function formatZpl(source: string): string {
  const commands = flattenCommands(source);
  if (commands.length === 0) return source;

  // These commands consume arbitrary payload text until the next command.
  // Inserting a formatting newline after them would change field data, a
  // comment, or downloaded bytes, so the next command remains adjacent.
  const payloadCommands = new Set([
    "^FD", "^FV", "^FX", "^GF",
    "~DB", "~DE", "~DG", "~DS", "~DT", "~DU", "~DY",
  ]);
  let formatted = "";
  let previousEnd = 0;
  for (const command of commands) {
    const unparsed = source.slice(previousEnd, command.span.start);
    if (unparsed.trim()) {
      formatted += unparsed;
      if (!formatted.endsWith("\n")) formatted += "\n";
    }
    if (command.canonical === "^XA" && formatted.trim() && !formatted.endsWith("\n\n")) {
      formatted += formatted.endsWith("\n") ? "\n" : "\n\n";
    }

    const raw = source.slice(command.span.start, command.span.end);
    // For ordinary parameter lists, remove only line-break separators that
    // were already between commands. Spaces and all payload bytes stay exact.
    formatted += payloadCommands.has(command.canonical)
      ? raw
      : raw.replace(/(?:\r?\n[\t ]*)+$/g, "");

    if (!payloadCommands.has(command.canonical) && !formatted.endsWith("\n")) {
      formatted += "\n";
    }
    if (command.canonical === "^XZ" && !formatted.endsWith("\n\n")) {
      formatted += "\n";
    }
    previousEnd = command.span.end;
  }
  const remainder = source.slice(previousEnd);
  if (remainder.trim()) formatted += remainder;
  return `${formatted.replace(/[\r\n]+$/g, "")}\n`;
}

export function getZplCommandDefinition(command: string): ZplCommandDefinition | undefined {
  const normalized = command.trim().toUpperCase();
  return commandDefinitionMap[normalized];
}

function signatureDiscriminator(command: string, signature: ZplCommandSignature): string {
  const firstParameterStart = signature.parameters
    .map(({ syntaxStart }) => syntaxStart)
    .filter((offset): offset is number => typeof offset === "number")
    .sort((left, right) => left - right)[0] ?? signature.syntax.length;
  return signature.syntax.slice(command.length, firstParameterStart);
}

function signatureForCommand(command: ZplCommandNode): ZplCommandSignature | undefined {
  const definition = getZplCommandDefinition(command.canonical);
  if (!definition) return undefined;
  if (definition.signatures.length === 1) return definition.signatures[0];
  const normalizedParameters = command.rawParameters.replaceAll(command.delimiter, ",");
  return definition.signatures.find((signature) =>
    normalizedParameters.startsWith(signatureDiscriminator(command.canonical, signature))
  ) ?? definition.signatures[0];
}

function commandDisplayLabel(command: string, signature: ZplCommandSignature): string {
  const firstParameterStart = signature.parameters
    .map(({ syntaxStart }) => syntaxStart)
    .filter((offset): offset is number => typeof offset === "number")
    .sort((left, right) => left - right)[0] ?? signature.syntax.length;
  return signature.syntax.slice(0, firstParameterStart).replace(/[,.:"']+$/g, "") || command;
}

function slotBounds(rawParameters: string, delimiter: string, slot: number): { start: number; end: number } {
  let currentSlot = 0;
  let start = 0;
  for (let index = 0; index < rawParameters.length; index++) {
    if (rawParameters[index] !== delimiter) continue;
    if (currentSlot === slot) return { start, end: index };
    currentSlot += 1;
    start = index + delimiter.length;
  }
  return currentSlot === slot
    ? { start, end: rawParameters.length }
    : { start: rawParameters.length, end: rawParameters.length };
}

function parametersInSlot(signature: ZplCommandSignature, slot: number): ZplParameterDefinition[] {
  return signature.parameters
    .filter((parameter) => parameter.slot === slot)
    .sort((left, right) => left.component - right.component);
}

function editableRawParameters(command: ZplCommandNode): string {
  return command.rawParameters.replace(/(?:\r?\n[\t ]*)+$/g, "");
}

function componentBounds(
  command: ZplCommandNode,
  signature: ZplCommandSignature,
  parameter: ZplParameterDefinition,
): { start: number; end: number } {
  const rawParameters = editableRawParameters(command);
  const bounds = slotBounds(rawParameters, command.delimiter, parameter.slot);
  const segment = rawParameters.slice(bounds.start, bounds.end);
  const parameters = parametersInSlot(signature, parameter.slot);
  const targetIndex = Math.max(0, parameters.findIndex((candidate) => candidate === parameter));
  let start = 0;

  for (let index = 1; index <= targetIndex; index++) {
    const previous = parameters[index - 1]!;
    const current = parameters[index]!;
    const separator = typeof previous.syntaxEnd === "number" && typeof current.syntaxStart === "number"
      ? signature.syntax.slice(previous.syntaxEnd, current.syntaxStart)
      : "";
    if (separator) {
      const separatorIndex = segment.indexOf(separator, start);
      start = separatorIndex >= 0 ? separatorIndex + separator.length : segment.length;
    } else {
      // Adjacent formal parameters (notably ^A font + orientation) are
      // single-character selectors before the first delimiter.
      start = Math.min(segment.length, start + 1);
    }
  }

  let end = segment.length;
  const next = parameters[targetIndex + 1];
  if (next) {
    const separator = typeof parameter.syntaxEnd === "number" && typeof next.syntaxStart === "number"
      ? signature.syntax.slice(parameter.syntaxEnd, next.syntaxStart)
      : "";
    if (separator) {
      const separatorIndex = segment.indexOf(separator, start);
      if (separatorIndex >= 0) end = separatorIndex;
    } else {
      end = Math.min(segment.length, start + 1);
    }
  } else if (typeof parameter.syntaxEnd === "number") {
    const commaIndex = signature.syntax.indexOf(",", parameter.syntaxEnd);
    const slotSyntaxEnd = commaIndex >= 0 ? commaIndex : signature.syntax.length;
    const trailingLiteral = signature.syntax.slice(parameter.syntaxEnd, slotSyntaxEnd);
    if (trailingLiteral) {
      const trailingIndex = segment.indexOf(trailingLiteral, start);
      if (trailingIndex >= 0) end = trailingIndex;
    }
  }
  return { start: bounds.start + start, end: bounds.start + Math.max(start, end) };
}

export interface ZplParameterContext {
  command: ZplCommandNode;
  definition: ZplCommandDefinition;
  signature: ZplCommandSignature;
  parameter: ZplParameterDefinition;
  parameterIndex: number;
  value: string;
  span: SourceSpan;
}

export function findZplParameterContext(source: string, offset: number): ZplParameterContext | undefined {
  if (!source) return undefined;
  const boundedOffset = Math.max(0, Math.min(offset, source.length));
  const lookupOffset = Math.max(0, Math.min(source.length - 1, boundedOffset === source.length ? boundedOffset - 1 : boundedOffset));
  const document = parseDocument(source);
  const command = findCommandAtOffset(document, lookupOffset)
    ?? (boundedOffset > 0 ? findCommandAtOffset(document, boundedOffset - 1) : undefined);
  if (!command) return undefined;
  const definition = getZplCommandDefinition(command.canonical);
  const signature = signatureForCommand(command);
  if (!definition || !signature || signature.parameters.length === 0) return undefined;
  const rawStart = command.span.end - command.rawParameters.length;
  if (boundedOffset < rawStart || boundedOffset > command.span.end) return undefined;

  const beforeCursor = source.slice(rawStart, boundedOffset);
  const activeSlot = [...beforeCursor].filter((character) => character === command.delimiter).length;
  const candidates = parametersInSlot(signature, activeSlot);
  if (candidates.length === 0) return undefined;
  const slot = slotBounds(editableRawParameters(command), command.delimiter, activeSlot);
  const cursorInSegment = Math.max(0, Math.min(slot.end - slot.start, boundedOffset - rawStart - slot.start));
  const candidateBounds = candidates.map((candidate) => ({
    candidate,
    bounds: componentBounds(command, signature, candidate),
  }));
  const exact = candidateBounds.find(({ bounds }) => {
    const start = bounds.start - slot.start;
    const end = bounds.end - slot.start;
    return start === end ? cursorInSegment === start : cursorInSegment >= start && cursorInSegment < end;
  });
  const parameter = exact?.candidate ?? [...candidateBounds]
    .reverse()
    .find(({ bounds }) => bounds.end - slot.start <= cursorInSegment)?.candidate ?? candidates[0]!;
  const relativeSpan = componentBounds(command, signature, parameter);
  const span = { start: rawStart + relativeSpan.start, end: rawStart + relativeSpan.end };
  return {
    command,
    definition,
    signature,
    parameter,
    parameterIndex: signature.parameters.indexOf(parameter),
    value: source.slice(span.start, span.end),
    span,
  };
}

export type ZplLanguageDiagnosticCode =
  | "INVALID_PARAMETER_VALUE"
  | "PARAMETER_OUT_OF_RANGE"
  | "MISSING_REQUIRED_PARAMETER"
  | "EXTRA_PARAMETER";

export interface ZplLanguageDiagnostic {
  code: ZplLanguageDiagnosticCode;
  severity: "warning" | "error";
  message: string;
  command: string;
  parameter?: string;
  choices?: readonly string[];
  span: SourceSpan;
}

const payloadParameterCommands = new Set([
  "^FD", "^FV", "^FX", "^GF",
  "~DB", "~DE", "~DG", "~DS", "~DT", "~DU", "~DY",
]);

export function validateZplParameters(source: string): ZplLanguageDiagnostic[] {
  const diagnostics: ZplLanguageDiagnostic[] = [];
  for (const command of flattenCommands(source)) {
    const signature = signatureForCommand(command);
    if (!signature || signature.parameters.length === 0 || payloadParameterCommands.has(command.canonical)) continue;
    const rawStart = command.span.end - command.rawParameters.length;
    const maxSlot = Math.max(...signature.parameters.map(({ slot }) => slot));
    const repeatable = signature.parameters.some(({ repeatable: value }) => value);
    if (!repeatable && command.parameters.length > maxSlot + 1) {
      const extra = parameterSpan(command, maxSlot + 1) ?? { start: command.span.end, end: command.span.end };
      diagnostics.push({
        code: "EXTRA_PARAMETER",
        severity: "warning",
        command: command.canonical,
        message: `${command.canonical} accepts ${maxSlot + 1} delimited parameter slot${maxSlot === 0 ? "" : "s"}.`,
        span: extra,
      });
    }

    for (const parameter of signature.parameters) {
      const relative = componentBounds(command, signature, parameter);
      const span = { start: rawStart + relative.start, end: rawStart + relative.end };
      const value = source.slice(span.start, span.end).trim();
      if (!value) {
        if (parameter.required && parameter.slot >= command.parameters.length) {
          diagnostics.push({
            code: "MISSING_REQUIRED_PARAMETER",
            severity: "warning",
            command: command.canonical,
            parameter: parameter.name,
            choices: parameter.choices,
            message: `${command.canonical} requires ${parameter.name}.`,
            span: { start: command.span.end, end: command.span.end },
          });
        }
        continue;
      }
      if (parameter.enumValues?.length && !parameter.enumValues.some((candidate) => candidate.toUpperCase() === value.toUpperCase())) {
        diagnostics.push({
          code: "INVALID_PARAMETER_VALUE",
          severity: "warning",
          command: command.canonical,
          parameter: parameter.name,
          choices: parameter.enumValues,
          message: `${value} is not a documented value for ${command.canonical} ${parameter.name}. Expected ${parameter.enumValues.join(", ")}.`,
          span,
        });
        continue;
      }
      if (
        parameter.range &&
        /^[-+]?\d+(?:\.\d+)?$/.test(value) &&
        !parameter.choices.some((choice) => choice.toUpperCase() === value.toUpperCase())
      ) {
        const numericValue = Number(value);
        if (numericValue < parameter.range.min || numericValue > parameter.range.max) {
          diagnostics.push({
            code: "PARAMETER_OUT_OF_RANGE",
            severity: "warning",
            command: command.canonical,
            parameter: parameter.name,
            choices: parameter.choices,
            message: `${command.canonical} ${parameter.name} must be between ${parameter.range.min} and ${parameter.range.max}.`,
            span,
          });
        }
      }
    }
  }
  return diagnostics;
}

export function configureZplLanguage(
  monaco: typeof Monaco,
  capabilities: readonly CommandCapability[]
): Monaco.IDisposable {
  const disposables: Monaco.IDisposable[] = [];
  const category = (name: CommandCapability["category"]) =>
    commandPattern(capabilities, (capability) => capability.category === name);

  disposables.push(
    monaco.languages.setLanguageConfiguration("zpl", {
      wordPattern: /(?:\^|~)[A-Za-z0-9@]{1,2}|[^\s\^~,]+/g,
      comments: { lineComment: "^FX" },
      folding: { markers: { start: /\^XA\b/, end: /\^XZ\b/ } },
    }),
    monaco.languages.setMonarchTokensProvider("zpl", {
      defaultToken: "",
      tokenPostfix: ".zpl",
      ignoreCase: true,
      tokenizer: {
        root: [
          [/\^FX/, { token: "comment", next: "@comment" }],
          [/\^FD/, { token: "keyword.field", next: "@fieldData" }],
          [category("barcode"), "keyword.barcode"],
          [category("text"), "keyword.font"],
          [category("graphic"), "keyword.graphic"],
          [category("storage"), "keyword.storage"],
          [category("network"), "keyword.network"],
          [category("rfid"), "keyword.rfid"],
          [commandPattern(capabilities, ({ category: name }) => name === "format" || name === "printer"), "keyword.control"],
          [/[+-]?\d+(?:\.\d+)?/, "number"],
          [/,/, "delimiter"],
          [/[YNIRBLCA](?=,|\^|~|$)/, "constant"],
          [/[a-zA-Z_$][\w$]*/, "identifier"],
        ],
        comment: [
          [/[^\^~]+/, "comment"],
          [/[\^~]/, { token: "@rematch", next: "@pop" }],
        ],
        fieldData: [
          [/_[0-9A-Fa-f]{2}/, "string.escape"],
          [/[^\^~]+/, "string"],
          [/[\^~]/, { token: "@rematch", next: "@pop" }],
        ],
      },
    })
  );

  disposables.push(
    monaco.languages.registerCompletionItemProvider("zpl", {
      triggerCharacters: ["^", "~", "!", "#", "$", "%", "@", ",", ":", "."],
      provideCompletionItems(model, position) {
        const offset = model.getOffsetAt(position);
        const syntax = syntaxAtOffset(model, offset);
        const parameterContext = findZplParameterContext(model.getValue(), offset);
        if (parameterContext) {
          const range = rangeForSpan(monaco, model, parameterContext.span);
          return {
            suggestions: parameterContext.parameter.choices.map((choice, index) => ({
              label: choice,
              kind: monaco.languages.CompletionItemKind.Value,
              detail: `${parameterContext.command.canonical} · ${parameterContext.parameter.name}`,
              documentation: {
                value: parameterContext.parameter.documentation,
                isTrusted: false,
              },
              insertText: choice,
              filterText: `${choice} ${parameterContext.parameter.name}`,
              sortText: String(index).padStart(3, "0"),
              range,
            })),
          };
        }
        const before = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });
        const activePrefixPattern = [syntax.formatPrefix, syntax.controlPrefix]
          .map(escapeRegExp)
          .join("|");
        const fragment = before.match(new RegExp(`(?:${activePrefixPattern})[A-Za-z0-9@]{0,2}$`))?.[0] ?? "";
        if (!fragment && before.match(/[^\s]$/)) return { suggestions: [] };
        const wordStart = Math.max(1, position.column - fragment.length);
        const range = new monaco.Range(position.lineNumber, wordStart, position.lineNumber, position.column);
        return {
          suggestions: capabilities.flatMap((capability) => {
            const metadata = getZplCommandDefinition(capability.canonical);
            const limitations = capability.limitations?.join(" ");
            const signatures = metadata?.signatures ?? [{
              syntax: capability.canonical,
              snippet: capability.canonical,
              parameters: [],
            } satisfies ZplCommandSignature];
            return signatures.map((signature, signatureIndex) => {
              const displayLabel = commandDisplayLabel(capability.canonical, signature);
              const localizedLabel = localizeZpl(displayLabel, syntax);
              const localizedSyntax = localizeZpl(signature.syntax, syntax);
              const title = metadata?.title ?? capability.name;
              return {
                label: localizedLabel === displayLabel
                  ? displayLabel
                  : { label: localizedLabel, description: displayLabel },
                kind:
                  capability.category === "barcode"
                    ? monaco.languages.CompletionItemKind.Struct
                    : capability.category === "graphic"
                      ? monaco.languages.CompletionItemKind.Color
                      : monaco.languages.CompletionItemKind.Keyword,
                detail: `${title}${signature.label ? ` · ${signature.label}` : ""} · ${capability.status}`,
                documentation: {
                  value: [
                    `**${localizedSyntax}**`,
                    metadata?.summary ?? capability.name,
                    signature.parameters.length
                      ? signature.parameters.map(({ key, name }) => `- \`${key}\` — ${name}`).join("\n")
                      : "No parameters.",
                    limitations,
                  ].filter(Boolean).join("\n\n"),
                  isTrusted: false,
                },
                insertText: localizeZpl(signature.snippet, syntax),
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                filterText: [
                  capability.canonical,
                  displayLabel,
                  title,
                  metadata?.summary,
                  ...signature.parameters.map(({ name }) => name),
                ].filter(Boolean).join(" "),
                sortText: `${capability.status === "supported" ? "0" : capability.status === "partial" ? "1" : "2"}-${capability.canonical}-${signatureIndex}`,
                range,
                tags: capability.status === "unsupported"
                  ? [monaco.languages.CompletionItemTag.Deprecated]
                  : undefined,
              };
            });
          }),
        };
      },
    })
  );

  const capabilityMap = new Map(capabilities.map((capability) => [capability.canonical, capability]));
  disposables.push(
    monaco.languages.registerHoverProvider("zpl", {
      provideHover(model, position) {
        const command = commandAt(model, position);
        if (!command) return null;
        const capability = capabilityMap.get(command.canonical);
        if (!capability) return null;
        const metadata = getZplCommandDefinition(capability.canonical);
        const signature = signatureForCommand(command);
        if (!metadata || !signature) return null;
        const parameterContext = findZplParameterContext(model.getValue(), model.getOffsetAt(position));
        const commandSyntax: ZplSyntaxState = {
          formatPrefix: command.prefixKind === "format" ? command.prefix : "^",
          controlPrefix: command.prefixKind === "control" ? command.prefix : "~",
          delimiter: command.delimiter,
        };
        const contents: Monaco.IMarkdownString[] = [
          { value: `\`${localizeZpl(signature.syntax, commandSyntax)}\`` },
          { value: `**${metadata.title}**  \n${metadata.summary}` },
          { value: `${capability.category} · ${capability.scope} scope · **${capability.status}**` },
        ];
        if (parameterContext?.command.span.start === command.span.start) {
          contents.push({
            value: [
              `**Parameter ${parameterContext.parameterIndex + 1}: ${parameterContext.parameter.name}** (\`${parameterContext.parameter.key}\`)`,
              parameterContext.parameter.documentation,
              `Suggestions: ${parameterContext.parameter.choices.map((choice) => `\`${choice}\``).join(", ")}`,
            ].join("  \n\n"),
          });
        } else if (signature.parameters.length) {
          contents.push({
            value: signature.parameters.map((parameter, index) =>
              `${index + 1}. \`${parameter.key}\` — **${parameter.name}**${parameter.required ? " *(required)*" : ""}`
            ).join("  \n"),
          });
        } else {
          contents.push({ value: "No parameters." });
        }
        if (metadata.signatures.length > 1) {
          contents.push({
            value: `Available forms: ${metadata.signatures.map((candidate) => `\`${localizeZpl(candidate.syntax, commandSyntax)}\``).join(", ")}`,
          });
        }
        if (capability.limitations?.length) {
          contents.push({ value: `$(warning) ${capability.limitations.join(" ")}` });
        }
        contents.push({ value: `[Open the official ZPL command reference](${metadata.reference})`, isTrusted: true });
        const hoverSpan = parameterContext?.command.span.start === command.span.start && parameterContext.span.end > parameterContext.span.start
          ? parameterContext.span
          : { start: command.span.start, end: command.span.start + command.prefix.length + command.code.length };
        return { range: rangeForSpan(monaco, model, hoverSpan), contents };
      },
    })
  );

  disposables.push(
    monaco.languages.registerDefinitionProvider("zpl", {
      provideDefinition(model, position) {
        const selected = commandAt(model, position);
        const identity = selected && resourceIdentity(selected);
        if (!selected || !identity || identity.declaration) return null;
        return monaco.editor.getModels()
          .filter((workspaceModel) => workspaceModel.getLanguageId() === "zpl")
          .flatMap((workspaceModel) => flattenCommands(workspaceModel.getValue())
            .filter((command) =>
              identity.definitions.includes(command.canonical) &&
              sameResource(identity.name, normalizedResourceName(command.parameters[0]))
            )
            .map((command) => ({ uri: workspaceModel.uri, range: rangeForSpan(monaco, workspaceModel, command.span) })))
          .sort((left, right) => Number(left.uri.toString() !== model.uri.toString()) - Number(right.uri.toString() !== model.uri.toString()));
      },
    }),
    monaco.languages.registerReferenceProvider("zpl", {
      provideReferences(model, position, context) {
        const selected = commandAt(model, position);
        const identity = selected && resourceIdentity(selected);
        if (!selected || !identity) return [];
        const declarationKinds = identity.declaration ? identity.definitions : resourceReferences[selected.canonical]!.definitions;
        return monaco.editor.getModels()
          .filter((workspaceModel) => workspaceModel.getLanguageId() === "zpl")
          .flatMap((workspaceModel) => relatedResourceCommands(
            flattenCommands(workspaceModel.getValue()),
            identity.name,
            declarationKinds,
            context.includeDeclaration,
          ).map((command) => ({ uri: workspaceModel.uri, range: rangeForSpan(monaco, workspaceModel, command.span) })));
      },
    }),
    monaco.languages.registerRenameProvider("zpl", {
      resolveRenameLocation(model, position) {
        const command = commandAt(model, position);
        const identity = command && resourceIdentity(command);
        const span = command && identity ? parameterSpan(command, resourceParameterIndex(command)) : undefined;
        if (!command || !identity || !span) return { range: new monaco.Range(1, 1, 1, 1), text: "", rejectReason: "Place the cursor on a stored ZPL resource name." };
        return { range: rangeForSpan(monaco, model, span), text: model.getValueInRange(rangeForSpan(monaco, model, span)) };
      },
      provideRenameEdits(model, position, newName) {
        if (!newName.trim() || /[\^~\r\n]/.test(newName)) return { edits: [], rejectReason: "Enter a valid ZPL resource name." };
        const selected = commandAt(model, position);
        const identity = selected && resourceIdentity(selected);
        if (!selected || !identity) return { edits: [], rejectReason: "No stored ZPL resource was found at this position." };
        const declarationKinds = identity.declaration ? identity.definitions : resourceReferences[selected.canonical]!.definitions;
        const workspaceModels = monaco.editor.getModels().filter((workspaceModel) => workspaceModel.getLanguageId() === "zpl");
        return {
          edits: workspaceModels.flatMap((workspaceModel) => relatedResourceCommands(
            flattenCommands(workspaceModel.getValue()),
            identity.name,
            declarationKinds,
            true,
          ).flatMap((command) => {
            const resourceSpan = parameterSpan(command, resourceParameterIndex(command));
            return resourceSpan ? [{
              resource: workspaceModel.uri,
              textEdit: { range: rangeForSpan(monaco, workspaceModel, resourceSpan), text: newName.trim() },
              versionId: workspaceModel.getVersionId(),
            }] : [];
          })),
        };
      },
    })
  );

  disposables.push(
    monaco.languages.registerSignatureHelpProvider("zpl", {
      signatureHelpTriggerCharacters: [",", ";", "|", ":", "."],
      signatureHelpRetriggerCharacters: [",", ";", "|", ":", "."],
      provideSignatureHelp(model, position) {
        const command = commandAt(model, position);
        const metadata = command && getZplCommandDefinition(command.canonical);
        const selectedSignature = command && signatureForCommand(command);
        if (!command || !metadata || !selectedSignature || selectedSignature.parameters.length === 0) return null;
        const parameterContext = findZplParameterContext(model.getValue(), model.getOffsetAt(position));
        const activeSignature = Math.max(0, metadata.signatures.indexOf(selectedSignature));
        const commandSyntax: ZplSyntaxState = {
          formatPrefix: command.prefixKind === "format" ? command.prefix : "^",
          controlPrefix: command.prefixKind === "control" ? command.prefix : "~",
          delimiter: command.delimiter,
        };
        return {
          value: {
            activeParameter: parameterContext?.parameterIndex ?? 0,
            activeSignature,
            signatures: metadata.signatures.map((signature) => ({
              label: localizeZpl(signature.syntax, commandSyntax),
              documentation: {
                value: [
                  `**${metadata.title}**`,
                  signature.label,
                  metadata.summary,
                ].filter(Boolean).join(" — "),
                isTrusted: false,
              },
              parameters: signature.parameters.map((parameter) => ({
                label: typeof parameter.syntaxStart === "number" && typeof parameter.syntaxEnd === "number"
                  ? [parameter.syntaxStart, parameter.syntaxEnd] as [number, number]
                  : parameter.key,
                documentation: {
                  value: parameter.documentation,
                  isTrusted: false,
                },
              })),
            })),
          },
          dispose() {},
        };
      },
    })
  );

  disposables.push(
    monaco.languages.registerInlayHintsProvider("zpl", {
      displayName: "ZPL parameter names",
      provideInlayHints(model, requestedRange) {
        const source = model.getValue();
        const requestedStart = model.getOffsetAt(requestedRange.getStartPosition());
        const requestedEnd = model.getOffsetAt(requestedRange.getEndPosition());
        const hints: Monaco.languages.InlayHint[] = [];
        for (const command of flattenCommands(source)) {
          if (command.span.end < requestedStart || command.span.start > requestedEnd) continue;
          const signature = signatureForCommand(command);
          if (!signature || payloadParameterCommands.has(command.canonical)) continue;
          const rawStart = command.span.end - command.rawParameters.length;
          for (const parameter of signature.parameters) {
            const relative = componentBounds(command, signature, parameter);
            const span = { start: rawStart + relative.start, end: rawStart + relative.end };
            if (span.start === span.end || !source.slice(span.start, span.end).trim()) continue;
            hints.push({
              kind: monaco.languages.InlayHintKind.Parameter,
              position: model.getPositionAt(span.start),
              label: `${parameter.key}:`,
              tooltip: {
                value: `**${parameter.name}**  \n${parameter.documentation}`,
                isTrusted: false,
              },
              paddingRight: true,
            });
          }
        }
        return { hints, dispose() {} };
      },
    })
  );

  const semanticTokenTypes = [
    "zplFormat",
    "zplText",
    "zplBarcode",
    "zplGraphic",
    "zplStorage",
    "zplNetwork",
    "zplRfid",
    "zplPrinter",
  ] as const;
  const semanticLegend: Monaco.languages.SemanticTokensLegend = {
    tokenTypes: [...semanticTokenTypes],
    tokenModifiers: [],
  };
  const semanticTypeFor = (categoryName: CommandCapability["category"]): number => {
    if (categoryName === "format") return 0;
    if (categoryName === "text") return 1;
    if (categoryName === "barcode") return 2;
    if (categoryName === "graphic") return 3;
    if (categoryName === "storage") return 4;
    if (categoryName === "network") return 5;
    if (categoryName === "rfid") return 6;
    return 7;
  };
  disposables.push(
    monaco.languages.registerDocumentSemanticTokensProvider("zpl", {
      getLegend: () => semanticLegend,
      provideDocumentSemanticTokens(model) {
        const tokens = flattenCommands(model.getValue()).map((command) => {
          const position = model.getPositionAt(command.span.start);
          const capability = capabilityMap.get(command.canonical);
          return {
            line: position.lineNumber - 1,
            start: position.column - 1,
            length: command.prefixKind === "control-character" ? 1 : 1 + command.code.length,
            type: semanticTypeFor(capability?.category ?? "printer"),
          };
        }).sort((left, right) => left.line - right.line || left.start - right.start);
        const data = new Uint32Array(tokens.length * 5);
        let previousLine = 0;
        let previousStart = 0;
        tokens.forEach((token, index) => {
          const dataIndex = index * 5;
          const deltaLine = token.line - previousLine;
          data[dataIndex] = deltaLine;
          data[dataIndex + 1] = deltaLine === 0 ? token.start - previousStart : token.start;
          data[dataIndex + 2] = token.length;
          data[dataIndex + 3] = token.type;
          data[dataIndex + 4] = 0;
          previousLine = token.line;
          previousStart = token.start;
        });
        return { data };
      },
      releaseDocumentSemanticTokens() {},
    })
  );

  disposables.push(
    monaco.languages.registerDocumentSymbolProvider("zpl", {
      provideDocumentSymbols(model) {
        const document = parseDocument(model.getValue());
        return document.labels.map((label, index) => {
          const range = rangeForSpan(monaco, model, label.span);
          return {
            name: `Label ${index + 1}`,
            detail: `${label.commands.length} commands`,
            kind: monaco.languages.SymbolKind.Namespace,
            tags: [],
            range,
            selectionRange: label.commands[0]
              ? rangeForSpan(monaco, model, label.commands[0].span)
              : range,
            children: label.commands.map((command) => {
              const commandRange = rangeForSpan(monaco, model, command.span);
              return {
                name: command.canonical,
                detail: getZplCommandDefinition(command.canonical)?.title ?? capabilityMap.get(command.canonical)?.name ?? "ZPL command",
                kind: monaco.languages.SymbolKind.Function,
                tags: [],
                range: commandRange,
                selectionRange: commandRange,
                children: [],
              };
            }),
          };
        });
      },
    })
  );

  disposables.push(
    monaco.languages.registerFoldingRangeProvider("zpl", {
      provideFoldingRanges(model) {
        return parseDocument(model.getValue()).labels
          .map((label) => {
            const start = model.getPositionAt(label.span.start).lineNumber;
            const end = model.getPositionAt(label.span.end).lineNumber;
            return { start, end, kind: monaco.languages.FoldingRangeKind.Region };
          })
          .filter(({ start, end }) => end > start);
      },
    })
  );

  disposables.push(
    monaco.languages.registerCodeActionProvider("zpl", {
      provideCodeActions(model, _range, context) {
        const source = model.getValue();
        const parsed = parseDocument(source);
        const actions: Monaco.languages.CodeAction[] = [];
        const addEdit = (
          title: string,
          editRange: Monaco.IRange,
          text: string,
          marker: Monaco.editor.IMarkerData,
          isPreferred = false,
        ) => {
          actions.push({
            title,
            kind: "quickfix.zpl",
            diagnostics: [marker],
            isPreferred,
            edit: {
              edits: [{
                resource: model.uri,
                textEdit: { range: editRange, text },
                versionId: model.getVersionId(),
              }],
            },
          });
        };

        for (const marker of context.markers) {
          const code = typeof marker.code === "string" ? marker.code : marker.code?.value;
          const markerStart = model.getOffsetAt({ lineNumber: marker.startLineNumber, column: marker.startColumn });
          const command = findCommandAtOffset(parsed, Math.min(markerStart, Math.max(0, source.length - 1)));
          const languageDiagnostic = validateZplParameters(source).find((diagnostic) =>
            diagnostic.code === code && diagnostic.span.start === markerStart
          );

          if ((code === "INVALID_PARAMETER_VALUE" || code === "PARAMETER_OUT_OF_RANGE") && languageDiagnostic) {
            const editRange = rangeForSpan(monaco, model, languageDiagnostic.span);
            languageDiagnostic.choices?.forEach((choice, index) => {
              addEdit(
                `Change ${languageDiagnostic.parameter ?? "parameter"} to ${choice}`,
                editRange,
                choice,
                marker,
                index === 0,
              );
            });
          } else if (code === "EXTRA_PARAMETER" && languageDiagnostic && command) {
            const removeStart = languageDiagnostic.span.start > command.span.start && source[languageDiagnostic.span.start - 1] === command.delimiter
              ? languageDiagnostic.span.start - 1
              : languageDiagnostic.span.start;
            addEdit(
              `Remove extra ${command.canonical} parameter`,
              rangeForSpan(monaco, model, { start: removeStart, end: languageDiagnostic.span.end }),
              "",
              marker,
              true,
            );
          } else if (code === "MISSING_REQUIRED_PARAMETER" && languageDiagnostic && command) {
            const signature = signatureForCommand(command);
            const missing = signature?.parameters.find(({ name }) => name === languageDiagnostic.parameter);
            if (missing) {
              const suppliedSlots = command.rawParameters.length === 0 ? 0 : command.parameters.length;
              const separators = Math.max(0, missing.slot - suppliedSlots + (suppliedSlots > 0 ? 1 : 0));
              const insertion = `${command.delimiter.repeat(separators)}${missing.choices[0] ?? ""}`;
              const position = model.getPositionAt(command.span.end);
              addEdit(
                `Insert required ${missing.name}`,
                new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
                insertion,
                marker,
                true,
              );
            }
          } else if ((code === "UNKNOWN_COMMAND" || code === "INVALID_COMMAND_PREFIX") && command && command.prefixKind !== "control-character") {
            const syntax = syntaxAtOffset(model, command.span.start);
            const tokenRange = rangeForSpan(monaco, model, {
              start: command.span.start,
              end: Math.min(command.span.end, command.span.start + command.prefix.length + command.code.length),
            });
            suggestZplCommands(command.canonical, capabilities).forEach((suggestion, index) => {
              const replacement = localizeZpl(suggestion.canonical, syntax);
              addEdit(`Change to ${replacement} — ${suggestion.name}`, tokenRange, replacement, marker, index === 0);
            });
          } else if (code === "UNTERMINATED_FIELD" && command) {
            const syntax = syntaxAtOffset(model, command.span.end);
            const position = model.getPositionAt(command.span.end);
            addEdit(
              `Insert ${localizeZpl("^FS", syntax)} field separator`,
              new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
              localizeZpl("^FS", syntax),
              marker,
              true,
            );
          } else if (code === "UNTERMINATED_FORMAT") {
            const syntax = parsed.syntax;
            const position = model.getPositionAt(model.getValueLength());
            const separator = source.length > 0 && !source.endsWith("\n") ? "\n" : "";
            addEdit(
              `Insert ${localizeZpl("^XZ", syntax)} format end`,
              new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
              `${separator}${localizeZpl("^XZ", syntax)}\n`,
              marker,
              true,
            );
          } else if (code === "UNMATCHED_FORMAT_END" && command) {
            const syntax = syntaxAtOffset(model, command.span.start);
            const position = model.getPositionAt(command.span.start);
            addEdit(
              `Insert ${localizeZpl("^XA", syntax)} format start`,
              new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
              `${localizeZpl("^XA", syntax)}\n`,
              marker,
              true,
            );
          } else if (code === "IMPLICIT_LABEL") {
            addEdit(
              "Wrap source in ^XA…^XZ",
              model.getFullModelRange(),
              `^XA\n${source.replace(/[\r\n]+$/g, "")}\n^XZ\n`,
              marker,
              true,
            );
          }
        }

        const uniqueActions = actions.filter((action, index) => actions.findIndex((candidate) =>
          candidate.title === action.title &&
          JSON.stringify(candidate.edit?.edits) === JSON.stringify(action.edit?.edits)
        ) === index);
        return { actions: uniqueActions, dispose() {} };
      },
    }, { providedCodeActionKinds: ["quickfix"] })
  );

  disposables.push(
    monaco.languages.registerDocumentFormattingEditProvider("zpl", {
      provideDocumentFormattingEdits(model) {
        const formatted = formatZpl(model.getValue());
        if (formatted === model.getValue()) return [];
        return [{ range: model.getFullModelRange(), text: formatted }];
      },
    })
  );

  return {
    dispose() {
      for (const disposable of disposables) disposable.dispose();
    },
  };
}

export function zplSnippetFor(
  command: string,
  syntax: ZplSyntaxState = { formatPrefix: "^", controlPrefix: "~", delimiter: "," }
): string {
  const normalized = command.trim().toUpperCase();
  const signature = getZplCommandDefinition(normalized)?.signatures[0];
  return localizeZpl(signature?.snippet ?? command, syntax);
}

export function zplSnippetsFor(
  command: string,
  syntax: ZplSyntaxState = { formatPrefix: "^", controlPrefix: "~", delimiter: "," }
): readonly string[] {
  const normalized = command.trim().toUpperCase();
  return getZplCommandDefinition(normalized)?.signatures.map(({ snippet }) => localizeZpl(snippet, syntax))
    ?? [localizeZpl(command, syntax)];
}

export function zplSnippetForSource(command: string, source: string, offset: number): string {
  return zplSnippetFor(command, parseDocument(source.slice(0, offset)).syntax);
}
