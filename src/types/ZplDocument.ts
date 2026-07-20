export type ZplProfile =
  | "zpl-ii-2025"
  /** @deprecated Use zpl-ii-2025. The 2006 name is a compatibility alias in 0.2. */
  | "zpl-ii-2006";

export interface SourceSpan {
  /** Inclusive UTF-16 offset in the original ZPL source. */
  start: number;
  /** Exclusive UTF-16 offset in the original ZPL source. */
  end: number;
}

export type ZplDiagnosticSeverity = "info" | "warning" | "error";
export type ZplDiagnosticPhase = "parse" | "semantic" | "render";

export interface ZplDiagnostic {
  code: string;
  severity: ZplDiagnosticSeverity;
  phase: ZplDiagnosticPhase;
  message: string;
  span?: SourceSpan;
  relatedSpans?: readonly SourceSpan[];
  command?: string;
  labelIndex?: number;
}

export type ZplPrefixKind = "format" | "control" | "control-character";

export interface ZplSyntaxState {
  formatPrefix: string;
  controlPrefix: string;
  delimiter: string;
}
export type CommandCapabilityStatus =
  | "supported"
  | "partial"
  | "non-rendering"
  | "unsupported"
  | "unknown";

export type CommandCategory =
  | "format"
  | "text"
  | "barcode"
  | "graphic"
  | "storage"
  | "printer"
  | "network"
  | "rfid";

export type CommandEffect = "raster" | "job" | "device";
export type CommandPersistenceScope = "field" | "format" | "job" | "session";

export interface ZplCommandNode {
  kind: "command";
  /** Command code without its prefix, for example FO, A, or A@. */
  code: string;
  /** Canonical command identity, including its documented ^ or ~ prefix. */
  canonical: string;
  /** The source prefix, or the matching ASCII control character. */
  prefix: string;
  prefixKind: ZplPrefixKind;
  rawParameters: string;
  /** Parameters split with the delimiter that was active at this command. */
  parameters: string[];
  delimiter: string;
  span: SourceSpan;
  /** Zero-based command index inside the containing label. */
  index: number;
  capability: CommandCapabilityStatus;
}

export interface ZplLabelNode {
  kind: "label";
  /** True when the label started with XA. Invalid fragments are implicit. */
  explicit: boolean;
  commands: ZplCommandNode[];
  span: SourceSpan;
}

export type ZplJobItem = ZplLabelNode | ZplCommandNode;

export interface ZplDocument {
  kind: "document";
  source: string;
  profile: ZplProfile;
  /** Ordered labels and commands that occur outside a label format. */
  items: ZplJobItem[];
  /** Compatibility view containing only renderable and implicit formats. */
  labels: ZplLabelNode[];
  /** Lexical state after the final command, for explicit render sessions. */
  syntax: ZplSyntaxState;
  diagnostics: ZplDiagnostic[];
}

export interface ParseDocumentOptions {
  profile?: ZplProfile;
  /** Initial lexical state used by an explicit printer session. */
  initialSyntax?: Partial<ZplSyntaxState>;
}

export interface RenderDocumentOptions {
  /** Explicit width override in dots. Otherwise ^PW or fallbackSize is used. */
  width?: number;
  /** Explicit height override in dots. Otherwise ^LL or fallbackSize is used. */
  height?: number;
  /** Print-head density in dots per millimetre. Defaults to 8 dpmm. */
  printDensity?: 6 | 8 | 12 | 24;
  /** @deprecated Use printDensity. Retained through the 0.2 release line. */
  dpi?: 150 | 200 | 300 | 600;
  fallbackSize?: {
    width: number;
    height: number;
    unit: "dots" | "mm" | "in";
  };
  strict?: boolean;
  limits?: Partial<{
    maxDimension: number;
    maxPixels: number;
    maxGraphicBytes: number;
    maxSessionBytes: number;
    maxTemplateDepth: number;
    maxExpandedCommands: number;
    maxLabels: number;
  }>;
}

export interface CommandCapability {
  canonical: string;
  prefix: "^" | "~";
  code: string;
  name: string;
  category: CommandCategory;
  effect: CommandEffect;
  scope: CommandPersistenceScope;
  status: Exclude<CommandCapabilityStatus, "unknown">;
  limitations?: readonly string[];
  reference: string;
}
