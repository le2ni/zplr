export type ZplProfile = "zpl-ii-2006";

export interface SourceSpan {
  /** Inclusive UTF-16 offset in the original ZPL source. */
  start: number;
  /** Exclusive UTF-16 offset in the original ZPL source. */
  end: number;
}

export type ZplDiagnosticSeverity = "warning" | "error";
export type ZplDiagnosticPhase = "parse" | "semantic" | "render";

export interface ZplDiagnostic {
  code: string;
  severity: ZplDiagnosticSeverity;
  phase: ZplDiagnosticPhase;
  message: string;
  span?: SourceSpan;
  command?: string;
  labelIndex?: number;
}

export type ZplPrefixKind = "format" | "control" | "control-character";
export type CommandCapabilityStatus =
  | "supported"
  | "partial"
  | "unsupported"
  | "unknown";

export interface ZplCommandNode {
  kind: "command";
  /** Command code without its prefix, for example FO, A, or A@. */
  code: string;
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

export interface ZplDocument {
  kind: "document";
  source: string;
  profile: ZplProfile;
  labels: ZplLabelNode[];
  diagnostics: ZplDiagnostic[];
}

export interface ParseDocumentOptions {
  profile?: ZplProfile;
}

export interface RenderDocumentOptions {
  width: number;
  height: number;
  /** Used for ZPL defaults that depend on print-head resolution. */
  dpi?: 150 | 200 | 300 | 600;
}

export interface CommandCapability {
  code: string;
  name: string;
  status: Exclude<CommandCapabilityStatus, "unknown">;
  limitations?: readonly string[];
}
