import type { MonochromeRaster } from "@/types/RenderJob";
import type { Orientation } from "@/types/Orientation";

export type DotOperation = "set" | "clear" | "xor";

export function createMonochromeRaster(
  width: number,
  height: number
): MonochromeRaster {
  const normalizedWidth = Math.max(0, Math.trunc(width));
  const normalizedHeight = Math.max(0, Math.trunc(height));
  const stride = Math.ceil(normalizedWidth / 8);
  return {
    width: normalizedWidth,
    height: normalizedHeight,
    stride,
    bitOrder: "msb-first",
    data: new Uint8Array(stride * normalizedHeight),
  };
}

export function cropRasterHeight(
  raster: MonochromeRaster,
  height: number
): MonochromeRaster {
  const normalized = Math.max(0, Math.min(raster.height, Math.trunc(height)));
  return {
    width: raster.width,
    height: normalized,
    stride: raster.stride,
    bitOrder: "msb-first",
    data: raster.data.slice(0, raster.stride * normalized),
  };
}

export function lastDarkRow(raster: MonochromeRaster): number {
  for (let y = raster.height - 1; y >= 0; y--) {
    const start = y * raster.stride;
    for (let x = 0; x < raster.stride; x++) {
      if (raster.data[start + x] !== 0) return y;
    }
  }
  return -1;
}

export function getDot(raster: MonochromeRaster, x: number, y: number): boolean {
  x = Math.trunc(x);
  y = Math.trunc(y);
  if (x < 0 || y < 0 || x >= raster.width || y >= raster.height) return false;
  const mask = 0x80 >> (x & 7);
  return (raster.data[y * raster.stride + (x >> 3)] & mask) !== 0;
}

export function setDot(
  raster: MonochromeRaster,
  x: number,
  y: number,
  operation: DotOperation = "set"
): void {
  x = Math.trunc(x);
  y = Math.trunc(y);
  if (x < 0 || y < 0 || x >= raster.width || y >= raster.height) return;
  const index = y * raster.stride + (x >> 3);
  const mask = 0x80 >> (x & 7);
  if (operation === "set") raster.data[index] |= mask;
  else if (operation === "clear") raster.data[index] &= ~mask;
  else raster.data[index] ^= mask;
}

export function fillRect(
  raster: MonochromeRaster,
  x: number,
  y: number,
  width: number,
  height: number,
  operation: DotOperation = "set"
): void {
  const startX = Math.max(0, Math.trunc(x));
  const startY = Math.max(0, Math.trunc(y));
  const endX = Math.min(raster.width, Math.ceil(x + width));
  const endY = Math.min(raster.height, Math.ceil(y + height));
  for (let py = startY; py < endY; py++) {
    for (let px = startX; px < endX; px++) setDot(raster, px, py, operation);
  }
}

export function strokeRect(
  raster: MonochromeRaster,
  x: number,
  y: number,
  width: number,
  height: number,
  thickness: number,
  operation: DotOperation = "set"
): void {
  const t = Math.max(1, Math.trunc(thickness));
  fillRect(raster, x, y, width, Math.min(t, height), operation);
  fillRect(raster, x, y + Math.max(0, height - t), width, Math.min(t, height), operation);
  fillRect(raster, x, y + t, Math.min(t, width), Math.max(0, height - t * 2), operation);
  fillRect(
    raster,
    x + Math.max(0, width - t),
    y + t,
    Math.min(t, width),
    Math.max(0, height - t * 2),
    operation
  );
}

function insideRoundedRect(
  px: number,
  py: number,
  width: number,
  height: number,
  radius: number
): boolean {
  if (px < 0 || py < 0 || px >= width || py >= height) return false;
  if (radius <= 0) return true;
  const r = Math.min(radius, width / 2, height / 2);
  // Test pixel centers against the continuous rounded rectangle. Testing the
  // integer indexes made the right and bottom arcs differ by one dot from
  // their left and top mirrors, most visibly at the lower-right corner.
  const sampleX = px + 0.5;
  const sampleY = py + 0.5;
  if (sampleX >= r && sampleX <= width - r) return true;
  if (sampleY >= r && sampleY <= height - r) return true;
  const centerX = sampleX < r ? r : width - r;
  const centerY = sampleY < r ? r : height - r;
  const dx = sampleX - centerX;
  const dy = sampleY - centerY;
  return dx * dx + dy * dy <= r * r;
}

