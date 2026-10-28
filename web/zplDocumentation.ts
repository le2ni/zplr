import type {
  CommandCapabilityStatus,
  CommandCategory,
  CommandEffect,
  CommandPersistenceScope,
} from "../src/types/ZplDocument";
import {
  zplCommandDocumentationSeeds,
  type ZplCommandDocumentationSeed,
  type ZplDocumentationParameterSeed,
  type ZplDocumentationSignatureSeed,
} from "./zplDocumentationData.generated";
import {
  commandSlug,
  commandSummary,
} from "./zplDocumentationSummary";
import { zplOverviewPreviewSource } from "./zplOverviewPreviews";

export interface ZplParameterGuide {
  id: string;
  key: string;
  name: string;
  description: string;
  defaultValue?: string;
  choices: readonly string[];
  enumValues?: readonly string[];
  range?: { readonly min: number; readonly max: number };
  required: boolean;
  repeatable: boolean;
  examples: readonly ZplDocumentationExample[];
}

export interface ZplSignatureGuide {
  id: string;
  syntax: string;
  label?: string;
  parameters: readonly ZplParameterGuide[];
  examples: readonly ZplDocumentationExample[];
}

export interface ZplDocumentationExample {
  id: string;
  command: string;
  signatureIndex: number;
  parameterId?: string;
  title: string;
  description: string;
  value?: string;
  source: string;
  filename: string;
  cursorOffset: number;
  preview: boolean;
}

export interface ZplCommandGuide {
  canonical: string;
  slug: string;
  title: string;
  summary: string;
  reference: string;
  category: CommandCategory;
  effect: CommandEffect;
  scope: CommandPersistenceScope;
  status: Exclude<CommandCapabilityStatus, "unknown">;
  limitations: readonly string[];
  signatures: readonly ZplSignatureGuide[];
  featuredExample?: ZplDocumentationExample;
  searchText: string;
}

export interface ZplCommandIndexGuide extends Pick<
  ZplCommandGuide,
  "canonical" | "slug" | "title" | "summary" | "category" | "effect" | "scope" | "status"
> {
  parameterTerms: string;
  parameterCount: number;
  previewSource?: string;
}

const barcodePayloads: Readonly<Record<string, string>> = {
  "^B0": "HELLO AZTEC",
  "^B1": "1234567890",
  "^B2": "123456",
  "^B3": "ZPLR-39",
  "^B4": "CODE49",
  "^B5": "01234567890",
  "^B7": "PDF417 FROM ZPLR",
  "^B8": "1234567",
  "^B9": "0421000",
  "^BA": "ZPLR-93",
  "^BB": "CODABLOCK",
  "^BC": "ABC123456",
  "^BD": "MAXICODE",
  "^BE": "590123412345",
  "^BF": "ABC",
  "^BI": "123456",
  "^BJ": "123456",
  "^BK": "123456",
  "^BL": "LOGMARS",
  "^BM": "123456",
  "^BO": "HELLO AZTEC",
  "^BP": "1234ABCD",
  "^BQ": "QA,ZPLR QR EXAMPLE",
  "^BR": "0952123454321",
  "^BS": "05",
  "^BT": "123456,SERIAL123",
  "^BU": "03600029145",
  "^BX": "ZPLR-DATAMATRIX",
  "^BZ": "01234",
};

const directTextCommands = new Set([
  "^A",
  "^A@",
  "^FB",
  "^FC",
  "^FH",
  "^FP",
  "^PA",
  "^SF",
  "^SN",
  "^TB",
]);

const fieldOriginCommands = new Set(["^FM", "^FO", "^FT"]);
const directGraphicCommands = new Set(["^GB", "^GC", "^GD", "^GE", "^GS"]);

