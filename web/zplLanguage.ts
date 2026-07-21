import type * as Monaco from "monaco-editor";
import {
  findCommandAtOffset,
  parseDocument,
  type CommandCapability,
  type SourceSpan,
  type ZplCommandNode,
  type ZplSyntaxState,
} from "../src/index.web";

export interface ZplCommandDefinition {
  syntax: string;
  parameters: readonly string[];
  snippet?: string;
  example?: string;
}

// Parameter metadata for the commands people use while composing labels. The
// capability catalog still supplies completion and hover support for every ZPL
// II command, including printer, network, and RFID commands.
const commandDefinitions: Readonly<Record<string, ZplCommandDefinition>> = {
  "^A": definition("^Afont,orientation,height,width", ["font", "orientation", "height", "width"], "^A${1:0}${2:N},${3:30},${4:30}"),
  "^A@": definition("^A@orientation,height,width,font", ["orientation", "height", "width", "font name"], "^A@${1:N},${2:30},${3:30},${4:R:FONT.TTF}"),
  "^B0": definition("^B0orientation,magnification,error-control,menu-symbol,structured-append", ["orientation", "magnification", "error control", "menu symbol", "structured append"], "^B0${1:N},${2:2},${3:Y},${4:N},${5:1}"),
  "^B1": barcode("^B1orientation,check-digit,height,interpretation-line,above", "^B1${1:N},${2:N},${3:100},${4:Y},${5:N}"),
  "^B2": barcode("^B2orientation,height,interpretation-line,above,check-digit", "^B2${1:N},${2:100},${3:Y},${4:N},${5:N}"),
  "^B3": barcode("^B3orientation,check-digit,height,interpretation-line,above", "^B3${1:N},${2:N},${3:100},${4:Y},${5:N}"),
  "^B4": barcode("^B4orientation,height,interpretation-line,mode", "^B4${1:N},${2:100},${3:Y},${4:0}"),
  "^B7": definition("^B7orientation,height,security,columns,rows,truncate", ["orientation", "row height", "security level", "columns", "rows", "truncate"], "^B7${1:N},${2:5},${3:5},${4:8},${5:0},${6:N}"),
  "^B8": barcode("^B8orientation,height,interpretation-line,above", "^B8${1:N},${2:100},${3:Y},${4:N}"),
  "^B9": barcode("^B9orientation,height,interpretation-line,above,check-digit", "^B9${1:N},${2:100},${3:Y},${4:N},${5:Y}"),
  "^BA": barcode("^BAorientation,height,interpretation-line,above,check-digit", "^BA${1:N},${2:100},${3:Y},${4:N},${5:N}"),
  "^BB": definition("^BBorientation,height,security,characters-per-row,rows,mode", ["orientation", "height", "security", "characters per row", "rows", "mode"], "^BB${1:N},${2:40},${3:1},${4:0},${5:0},${6:F}"),
  "^BC": definition("^BCorientation,height,interpretation-line,above,check-digit,mode", ["orientation", "height", "interpretation line", "line above", "check digit", "mode"], "^BC${1:N},${2:100},${3:Y},${4:N},${5:N},${6:A}", "^BCN,100,Y,N,N,A"),
  "^BD": definition("^BDmode,symbol-number,total-symbols", ["mode", "symbol number", "total symbols"], "^BD${1:2},${2:1},${3:1}"),
  "^BE": barcode("^BEorientation,height,interpretation-line,above", "^BE${1:N},${2:100},${3:Y},${4:N}"),
  "^BF": definition("^BForientation,height,mode", ["orientation", "height", "mode"], "^BF${1:N},${2:5},${3:0}"),
  "^BI": barcode("^BIorientation,height,interpretation-line,above", "^BI${1:N},${2:100},${3:Y},${4:N}"),
  "^BJ": barcode("^BJorientation,height,interpretation-line,above", "^BJ${1:N},${2:100},${3:Y},${4:N}"),
  "^BK": definition("^BKorientation,check-digit,height,interpretation-line,above,start-stop", ["orientation", "check digit", "height", "interpretation line", "line above", "start/stop"], "^BK${1:N},${2:N},${3:100},${4:Y},${5:N},${6:A}"),
  "^BL": barcode("^BLorientation,height,interpretation-line,above", "^BL${1:N},${2:100},${3:Y},${4:N}"),
  "^BM": definition("^BMorientation,check-digit,height,interpretation-line,above,check-digit-scheme", ["orientation", "check digit", "height", "interpretation line", "line above", "check digit scheme"], "^BM${1:N},${2:N},${3:100},${4:Y},${5:N},${6:B}"),
  "^BO": definition("^BOorientation,magnification,error-control,menu-symbol,structured-append", ["orientation", "magnification", "error control", "menu symbol", "structured append"], "^BO${1:N},${2:2},${3:Y},${4:N},${5:1}"),
  "^BP": barcode("^BPorientation,check-digit,height,interpretation-line,above", "^BP${1:N},${2:Y},${3:100},${4:Y},${5:N}"),
  "^BQ": definition("^BQorientation,model,magnification,error-correction,mask", ["orientation", "model", "magnification", "error correction", "mask"], "^BQ${1:N},${2:2},${3:5},${4:Q},${5:7}", "^BQN,2,5\n^FDQA,HELLO^FS"),
  "^BR": definition("^BRorientation,symbology,magnification,separators,height,interpretation-line", ["orientation", "symbology", "magnification", "separator height", "height", "interpretation line"], "^BR${1:N},${2:6},${3:2},${4:1},${5:100},${6:Y}"),
  "^BS": barcode("^BSorientation,height,interpretation-line,above", "^BS${1:N},${2:50},${3:Y},${4:N}"),
  "^BT": definition("^BTorientation,width-ratio,height,interpretation-line,above", ["orientation", "width ratio", "height", "interpretation line", "line above"], "^BT${1:N},${2:2},${3:100},${4:Y},${5:N}"),
  "^BU": barcode("^BUorientation,height,interpretation-line,above,check-digit", "^BU${1:N},${2:100},${3:Y},${4:N},${5:Y}"),
  "^BX": definition("^BXorientation,height,quality,columns,rows,format,escape,aspect", ["orientation", "module height", "quality", "columns", "rows", "format ID", "escape character", "aspect ratio"], "^BX${1:N},${2:6},${3:200},${4:0},${5:0},${6:0},${7:_},${8:1}"),
  "^BY": definition("^BYmodule-width,wide-to-narrow,height", ["module width", "wide-to-narrow ratio", "height"], "^BY${1:2},${2:3},${3:100}", "^BY2,3,100"),
  "^CC": definition("^CCcaret", ["new format prefix"], "^CC${1:!}"),
  "~CC": definition("~CCcaret", ["new format prefix"], "~CC${1:!}"),
  "^CD": definition("^CDdelimiter", ["new parameter delimiter"], "^CD${1:;}"),
  "~CD": definition("~CDdelimiter", ["new parameter delimiter"], "~CD${1:;}"),
  "^CF": definition("^CFfont,height,width", ["font", "height", "width"], "^CF${1:0},${2:30},${3:30}"),
  "^CI": definition("^CIcharacter-set,source-1,destination-1,...", ["character set", "source code", "destination code"], "^CI${1:28}", "^CI28"),
  "^CM": definition("^CMalias-b,alias-e,alias-r,alias-a", ["B: alias", "E: alias", "R: alias", "A: alias"], "^CM${1:R},${2:E},${3:B},${4:A}"),
  "^CT": definition("^CTtilde", ["new control prefix"], "^CT${1:!}"),
  "~CT": definition("~CTtilde", ["new control prefix"], "~CT${1:!}"),
  "^CV": definition("^CVvalidation", ["enable validation: Y/N"], "^CV${1|Y,N|}"),
  "^CW": definition("^CWidentifier,font", ["font identifier", "font name"], "^CW${1:E},${2:R:FONT.TTF}"),
  "^DF": definition("^DFformat-name", ["stored format name"], "^DF${1:R:FORMAT.ZPL}"),
  "~DG": definition("~DGname,total-bytes,bytes-per-row,data", ["graphic name", "total bytes", "bytes per row", "ASCII hex data"], "~DG${1:R:IMAGE.GRF},${2:0},${3:0},${4:data}"),
  "^FB": definition("^FBwidth,max-lines,line-spacing,justification,hanging-indent", ["block width", "maximum lines", "line spacing", "justification", "hanging indent"], "^FB${1:500},${2:3},${3:0},${4:L},${5:0}"),
  "^FC": definition("^FCprimary,secondary,tertiary", ["primary indicator", "secondary indicator", "tertiary indicator"], "^FC${1:%},${2:#},${3:@}"),
  "^FD": definition("^FDdata", ["field data"], "^FD${1:text}^FS", "^FDHello ZPL^FS"),
  "^FH": definition("^FHindicator", ["hexadecimal indicator"], "^FH${1:_}"),
  "^FL": definition("^FLbase-font,link-font,link-font-2", ["base font", "linked font", "second linked font"], "^FL${1:0},${2:E},${3:F}"),
  "^FM": definition("^FMx1,y1,x2,y2,...", ["x coordinate", "y coordinate"], "^FM${1:20},${2:20},${3:200},${4:20}"),
  "^FN": definition("^FNfield-number,prompt", ["field number", "prompt"], "^FN${1:1},${2:Name}"),
  "^FO": definition("^FOx,y,justification", ["x position", "y position", "justification"], "^FO${1:40},${2:40},${3:0}", "^FO40,40"),
  "^FP": definition("^FPdirection,additional-spacing", ["direction", "additional spacing"], "^FP${1:H},${2:0}"),
  "^FR": definition("^FR", [], "^FR"),
  "^FS": definition("^FS", [], "^FS"),
  "^FT": definition("^FTx,y,justification", ["x position", "y baseline", "justification"], "^FT${1:40},${2:80},${3:0}"),
  "^FV": definition("^FVvariable-data", ["variable field data"], "^FV${1:data}^FS"),
  "^FW": definition("^FWorientation,justification", ["default orientation", "justification"], "^FW${1:N},${2:0}"),
  "^FX": definition("^FXcomment", ["comment text"], "^FX ${1:comment}"),
  "^GB": definition("^GBwidth,height,thickness,color,rounding", ["width", "height", "border thickness", "color", "corner rounding"], "^GB${1:300},${2:150},${3:3},${4:B},${5:0}^FS"),
  "^GC": definition("^GCdiameter,thickness,color", ["diameter", "border thickness", "color"], "^GC${1:100},${2:3},${3:B}^FS"),
  "^GD": definition("^GDwidth,height,thickness,color,orientation", ["width", "height", "thickness", "color", "orientation"], "^GD${1:200},${2:100},${3:3},${4:B},${5:R}^FS"),
  "^GE": definition("^GEwidth,height,thickness,color", ["width", "height", "thickness", "color"], "^GE${1:200},${2:100},${3:3},${4:B}^FS"),
  "^GF": definition("^GFformat,total-bytes,bytes-used,bytes-per-row,data", ["compression format", "total bytes", "bytes used", "bytes per row", "image data"], "^GF${1:A},${2:0},${3:0},${4:0},${5:data}"),
  "^GS": definition("^GSorientation,height,width", ["orientation", "height", "width"], "^GS${1:N},${2:40},${3:40}"),
  "^ID": definition("^IDobject-name", ["object name"], "^ID${1:R:OBJECT.*}"),
  "^IL": definition("^ILimage-name", ["stored image name"], "^IL${1:R:IMAGE.GRF}"),
  "^IM": definition("^IMimage-name", ["stored image name"], "^IM${1:R:IMAGE.GRF}"),
  "^IS": definition("^ISimage-name,print-after-storing", ["image name", "print after storing"], "^IS${1:R:IMAGE.GRF},${2:N}"),
  "^LH": definition("^LHx,y", ["label home x", "label home y"], "^LH${1:0},${2:0}"),
  "^LL": definition("^LLheight", ["label length in dots"], "^LL${1:1218}", "^LL1218"),
  "^LR": definition("^LRreverse", ["reverse entire label: Y/N"], "^LR${1|Y,N|}"),
  "^LS": definition("^LSshift", ["horizontal shift"], "^LS${1:0}"),
  "^LT": definition("^LToffset", ["label top offset"], "^LT${1:0}"),
  "^MC": definition("^MCmap-clear", ["clear bitmap after printing: Y/N"], "^MC${1|Y,N|}"),
  "^ML": definition("^MLmaximum-length", ["maximum label length"], "^ML${1:1218}"),
  "^MN": definition("^MNmedia-type,black-mark-offset", ["media tracking mode", "black mark offset"], "^MN${1:N},${2:0}"),
  "^MU": definition("^MUunits,dpi,base-dpi", ["units", "desired dots per inch", "base dots per inch"], "^MU${1:D},${2:203},${3:203}"),
  "^PA": definition("^PAbidi,character-shaping,open-type,default-glyph", ["bidirectional", "character shaping", "OpenType", "default glyph"], "^PA${1:0},${2:0},${3:0},${4:0}"),
  "^PM": definition("^PMmirror", ["mirror image: Y/N"], "^PM${1|Y,N|}"),
  "^PO": definition("^POorientation", ["print orientation: N/I"], "^PO${1|N,I|}"),
  "^PQ": definition("^PQquantity,pause,replicates,override,cut", ["quantity", "pause/cut interval", "replicates", "override pause count", "cut on error"], "^PQ${1:1},${2:0},${3:1},${4:N},${5:Y}"),
  "^PW": definition("^PWwidth", ["print width in dots"], "^PW${1:812}", "^PW812"),
  "^SE": definition("^SEencoding-table", ["encoding table name"], "^SE${1:R:ENCODING.DAT}"),
  "^SF": definition("^SFmask,increment", ["serialization mask", "increment"], "^SF${1:%%%%0000},${2:1}"),
  "^SL": definition("^SLmode,language", ["clock mode", "language"], "^SL${1:S},${2:1}"),
  "^SN": definition("^SNstarting-value,increment,pad", ["starting value", "increment", "zero pad"], "^SN${1:1},${2:1},${3:Y}"),
  "^SO": definition("^SOfont,offset-1,offset-2,...", ["font", "character offset"], "^SO${1:0},${2:0}"),
  "^ST": definition("^STmonth,day,year,hour,minute,second,format", ["month", "day", "year", "hour", "minute", "second", "date format"], "^ST${1:01},${2:01},${3:2026},${4:12},${5:00},${6:00},${7:0}"),
  "^TB": definition("^TBorientation,width,height", ["orientation", "block width", "block height"], "^TB${1:N},${2:500},${3:200}"),
  "^TO": definition("^TOsource,destination", ["source object", "destination object"], "^TO${1:R:SOURCE.GRF},${2:E:DEST.GRF}"),
  "^XA": definition("^XA", [], "^XA", "^XA"),
  "^XF": definition("^XFformat-name", ["stored format name"], "^XF${1:R:FORMAT.ZPL}^FS"),
  "^XG": definition("^XGgraphic-name,x-magnification,y-magnification", ["stored graphic name", "x magnification", "y magnification"], "^XG${1:R:IMAGE.GRF},${2:1},${3:1}^FS"),
  "^XZ": definition("^XZ", [], "^XZ", "^XZ"),
};

