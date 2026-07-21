import { Canvas } from "skia-canvas";
import type { CanvasFactory, CanvasLike } from "./canvas";

export type NodeCanvasLike = Canvas & CanvasLike;

/**
 * Node.js canvas factory using skia-canvas
 */
export const createCanvas: CanvasFactory<NodeCanvasLike> = (
  width = 300,
  height = 150
): NodeCanvasLike =>
  new Canvas(width, height) as unknown as NodeCanvasLike;