const commandDefaultOverrides: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  "^A": { f: "A", o: "N", h: "42", w: "34" },
  "^A@": { d: "R", f: "MISSING", x: "TTF" },
  "^B0": { a: "N", b: "3", c: "N", d: "0", e: "N", f: "1", g: "0" },
  "^B4": { o: "N", h: "8", f: "N", m: "A" },
  "^B7": { o: "N", h: "3", s: "0", c: "6", r: "8", t: "N" },
  "^BB": { o: "N", h: "8", s: "Y", c: "8", r: "0", m: "F" },
  "^BD": { m: "4", o: "1", h: "1" },
  "^BF": { o: "N", h: "3", m: "0" },
  "^BK": { o: "N", e: "N", h: "60", f: "N", g: "N", k: "A", l: "B" },
  "^BQ": { a: "N", b: "2", c: "4", d: "Q", e: "7" },
  "^BR": { o: "N", a: "1", b: "2", c: "1", d: "50", e: "22" },
  "^BT": { o: "N", w: "2", r: "2", h: "50", s: "2", c: "4" },
  "^BX": { o: "N", h: "5", s: "200", c: "0", r: "0", f: "6", g: "_", a: "1" },
  "^BY": { w: "2", r: "2.5", h: "100" },
  "^CF": { f: "0", h: "48", w: "38" },
  "^CI": { a: "28", s1: "0", d1: "0", s2: "0", d2: "0", "...": "0" },
  "^FB": { a: "360", b: "3", c: "10", d: "L", e: "0" },
  "^FC": { a: "%", b: "{", c: "#" },
  "^FD": { a: "Sample field data" },
  "^FE": { a: "#" },
  "^FH": { a: "_" },
  "^FO": { x: "320", y: "90", z: "0" },
  "^FP": { d: "H", g: "8" },
  "^GF": { a: "A", b: "8", c: "8", d: "1", data: "FF818181818181FF" },
  "^FT": { x: "320", y: "150", z: "0" },
  "^FV": { a: "Variable value" },
  "^FW": { r: "N", z: "0" },
  "^GB": { w: "360", h: "120", t: "6", c: "B", r: "16" },
  "^GC": { d: "130", t: "6", c: "B" },
  "^GD": { w: "340", h: "140", t: "6", c: "B", o: "R" },
  "^GE": { w: "340", h: "130", t: "6", c: "B" },
  "^GS": { o: "N", h: "120", w: "120" },
  "^IL": { d: "R", o: "ICON", x: "GRF" },
  "^IM": { d: "R", o: "ICON", x: "GRF" },
  "^LR": { a: "Y" },
  "^PM": { a: "Y" },
  "^PO": { a: "I" },
  "^SN": { v: "0001", n: "1", z: "Y" },
  "^TB": { a: "N", b: "360", c: "130" },
  "^XG": { d: "R", o: "ICON", x: "GRF", mx: "4", my: "4" },
  "~DG": { d: "R", o: "ICON", x: "GRF", t: "8", w: "1", data: "FF818181818181FF" },
};

const commandExampleValueOverrides: Readonly<Record<string, Readonly<Record<string, readonly string[]>>>> = {
  "^A": {
    f: ["A", "B", "0"],
    o: ["N", "R", "I"],
    h: ["24", "42", "64"],
    w: ["20", "34", "52"],
  },
  "^A@": {
    o: ["N", "R", "I"],
    h: ["24", "42", "64"],
    w: ["20", "34", "52"],
  },
  "^B0": {
    a: ["N", "R", "B"],
    b: ["2", "3", "5"],
    c: ["N", "Y"],
    d: ["0", "10", "23"],
    e: ["N", "Y"],
    f: ["1", "2"],
    g: ["0", "1"],
  },
  "^BY": {
    w: ["2", "3", "4"],
    r: ["2", "2.5", "3"],
    h: ["60", "100", "140"],
  },
  "^CF": {
    f: ["A", "0"],
    h: ["28", "48", "68"],
    w: ["22", "38", "54"],
  },
  "^CI": { a: ["0", "28"] },
  "^FB": {
    a: ["220", "360", "480"],
    b: ["1", "2", "4"],
    c: ["0", "10", "24"],
    d: ["L", "C", "R"],
    e: ["0", "20", "50"],
  },
  "^FC": {
    a: ["%", "@"],
    b: ["{", "&"],
    c: ["#", "!"],
  },
  "^FD": { a: ["Sample field", "Order 123"] },
  "^FE": { a: ["#", "%", "|"] },
  "^FH": { a: ["_", "#"] },
  "^FO": {
    x: ["80", "300", "500"],
    y: ["40", "120", "220"],
    z: ["0", "1"],
  },
  "^FP": {
    d: ["H", "V", "R"],
    g: ["0", "8", "18"],
  },
  "^FT": {
    x: ["80", "300", "500"],
    y: ["70", "150", "250"],
    z: ["0", "1"],
  },
  "^FV": { a: ["Variable value", "Batch 42"] },
  "^FW": {
    r: ["N", "R", "I"],
    z: ["0", "1", "2"],
  },
  "^GB": {
    w: ["160", "280", "420"],
    h: ["70", "120", "190"],
    t: ["2", "6", "12"],
    r: ["0", "4", "8"],
  },
  "^GC": {
    d: ["70", "130", "200"],
    t: ["2", "6", "12"],
  },
  "^GD": {
    w: ["160", "280", "420"],
    h: ["70", "120", "190"],
    t: ["2", "6", "12"],
  },
  "^GE": {
    w: ["160", "280", "420"],
    h: ["70", "120", "190"],
    t: ["2", "6", "12"],
  },
  "^GS": {
    o: ["N", "R", "I"],
    h: ["60", "120", "180"],
    w: ["60", "120", "180"],
  },
  "^LR": { a: ["N", "Y"] },
  "^PM": { a: ["N", "Y"] },
  "^PO": { a: ["N", "I"] },
  "^SN": {
    v: ["0001", "0099", "1200"],
    n: ["1", "5", "-1"],
    z: ["N", "Y"],
  },
  "^TB": {
    a: ["N", "R", "I"],
    b: ["220", "360", "480"],
    c: ["80", "130", "200"],
  },
};

