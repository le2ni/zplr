import { Command } from "./commands/index";
import { parse as parseZPL } from "./helper/labelParsing/parse";
import {
  render as renderInternal,
  RenderResult,
} from "./helper/rendering/render.web";
import { HighlightRegion } from "./types/RenderContext";
import type { DocumentRenderResult } from "./core/renderDocument";
import {
  createRenderSessionWithPlatform,
  renderZplWithPlatform,
} from "./core/jobRenderer";
import { createCanvas, drawCanvasToCanvas } from "./helper/rendering/canvas.web";
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

// Re-export types
export type { RenderResult, HighlightRegion };

export interface WebDocumentRenderResult
  extends DocumentRenderResult<HTMLCanvasElement> {}

/** @deprecated Use renderZpl() or createRenderSession(); retained through 0.2. */
export async function renderDocument(
  document: ZplDocument,
  options: RenderDocumentOptions = {}
): Promise<WebDocumentRenderResult[]> {
  const result = await createRenderSessionWithPlatform<HTMLCanvasElement>(
    { createCanvas, drawCanvasToCanvas } as any,
    options
  ).renderDocument(document);
  return result.labels.map((label) => ({
    ...label,
    canvas: label.canvas!,
  }));
}

/** Parse and render a complete ZPL job with a fresh virtual printer state. */
export async function renderZpl(
  source: string,
  options: RenderJobOptions = {}
): Promise<RenderJobResult<HTMLCanvasElement>> {
  return renderZplWithPlatform<HTMLCanvasElement>(source, options, {
    createCanvas,
    drawCanvasToCanvas,
  } as any);
}

/** Create an explicit FIFO-serialized virtual printer session. */
export function createRenderSession(
  options: RenderJobOptions = {}
): ZplRenderSession<HTMLCanvasElement> {
  return createRenderSessionWithPlatform<HTMLCanvasElement>({
    createCanvas,
    drawCanvasToCanvas,
  } as any, options);
}

export async function renderZplPNG(
  source: string,
  options: RenderJobOptions = {}
): Promise<Blob[]> {
  const result = await renderZpl(source, options);
  return Promise.all(
    result.labels.map(
      (label) =>
        new Promise<Blob>((resolve, reject) => {
          label.canvas!.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error("The rendered label could not be encoded as PNG."));
          }, "image/png");
        })
    )
  );
}

/**
 * Render ZPL commands to a canvas using web browser APIs
 *
 * This is the standard render function that returns just the canvas element,
 * as documented in the README. For advanced features like highlight regions,
 * use renderAdvanced() instead.
 *
 * @param commands - Array of parsed ZPL commands from the parse() function
 * @param width - Width of the canvas in pixels
 * @param height - Height of the canvas in pixels
 * @returns Promise resolving to the rendered HTMLCanvasElement
 *
 * @example
 * import { parse, render } from "zplr/web";
 *
 * const commands = parse("^XA^FO100,100^FDHello^FS^XZ");
 * const canvas = await render(commands[0], 400, 600);
 *
 * // Append to document
 * document.body.appendChild(canvas);
 *
 * @deprecated Use renderZpl(); retained through the 0.2 release line.
 */
export async function render(
  commands: Command[],
  width: number,
  height: number
): Promise<HTMLCanvasElement> {
  const result = await renderInternal(commands, width, height);
  return result.canvas;
}

/**
 * Advanced render function that returns both canvas and highlight regions
 *
 * Use this function when you need access to bounding box information for
 * interactive features like click-to-select or hover highlighting.
 *
 * @param commands - Array of parsed ZPL commands from the parse() function
 * @param width - Width of the canvas in pixels
 * @param height - Height of the canvas in pixels
 * @param highlightedCommandIndex - Optional index of command to highlight
 * @returns Promise resolving to RenderResult with canvas and highlight regions
 *
 * @example
 * import { parse, renderAdvanced } from "zplr/web";
 *
 * const commands = parse("^XA^FO100,100^FDHello^FS^XZ");
 * const result = await renderAdvanced(commands[0], 400, 600, 5);
 *
 * // Use canvas
 * document.body.appendChild(result.canvas);
 *
 * // Use highlight regions for interactive features
 * result.canvas.addEventListener('click', (e) => {
 *   const commandIndex = findCommandAtCoordinate(result.highlightRegions, e.offsetX, e.offsetY);
 *   console.log('Clicked command:', commandIndex);
 * });
 *
 * @deprecated Use renderZpl() and its highlightRegions; retained through 0.2.
 */
export async function renderAdvanced(
  commands: Command[],
  width: number,
  height: number,
  highlightedCommandIndex?: number
): Promise<RenderResult> {
  return renderInternal(commands, width, height, highlightedCommandIndex);
}

/**
 * Convenience function to parse and render ZPL in one call
 *
 * @param zpl - ZPL string to parse and render
 * @param width - Width of the canvas in pixels
 * @param height - Height of the canvas in pixels
 * @returns Promise resolving to array of HTMLCanvasElement instances (one per label)
 *
 * @example
 * import { parseAndRender } from "zplr/web";
 *
 * const canvases = await parseAndRender("^XA^FO100,100^FDHello^FS^XZ", 400, 600);
 * document.body.appendChild(canvases[0]);
 */
