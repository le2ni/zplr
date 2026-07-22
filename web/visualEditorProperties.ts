import {
  parseDocument,
  type SourceSpan,
  type ZplCommandNode,
} from "../src/index.web";
import type {
  ZplCommandDefinition,
  ZplCommandSignature,
  ZplParameterDefinition,
} from "./zplCommandMetadata.generated";
import {
  getZplCommandDefinition,
  getZplCommandSignature,
  getZplParameterValue,
  replaceZplCommandParameter,
} from "./zplLanguage";
import type { SourceEdit, VisualField } from "./visualEditorSource";

export type VisualPropertyInputKind = "number" | "select" | "text";

export interface VisualPropertyParameter {
  id: string;
  label: string;
  value: string;
  inputKind: VisualPropertyInputKind;
  options: readonly string[];
  suggestions: readonly string[];
  min?: number;
  max?: number;
  step: number | "any";
  command: ZplCommandNode;
  signature: ZplCommandSignature;
  definition: ZplParameterDefinition;
}

export interface VisualPropertyGroup {
  id: string;
  command: ZplCommandNode;
  definition: ZplCommandDefinition;
  signature: ZplCommandSignature;
  parameters: readonly VisualPropertyParameter[];
}

export interface VisualBarcodeType {
  canonical: string;
  title: string;
}

const hiddenVisualCommands = new Set([
  "^FO",
  "^FT",
  "^FD",
  "^FE",
  "^FS",
  "^FX",
  "^GF",
]);

const decimal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function propertyLabel(name: string): string {
  const normalized = name.trim().replace(/\s+/g, " ").replace(/-+$/g, "");
  return normalized ? `${normalized[0]!.toUpperCase()}${normalized.slice(1)}` : "Parameter";
}

function isNumericParameter(parameter: ZplParameterDefinition): boolean {
  const choices = parameter.choices.filter(Boolean);
  if (choices.some((choice) => !decimal.test(choice))) return false;
  if (parameter.range) return true;
  return choices.length > 0 && /(?:\bin dots\b|\bheight\b|\bwidth\b|\bratio\b|\bnumber\b|\bcount\b|\brows?\b|\bcolumns?\b|\bmagnification\b|\bmultiplier\b|\boffset\b|\bdegree\b)/i
    .test(`${parameter.name} ${parameter.documentation}`);
}

function parameterStep(parameter: ZplParameterDefinition): number | "any" {
  const documented = parameter.documentation.match(/(?:in|by)\s+(\d+(?:\.\d+)?)\s+increments?/i)?.[1];
  if (documented && Number(documented) > 0) return Number(documented);
  const numericChoices = parameter.choices.filter((choice) => decimal.test(choice));
  if (numericChoices.some((choice) => choice.includes("."))) return "any";
  return 1;
}

function propertyParameter(
  command: ZplCommandNode,
  signature: ZplCommandSignature,
  parameter: ZplParameterDefinition,
): VisualPropertyParameter {
  const options = unique(parameter.enumValues ?? []);
  const inputKind: VisualPropertyInputKind = options.length > 0
    ? "select"
    : isNumericParameter(parameter) ? "number" : "text";
  return {
    id: `visual-property-${command.span.start}-${parameter.slot}-${parameter.component}-${parameter.key}`,
    label: propertyLabel(parameter.name),
    value: getZplParameterValue(command, signature, parameter).trim(),
    inputKind,
    options,
    suggestions: unique(parameter.choices),
    min: inputKind === "number" ? parameter.range?.min : undefined,
    max: inputKind === "number" ? parameter.range?.max : undefined,
    step: inputKind === "number" ? parameterStep(parameter) : 1,
    command,
    signature,
    definition: parameter,
  };
}

/** Build visual property controls from the same generated metadata as IntelliSense. */
export function visualPropertyGroups(field: VisualField | undefined): VisualPropertyGroup[] {
  if (!field) return [];
  return field.commands.flatMap((command) => {
    if (hiddenVisualCommands.has(command.canonical)) return [];
    const definition = getZplCommandDefinition(command.canonical);
    const signature = getZplCommandSignature(command);
    if (!definition || !signature || signature.parameters.length === 0) return [];
    return [{
      id: `visual-command-${command.span.start}-${command.canonical}`,
      command,
      definition,
      signature,
      parameters: signature.parameters.map((parameter) => propertyParameter(command, signature, parameter)),
    }];
  });
}