function sentenceName(value: string): string {
  const normalized = value
    .replace(/\s+/g, " ")
    .replace(/\s*[-–—:,.]+\s*$/g, "")
    .trim();
  if (!normalized) return "this parameter";
  return normalized[0]!.toLowerCase() + normalized.slice(1);
}

function parameterDescription(parameter: ZplDocumentationParameterSeed): string {
  const requirement = parameter.required ? " It must be supplied." : " It can be omitted when the documented default is suitable.";
  const repetition = parameter.repeatable ? " The value can repeat to continue the documented pattern." : "";
  return `Sets ${sentenceName(parameter.name)}.${requirement}${repetition}`;
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function alternateValue(parameter: ZplDocumentationParameterSeed, initial: string): string {
  if (/^[+-]?\d+(?:\.\d+)?$/.test(initial)) {
    const number = Number(initial);
    if (Number.isFinite(number)) return String(number === 0 ? 1 : number + 1);
  }
  if (/character|indicator/i.test(parameter.name) || initial.length === 1) {
    return initial === "_" ? "#" : initial === "X" ? "Z" : "X";
  }
  if (/drive|device|location/i.test(parameter.name)) return initial.startsWith("R") ? "E:" : "R:";
  if (/name|object|file|font/i.test(parameter.name)) return "EXAMPLE";
  if (/data|text|comment|prompt|key|value/i.test(parameter.name)) return "SAMPLE";
  return `${initial || "VALUE"}2`;
}

function curatedValues(
  parameter: ZplDocumentationParameterSeed,
  preview: boolean,
): string[] {
  const documented = unique([
    ...(parameter.enumValues ?? []),
    ...parameter.choices,
  ]);
  const safeDocumented = preview
    ? documented.filter((value) => !/^[+-]?\d+(?:\.\d+)?$/.test(value) || Math.abs(Number(value)) <= 1_000)
    : documented;
  const candidates = safeDocumented.length ? safeDocumented : documented;
  const values = unique(candidates);
  if (values.length === 0) values.push("");
  if (values.length === 1) values.push(alternateValue(parameter, values[0]!));

  const includeThird =
    (parameter.enumValues?.length ?? 0) >= 3 ||
    (parameter.range !== undefined && values.length >= 3) ||
    values.length >= 4;
  const result = [values[0]!, values[1]!];
  if (includeThird) {
    const third = values.at(-1);
    if (third && !result.includes(third)) result.push(third);
  }
  return result.slice(0, 3);
}

function exampleValues(
  command: string,
  parameter: ZplDocumentationParameterSeed,
  preview: boolean,
): string[] {
  const override = commandExampleValueOverrides[command]?.[parameter.key];
  return override ? [...override] : curatedValues(parameter, preview);
}

function defaultValue(
  command: string,
  parameter: ZplDocumentationParameterSeed,
): string {
  return commandDefaultOverrides[command]?.[parameter.key]
    ?? parameter.choices[0]
    ?? parameter.enumValues?.[0]
    ?? "";
}

function commandFromSignature(
  command: string,
  signature: ZplDocumentationSignatureSeed,
  target: ZplDocumentationParameterSeed | undefined,
  requestedValue: string | undefined,
): string {
  if (command === "^WE") {
    const values = ["OFF", "1", "O", "H", "KEY1", "KEY2", "KEY3", "KEY4"];
    if (target) {
      if (target.key === "e,_f,_g,_h") values.splice(4, 4, requestedValue ?? "KEY");
      else values[target.slot] = requestedValue ?? "";
    }
    return `^WE${values.join(",")}`;
  }
  if (command === "^RB") {
    const values = ["96", ...Array.from({ length: 16 }, () => "6")];
    if (target) {
      const partition = /^p(\d+)$/.exec(target.key)?.[1];
      const slot = partition === undefined ? target.slot : Number(partition) + 1;
      values[slot] = requestedValue ?? "";
    }
    return `^RB${values.join(",")}`;
  }

  const parameters = [...signature.parameters]
    .filter((parameter) => parameter.syntaxStart !== undefined && parameter.syntaxEnd !== undefined)
    .sort((left, right) => left.syntaxStart! - right.syntaxStart!);
  let cursor = 0;
  let result = "";
  for (const parameter of parameters) {
    result += signature.syntax.slice(cursor, parameter.syntaxStart);
    result += parameter === target
      ? requestedValue ?? ""
      : defaultValue(command, parameter);
    cursor = parameter.syntaxEnd!;
  }
  result += signature.syntax.slice(cursor);
  return result.replace(/\s*\.\.\.\s*/g, "");
}

function previewEnabled(
  capability: ZplCommandDocumentationSeed,
  _parameter?: ZplDocumentationParameterSeed,
): boolean {
  return capability.status !== "unsupported"
    && capability.effect === "raster";
}

function zplCaption(command: string): string {
  return `${command.replace("^", "Caret ").replace("~", "Tilde ")} parameter example`;
}

function fieldClockBody(rawCommand: string, footer: string): string {
  const [primary = "%", secondary = "{", tertiary = "#"] = rawCommand.slice(3).split(",");
  const clockLine = (label: string, indicator: string): string =>
    `${label} [${indicator}]  ${indicator}Y-${indicator}m-${indicator}d ${indicator}H:${indicator}M:${indicator}S`;

  return [
    "^ST07,20,2026,02,05,06,P",
    "^SO2,0,0,0,1,0,0",
    "^SO3,0,0,0,2,0,0",
    "^FO36,55^A0N,30,26^FB568,3,28,L,0",
    rawCommand,
    `^FD${[
      clockLine("Primary", primary || "%"),
      clockLine("Secondary", secondary || "{"),
      clockLine("Third", tertiary || "#"),
    ].join("\\&")}^FS`,
    footer,
  ].join("\n");
}

function previewSource(
  command: string,
  category: CommandCategory,
  rawCommand: string,
): { source: string; cursorOffset: number } {
  const labelStart = "^XA\n^PW640\n^LL360\n";
  const footer = `^FO28,318^A0N,22,22^FD${zplCaption(command)}^FS\n^XZ`;
  const graphicResource = "~DGR:ICON.GRF,8,1,FF818181818181FF\n";
  let body: string;

  if (command === "^XA") {
    body = `^PW640\n^LL360\n^FO28,24^GB584,270,3,B,16^FS\n^FO48,125^A0N,42,38^FDStart format^FS\n${footer.replace(/^\^FO/, "^FO")}`;
    return { source: `${rawCommand}\n${body}`, cursorOffset: 0 };
  }
  if (command === "^XZ") {
    const source = `${labelStart}^FO28,24^GB584,270,3,B,16^FS\n^FO48,125^A0N,42,38^FDEnd format^FS\n${rawCommand}`;
    return { source, cursorOffset: source.lastIndexOf(rawCommand) };
  }
  if (command === "^JM") {
    // Half-density mode doubles each logical dot, including label dimensions.
    const source = `^XA\n^PW300\n^LL170\n${rawCommand}\n^FO14,12^GB272,135,2,B,0^FS\n^FO28,60^A0N,20,16^FDDot density^FS\n^FO14,150^A0N,11,11^FD${zplCaption(command)}^FS\n^XZ`;
    return { source, cursorOffset: source.indexOf(rawCommand) };
  }

  if (category === "barcode" && command.startsWith("^B") && command !== "^BY") {
    const payload = barcodePayloads[command] ?? "1234567890";
    body = `^FO36,32\n^BY2,2,90\n${rawCommand}\n^FD${payload}^FS\n${footer}`;
  } else if (command === "^BY") {
    body = `${rawCommand}\n^FO100,65^BCN,,Y,N,N^FDABC123^FS\n${footer}`;
  } else if (command === "^A" || command === "^A@") {
    body = `^FO260,125\n${rawCommand}\n^FDZPLr^FS\n${footer}`;
  } else if (command === "^CF") {
    body = `${rawCommand}\n^FO70,105^FDDefault font^FS\n${footer}`;
  } else if (command === "^CI") {
    body = `${rawCommand}\n^FO70,105^A0N,48,40^FDGrüße · ZPLr^FS\n${footer}`;
  } else if (command === "^FE") {
    const indicator = rawCommand.slice(3, 4) || "#";
    body = [
      "^FO0,400^FN2^FDOrder^FS",
      "^FO0,400^FN3^FD1234^FS",
      "^FO70,105^A0N,48,40",
      rawCommand,
      `^FD${indicator}2${indicator}: ${indicator}3${indicator}^FS`,
      footer,
    ].join("\n");
  } else if (command === "^FH") {
    const indicator = rawCommand.slice(3, 4) || "_";
    body = `^FO70,105^A0N,48,40\n${rawCommand}\n^FDHex${indicator}20data${indicator}21^FS\n${footer}`;
  } else if (command === "^FS") {
    body = [
      `^FO45,105^A0N,42,34^FDFIRST${rawCommand}`,
      `^FO330,105^A0N,42,34^FDSECOND${rawCommand}`,
      footer,
    ].join("\n");
  } else if (command === "^FW") {
    body = `${rawCommand}\n^FO300,140^A0,46,38^FDFW^FS\n${footer}`;
  } else if (command === "^GS") {
    body = `^FO250,70\n${rawCommand}\n^FDA^FS\n${footer}`;
  } else if (command === "^LR") {
    body = [
      rawCommand,
      "^FO70,70^GB500,180,180,B,0^FS",
      "^FO135,125^A0N,48,40^FDLabel reverse^FS",
      footer,
    ].join("\n");
  } else if (command === "^PM") {
    body = `${rawCommand}\n^FO100,105^A0N,52,44^FDMIRROR >^FS\n${footer}`;
  } else if (command === "^PO") {
    body = `${rawCommand}\n^FO100,105^A0N,52,44^FDROTATE 180^FS\n${footer}`;
  } else if (command === "^SN") {
    body = `^FO190,95^A0N,68,56\n${rawCommand}^FS\n${footer}`;
  } else if (command === "^GF") {
    body = `^FO70,50\n${rawCommand}^FS\n${footer}`;
  } else if (directGraphicCommands.has(command)) {
    body = `^FO90,55\n${rawCommand}^FS\n${footer}`;
  } else if (command === "^IL" || command === "^IM" || command === "^XG") {
    body = `^FO90,55\n${rawCommand}^FS\n${footer}`;
  } else if (fieldOriginCommands.has(command)) {
    body = `${rawCommand}\n^A0N,42,34^FDORIGIN^FS\n${footer}`;
  } else if (command === "^FD" || command === "^FV") {
    body = `^FO48,90^A0N,42,38\n${rawCommand}^FS\n${footer}`;
  } else if (command === "^FR") {
    body = `^FO28,24^GB584,270,584,B,0^FS\n^FO80,125^A0N,42,38\n${rawCommand}\n^FDReverse field^FS\n${footer}`;
  } else if (command === "^FC") {
    body = fieldClockBody(rawCommand, footer);
  } else if (command === "^FB") {
    body = `^FO70,55^A0N,34,28\n${rawCommand}\n^FDField blocks wrap readable text across the label and keep every line aligned for a clear comparison.^FS\n${footer}`;
  } else if (command === "^FP") {
    body = `^FO150,55^A0N,42,34\n${rawCommand}\n^FDGAPS^FS\n${footer}`;
  } else if (command === "^TB") {
    body = `^FO70,70^A0N,34,28\n${rawCommand}\n^FDText blocks keep copy inside a defined area.^FS\n${footer}`;
  } else if (directTextCommands.has(command)) {
    body = `^FO48,75\n${rawCommand}\n^FDThe quick brown fox wraps across the label.^FS\n${footer}`;
  } else if (category === "graphic") {
    body = `^FO90,55\n${rawCommand}^FS\n${footer}`;
  } else if (category === "text") {
    body = `${rawCommand}\n^FO48,95^A0N,42,38^FDText command example^FS\n${footer}`;
  } else if (category === "format") {
    body = `${rawCommand}\n^FO28,24^GB584,270,3,B,16^FS\n^FO58,125^A0N,42,38^FDFormat command^FS\n${footer}`;
  } else {
    body = `^FO28,24^GB584,270,3,B,16^FS\n^FO58,125^A0N,42,38^FDJob command^FS\n${footer}\n${rawCommand}`;
  }

  const prefix = command === "^IL" || command === "^IM" || command === "^XG"
    ? graphicResource
    : "";
  const source = `${prefix}${labelStart}${body}`;
  return { source, cursorOffset: source.indexOf(rawCommand) };
}

function codeOnlySource(rawCommand: string): { source: string; cursorOffset: number } {
  return { source: `${rawCommand}\n`, cursorOffset: 0 };
}

function exampleIdPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 42) || "value";
}

