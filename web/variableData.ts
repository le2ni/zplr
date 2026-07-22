import { parseDocument, type SourceSpan } from "../src/index.web";
import { parseFieldNumber } from "../src/core/fieldNumber";
import type { SourceEdit, VisualField } from "./visualEditorSource";

export interface VariableColumn {
  id: string;
  name: string;
  /** Normalized Zebra field number (`^FN`), without leading zeroes. */
  fieldNumber: string;
}

export interface VariableRecord {
  id: string;
  name: string;
  values: Record<string, string>;
}

export interface VariableDataset {
  id: string;
  name: string;
  columns: VariableColumn[];
  records: VariableRecord[];
  activeRecordId?: string;
}

export interface DocumentVariableData {
  datasets: VariableDataset[];
  activeDatasetId?: string;
}

export interface ZplFieldBinding {
  fieldNumber: string;
  prompt?: string;
  span: SourceSpan;
  labelIndex?: number;
}

let dataIdSequence = 0;

export function createVariableId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  dataIdSequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${dataIdSequence.toString(36)}`;
}

export function emptyVariableData(): DocumentVariableData {
  return { datasets: [] };
}

function normalizedFieldNumber(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const parsed = parseFieldNumber(String(value));
  return parsed?.number;
}

function nextAvailableFieldNumber(columns: readonly VariableColumn[]): string {
  const used = new Set(columns.map(({ fieldNumber }) => fieldNumber));
  let candidate = 1;
  while (used.has(String(candidate))) candidate += 1;
  return String(candidate);
}

export function createVariableRecord(
  columns: readonly VariableColumn[],
  name?: string,
  values: Record<string, string> = {},
): VariableRecord {
  const id = createVariableId("record");
  return {
    id,
    name: name?.trim() || `Record ${id.slice(-4)}`,
    values: Object.fromEntries(columns.map((column) => [column.id, values[column.id] ?? ""])),
  };
}

export function createVariableDataset(name = "Dataset", headers: readonly string[] = []): VariableDataset {
  const columns: VariableColumn[] = [];
  for (const [index, header] of headers.entries()) {
    columns.push({
      id: createVariableId("column"),
      name: header.trim() || `Field ${index + 1}`,
      fieldNumber: nextAvailableFieldNumber(columns),
    });
  }
  const id = createVariableId("dataset");
  const firstRecord = createVariableRecord(columns, "Record 1");
  return { id, name: name.trim() || "Dataset", columns, records: [firstRecord], activeRecordId: firstRecord.id };
}

function normalizeColumn(value: unknown, usedNumbers: Set<string>, index: number): VariableColumn | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<VariableColumn>;
  const id = typeof candidate.id === "string" && candidate.id ? candidate.id : createVariableId("column");
  let fieldNumber = normalizedFieldNumber(candidate.fieldNumber);
  if (!fieldNumber || usedNumbers.has(fieldNumber)) {
    let next = 1;
    while (usedNumbers.has(String(next))) next += 1;
    fieldNumber = String(next);
  }
  usedNumbers.add(fieldNumber);
  return {
    id,
    name: typeof candidate.name === "string" && candidate.name.trim() ? candidate.name.trim() : `Field ${index + 1}`,
    fieldNumber,
  };
}

function normalizeRecord(value: unknown, columns: readonly VariableColumn[], index: number): VariableRecord | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<VariableRecord>;
  const rawValues = candidate.values && typeof candidate.values === "object" ? candidate.values : {};
  return {
    id: typeof candidate.id === "string" && candidate.id ? candidate.id : createVariableId("record"),
    name: typeof candidate.name === "string" && candidate.name.trim() ? candidate.name.trim() : `Record ${index + 1}`,
    values: Object.fromEntries(columns.map(({ id }) => [id, typeof rawValues[id] === "string" ? rawValues[id] : ""])),
  };
}

export function normalizeVariableData(value: unknown): DocumentVariableData {
  if (!value || typeof value !== "object") return emptyVariableData();
  const candidate = value as Partial<DocumentVariableData>;
  const datasets = (Array.isArray(candidate.datasets) ? candidate.datasets : []).flatMap((rawDataset, datasetIndex) => {
    if (!rawDataset || typeof rawDataset !== "object") return [];
    const dataset = rawDataset as Partial<VariableDataset>;
    const usedNumbers = new Set<string>();
    const columns = (Array.isArray(dataset.columns) ? dataset.columns : [])
      .flatMap((column, index) => normalizeColumn(column, usedNumbers, index) ?? []);
    const records = (Array.isArray(dataset.records) ? dataset.records : [])
      .flatMap((record, index) => normalizeRecord(record, columns, index) ?? []);
    const normalizedRecords = records.length ? records : [createVariableRecord(columns, "Record 1")];
    const id = typeof dataset.id === "string" && dataset.id ? dataset.id : createVariableId("dataset");
    return [{
      id,
      name: typeof dataset.name === "string" && dataset.name.trim() ? dataset.name.trim() : `Dataset ${datasetIndex + 1}`,
      columns,
      records: normalizedRecords,
      activeRecordId: normalizedRecords.some(({ id: recordId }) => recordId === dataset.activeRecordId)
        ? dataset.activeRecordId
        : normalizedRecords[0]!.id,
    }];
  });
  return {
    datasets,
    activeDatasetId: datasets.some(({ id }) => id === candidate.activeDatasetId)
      ? candidate.activeDatasetId
      : datasets[0]?.id,
  };
}

export function activeVariableDataset(data: DocumentVariableData): VariableDataset | undefined {
  return data.datasets.find(({ id }) => id === data.activeDatasetId) ?? data.datasets[0];
}

export function activeVariableRecord(dataset?: VariableDataset): VariableRecord | undefined {
  return dataset?.records.find(({ id }) => id === dataset.activeRecordId) ?? dataset?.records[0];
}

export function fieldValuesForVariableData(data: DocumentVariableData): Readonly<Record<string, string>> {
  const dataset = activeVariableDataset(data);
  const record = activeVariableRecord(dataset);
  if (!dataset || !record) return {};
  return Object.fromEntries(dataset.columns.map((column) => [column.fieldNumber, record.values[column.id] ?? ""]));
}

export function collectZplFieldBindings(source: string): ZplFieldBinding[] {
  const document = parseDocument(source);
  const bindings: ZplFieldBinding[] = [];
  for (const [labelIndex, label] of document.labels.entries()) {
    for (const command of label.commands) {
      if (command.canonical !== "^FN") continue;
      const parsed = parseFieldNumber(command.rawParameters);
      if (!parsed) continue;
      bindings.push({ fieldNumber: parsed.number, prompt: parsed.prompt, span: { ...command.span }, labelIndex });
    }
  }
  for (const item of document.items) {
    if (item.kind !== "command" || item.canonical !== "^FN") continue;
    const parsed = parseFieldNumber(item.rawParameters);
    if (parsed) bindings.push({ fieldNumber: parsed.number, prompt: parsed.prompt, span: { ...item.span } });
  }
  return bindings;
}

export function fieldNumberForVisualField(field?: VisualField): string | undefined {
  const command = field?.commands.find(({ canonical }) => canonical === "^FN");
  return command ? parseFieldNumber(command.rawParameters)?.number : undefined;
}

export function sourceEditForVariableBinding(
  source: string,
  field: VisualField,
  fieldNumber?: string,
  prompt?: string,
): SourceEdit | undefined {
  const existing = field.commands.find(({ canonical }) => canonical === "^FN");
  if (!fieldNumber) {
    return existing ? { start: existing.span.start, end: existing.span.end, text: "" } : undefined;
  }
  const normalized = normalizedFieldNumber(fieldNumber);
  if (!normalized) return undefined;
  const safePrompt = prompt?.replace(/["\r\n]/g, " ").trim();
  const prefix = existing?.prefix ?? field.commands[0]?.prefix ?? "^";
  const text = `${prefix}FN${normalized}${safePrompt ? `"${safePrompt}"` : ""}`;
  if (existing) {
    if (source.slice(existing.span.start, existing.span.end) === text) return undefined;
    return { start: existing.span.start, end: existing.span.end, text };
  }
  const before = field.commands.find(({ canonical }) => canonical === "^FD" || canonical === "^FV" || canonical === "^FS");
  const insertionPoint = before?.span.start ?? field.sourceSpan.end;
  return { start: insertionPoint, end: insertionPoint, text, selectOriginAt: field.origin?.command.span.start };
}

/** RFC-4180-style CSV parser, including escaped quotes and embedded newlines. */
export function parseVariableCsv(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < source.length; index++) {
    const character = source[index]!;
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else value += character;
      continue;
    }
    if (character === '"' && value === "") quoted = true;
    else if (character === ",") {
      row.push(value);
      value = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else value += character;
  }
  if (value || row.length || !rows.length) {
    row.push(value);
    rows.push(row);
  }
  return rows.filter((candidate, index) => index === 0 || candidate.some((cell) => cell !== ""));
}

function primitiveText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return String(value);
  return JSON.stringify(value);
}

export function importVariableDataset(
  source: string,
  format: "csv" | "json",
  name = "Imported data",
): VariableDataset {
  let headers: string[];
  let rows: string[][];
  if (format === "csv") {
    const parsed = parseVariableCsv(source.replace(/^\uFEFF/, ""));
    headers = parsed[0]?.map((header, index) => header.trim() || `Field ${index + 1}`) ?? [];
    rows = parsed.slice(1);
  } else {
    const parsed = JSON.parse(source) as unknown;
    const values = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && Array.isArray((parsed as { records?: unknown }).records)
        ? (parsed as { records: unknown[] }).records
        : [];
    const objects = values.filter((value): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value));
    headers = [...new Set(objects.flatMap((value) => Object.keys(value)))];
    rows = objects.map((value) => headers.map((header) => primitiveText(value[header])));
  }
  if (headers.length === 0) throw new Error("The data file has no columns.");
  const dataset = createVariableDataset(name, headers);
  dataset.records = rows.map((row, index) => ({
    id: createVariableId("record"),
    name: `Record ${index + 1}`,
    values: Object.fromEntries(dataset.columns.map((column, columnIndex) => [column.id, row[columnIndex] ?? ""])),
  }));
  if (dataset.records.length === 0) dataset.records = [createVariableRecord(dataset.columns, "Record 1")];
  dataset.activeRecordId = dataset.records[0]!.id;
  return dataset;
}

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function variableDatasetToCsv(dataset: VariableDataset): string {
  return [
    dataset.columns.map(({ name }) => csvCell(name)).join(","),
    ...dataset.records.map((record) => dataset.columns.map(({ id }) => csvCell(record.values[id] ?? "")).join(",")),
  ].join("\r\n");
}
