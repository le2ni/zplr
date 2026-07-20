import { NOTO_SANS_ADVANCE_RATIOS } from "@/assets/notoSansCondensed.generated";
import { SPLEEN_5X8_ROWS } from "@/assets/spleen5x8.generated";
import type { MonochromeRaster } from "@/types/RenderJob";
import { createMonochromeRaster, setDot } from "./raster";

export type ResidentFontKey =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "P"
  | "Q"
  | "R"
  | "S"
  | "T"
  | "U"
  | "V";

export interface ResidentFontMetrics {
  readonly height: number;
  readonly width: number;
  readonly intercharacterGap: number;
  readonly baseline: number;
  readonly uppercaseOnly: boolean;
  readonly outlineFace: boolean;
}

const RESIDENT_FONT_KEYS = new Set<ResidentFontKey>([
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
]);

const FONT_METRICS_8_DPMM: Readonly<
  Record<ResidentFontKey, ResidentFontMetrics>
> = {
  A: metric(9, 5, 1, 7),
  B: metric(11, 7, 2, 11, true),
  C: metric(18, 10, 2, 14),
  D: metric(18, 10, 2, 14),
  E: metric(28, 15, 5, 23, false, true),
  F: metric(26, 13, 3, 21),
  G: metric(60, 40, 8, 48),
  H: metric(21, 13, 6, 21, true, true),
  P: metric(20, 18, 3, 16, false, true),
  Q: metric(28, 24, 4, 22, false, true),
  R: metric(35, 31, 5, 28, false, true),
  S: metric(40, 35, 6, 32, false, true),
  T: metric(48, 42, 7, 38, false, true),
  U: metric(59, 53, 9, 47, false, true),
  V: metric(80, 71, 12, 64, false, true),
};

function metric(
  height: number,
  width: number,
  intercharacterGap: number,
  baseline: number,
  uppercaseOnly = false,
  outlineFace = false
): ResidentFontMetrics {
  return {
    height,
    width,
    intercharacterGap,
    baseline,
    uppercaseOnly,
    outlineFace,
  };
}

export function isResidentFontKey(value: string): value is ResidentFontKey {
  return RESIDENT_FONT_KEYS.has(value as ResidentFontKey);
}

/** Standard resident-font cell metrics from the ZPL programming guide. */
export function residentFontMetrics(
  key: string,
  dpi: 150 | 200 | 300 | 600 = 200
): ResidentFontMetrics | undefined {
  if (!isResidentFontKey(key)) return undefined;
  const base = FONT_METRICS_8_DPMM[key];
  if (key !== "E" && key !== "H") return base;

  if (key === "E") {
    if (dpi === 150) return metric(21, 10, 3, 17, false, true);
    if (dpi === 300 || dpi === 600) {
      return metric(42, 20, 7, 35, false, true);
    }
  } else {
    if (dpi === 150) return metric(17, 11, 5, 17, true, true);
    if (dpi === 300 || dpi === 600) {
      return metric(34, 22, 10, 34, true, true);
    }
  }
  return base;
}

export function residentInkWidth(key: string, requestedWidth: number): number {
  const width = Math.max(1, Math.trunc(requestedWidth));
  const metrics = residentFontMetrics(key);
  if (!metrics) return width;
  const gap = Math.min(
    width - 1,
    Math.max(0, Math.round((metrics.intercharacterGap * width) / metrics.width))
  );
  return Math.max(1, width - gap);
}

export function residentUsesOutlineFace(key: string): boolean {
  return residentFontMetrics(key)?.outlineFace ?? false;
}

export function residentAcceptsCharacter(key: string, character: string): boolean {
  const metrics = residentFontMetrics(key);
  if (!metrics?.uppercaseOnly) return true;
  return character === character.toUpperCase();
}

export function hasPinnedBitmapGlyph(character: string): boolean {
  if (character === "□") return true;
  const codePoint = character.codePointAt(0) ?? 0x3f;
  return SPLEEN_5X8_ROWS[codePoint] !== undefined;
}

export function glyphAdvance(
  character: string,
  requestedWidth: number,
  proportional: boolean
): number {
  const width = Math.max(1, Math.trunc(requestedWidth));
  if (!proportional) return width;
  const codePoint = character.codePointAt(0) ?? 0x3f;
  const ratio = NOTO_SANS_ADVANCE_RATIOS[codePoint];
  if (ratio !== undefined) return Math.max(1, Math.round(width * ratio));
  if (character === " ") return Math.max(1, Math.round(width * 0.5));
  if (/[.,:;!|'Il1]/u.test(character)) return Math.max(1, Math.round(width * 0.45));
  if (/[MW@#%]/u.test(character)) return width;
  return Math.max(1, Math.round(width * 0.75));
}

/** Rasterizes a fixed-cell resident font with deterministic nearest-dot scaling. */
export function rasterizeGlyph(
  character: string,
  width: number,
  height: number,
  proportional: boolean,
  fontKey = "A"
): MonochromeRaster {
  const advance = glyphAdvance(character, width, proportional);
  const raster = createMonochromeRaster(
    advance,
    Math.max(1, Math.trunc(height))
  );
  if (!residentAcceptsCharacter(fontKey, character)) return raster;
  const codePoint = character.codePointAt(0) ?? 0x3f;
  const rows =
    character === "□"
      ? [0, 0xf8, 0x88, 0x88, 0x88, 0xf8, 0, 0]
      : SPLEEN_5X8_ROWS[codePoint] ?? SPLEEN_5X8_ROWS[0x3f];
  const inkWidth = proportional
    ? raster.width
    : residentInkWidth(fontKey, raster.width);
  for (let y = 0; y < raster.height; y++) {
    const sourceY = Math.min(7, Math.floor((y * 8) / raster.height));
    for (let x = 0; x < inkWidth; x++) {
      const sourceX = Math.min(4, Math.floor((x * 5) / inkWidth));
      if ((rows[sourceY] & (0x80 >> sourceX)) !== 0) setDot(raster, x, y);
    }
  }
  return raster;
}