function exampleFor(
  capability: ZplCommandDocumentationSeed,
  signature: ZplDocumentationSignatureSeed,
  signatureIndex: number,
  parameter: ZplDocumentationParameterSeed | undefined,
  parameterId: string | undefined,
  value: string | undefined,
  variantIndex: number,
): ZplDocumentationExample {
  const preview = previewEnabled(capability, parameter);
  const rawCommand = commandFromSignature(capability.canonical, signature, parameter, value);
  const prepared = preview
    ? previewSource(capability.canonical, capability.category, rawCommand)
    : codeOnlySource(rawCommand);
  const valueLabel = value === "" ? "Omitted value" : value ?? "Basic form";
  const exampleKey = parameter
    ? `${parameterId}-${variantIndex + 1}-${exampleIdPart(valueLabel)}`
    : `basic-${signatureIndex + 1}`;
  const slug = commandSlug(capability.canonical);
  return {
    id: `${slug}-${exampleKey}`,
    command: capability.canonical,
    signatureIndex,
    parameterId,
    title: parameter ? `${parameter.key} = ${valueLabel}` : `${capability.canonical} basic example`,
    description: parameter
      ? `Uses ${valueLabel} for ${sentenceName(parameter.name)} while the other command values stay at representative defaults.`
      : `Shows the ${signature.label?.toLowerCase() ?? "parameterless command form"} in a complete ZPL sample.`,
    value,
    source: prepared.source,
    filename: `${slug}-${parameter ? exampleIdPart(parameter.key) : "basic"}-${variantIndex + 1}.zpl`,
    cursorOffset: prepared.cursorOffset,
    preview,
  };
}

