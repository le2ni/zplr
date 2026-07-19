import { Canvas } from "skia-canvas";
import { Command } from "./commands/index";
import { parse as parseZPL } from "./helper/labelParsing/parse";
import { render as renderInternal } from "./helper/rendering/render-node";
import { renderDocumentWithPlatform } from "./core/renderDocument";
import { createCanvas, drawCanvasToCanvas } from "./helper/rendering/canvas-node";
import type {
  RenderDocumentOptions,
  ZplDiagnostic,
  ZplDocument,
} from "./types/ZplDocument";
import type { HighlightRegion } from "./types/RenderContext";

// Re-export parse
export { parse } from "./helper/labelParsing/parse";
export { parseDocument } from "./core/documentParser";
export {
  commandCapabilities,
  getCommandCapability,
} from "./core/capabilities";

export interface NodeDocumentRenderResult {
  canvas: Canvas;
  diagnostics: ZplDiagnostic[];
  highlightRegions: HighlightRegion[];
}

export async function renderDocument(
  document: ZplDocument,
  options: RenderDocumentOptions
): Promise<NodeDocumentRenderResult[]> {
  const results = await renderDocumentWithPlatform<any>(document, options, {
    createCanvas,
    drawCanvasToCanvas,
  } as any);
  return results.map((result) => ({
    ...result,
    canvas: result.canvas as Canvas,
  }));
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
export async function parseAndRender(
  zpl: string,
  width: number,
  height: number
): Promise<Canvas[]> {
  const labels = parseZPL(zpl);
  const canvases: Canvas[] = [];

  for (const commands of labels) {
    const canvas = await render(commands, width, height);
    canvases.push(canvas);
  }

  return canvases;
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
  CommandCapabilityStatus,
  ParseDocumentOptions,
  RenderDocumentOptions,
  SourceSpan,
  ZplCommandNode,
  ZplDiagnostic,
  ZplDocument,
  ZplLabelNode,
  ZplProfile,
} from "./types/ZplDocument";
