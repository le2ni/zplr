import {
  createRenderSessionWithPlatform,
  renderZplWithPlatform,
} from "./core/jobRenderer";
import { createCanvas } from "./helper/rendering/canvas-node";
import type { Canvas } from "skia-canvas";
import type {
  RenderJobOptions,
  RenderJobResult,
  ZplRenderSession,
} from "./types/RenderJob";

/** The concrete skia-canvas surface returned by the Node adapter. */
export type NodeCanvas = Canvas;

export { parseDocument } from "./core/documentParser";
export {
  commandCapabilities,
  getCommandCapability,
  getCommandCapabilityStatus,
} from "./core/capabilities";
export {
  findCommandAtOffset,
  findHighlightRegionAtPoint,
} from "./core/sourceNavigation";

/** Parse and render a complete ZPL job with fresh virtual-printer state. */
export async function renderZpl(
  source: string,
  options: RenderJobOptions = {}
): Promise<RenderJobResult<NodeCanvas>> {
  return renderZplWithPlatform(source, options, { createCanvas });
}

/** Create a private FIFO-serialized virtual-printer session. */
export function createRenderSession(
  options: RenderJobOptions = {}
): ZplRenderSession<NodeCanvas> {
  return createRenderSessionWithPlatform({ createCanvas }, options);
}

/** Render every printable label in a job to a PNG buffer. */
export async function renderZplPNG(
  source: string,
  options: RenderJobOptions = {}
): Promise<Buffer[]> {
  const result = await renderZpl(source, options);
  return Promise.all(
    result.labels.map((label) => label.canvas.toBuffer("png"))
  );
}

export type {
  HighlightRegion,
  HighlightRegionType,
  TextCaretStop,
} from "./types/HighlightRegion";
export type {
  CommandCapability,
  CommandCategory,
  CommandEffect,
  CommandPersistenceScope,
  CommandCapabilityStatus,
  ZplDiagnosticPhase,
  ZplDiagnosticSeverity,
  ZplJobItem,
  ZplPrefixKind,
  ParseDocumentOptions,
  RenderDocumentOptions,
  SourceSpan,
  ZplCommandNode,
  ZplDiagnostic,
  ZplDocument,
  ZplLabelNode,
  ZplProfile,
  ZplSyntaxState,
} from "./types/ZplDocument";
export type {
  DownloadedFontSource,
  FieldValueMap,
  FontProvider,
  MonochromeRaster,
  PrintDensity,
  RenderJobOptions,
  RenderJobResult,
  RenderedLabel,
  RenderLimits,
  ZplRenderSession,
} from "./types/RenderJob";