function signatureGuides(
  capability: ZplCommandDocumentationSeed,
): ZplSignatureGuide[] {
  return capability.signatures.map((signature, signatureIndex) => {
    const parameters = signature.parameters.map((parameter) => {
      const parameterId = `${signatureIndex}-${parameter.slot}-${parameter.component}-${exampleIdPart(parameter.key)}`;
      const values = exampleValues(
        capability.canonical,
        parameter,
        previewEnabled(capability, parameter),
      );
      return {
        id: parameterId,
        key: parameter.key,
        name: parameter.name,
        description: parameterDescription(parameter),
        defaultValue: parameter.defaultValue,
        choices: parameter.choices,
        enumValues: parameter.enumValues,
        range: parameter.range,
        required: Boolean(parameter.required),
        repeatable: Boolean(parameter.repeatable),
        examples: values.map((value, variantIndex) => exampleFor(
          capability,
          signature,
          signatureIndex,
          parameter,
          parameterId,
          value,
          variantIndex,
        )),
      } satisfies ZplParameterGuide;
    });
    const examples = parameters.length === 0
      ? [exampleFor(capability, signature, signatureIndex, undefined, undefined, undefined, 0)]
      : [];
    return {
      id: `${commandSlug(capability.canonical)}-signature-${signatureIndex + 1}`,
      syntax: signature.syntax,
      label: signature.label,
      parameters,
      examples,
    };
  });
}

