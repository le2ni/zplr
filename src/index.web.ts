import {
  createRenderSessionWithPlatform,
  renderZplWithPlatform,
} from "./core/jobRenderer";
import { createCanvas } from "./helper/rendering/canvas.web";
import type {
  RenderJobOptions,
  RenderJobResult,
  ZplRenderSession,
} from "./types/RenderJob";

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
): Promise<RenderJobResult<HTMLCanvasElement>> {
  return renderZplWithPlatform<HTMLCanvasElement>(source, options, {
    createCanvas,
  });
}

/** Create a private FIFO-serialized virtual-printer session. */
export function createRenderSession(
  options: RenderJobOptions = {}
): ZplRenderSession<HTMLCanvasElement> {
  return createRenderSessionWithPlatform<HTMLCanvasElement>(
    { createCanvas },
    options
  );
}

/** Render every printable label in a job to a PNG blob. */
export async function renderZplPNG(
  source: string,
  options: RenderJobOptions = {}
): Promise<Blob[]> {
  const result = await renderZpl(source, options);
  return Promise.all(
    result.labels.map(
      (label) =>
        new Promise<Blob>((resolve, reject) => {
          label.canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("The rendered label could not be encoded as PNG."));
          }, "image/png");
        })
    )
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