/** @deprecated Use renderZpl(); retained through the 0.2 release line. */
export async function parseAndRender(
  zpl: string,
  width: number,
  height: number
): Promise<HTMLCanvasElement[]> {
  const result = await renderZpl(zpl, { width, height });
  return result.labels.map((label) => label.canvas!);
}

/**
 * Advanced parse and render function that returns full render results
 *
 * @param zpl - ZPL string to parse and render
 * @param width - Width of the canvas in pixels
 * @param height - Height of the canvas in pixels
 * @param highlightedCommandIndex - Optional index of command to highlight
 * @returns Promise resolving to array of RenderResult instances (one per label)
 *
 * @example
 * import { parseAndRenderAdvanced } from "zplr/web";
 *
 * const results = await parseAndRenderAdvanced("^XA^FO100,100^FDHello^FS^XZ", 400, 600);
 * document.body.appendChild(results[0].canvas);
 */
/** @deprecated Use renderZpl(); retained through the 0.2 release line. */
export async function parseAndRenderAdvanced(
  zpl: string,
  width: number,
  height: number,
  highlightedCommandIndex?: number
): Promise<RenderResult[]> {
  if (highlightedCommandIndex !== undefined) {
    const labels = parseZPL(zpl);
    return Promise.all(
      labels.map((commands) =>
        renderAdvanced(commands, width, height, highlightedCommandIndex)
      )
    );
  }
  const result = await renderZpl(zpl, { width, height });
  return result.labels.map((label) => ({
    canvas: label.canvas!,
    highlightRegions: label.highlightRegions,
    diagnostics: label.diagnostics,
  }));
}

/**
 * Convenience function to parse, render, and export ZPL as PNG data URLs
 *
 * @param zpl - ZPL string to parse and render
 * @param width - Width of the canvas in pixels
 * @param height - Height of the canvas in pixels
 * @returns Promise resolving to array of PNG data URLs (one per label)
 *
 * @example
 * import { parseAndRenderPNG } from "zplr/web";
 *
 * const pngDataUrls = await parseAndRenderPNG("^XA^FO100,100^FDHello^FS^XZ", 400, 600);
 *
 * // Use in an img tag
 * const img = document.createElement('img');
 * img.src = pngDataUrls[0];
 * document.body.appendChild(img);
 */
/** @deprecated Use renderZplPNG(); retained through the 0.2 release line. */
export async function parseAndRenderPNG(
  zpl: string,
  width: number,
  height: number
): Promise<string[]> {
  const canvases = await parseAndRender(zpl, width, height);
  return canvases.map((canvas) => canvas.toDataURL("image/png"));
}

/**
 * Find the command index at a specific position in the ZPL string
 *
 * @param zpl - ZPL string to parse
 * @param position - Character position (cursor position) in the ZPL string
 * @param labelIndex - Index of the label (default: 0)
 * @returns Command index at the given position, or undefined if not found
 *
 * @example
 * import { findCommandAtPosition } from "zplr/web";
 *
 * const zpl = "^XA^FO100,100^FDHello^FS^XZ";
 * const commandIndex = findCommandAtPosition(zpl, 10); // Position within ^FO command
 */
export function findCommandAtPosition(
  zpl: string,
  position: number,
  labelIndex: number = 0
): number | undefined {
  const labels = parseZPL(zpl);
  if (!labels[labelIndex]) return undefined;

  const commands = labels[labelIndex];
  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    if (
      cmd.sourceStart !== undefined &&
      cmd.sourceEnd !== undefined &&
      position >= cmd.sourceStart &&
      position < cmd.sourceEnd
    ) {
      return i;
    }
  }
  return undefined;
}

/**
 * Find the command index at a specific canvas coordinate
 *
 * @param highlightRegions - Array of highlight regions from render result
 * @param x - X coordinate on canvas
 * @param y - Y coordinate on canvas
 * @returns Command index at the given coordinate, or undefined if not found
 *
 * @example
 * import { render, findCommandAtCoordinate } from "zplr/web";
 *
 * const result = await render(commands, 400, 600);
 * const commandIndex = findCommandAtCoordinate(result.highlightRegions, mouseX, mouseY);
 */
export function findCommandAtCoordinate(
  highlightRegions: HighlightRegion[],
  x: number,
  y: number
): number | undefined {
  // Iterate in reverse to check top-most elements first
  for (let i = highlightRegions.length - 1; i >= 0; i--) {
    const region = highlightRegions[i];

    switch (region.type) {
      case "box":
      case "ellipse":
      case "barcode":
      case "text":
        if (region.width && region.height) {
          if (
            x >= region.x &&
            x <= region.x + region.width &&
            y >= region.y &&
            y <= region.y + region.height
          ) {
            return region.commandIndex;
          }
        }
        break;

      case "circle":
        if (region.radius) {
          const dx = x - region.x;
          const dy = y - region.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance <= region.radius) {
            return region.commandIndex;
          }
        }
        break;

      case "origin":
        // Check if within small clickable area around origin (20px radius)
        const dx = x - region.x;
        const dy = y - region.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= 20) {
          return region.commandIndex;
        }
        break;
    }
  }

  return undefined;
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