function firstComparisonPreview(
  signatures: readonly ZplSignatureGuide[],
): ZplDocumentationExample | undefined {
  for (const signature of signatures) {
    for (const example of signature.examples) {
      if (example.preview) return example;
    }
    for (const parameter of signature.parameters) {
      for (const example of parameter.examples) {
        if (example.preview) return example;
      }
    }
  }
  return undefined;
}

function featuredExampleFor(
  capability: ZplCommandDocumentationSeed,
  signatures: readonly ZplSignatureGuide[],
): ZplDocumentationExample | undefined {
  const signature = capability.signatures[0];
  const generatedSource = firstComparisonPreview(signatures)?.source ?? (
    signature
      ? previewSource(
          capability.canonical,
          capability.category,
          commandFromSignature(capability.canonical, signature, undefined, undefined),
        ).source
      : undefined
  );
  const source = zplOverviewPreviewSource(
    capability.canonical,
    capability.effect,
    generatedSource,
  );
  if (!source) return undefined;

  const slug = commandSlug(capability.canonical);
  return {
    id: `${slug}-recommended`,
    command: capability.canonical,
    signatureIndex: 0,
    title: "Recommended rendered sample",
    description: `Uses ${capability.canonical} in a compact label where its visible effect is easy to inspect.`,
    source,
    filename: `${slug}-recommended.zpl`,
    cursorOffset: Math.max(0, source.lastIndexOf(capability.canonical)),
    preview: true,
  };
}