function currentCommand(source: string, span: SourceSpan): ZplCommandNode | undefined {
  return parseDocument(source).labels
    .flatMap(({ commands }) => commands)
    .find((command) => command.span.start === span.start && command.span.end === span.end);
}

function normalizedParameterValue(
  command: ZplCommandNode,
  parameter: VisualPropertyParameter,
  requested: string,
): string | undefined {
  const value = requested.replace(/[\r\n]+/g, " ").trim();
  if (value.includes(command.delimiter) || value.includes(command.prefix)) return undefined;
  if (!value) return "";
  if (parameter.inputKind === "select") {
    return parameter.options.find((option) => option.toUpperCase() === value.toUpperCase());
  }
  if (parameter.inputKind === "number") {
    if (!decimal.test(value)) return undefined;
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return undefined;
    if (parameter.min !== undefined && numeric < parameter.min) return undefined;
    if (parameter.max !== undefined && numeric > parameter.max) return undefined;
  }
  return value;
}

/** Create one source edit for a metadata-backed property control. */
export function sourceEditForVisualProperty(
  source: string,
  property: VisualPropertyParameter,
  requested: string,
): SourceEdit | undefined {
  const command = currentCommand(source, property.command.span);
  if (!command || command.canonical !== property.command.canonical) return undefined;
  const signature = getZplCommandSignature(command);
  if (!signature) return undefined;
  const definition = signature.parameters.find((parameter) =>
    parameter.slot === property.definition.slot &&
    parameter.component === property.definition.component &&
    parameter.key === property.definition.key
  );
  if (!definition) return undefined;
  const value = normalizedParameterValue(command, property, requested);
  if (value === undefined) return undefined;
  const replacement = replaceZplCommandParameter(command, signature, definition, value);
  if (replacement === source.slice(command.span.start, command.span.end)) return undefined;
  return { start: command.span.start, end: command.span.end, text: replacement };
}

const visualBarcodeCommands = [
  "^BC",
  "^B3",
  "^BA",
  "^B0",
  "^B1",
  "^B2",
  "^B4",
  "^B5",
  "^B7",
  "^B8",
  "^B9",
  "^BB",
  "^BD",
  "^BE",
  "^BF",
  "^BI",
  "^BJ",
  "^BK",
  "^BL",
  "^BM",
  "^BO",
  "^BP",
  "^BR",
  "^BS",
  "^BT",
  "^BU",
  "^BX",
  "^BZ",
] as const;

export const visualBarcodeTypes: readonly VisualBarcodeType[] = visualBarcodeCommands.flatMap((canonical) => {
  const definition = getZplCommandDefinition(canonical);
  return definition ? [{ canonical, title: definition.title }] : [];
});

export function visualBarcodeCommand(field: VisualField | undefined): ZplCommandNode | undefined {
  if (field?.kind !== "barcode") return undefined;
  return field.commands.find(({ canonical }) => canonical.startsWith("^B") && canonical !== "^BY" && canonical !== "^BQ");
}

function expandedSnippet(signature: ZplCommandSignature): string {
  return signature.snippet
    .replace(/\$\{\d+:([^{}]*)\}/g, "$1")
    .replace(/\$\{\d+\}/g, "");
}

/** Switch a barcode symbology command and seed its documented defaults. */
export function sourceEditForBarcodeType(
  source: string,
  commandSpan: SourceSpan,
  targetCanonical: string,
): SourceEdit | undefined {
  const normalized = targetCanonical.trim().toUpperCase();
  if (!visualBarcodeCommands.some((canonical) => canonical === normalized)) return undefined;
  const command = currentCommand(source, commandSpan);
  if (!command || !command.canonical.startsWith("^B") || command.canonical === "^BY" || command.canonical === normalized) return undefined;
  const definition = getZplCommandDefinition(normalized);
  const signature = definition?.signatures[0];
  if (!signature) return undefined;
  const snippet = expandedSnippet(signature);
  if (!snippet.toUpperCase().startsWith(normalized)) return undefined;
  const editable = command.rawParameters.replace(/(?:\r?\n[\t ]*)+$/g, "");
  const trailingWhitespace = command.rawParameters.slice(editable.length);
  const parameters = snippet.slice(normalized.length).replaceAll(",", command.delimiter);
  return {
    start: command.span.start,
    end: command.span.end,
    text: `${command.prefix}${normalized.slice(1)}${parameters}${trailingWhitespace}`,
  };
}