function definition(
  syntax: string,
  parameters: readonly string[],
  snippet?: string,
  example?: string
): ZplCommandDefinition {
  return { syntax, parameters, snippet, example };
}

function barcode(syntax: string, snippet: string): ZplCommandDefinition {
  return definition(
    syntax,
    syntax
      .slice(3)
      .split(",")
      .filter(Boolean)
      .map((parameter) => parameter.replaceAll("-", " ")),
    snippet
  );
}

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
      triggerCharacters: ["^", "~", "!", "#", "$", "%", "@", ","],
      provideCompletionItems(model, position) {
        const offset = model.getOffsetAt(position);
        const syntax = syntaxAtOffset(model, offset);
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
          suggestions: capabilities.map((capability) => {
            const metadata = commandDefinitions[capability.canonical];
            const limitations = capability.limitations?.join(" ");
            const localizedCanonical = localizeZpl(capability.canonical, syntax);
            const localizedSyntax = localizeZpl(metadata?.syntax ?? capability.canonical, syntax);
            return {
              label: localizedCanonical === capability.canonical
                ? capability.canonical
                : { label: localizedCanonical, description: capability.canonical },
              kind:
                capability.category === "barcode"
                  ? monaco.languages.CompletionItemKind.Struct
                  : capability.category === "graphic"
                    ? monaco.languages.CompletionItemKind.Color
                    : monaco.languages.CompletionItemKind.Keyword,
              detail: `${capability.name} · ${capability.status}`,
              documentation: {
                value: [
                  `**${localizedSyntax}**`,
                  capability.name,
                  limitations,
                ].filter(Boolean).join("\n\n"),
                isTrusted: false,
              },
              insertText: localizeZpl(metadata?.snippet ?? capability.canonical, syntax),
              insertTextRules: metadata?.snippet
                ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
                : undefined,
              filterText: `${capability.canonical} ${capability.name}`,
              sortText: `${capability.status === "supported" ? "0" : capability.status === "partial" ? "1" : "2"}-${capability.canonical}`,
              range,
              tags: capability.status === "unsupported"
                ? [monaco.languages.CompletionItemTag.Deprecated]
                : undefined,
            };
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
        const metadata = commandDefinitions[capability.canonical];
        const commandSyntax: ZplSyntaxState = {
          formatPrefix: command.prefixKind === "format" ? command.prefix : "^",
          controlPrefix: command.prefixKind === "control" ? command.prefix : "~",
          delimiter: command.delimiter,
        };
        const contents: Monaco.IMarkdownString[] = [
          { value: `\`${localizeZpl(metadata?.syntax ?? capability.canonical, commandSyntax)}\`` },
          { value: `**${capability.name}**  \n${capability.category} · ${capability.scope} scope · **${capability.status}**` },
        ];
        if (metadata?.parameters.length) {
          contents.push({ value: metadata.parameters.map((parameter, index) => `${index + 1}. ${parameter}`).join("  \n") });
        }
        if (capability.limitations?.length) {
          contents.push({ value: `$(warning) ${capability.limitations.join(" ")}` });
        }
        contents.push({ value: `[Open the official ZPL command reference](${capability.reference})`, isTrusted: true });
        return { range: rangeForSpan(monaco, model, command.span), contents };
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
      signatureHelpTriggerCharacters: [","],
      signatureHelpRetriggerCharacters: [","],
      provideSignatureHelp(model, position) {
        const command = commandAt(model, position);
        const metadata = command && commandDefinitions[command.canonical];
        if (!command || !metadata || metadata.parameters.length === 0) return null;
        const commandStart = model.getPositionAt(command.span.start);
        const currentText = model.getValueInRange({
          startLineNumber: commandStart.lineNumber,
          startColumn: commandStart.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });
        const activeParameter = Math.min(
          metadata.parameters.length - 1,
          Math.max(0, currentText.split(command.delimiter).length - 1)
        );
        return {
          value: {
            activeParameter,
            activeSignature: 0,
            signatures: [{
              label: localizeZpl(metadata.syntax, {
                formatPrefix: command.prefixKind === "format" ? command.prefix : "^",
                controlPrefix: command.prefixKind === "control" ? command.prefix : "~",
                delimiter: command.delimiter,
              }),
              documentation: capabilityMap.get(command.canonical)?.name,
              parameters: metadata.parameters.map((parameter) => ({ label: parameter })),
            }],
          },
          dispose() {},
        };
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
                detail: capabilityMap.get(command.canonical)?.name ?? "ZPL command",
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

          if ((code === "UNKNOWN_COMMAND" || code === "INVALID_COMMAND_PREFIX") && command && command.prefixKind !== "control-character") {
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
  return localizeZpl(commandDefinitions[command]?.snippet ?? command, syntax);
}

export function zplSnippetForSource(command: string, source: string, offset: number): string {
  return zplSnippetFor(command, parseDocument(source.slice(0, offset)).syntax);
}