/** Draws the ^GB border inward from its declared dimensions. */
export function strokeRoundedRect(
  raster: MonochromeRaster,
  x: number,
  y: number,
  width: number,
  height: number,
  thickness: number,
  rounding: number,
  operation: DotOperation = "set"
): void {
  const w = Math.max(1, Math.trunc(width));
  const h = Math.max(1, Math.trunc(height));
  const t = Math.min(Math.max(1, Math.trunc(thickness)), Math.ceil(Math.min(w, h) / 2));
  const radius = (Math.min(8, Math.max(0, rounding)) / 8) * (Math.min(w, h) / 2);
  if (radius <= 0) {
    strokeRect(raster, x, y, w, h, t, operation);
    return;
  }
  const innerWidth = Math.max(0, w - t * 2);
  const innerHeight = Math.max(0, h - t * 2);
  const innerRadius = Math.max(0, radius - t);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      if (!insideRoundedRect(px, py, w, h, radius)) continue;
      const inner =
        innerWidth > 0 &&
        innerHeight > 0 &&
        insideRoundedRect(px - t, py - t, innerWidth, innerHeight, innerRadius);
      if (!inner) setDot(raster, x + px, y + py, operation);
    }
  }
}

export function drawLine(
  raster: MonochromeRaster,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  thickness = 1,
  operation: DotOperation = "set"
): void {
  x0 = Math.round(x0);
  y0 = Math.round(y0);
  x1 = Math.round(x1);
  y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0);
  const sx = x0 < x1 ? 1 : -1;
  const dy = -Math.abs(y1 - y0);
  const sy = y0 < y1 ? 1 : -1;
  let error = dx + dy;
  const t = Math.max(1, Math.trunc(thickness));
  const offset = Math.floor(t / 2);
  while (true) {
    fillRect(raster, x0 - offset, y0 - offset, t, t, operation);
    if (x0 === x1 && y0 === y1) break;
    const doubled = 2 * error;
    if (doubled >= dy) {
      error += dy;
      x0 += sx;
    }
    if (doubled <= dx) {
      error += dx;
      y0 += sy;
    }
  }
}

export function strokeEllipse(
  raster: MonochromeRaster,
  x: number,
  y: number,
  width: number,
  height: number,
  thickness: number,
  operation: DotOperation = "set"
): void {
  const w = Math.max(3, Math.trunc(width));
  const h = Math.max(3, Math.trunc(height));
  // Zebra's circle/ellipse commands have a two-dot documented minimum and
  // render the inclusive inner edge. This produces a three-dot minimum ring.
  const t = Math.max(3, Math.trunc(thickness) + 1);
  const rx = w / 2;
  const ry = Math.max(1, (h - 2) / 2);
  const innerRx = Math.max(0, rx - t);
  const innerRy = Math.max(0, ry - t);
  for (let py = 1; py < h - 1; py++) {
    for (let px = 0; px < w; px++) {
      const dx = (px + 0.5 - rx) / rx;
      const dy = (py - h / 2) / ry;
      const outer = dx * dx + dy * dy <= 1;
      const inner =
        innerRx > 0 &&
        innerRy > 0 &&
        ((px + 0.5 - rx) / innerRx) ** 2 +
          ((py - h / 2) / innerRy) ** 2 <
          1;
      if (outer && !inner) setDot(raster, x + px, y + py, operation);
    }
  }
}

