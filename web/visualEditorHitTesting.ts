import type { MonochromeRaster } from "../src/index.web";
import type { VisualBounds, VisualField } from "./visualEditorSource";

export const visualHitPaddingPixels = 4;

export interface VisualHitGeometry {
  fillRule: "evenodd" | "nonzero";
  kind: "outline" | "paint" | "text";
  padding: number;
  path: string;
  viewBox: string;
}

interface RasterRunRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

function pathNumber(value: number): string {
  return String(Number(value.toFixed(3)));
}

function rectangleSubpath(x: number, y: number, width: number, height: number): string {
  return `M${pathNumber(x)} ${pathNumber(y)}h${pathNumber(width)}v${pathNumber(height)}h-${pathNumber(width)}Z`;
}

function roundedRectangleSubpath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): string {
  const boundedRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  if (boundedRadius <= 0) return rectangleSubpath(x, y, width, height);
  const right = x + width;
  const bottom = y + height;
  return [
    `M${pathNumber(x + boundedRadius)} ${pathNumber(y)}`,
    `H${pathNumber(right - boundedRadius)}`,
    `A${pathNumber(boundedRadius)} ${pathNumber(boundedRadius)} 0 0 1 ${pathNumber(right)} ${pathNumber(y + boundedRadius)}`,
    `V${pathNumber(bottom - boundedRadius)}`,
    `A${pathNumber(boundedRadius)} ${pathNumber(boundedRadius)} 0 0 1 ${pathNumber(right - boundedRadius)} ${pathNumber(bottom)}`,
    `H${pathNumber(x + boundedRadius)}`,
    `A${pathNumber(boundedRadius)} ${pathNumber(boundedRadius)} 0 0 1 ${pathNumber(x)} ${pathNumber(bottom - boundedRadius)}`,
    `V${pathNumber(y + boundedRadius)}`,
    `A${pathNumber(boundedRadius)} ${pathNumber(boundedRadius)} 0 0 1 ${pathNumber(x + boundedRadius)} ${pathNumber(y)}`,
    "Z",
  ].join("");
}

function ellipseSubpath(centerX: number, centerY: number, radiusX: number, radiusY: number): string {
  if (radiusX <= 0 || radiusY <= 0) return "";
  return [
    `M${pathNumber(centerX - radiusX)} ${pathNumber(centerY)}`,
    `A${pathNumber(radiusX)} ${pathNumber(radiusY)} 0 1 0 ${pathNumber(centerX + radiusX)} ${pathNumber(centerY)}`,
    `A${pathNumber(radiusX)} ${pathNumber(radiusY)} 0 1 0 ${pathNumber(centerX - radiusX)} ${pathNumber(centerY)}`,
    "Z",
  ].join("");
}

function numericParameter(field: VisualField, canonical: string, index: number, fallback: number): number {
  const raw = field.commands.find((command) => command.canonical === canonical)?.parameters[index]?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function outlinePath(field: VisualField, padding: number): string | undefined {
  const { width, height } = field.bounds;
  if (field.commands.some(({ canonical }) => canonical === "^GB")) {
    const thickness = Math.min(
      Math.max(1, Math.trunc(numericParameter(field, "^GB", 2, 1))),
      Math.ceil(Math.min(width, height) / 2),
    );
    const rounding = Math.min(8, Math.max(0, numericParameter(field, "^GB", 4, 0)));
    const radius = rounding / 8 * (Math.min(width, height) / 2);
    const outer = roundedRectangleSubpath(
      -padding,
      -padding,
      width + padding * 2,
      height + padding * 2,
      radius + padding,
    );
    const inset = thickness + padding;
    const innerWidth = width - inset * 2;
    const innerHeight = height - inset * 2;
    const inner = innerWidth > 0 && innerHeight > 0
      ? roundedRectangleSubpath(
          inset,
          inset,
          innerWidth,
          innerHeight,
          Math.max(0, radius - inset),
        )
      : "";
    return outer + inner;
  }

  const ellipseCommand = field.commands.some(({ canonical }) => canonical === "^GC")
    ? "^GC"
    : field.commands.some(({ canonical }) => canonical === "^GE") ? "^GE" : undefined;
  if (!ellipseCommand) return undefined;
  const thicknessIndex = ellipseCommand === "^GC" ? 1 : 2;
  const thickness = Math.max(3, Math.trunc(numericParameter(field, ellipseCommand, thicknessIndex, 1)) + 1);
  const centerX = width / 2;
  const centerY = height / 2;
  const outer = ellipseSubpath(
    centerX,
    centerY,
    width / 2 + padding,
    height / 2 + padding,
  );
  const inner = ellipseSubpath(
    centerX,
    centerY,
    width / 2 - thickness - padding,
    height / 2 - thickness - padding,
  );
  return outer + inner;
}

function rasterDot(raster: MonochromeRaster, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= raster.width || y >= raster.height) return false;
  const mask = 0x80 >> (x & 7);
  return (raster.data[y * raster.stride + (x >> 3)]! & mask) !== 0;
}