export const zplCommandGuides: readonly ZplCommandGuide[] = zplCommandDocumentationSeeds.map((capability) => {
  const signatures = signatureGuides(capability);
  const featuredExample = featuredExampleFor(capability, signatures);
  const summary = commandSummary(capability);
  return {
    canonical: capability.canonical,
    slug: commandSlug(capability.canonical),
    title: capability.title,
    summary,
    reference: capability.reference,
    category: capability.category,
    effect: capability.effect,
    scope: capability.scope,
    status: capability.status,
    limitations: capability.limitations ?? [],
    signatures,
    ...(featuredExample ? { featuredExample } : {}),
    searchText: [
      capability.canonical,
      capability.title,
      summary,
      capability.category,
      capability.effect,
      capability.scope,
      capability.status,
      ...signatures.flatMap((signature) =>
        signature.parameters.flatMap((parameter) => [
          parameter.key,
          parameter.name,
          parameter.description,
        ])),
    ].join(" ").toLowerCase(),
  };
});

const guidesBySlug = new Map(zplCommandGuides.map((guide) => [guide.slug, guide]));
const examplesById = new Map(
  zplCommandGuides.flatMap((guide) =>
    [
      ...(guide.featuredExample ? [guide.featuredExample] : []),
      ...guide.signatures.flatMap((signature) => [
        ...signature.examples,
        ...signature.parameters.flatMap((parameter) => parameter.examples),
      ]),
    ].map((example) => [example.id, example] as const)),
);

export function getZplCommandGuide(slug: string): ZplCommandGuide | undefined {
  return guidesBySlug.get(slug.trim().toLowerCase());
}

export function getZplDocumentationExample(id: string): ZplDocumentationExample | undefined {
  return examplesById.get(id.trim().toLowerCase());
}

export function getZplCommandPreviewExample(
  guide: Pick<ZplCommandGuide, "featuredExample" | "signatures">,
): ZplDocumentationExample | undefined {
  return guide.featuredExample ?? firstComparisonPreview(guide.signatures);
}

export function zplCommandIndexEntry(guide: ZplCommandGuide): ZplCommandIndexGuide {
  const previewSource = guide.featuredExample?.source;
  return {
    canonical: guide.canonical,
    slug: guide.slug,
    title: guide.title,
    summary: guide.summary,
    category: guide.category,
    effect: guide.effect,
    scope: guide.scope,
    status: guide.status,
    parameterTerms: guide.signatures.flatMap((signature) =>
      signature.parameters.flatMap((parameter) => [
        parameter.key,
        parameter.name,
      ]),
    ).join(" ").toLowerCase(),
    parameterCount: guide.signatures.reduce(
      (total, signature) => total + signature.parameters.length,
      0,
    ),
    ...(previewSource ? { previewSource } : {}),
  };
}

export function zplCommandRoute(guide: Pick<ZplCommandGuide, "slug">): string {
  return `/zpl-commands/${guide.slug}`;
}

export const zplDocumentationCoverage = Object.freeze({
  commands: zplCommandGuides.length,
  signatures: zplCommandGuides.reduce((total, guide) => total + guide.signatures.length, 0),
  parameters: zplCommandGuides.reduce(
    (total, guide) => total + guide.signatures.reduce((sum, signature) => sum + signature.parameters.length, 0),
    0,
  ),
  examples: examplesById.size,
  previewExamples: [...examplesById.values()].filter((example) => example.preview).length,
});