/** Rasterizes ^GD one scanline at a time, matching its exclusive end point. */
export function drawDiagonal(
  raster: MonochromeRaster,
  x: number,
  y: number,
  width: number,
  height: number,
  thickness: number,
  direction: "L" | "R",
  operation: DotOperation = "set"
): void {
  const w = Math.max(3, Math.trunc(width));
  const h = Math.max(3, Math.trunc(height));
  const t = Math.max(1, Math.trunc(thickness));
  const half = Math.floor(t / 2);
  for (let py = 0; py < h; py++) {
    const progress = py / h;
    const center =
      direction === "R"
        ? x + Math.round(w * (1 - progress))
        : x + Math.round(w * progress);
    fillRect(raster, center - half, y + py, t, 1, operation);
  }
}

export function blitRaster(
  target: MonochromeRaster,
  source: MonochromeRaster,
  x: number,
  y: number,
  options: {
    orientation?: Orientation;
    scaleX?: number;
    scaleY?: number;
    operation?: DotOperation;
  } = {}
): { width: number; height: number } {
  const orientation = options.orientation ?? "N";
  const scaleX = Math.max(1, Math.trunc(options.scaleX ?? 1));
  const scaleY = Math.max(1, Math.trunc(options.scaleY ?? 1));
  const logicalWidth = source.width * scaleX;
  const logicalHeight = source.height * scaleY;
  const orientedWidth =
    orientation === "R" || orientation === "B"
      ? logicalHeight
      : logicalWidth;
  const orientedHeight =
    orientation === "R" || orientation === "B"
      ? logicalWidth
      : logicalHeight;
  const startX = Math.max(0, -Math.trunc(x));
  const startY = Math.max(0, -Math.trunc(y));
  const endX = Math.min(orientedWidth, target.width - Math.trunc(x));
  const endY = Math.min(orientedHeight, target.height - Math.trunc(y));

  // Iterate only the visible destination window. Besides avoiding work for
  // clipped fields, inverse mapping prevents a large magnification factor from
  // multiplying the loop count beyond the target raster's pixel budget.
  for (let destinationY = startY; destinationY < endY; destinationY++) {
    for (let destinationX = startX; destinationX < endX; destinationX++) {
      let logicalX: number;
      let logicalY: number;
      if (orientation === "R") {
        logicalX = destinationY;
        logicalY = logicalHeight - 1 - destinationX;
      } else if (orientation === "I") {
        logicalX = logicalWidth - 1 - destinationX;
        logicalY = logicalHeight - 1 - destinationY;
      } else if (orientation === "B") {
        logicalX = logicalWidth - 1 - destinationY;
        logicalY = destinationX;
      } else {
        logicalX = destinationX;
        logicalY = destinationY;
      }
      if (getDot(source, Math.floor(logicalX / scaleX), Math.floor(logicalY / scaleY))) {
        setDot(
          target,
          Math.trunc(x) + destinationX,
          Math.trunc(y) + destinationY,
          options.operation
        );
      }
    }
  }
  return { width: orientedWidth, height: orientedHeight };
}

export function transformRaster(
  source: MonochromeRaster,
  options: { invert?: boolean; mirrorX?: boolean; rotate180?: boolean }
): MonochromeRaster {
  const target = createMonochromeRaster(source.width, source.height);
  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < source.width; x++) {
      const sourceX = options.mirrorX ? source.width - 1 - x : x;
      const sourceY = y;
      const rotatedX = options.rotate180 ? source.width - 1 - sourceX : sourceX;
      const rotatedY = options.rotate180 ? source.height - 1 - sourceY : sourceY;
      const black = getDot(source, rotatedX, rotatedY);
      if (options.invert ? !black : black) setDot(target, x, y);
    }
  }
  return target;
}

export function rasterToRgba(raster: MonochromeRaster): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(raster.width * raster.height * 4);
  for (let y = 0; y < raster.height; y++) {
    for (let x = 0; x < raster.width; x++) {
      const value = getDot(raster, x, y) ? 0 : 255;
      const offset = (y * raster.width + x) * 4;
      rgba[offset] = value;
      rgba[offset + 1] = value;
      rgba[offset + 2] = value;
      rgba[offset + 3] = 255;
    }
  }
  return rgba;
}
