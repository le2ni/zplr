import { Command } from "@/commands";
import { interpretLabel } from "@/core/interpreter";
import { renderLayout } from "@/core/layoutRenderer";
import { FieldBlock } from "@/commands/FieldBlock";
import { FieldSeparator } from "@/commands/FieldSeparator";
import { getParsedLabelNode } from "@/helper/labelParsing/parse";
import { RenderContext } from "@/types/RenderContext";
import { Canvas } from "skia-canvas";
import { createCanvas, drawCanvasToCanvas } from "./canvas-node";

/**
 * Render ZPL commands to a canvas using Node.js (skia-canvas)
 *
 * @param commands Array of parsed ZPL commands
 * @param width Canvas width in pixels
 * @param height Canvas height in pixels
 * @returns Promise resolving to the rendered Canvas
 */
export async function render(
  commands: Command[],
  width: number,
  height: number
): Promise<Canvas> {
  const parsedLabel = getParsedLabelNode(commands);
  if (parsedLabel) {
    const layout = interpretLabel(parsedLabel);
    const result = await renderLayout<any>(
      layout,
      width,
      height,
      { createCanvas, drawCanvasToCanvas } as any
    );
    return result.canvas as Canvas;
  }

  const canvas = new Canvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get context from canvas");
  }

  const renderContext: RenderContext = {
    ctx: ctx as any,
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
      highlightedCommandIndex: undefined,
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

  if (!commands || commands.length === 0) return canvas;

  const renderCommands =
    commands[commands.length - 1] instanceof FieldSeparator
      ? commands
      : [...commands, new FieldSeparator()];

  for (let command of renderCommands) {
    await command.applyToContext(renderContext);
  }

  return canvas;
}
