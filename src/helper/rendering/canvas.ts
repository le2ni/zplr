/**
 * Platform-agnostic canvas interface
 *
 * This interface abstracts the differences between skia-canvas (Node.js)
 * and HTMLCanvasElement (web) to provide a unified API.
 */
export interface CanvasLike {
  width: number;
  height: number;
  getContext(contextId: "2d"): CanvasRenderingContext2D | null;
}

/**
 * A function that creates a new canvas instance
 */
export type CanvasFactory<TCanvas extends CanvasLike = CanvasLike> = (
  width?: number,
  height?: number
) => TCanvas;

/** Minimal host adapter used after the canonical packed raster is complete. */
export interface CanvasPlatform<TCanvas extends CanvasLike = CanvasLike> {
  createCanvas: CanvasFactory<TCanvas>;
}
