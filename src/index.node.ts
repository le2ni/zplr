import { Canvas } from "skia-canvas";
import { Command } from "./commands/index";
import { render as renderInternal } from "./helper/rendering/render-node";
import type { DocumentRenderResult } from "./core/renderDocument";
import {
  createRenderSessionWithPlatform,
  renderZplWithPlatform,
} from "./core/jobRenderer";
import { createCanvas, drawCanvasToCanvas } from "./helper/rendering/canvas-node";
import type {
  RenderDocumentOptions,
  ZplDocument,
} from "./types/ZplDocument";
import type {
  RenderJobOptions,
  RenderJobResult,
  ZplRenderSession,
} from "./types/RenderJob";

// Re-export parse
export { parse } from "./helper/labelParsing/parse";
export { parseDocument } from "./core/documentParser";
export {
  commandCapabilities,
  getCommandCapability,
  getCommandCapabilityStatus,
} from "./core/capabilities";

export type NodeDocumentRenderResult = Omit<
  DocumentRenderResult<any>,
  "canvas"
> & { canvas: Canvas };

/** @deprecated Use renderZpl() or createRenderSession(); retained through 0.2. */
export async function renderDocument(
  document: ZplDocument,
  options: RenderDocumentOptions = {}
): Promise<NodeDocumentRenderResult[]> {
  const result = await createRenderSessionWithPlatform<any>(
    { createCanvas, drawCanvasToCanvas } as any,
    options
  ).renderDocument(document);
  return result.labels.map((label) => ({
    ...label,
    canvas: label.canvas as Canvas,
  }));
}

/** Parse and render a complete ZPL job with a fresh virtual printer state. */
export async function renderZpl(
  source: string,
  options: RenderJobOptions = {}
): Promise<RenderJobResult<Canvas>> {
  return renderZplWithPlatform<any>(source, options, {
    createCanvas,
    drawCanvasToCanvas,
  } as any) as Promise<RenderJobResult<Canvas>>;
}

/** Create an explicit FIFO-serialized virtual printer session. */
export function createRenderSession(
  options: RenderJobOptions = {}
): ZplRenderSession<Canvas> {
  return createRenderSessionWithPlatform<any>({
    createCanvas,
    drawCanvasToCanvas,
  } as any, options) as ZplRenderSession<Canvas>;
}

export async function renderZplPNG(
  source: string,
  options: RenderJobOptions = {}
): Promise<Buffer[]> {
  const result = await renderZpl(source, options);
  return Promise.all(result.labels.map((label) => label.canvas!.toBuffer("png")));
}

/**
 * Render ZPL commands to a canvas using Node.js (skia-canvas)
 *
 * @param commands - Array of parsed ZPL commands from the parse() function
 * @param width - Width of the canvas in pixels
 * @param height - Height of the canvas in pixels
 * @returns Promise resolving to the rendered Canvas
 *
 * @example
 * import { parse, render } from "zplr/node";
 *
 * const commands = parse("^XA^FO100,100^FDHello^FS^XZ");
 * const canvas = await render(commands[0], 400, 600);
 *
 * // Save to file (skia-canvas specific feature)
 * await canvas.toFile("output.png");
 *
 * @deprecated Use renderZpl(); retained through the 0.2 release line.
 */
export async function render(
  commands: Command[],
  width: number,
  height: number
): Promise<Canvas> {
  return renderInternal(commands, width, height);
}

/**
 * Convenience function to parse and render ZPL in one call
 *
 * @param zpl - ZPL string to parse and render
 * @param width - Width of the canvas in pixels
 * @param height - Height of the canvas in pixels
 * @returns Promise resolving to array of Canvas instances (one per label)
 *
 * @example
 * import { parseAndRender } from "zplr/node";
 *
 * const canvases = await parseAndRender("^XA^FO100,100^FDHello^FS^XZ", 400, 600);
 * await canvases[0].toFile("label.png");
 */
/** @deprecated Use renderZpl(); retained through the 0.2 release line. */
export async function parseAndRender(
  zpl: string,
  width: number,
  height: number
): Promise<Canvas[]> {
  const result = await renderZpl(zpl, { width, height });
  return result.labels.map((label) => label.canvas!);
}

/**
 * Convenience function to parse, render, and export ZPL as PNG buffers
 *
 * @param zpl - ZPL string to parse and render
 * @param width - Width of the canvas in pixels
 * @param height - Height of the canvas in pixels
 * @returns Promise resolving to array of PNG Buffers (one per label)
 *
 * @example
 * import { parseAndRenderPNG } from "zplr/node";
 * import fs from "fs/promises";
 *
 * const pngBuffers = await parseAndRenderPNG("^XA^FO100,100^FDHello^FS^XZ", 400, 600);
 * await fs.writeFile("label.png", pngBuffers[0]);
 */
/** @deprecated Use renderZplPNG(); retained through the 0.2 release line. */
export async function parseAndRenderPNG(
  zpl: string,
  width: number,
  height: number
): Promise<Buffer[]> {
  const canvases = await parseAndRender(zpl, width, height);
  const buffers: Buffer[] = [];

  for (const canvas of canvases) {
    const buffer = await canvas.toBuffer("png");
    buffers.push(buffer);
  }

  return buffers;
}

// Export types
export type { CommandClass } from "./types/CommandClass";
export type { Orientation } from "./types/Orientation";
export type { RenderContext } from "./types/RenderContext";
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
  FontProvider,
  MonochromeRaster,
  PrintDensity,
  RenderJobOptions,
  RenderJobResult,
  RenderedLabel,
  RenderLimits,
  ZplRenderSession,
} from "./types/RenderJob";
