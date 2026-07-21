import type { CanvasFactory } from "./canvas";

/**
 * Web browser canvas factory using HTMLCanvasElement
 */
export const createCanvas: CanvasFactory<HTMLCanvasElement> = (
  width = 300,
  height = 150
): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
};
