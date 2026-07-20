import type { HighlightRegion } from "./RenderContext";
import type {
  ParseDocumentOptions,
  RenderDocumentOptions,
  ZplDiagnostic,
  ZplDocument,
} from "./ZplDocument";

export type PrintDensity = 6 | 8 | 12 | 24;

export interface MonochromeRaster {
  readonly width: number;
  readonly height: number;
  readonly stride: number;
  readonly bitOrder: "msb-first";
  /** Packed rows where a set bit represents a black dot. */
  readonly data: Uint8Array;
}

export interface RenderLimits {
  maxDimension: number;
  maxPixels: number;
  maxGraphicBytes: number;
  maxSessionBytes: number;
  maxTemplateDepth: number;
  maxExpandedCommands: number;
  maxLabels: number;
}

export interface DownloadedFontSource {
  /** Canonical printer resource name, including its memory designator. */
  readonly name: string;
  /** Format of the downloaded outline-font bytes. */
  readonly format: "intellifont";
  /** A copy of the bytes supplied by the corresponding download command. */
  readonly data: Uint8Array;
}

export interface FontProvider {
  /**
   * Resolve a printer font to OpenType-compatible bytes. `source` is supplied
   * for downloaded Intellifont resources so the host can decode or convert the
   * embedded font while preserving normal ^A@ and ^CW lookup behavior.
   */
  resolveFont(
    name: string,
    source?: DownloadedFontSource
  ): Promise<ArrayBuffer | Uint8Array | undefined>;
}

export interface DownloadedBitmapGlyph {
  readonly codePoint: number;
  readonly width: number;
  readonly height: number;
  readonly xOffset: number;
  readonly yOffset: number;
  readonly advance: number;
  readonly bytesPerRow: number;
  readonly data: Uint8Array;
}

export interface DownloadedBitmapFont {
  readonly cellWidth: number;
  readonly cellHeight: number;
  readonly baseline: number;
  readonly spaceWidth: number;
  readonly glyphs: ReadonlyMap<number, DownloadedBitmapGlyph>;
}

export interface RenderJobOptions
  extends ParseDocumentOptions,
    RenderDocumentOptions {
  fontProvider?: FontProvider;
  /** RTC source used by ^FC. A fixed Date makes clock fields deterministic. */
  clock?: Date | (() => Date);
}

export interface RenderedLabel<TSurface = never> {
  raster: MonochromeRaster;
  width: number;
  height: number;
  printDensity: PrintDensity;
  diagnostics: ZplDiagnostic[];
  highlightRegions: HighlightRegion[];
  canvas?: TSurface;
}

export interface RenderJobResult<TSurface = never> {
  document: ZplDocument;
  labels: RenderedLabel<TSurface>[];
  diagnostics: ZplDiagnostic[];
}

export interface ZplRenderSession<TSurface = never> {
  render(source: string, options?: RenderJobOptions): Promise<RenderJobResult<TSurface>>;
  renderDocument(
    document: ZplDocument,
    options?: RenderJobOptions
  ): Promise<RenderJobResult<TSurface>>;
  reset(): Promise<void>;
}