function rasterRunRectangles(raster: MonochromeRaster, bounds: VisualBounds): RasterRunRectangle[] {
  const startX = Math.max(0, Math.floor(bounds.x));
  const startY = Math.max(0, Math.floor(bounds.y));
  const endX = Math.min(raster.width, Math.ceil(bounds.x + bounds.width));
  const endY = Math.min(raster.height, Math.ceil(bounds.y + bounds.height));
  const rectangles: RasterRunRectangle[] = [];
  let active = new Map<string, RasterRunRectangle>();

  for (let y = startY; y < endY; y++) {
    const runs: Array<{ start: number; end: number }> = [];
    let x = startX;
    while (x < endX) {
      while (x < endX && !rasterDot(raster, x, y)) x++;
      if (x >= endX) break;
      const runStart = x;
      while (x < endX && rasterDot(raster, x, y)) x++;
      runs.push({ start: runStart, end: x });
    }

    const next = new Map<string, RasterRunRectangle>();
    for (const run of runs) {
      const key = `${run.start}:${run.end}`;
      const previous = active.get(key);
      const rectangle = previous ?? {
        x: run.start,
        y,
        width: run.end - run.start,
        height: 0,
      };
      rectangle.height++;
      next.set(key, rectangle);
    }
    for (const [key, rectangle] of active) {
      if (!next.has(key)) rectangles.push(rectangle);
    }
    active = next;
  }
  rectangles.push(...active.values());
  return rectangles;
}

function rasterPaintPath(field: VisualField, raster: MonochromeRaster, padding: number): string {
  return rasterRunRectangles(raster, field.bounds)
    .map((rectangle) => rectangleSubpath(
      rectangle.x - field.bounds.x - padding,
      rectangle.y - field.bounds.y - padding,
      rectangle.width + padding * 2,
      rectangle.height + padding * 2,
    ))
    .join("");
}

function textFlowPath(field: VisualField, padding: number): string | undefined {
  const stops = field.region.textCaretStops;
  if (!stops || stops.length < 2) return undefined;
  const ordered = [...stops].sort((left, right) => left.offset - right.offset);
  const rectangles: string[] = [];
  for (let index = 0; index + 1 < ordered.length; index++) {
    const start = ordered[index]!;
    const end = ordered[index + 1]!;
    const points = [
      { x: start.x, y: start.y },
      { x: end.x, y: end.y },
      { x: end.endX, y: end.endY },
      { x: start.endX, y: start.endY },
    ];
    const left = Math.min(...points.map(({ x }) => x)) - field.bounds.x - padding;
    const top = Math.min(...points.map(({ y }) => y)) - field.bounds.y - padding;
    const right = Math.max(...points.map(({ x }) => x)) - field.bounds.x + padding;
    const bottom = Math.max(...points.map(({ y }) => y)) - field.bounds.y + padding;
    rectangles.push(rectangleSubpath(left, top, right - left, bottom - top));
  }
  return rectangles.join("");
}

/** Exact painted hit geometry with a zoom-independent screen-space tolerance. */
export function visualFieldHitGeometry(
  field: VisualField,
  raster: MonochromeRaster,
  canvasScale: number,
): VisualHitGeometry {
  const padding = Math.max(1, Math.ceil(visualHitPaddingPixels / Math.max(0.01, canvasScale)));
  const outline = outlinePath(field, padding);
  const text = outline === undefined && field.kind === "text"
    ? textFlowPath(field, padding)
    : undefined;
  return {
    fillRule: outline === undefined ? "nonzero" : "evenodd",
    kind: outline !== undefined ? "outline" : text !== undefined ? "text" : "paint",
    padding,
    path: outline ?? text ?? rasterPaintPath(field, raster, padding),
    viewBox: [
      pathNumber(-padding),
      pathNumber(-padding),
      pathNumber(field.bounds.width + padding * 2),
      pathNumber(field.bounds.height + padding * 2),
    ].join(" "),
  };
}
