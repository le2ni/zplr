import { SPLEEN_5X8_ROWS } from "@/assets/spleen5x8.generated";
import {
  TEX_GYRE_HEROS_ADVANCE_RATIOS,
  TEX_GYRE_HEROS_ADVANCE_SCALE,
} from "@/assets/texGyreHerosCondensed.generated";
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

interface ProportionalFontCalibration {
  readonly widthScale: number;
  readonly advanceScale: number;
  readonly verticalScale: number;
  readonly topOffsetRatio: number;
}

const PROPORTIONAL_FONT_CALIBRATION: Readonly<
  Record<string, ProportionalFontCalibration>
> = {
  P: {
    widthScale: 0.8,
    advanceScale: 0.8,
    verticalScale: 0.95,
    topOffsetRatio: 0.06,
  },
  Q: {
    widthScale: 0.9,
    advanceScale: 0.75,
    verticalScale: 0.95,
    topOffsetRatio: 0.14,
  },
  R: {
    widthScale: 0.9,
    advanceScale: 0.75,
    verticalScale: 0.95,
    topOffsetRatio: 0.14,
  },
  S: {
    widthScale: 0.9,
    advanceScale: 0.75,
    verticalScale: 0.95,
    topOffsetRatio: 0.1,
  },
  T: {
    widthScale: 0.9,
    advanceScale: 0.75,
    verticalScale: 0.95,
    topOffsetRatio: 0.1,
  },
  U: {
    widthScale: 0.85,
    advanceScale: 0.75,
    verticalScale: 0.95,
    topOffsetRatio: 0.1,
  },
  V: {
    widthScale: 0.95,
    advanceScale: 0.7,
    verticalScale: 0.95,
    topOffsetRatio: 0.1,
  },
};

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

export function residentInkWidth(_key: string, requestedWidth: number): number {
  return Math.max(1, Math.trunc(requestedWidth));
}

/** Adds the separately magnified intercharacter gap to a bitmap font cell. */
export function residentAdvanceWidth(
  key: string,
  requestedWidth: number
): number {
  const width = residentInkWidth(key, requestedWidth);
  const metrics = residentFontMetrics(key);
  if (!metrics) return width;
  const widthMultiplier = Math.min(
    10,
    Math.max(1, Math.round(width / metrics.width))
  );
  return width + metrics.intercharacterGap * widthMultiplier;
}

export function residentUsesOutlineFace(key: string): boolean {
  return residentFontMetrics(key)?.outlineFace ?? false;
}

/** P–V use the legacy proportional resident faces rather than fixed cells. */
export function residentUsesProportionalFace(key: string): boolean {
  return key > "O" && key < "W";
}

export function proportionalFontCalibration(
  key: string
): ProportionalFontCalibration | undefined {
  return PROPORTIONAL_FONT_CALIBRATION[key];
}

export function proportionalFontWidth(
  key: string,
  requestedWidth: number
): number {
  const calibration = proportionalFontCalibration(key);
  return Math.max(
    1,
    Math.round(requestedWidth * (calibration?.widthScale ?? 1))
  );
}

export function proportionalFontAdvance(
  key: string,
  character: string,
  requestedWidth: number
): number {
  const calibration = proportionalFontCalibration(key);
  const width = proportionalFontWidth(key, requestedWidth);
  const advance = glyphAdvance(character, width, true);
  if (!calibration) return advance;
  return Math.max(
    1,
    Math.round(
      advance * (calibration.advanceScale / TEX_GYRE_HEROS_ADVANCE_SCALE)
    )
  );
}

export function residentAcceptsCharacter(key: string, character: string): boolean {
  return residentCharacter(key, character) !== undefined;
}

/** Applies the firmware's uppercase-only resident-font behavior. */
export function residentCharacter(
  key: string,
  character: string
): string | undefined {
  const metrics = residentFontMetrics(key);
  if (!metrics?.uppercaseOnly) return character;
  if (key === "H") {
    return character.length === 1 && character === character.toUpperCase()
      ? character
      : undefined;
  }
  const uppercase = character.toUpperCase();
  return [...uppercase].length === 1 ? uppercase : undefined;
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
  const ratio = TEX_GYRE_HEROS_ADVANCE_RATIOS[codePoint];
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
  const advance = proportional
    ? glyphAdvance(character, width, true)
    : residentAdvanceWidth(fontKey, width);
  const raster = createMonochromeRaster(
    advance,
    Math.max(1, Math.trunc(height))
  );
  const resident = residentCharacter(fontKey, character);
  if (resident === undefined) return raster;
  const codePoint = resident.codePointAt(0) ?? 0x3f;
  const rows =
    resident === "□"
      ? [0, 0xf8, 0x88, 0x88, 0x88, 0xf8, 0, 0]
      : SPLEEN_5X8_ROWS[codePoint] ?? SPLEEN_5X8_ROWS[0x3f];
  const inkWidth = proportional
    ? raster.width
    : Math.min(raster.width, residentInkWidth(fontKey, width));
  for (let y = 0; y < raster.height; y++) {
    // Spleen includes one blank cap row. Font B's native 11-dot matrix does
    // not, so spread the open glyph's remaining seven rows over the cell.
    const sourceY =
      fontKey === "B"
        ? Math.min(7, 1 + Math.floor((y * 7) / raster.height))
        : Math.min(7, Math.floor((y * 8) / raster.height));
    for (let x = 0; x < inkWidth; x++) {
      const sourceX = Math.min(4, Math.floor((x * 5) / inkWidth));
      if ((rows[sourceY] & (0x80 >> sourceX)) !== 0) setDot(raster, x, y);
    }
  }
  return raster;
}
