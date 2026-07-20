import { Command } from "@/commands";
import { renderDocumentWithPlatform } from "@/core/renderDocument";
import { FieldBlock } from "@/commands/FieldBlock";
import { FieldSeparator } from "@/commands/FieldSeparator";
import { RenderContext, HighlightRegion } from "@/types/RenderContext";
import { createCanvas, drawCanvasToCanvas } from "./canvas.web";
import {
  getParsedLabelMetadata,
  getParsedLabelNode,
} from "@/helper/labelParsing/parse";
import { ZplDiagnostic } from "@/types/ZplDocument";

export interface RenderResult {
  canvas: HTMLCanvasElement;
  highlightRegions: HighlightRegion[];
  diagnostics: ZplDiagnostic[];
}

/**
 * Render ZPL commands to a canvas using web browser APIs
 *
 * @param commands Array of parsed ZPL commands
 * @param width Canvas width in pixels
 * @param height Canvas height in pixels
 * @param highlightedCommandIndex Optional index of command to highlight
 * @returns Promise resolving to the rendered HTMLCanvasElement and highlight regions
 */
export async function render(
  commands: Command[],
  width: number,
  height: number,
  highlightedCommandIndex?: number
): Promise<RenderResult> {
  const parsedLabel = getParsedLabelNode(commands);
  if (parsedLabel) {
    const [rendered] = await renderDocumentWithPlatform<HTMLCanvasElement>(
      {
        kind: "document",
        source: "",
        profile: "zpl-ii-2025",
        items: [parsedLabel],
        labels: [parsedLabel],
        syntax: { formatPrefix: "^", controlPrefix: "~", delimiter: "," },
        diagnostics: [],
      },
      { width, height },
      { createCanvas, drawCanvasToCanvas } as any
    );
    const metadata = getParsedLabelMetadata(commands);
    const highlightRegions = rendered.highlightRegions
      .map((region) => {
        const legacyIndex = metadata?.commandIndexMap.get(region.commandIndex);
        return legacyIndex === undefined
          ? undefined
          : { ...region, commandIndex: legacyIndex };
      })
      .filter((region): region is HighlightRegion => region !== undefined);
    drawHighlights(
      rendered.canvas.getContext("2d"),
      highlightRegions,
      highlightedCommandIndex
    );
    return { ...rendered, highlightRegions };
  }

  const canvas = createCanvas(width, height) as HTMLCanvasElement;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get context from canvas");
  }

  const renderContext: RenderContext = {
    ctx,
    barcodeCommand: undefined,
    fieldData: "",
    fieldBlock: new FieldBlock(""),
    barcodeDefaults: {
      moduleWidth: 2,
      ratio: 3,
      height: 10,
    },
    charHeight: 9,
    charWidth: 5,
    fontKey: "A",
    rotation: 0,
    x: 0,
    y: 0,
    fieldX: 0,
    fieldY: 0,
    labelReversePrint: false,
    createCanvas,
    drawCanvasToCanvas,
    highlight: {
      highlightedCommandIndex,
      currentCommandIndex: 0,
      regions: [],
      currentFieldStartIndex: undefined,
      fieldDataCommandIndex: undefined,
    },
  };

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "black";
  ctx.strokeStyle = "black";

  if (!commands || commands.length === 0) {
    return { canvas, highlightRegions: [], diagnostics: [] };
  }

  const renderCommands =
    commands[commands.length - 1] instanceof FieldSeparator
      ? commands
      : [...commands, new FieldSeparator()];

  // Render all commands
  for (let i = 0; i < renderCommands.length; i++) {
    const command = renderCommands[i];
    renderContext.highlight.currentCommandIndex = i;
    await command.applyToContext(renderContext);
  }

  // Draw all highlights on top
  for (const region of renderContext.highlight.regions) {
    // Only draw highlight if this region's command should be highlighted
    if (
      highlightedCommandIndex !== undefined &&
      region.commandIndex === highlightedCommandIndex
    ) {
      ctx.save();
      ctx.fillStyle = "rgba(255, 165, 0, 0.3)";
      ctx.strokeStyle = "rgba(255, 165, 0, 0.8)";
      ctx.lineWidth = 2;

      switch (region.type) {
        case "box":
        case "ellipse":
          if (region.width && region.height) {
            ctx.fillRect(region.x, region.y, region.width, region.height);
            ctx.strokeRect(region.x, region.y, region.width, region.height);
          }
          break;
        case "circle":
          if (region.radius) {
            ctx.beginPath();
            ctx.arc(region.x, region.y, region.radius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
          }
          break;
        case "barcode":
          if (region.width && region.height) {
            ctx.fillRect(region.x, region.y, region.width, region.height);
            ctx.strokeRect(region.x, region.y, region.width, region.height);
          }
          break;
        case "text":
          if (region.width && region.height) {
            ctx.fillRect(region.x, region.y, region.width, region.height);
            ctx.strokeRect(region.x, region.y, region.width, region.height);
          }
          break;
        case "origin":
          // Draw crosshair at origin
          const size = 20;
          ctx.beginPath();
          ctx.moveTo(region.x - size, region.y);
          ctx.lineTo(region.x + size, region.y);
          ctx.moveTo(region.x, region.y - size);
          ctx.lineTo(region.x, region.y + size);
          ctx.stroke();

          // Draw circle at origin point
          ctx.fillStyle = "rgba(255, 165, 0, 0.5)";
          ctx.beginPath();
          ctx.arc(region.x, region.y, 5, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
          break;
      }
      ctx.restore();
    }
  }

  return {
    canvas,
    highlightRegions: renderContext.highlight.regions,
    diagnostics: [],
  };
}

function drawHighlights(
  ctx: CanvasRenderingContext2D | null,
  regions: HighlightRegion[],
  highlightedCommandIndex?: number
): void {
  if (!ctx || highlightedCommandIndex === undefined) return;
  for (const region of regions) {
    if (region.commandIndex !== highlightedCommandIndex) continue;
    ctx.save();
    ctx.fillStyle = "rgba(255, 165, 0, 0.3)";
    ctx.strokeStyle = "rgba(255, 165, 0, 0.8)";
    ctx.lineWidth = 2;
    if (
      (region.type === "box" ||
        region.type === "ellipse" ||
        region.type === "barcode" ||
        region.type === "text") &&
      region.width !== undefined &&
      region.height !== undefined
    ) {
      ctx.fillRect(region.x, region.y, region.width, region.height);
      ctx.strokeRect(region.x, region.y, region.width, region.height);
    } else if (region.type === "circle" && region.radius !== undefined) {
      ctx.beginPath();
      ctx.arc(region.x, region.y, region.radius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    } else if (region.type === "origin") {
      const size = 20;
      ctx.beginPath();
      ctx.moveTo(region.x - size, region.y);
      ctx.lineTo(region.x + size, region.y);
      ctx.moveTo(region.x, region.y - size);
      ctx.lineTo(region.x, region.y + size);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(region.x, region.y, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }
}
