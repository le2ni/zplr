import bwipjs from "bwip-js";
import type {
  BarcodeLayoutField,
  BitmapLayoutField,
  ExtendedBarcodeLayoutField,
  LabelLayout,
  LayoutFont,
  LayoutFontResources,
  TextLayoutField,
} from "@/types/LabelLayout";
import type {
  DownloadedBitmapFont,
  FontProvider,
  MonochromeRaster,
} from "@/types/RenderJob";
import type { HighlightRegion } from "@/types/HighlightRegion";
import type { Orientation } from "@/types/Orientation";
import type { ZplDiagnostic } from "@/types/ZplDocument";
import {
  ZEBRA_GRAPHIC_SYMBOL_BYTES_PER_ROW,
  ZEBRA_GRAPHIC_SYMBOL_HEIGHT,
  ZEBRA_GRAPHIC_SYMBOL_WIDTH,
  zebraGraphicSymbolData,
} from "@/assets/zebraGraphicSymbols.generated";
import {
  glyphAdvance,
  hasPinnedBitmapGlyph,
  isResidentFontKey,
  rasterizeGlyph,
  residentAcceptsCharacter,
  residentInkWidth,
  residentUsesOutlineFace,
} from "./bitmapFont";
import { OpenTypeFontEngine } from "./fontEngine";
import {
  code39CheckDigit,
  code39Runs,
  encodeCode128Raster,
} from "./layoutRenderer";
import {
  encodeLegacyDataMatrix,
  type LegacyDataMatrixQuality,
} from "./legacyDataMatrix";
import { encodeLegacyQrModel1 } from "./legacyQrModel1";
import { encodeQrModel2 } from "./qrModel2";
import { encodeZplCode49, expandAutomaticCode49 } from "./code49";
import { encodeZplCodablockA } from "./codablockA";
import {
  encodeAztecHighLevel,
  parseZplAztecTokens,
  type AztecHighLevelToken,
} from "./aztecHighLevel";
import {
  blitRaster,
  createMonochromeRaster,
  cropRasterHeight,
  drawDiagonal,
  fillRect,
  getDot,
  lastDarkRow,
  setDot,
  strokeEllipse,
  strokeRoundedRect,
  transformRaster,
  type DotOperation,
} from "./raster";

const MAX_FIELD_BLOCK_DATA = 3 * 1024;
const snapshotFontEngines = new WeakMap<
  LayoutFontResources,
  OpenTypeFontEngine
>();

interface RawLinearBarcode {
  sbs: number[];
  bhs?: number[];
  bbs?: number[];
  txt?: Array<[string, ...unknown[]]>;
}

interface RawMatrixBarcode {
  pixs: number[];
  pixx: number;
  pixy: number;
}

interface RasterAllocator {
  (width: number, height: number): MonochromeRaster;
  assert(width: number, height: number): void;
  readonly limit: number;
}

class RasterLimitError extends RangeError {}

function limitedRasterAllocator(maxPixels: number): RasterAllocator {
  const limit = Math.max(0, Math.trunc(maxPixels));
  const assert = (width: number, height: number) => {
    const normalizedWidth = Math.max(0, Math.trunc(width));
    const normalizedHeight = Math.max(0, Math.trunc(height));
    const pixels = normalizedWidth * normalizedHeight;
    if (!Number.isSafeInteger(pixels) || pixels > limit) {
      throw new RasterLimitError(
        `Field raster ${normalizedWidth}x${normalizedHeight} exceeds the configured ${limit}-pixel render limit.`
      );
    }
  };
  return Object.assign(
    (width: number, height: number) => {
      assert(width, height);
      return createMonochromeRaster(width, height);
    },
    { assert, limit }
  );
}

export interface RasterRenderResult {
  raster: MonochromeRaster;
  diagnostics: ZplDiagnostic[];
  highlightRegions: HighlightRegion[];
}

function transformHighlightRegions(
  regions: readonly HighlightRegion[],
  width: number,
  height: number,
  options: { mirror: boolean; rotate180: boolean }
): HighlightRegion[] {
  return regions.map((source) => {
    const region = { ...source };
    if (region.width !== undefined && region.height !== undefined) {
      if (options.mirror) region.x = width - region.x - region.width;
      if (options.rotate180) {
        region.x = width - region.x - region.width;
        region.y = height - region.y - region.height;
      }
      return region;
    }
    if (region.type === "circle") {
      if (options.mirror) region.x = width - region.x;
      if (options.rotate180) {
        region.x = width - region.x;
        region.y = height - region.y;
      }
      return region;
    }
    if (options.mirror) region.x = width - 1 - region.x;
    if (options.rotate180) {
      region.x = width - 1 - region.x;
      region.y = height - 1 - region.y;
    }
    return region;
  });
}

function diagnostic(
  code: string,
  message: string,
  field: { sourceSpan: { start: number; end: number }; commandIndex: number },
  labelIndex: number
): ZplDiagnostic {
  return {
    code,
    message,
    severity: "error",
    phase: "render",
    span: field.sourceSpan,
    labelIndex,
  };
}

function hasFieldDiagnostic(
  diagnostics: readonly ZplDiagnostic[],
  code: string,
  field: { sourceSpan: { start: number; end: number } },
  labelIndex: number
): boolean {
  return diagnostics.some(
    (item) =>
      item.code === code &&
      item.labelIndex === labelIndex &&
      item.span !== undefined &&
      item.span.start >= field.sourceSpan.start &&
      item.span.end <= field.sourceSpan.end
  );
}

function operation(reverse: boolean, color: "B" | "W" = "B"): DotOperation {
  if (reverse) return "xor";
  return color === "W" ? "clear" : "set";
}

function orientedSize(
  orientation: Orientation,
  width: number,
  height: number
): { width: number; height: number } {
  return orientation === "R" || orientation === "B"
    ? { width: height, height: width }
    : { width, height };
}

function measureText(value: string, font: LayoutFont): number {
  const proportional = font.key === "0" || font.name !== undefined;
  return [...value].reduce(
    (width, character) => width + glyphAdvance(character, font.width, proportional),
    0
  );
}

function measureFieldText(value: string, field: TextLayoutField): number {
  const characters = [...value];
  return (
    measureText(value, field.font) +
    Math.max(0, characters.length - 1) * Math.max(0, field.characterGap ?? 0)
  );
}

export interface RasterTextLine {
  text: string;
  width: number;
  indent: number;
  paragraphEnd: boolean;
  overprints?: RasterTextLine[];
}

interface ArabicForms {
  isolated: number;
  final?: number;
  initial?: number;
  medial?: number;
}

const ARABIC_FORMS = new Map<number, ArabicForms>([
  [0x0621, { isolated: 0xfe80 }],
  [0x0622, { isolated: 0xfe81, final: 0xfe82 }],
  [0x0623, { isolated: 0xfe83, final: 0xfe84 }],
  [0x0624, { isolated: 0xfe85, final: 0xfe86 }],
  [0x0625, { isolated: 0xfe87, final: 0xfe88 }],
  [0x0626, { isolated: 0xfe89, final: 0xfe8a, initial: 0xfe8b, medial: 0xfe8c }],
  [0x0627, { isolated: 0xfe8d, final: 0xfe8e }],
  [0x0628, { isolated: 0xfe8f, final: 0xfe90, initial: 0xfe91, medial: 0xfe92 }],
  [0x0629, { isolated: 0xfe93, final: 0xfe94 }],
  [0x062a, { isolated: 0xfe95, final: 0xfe96, initial: 0xfe97, medial: 0xfe98 }],
  [0x062b, { isolated: 0xfe99, final: 0xfe9a, initial: 0xfe9b, medial: 0xfe9c }],
  [0x062c, { isolated: 0xfe9d, final: 0xfe9e, initial: 0xfe9f, medial: 0xfea0 }],
  [0x062d, { isolated: 0xfea1, final: 0xfea2, initial: 0xfea3, medial: 0xfea4 }],
  [0x062e, { isolated: 0xfea5, final: 0xfea6, initial: 0xfea7, medial: 0xfea8 }],
  [0x062f, { isolated: 0xfea9, final: 0xfeaa }],
  [0x0630, { isolated: 0xfeab, final: 0xfeac }],
  [0x0631, { isolated: 0xfead, final: 0xfeae }],
  [0x0632, { isolated: 0xfeaf, final: 0xfeb0 }],
  [0x0633, { isolated: 0xfeb1, final: 0xfeb2, initial: 0xfeb3, medial: 0xfeb4 }],
  [0x0634, { isolated: 0xfeb5, final: 0xfeb6, initial: 0xfeb7, medial: 0xfeb8 }],
  [0x0635, { isolated: 0xfeb9, final: 0xfeba, initial: 0xfebb, medial: 0xfebc }],
  [0x0636, { isolated: 0xfebd, final: 0xfebe, initial: 0xfebf, medial: 0xfec0 }],
  [0x0637, { isolated: 0xfec1, final: 0xfec2, initial: 0xfec3, medial: 0xfec4 }],
  [0x0638, { isolated: 0xfec5, final: 0xfec6, initial: 0xfec7, medial: 0xfec8 }],
  [0x0639, { isolated: 0xfec9, final: 0xfeca, initial: 0xfecb, medial: 0xfecc }],
  [0x063a, { isolated: 0xfecd, final: 0xfece, initial: 0xfecf, medial: 0xfed0 }],
  [0x0641, { isolated: 0xfed1, final: 0xfed2, initial: 0xfed3, medial: 0xfed4 }],
  [0x0642, { isolated: 0xfed5, final: 0xfed6, initial: 0xfed7, medial: 0xfed8 }],
  [0x0643, { isolated: 0xfed9, final: 0xfeda, initial: 0xfedb, medial: 0xfedc }],
  [0x0644, { isolated: 0xfedd, final: 0xfede, initial: 0xfedf, medial: 0xfee0 }],
  [0x0645, { isolated: 0xfee1, final: 0xfee2, initial: 0xfee3, medial: 0xfee4 }],
  [0x0646, { isolated: 0xfee5, final: 0xfee6, initial: 0xfee7, medial: 0xfee8 }],
  [0x0647, { isolated: 0xfee9, final: 0xfeea, initial: 0xfeeb, medial: 0xfeec }],
  [0x0648, { isolated: 0xfeed, final: 0xfeee }],
  [0x0649, { isolated: 0xfeef, final: 0xfef0 }],
  [0x064a, { isolated: 0xfef1, final: 0xfef2, initial: 0xfef3, medial: 0xfef4 }],
  [0x0671, { isolated: 0xfb50, final: 0xfb51 }],
  [0x067e, { isolated: 0xfb56, final: 0xfb57, initial: 0xfb58, medial: 0xfb59 }],
  [0x0686, { isolated: 0xfb7a, final: 0xfb7b, initial: 0xfb7c, medial: 0xfb7d }],
  [0x0698, { isolated: 0xfb8a, final: 0xfb8b }],
  [0x06a9, { isolated: 0xfb8e, final: 0xfb8f, initial: 0xfb90, medial: 0xfb91 }],
  [0x06af, { isolated: 0xfb92, final: 0xfb93, initial: 0xfb94, medial: 0xfb95 }],
  [0x06cc, { isolated: 0xfbfc, final: 0xfbfd, initial: 0xfbfe, medial: 0xfbff }],
]);

function joiningCharacter(characters: readonly string[], from: number, step: -1 | 1): number {
  for (let index = from + step; index >= 0 && index < characters.length; index += step) {
    const code = characters[index].codePointAt(0) ?? 0;
    if (/\p{Mark}/u.test(characters[index])) continue;
    return code;
  }
  return -1;
}

function shapeArabic(value: string): string {
  const characters = [...value];
  return characters
    .map((character, index) => {
      const code = character.codePointAt(0) ?? 0;
      const forms = ARABIC_FORMS.get(code);
      if (!forms) return character;
      const previous = ARABIC_FORMS.get(joiningCharacter(characters, index, -1));
      const next = ARABIC_FORMS.get(joiningCharacter(characters, index, 1));
      const joinsPrevious = Boolean(forms.final && previous?.initial);
      const joinsNext = Boolean(forms.initial && next?.final);
      const shaped =
        joinsPrevious && joinsNext && forms.medial
          ? forms.medial
          : joinsPrevious && forms.final
          ? forms.final
          : joinsNext && forms.initial
          ? forms.initial
          : forms.isolated;
      return String.fromCodePoint(shaped);
    })
    .join("");
}

function bidiClass(character: string): "L" | "R" | "N" {
  const code = character.codePointAt(0) ?? 0;
  if (
    (code >= 0x0590 && code <= 0x08ff) ||
    (code >= 0xfb1d && code <= 0xfdff) ||
    (code >= 0xfe70 && code <= 0xfeff)
  ) {
    return "R";
  }
  if (/\p{Letter}|\p{Number}/u.test(character)) return "L";
  return "N";
}

function reorderBidirectional(value: string): string {
  const characters = [...value];
  const base = characters.map(bidiClass).find((value) => value !== "N") ?? "L";
  const runs: Array<{ direction: "L" | "R"; characters: string[] }> = [];
  let direction: "L" | "R" = base;
  for (const character of characters) {
    const classified = bidiClass(character);
    const resolved = classified === "N" ? direction : classified;
    if (runs.length === 0 || runs[runs.length - 1].direction !== resolved) {
      runs.push({ direction: resolved, characters: [] });
    }
    runs[runs.length - 1].characters.push(character);
    direction = resolved;
  }
  const orderedRuns = base === "R" ? [...runs].reverse() : runs;
  return orderedRuns
    .map((run) =>
      run.direction === "R" ? [...run.characters].reverse().join("") : run.characters.join("")
    )
    .join("");
}

export function shapeAndOrderText(
  value: string,
  options: { bidirectional?: boolean; shaping?: boolean; openType?: boolean }
): string {
  let result = options.shaping || options.openType ? shapeArabic(value) : value;
  if (options.bidirectional) result = reorderBidirectional(result);
  return result;
}

function parseBlockEscapes(data: string): string {
  let result = "";
  for (let index = 0; index < data.length; index++) {
    if (data[index] !== "\\") {
      result += data[index] === "\u00ad" ? "-" : data[index];
      continue;
    }
    const next = data[index + 1];
    if (next === "&") {
      result += "\n";
      index++;
    } else if (next === "\\") {
      result += "\\";
      index++;
    } else if (next && /[A-Za-z0-9]/.test(next)) {
      result += "\u00ad";
      index++;
    } else {
      result += "\\";
    }
  }
  return result;
}

function parseTextBlockEscapes(data: string): string {
  let result = "";
  for (let index = 0; index < data.length; index++) {
    if (data[index] !== "<") {
      if (data[index] !== "\u00ad") result += data[index];
      continue;
    }
    if (data[index + 1] === "<") {
      result += "<";
      index++;
      continue;
    }
    const end = data.indexOf(">", index + 1);
    if (end < 0) result += "<";
    else index = end;
  }
  return result;
}

function visibleText(value: string): string {
  return value.replace(/\u00ad/g, "");
}

function splitLongWord(
  word: string,
  availableWidth: number,
  field: TextLayoutField
): { head: string; tail: string } {
  const characters = [...word];
  let bestSoftHyphen = -1;
  for (let index = 0; index < characters.length; index++) {
    if (characters[index] !== "\u00ad") continue;
    const prefix = visibleText(characters.slice(0, index).join(""));
    const candidate = prefix + "-";
    if (prefix && measureFieldText(candidate, field) <= availableWidth) {
      bestSoftHyphen = index;
    }
  }
  if (bestSoftHyphen >= 0) {
    return {
      head: visibleText(characters.slice(0, bestSoftHyphen).join("")) + "-",
      tail: characters.slice(bestSoftHyphen + 1).join(""),
    };
  }

  const visible = [...visibleText(word)];
  let count = 0;
  while (count < visible.length) {
    const suffix = count + 1 < visible.length ? "-" : "";
    const candidate = visible.slice(0, count + 1).join("") + suffix;
    if (count > 0 && measureFieldText(candidate, field) > availableWidth) break;
    count++;
  }
  count = Math.max(1, Math.min(count, visible.length));
  if (count >= visible.length) return { head: visible.join(""), tail: "" };
  let originalSplit = 0;
  let remaining = count;
  while (originalSplit < characters.length && remaining > 0) {
    if (characters[originalSplit] !== "\u00ad") remaining--;
    originalSplit++;
  }
  while (characters[originalSplit] === "\u00ad") originalSplit++;
  return {
    head: visible.slice(0, count).join("") + "-",
    tail: characters.slice(originalSplit).join(""),
  };
}

function wrapParagraph(
  paragraph: string,
  field: TextLayoutField,
  lineOffset: number
): RasterTextLine[] {
  const block = field.block!;
  if (paragraph.length === 0) {
    const indent = lineOffset === 0 ? 0 : block.hangingIndent;
    return [{ text: "", width: 0, indent, paragraphEnd: true }];
  }
  const words = paragraph.split(/\s+/).filter(Boolean);
  const lines: RasterTextLine[] = [];
  let current = "";
  let wordIndex = 0;
  const indent = () =>
    lineOffset + lines.length === 0 ? 0 : block.hangingIndent;

  while (wordIndex < words.length) {
    const word = words[wordIndex];
    const candidate = current
      ? `${current} ${visibleText(word)}`
      : visibleText(word);
    const available = Math.max(1, block.width - indent());
    if (measureFieldText(candidate, field) <= available) {
      current = candidate;
      wordIndex++;
      continue;
    }
    if (current) {
      lines.push({
        text: current,
        width: measureFieldText(current, field),
        indent: indent(),
        paragraphEnd: false,
      });
      current = "";
      continue;
    }
    const split = splitLongWord(word, available, field);
    lines.push({
      text: split.head,
      width: measureFieldText(split.head, field),
      indent: indent(),
      paragraphEnd: false,
    });
    if (split.tail) words[wordIndex] = split.tail;
    else wordIndex++;
  }

  if (current || lines.length === 0) {
    lines.push({
      text: current,
      width: measureFieldText(current, field),
      indent: indent(),
      paragraphEnd: true,
    });
  } else {
    lines[lines.length - 1].paragraphEnd = true;
  }
  return lines;
}

export function layoutTextLines(field: TextLayoutField): RasterTextLine[] {
  if (!field.block) {
    return [
      {
        text: field.data,
        width: measureFieldText(field.data, field),
        indent: 0,
        paragraphEnd: true,
      },
    ];
  }
  if (field.block.width <= 0) return [];
  const lines: RasterTextLine[] = [];
  const normalized =
    field.block.mode === "TB"
      ? parseTextBlockEscapes(field.data)
      : parseBlockEscapes(field.data.slice(0, MAX_FIELD_BLOCK_DATA));
  for (const paragraph of normalized.split(/\r?\n/)) {
    lines.push(...wrapParagraph(paragraph, field, lines.length));
  }
  const lineStep = Math.max(1, field.font.height + field.block.lineSpacing);
  const heightLines =
    field.block.height === undefined
      ? field.block.maxLines
      : Math.max(
          0,
          Math.floor((field.block.height - field.font.height) / lineStep) + 1
        );
  const maximumLines = Math.min(field.block.maxLines, heightLines);
  if (lines.length <= maximumLines) return lines;
  if (field.block.mode === "TB") return lines.slice(0, maximumLines);
  const retained = lines.slice(0, maximumLines);
  if (retained.length === 0) return retained;
  const overflow = lines.slice(maximumLines - 1);
  retained[retained.length - 1] = {
    ...overflow[0],
    overprints: overflow.slice(1),
  };
  return retained;
}

async function glyphFor(
  engine: OpenTypeFontEngine,
  character: string,
  font: LayoutFont,
  allocate: RasterAllocator,
  bitmapFonts?: ReadonlyMap<string, DownloadedBitmapFont>,
  fontLinks?: ReadonlyMap<string, readonly string[]>
): Promise<{ raster: MonochromeRaster; substituted: boolean }> {
  if (font.resources) {
    bitmapFonts = font.resources.bitmapFonts;
    fontLinks = font.resources.fontLinks;
    let snapshotEngine = snapshotFontEngines.get(font.resources);
    if (!snapshotEngine) {
      snapshotEngine = new OpenTypeFontEngine(
        font.resources.fontProvider,
        allocate.limit
      );
      snapshotFontEngines.set(font.resources, snapshotEngine);
    }
    engine = snapshotEngine;
  }
  const proportional = font.key === "0" || font.name !== undefined;
  const advance = glyphAdvance(character, font.width, proportional);
  allocate.assert(advance, Math.max(1, font.height));
  if (font.name) {
    const lookupName = aliasedFontName(
      font.name,
      font.resources?.memoryAliases
    );
    const bitmap = findBitmapFont(bitmapFonts, lookupName);
    const bitmapGlyph = bitmap
      ? rasterizeBitmapFontGlyph(
          bitmap,
          character,
          font.width,
          font.height,
          allocate
        )
      : undefined;
    if (bitmapGlyph) return { raster: bitmapGlyph, substituted: false };
    const custom = await engine.rasterize(
      font.name,
      character,
      advance,
      font.height
    );
    if (custom) return { raster: custom, substituted: false };
    for (const linked of linkedFonts(fontLinks, lookupName)) {
      const linkedBitmap = findBitmapFont(bitmapFonts, linked);
      const linkedGlyph = linkedBitmap
        ? rasterizeBitmapFontGlyph(
            linkedBitmap,
            character,
            font.width,
            font.height,
            allocate
          )
        : undefined;
      if (linkedGlyph) return { raster: linkedGlyph, substituted: false };
      const linkedOutline = await engine.rasterize(
        linked,
        character,
        advance,
        font.height
      );
      if (linkedOutline) return { raster: linkedOutline, substituted: false };
    }
    const builtIn = await engine.rasterizeBuiltIn(
      character,
      advance,
      font.height
    );
    if (builtIn) return { raster: builtIn, substituted: true };
  } else if (font.key === "0") {
    const builtIn = await engine.rasterizeBuiltIn(
      character,
      advance,
      font.height
    );
    if (builtIn) return { raster: builtIn, substituted: false };
  } else if (isResidentFontKey(font.key)) {
    if (!residentAcceptsCharacter(font.key, character)) {
      return {
        raster: allocate(advance, Math.max(1, font.height)),
        substituted: false,
      };
    }
    if (residentUsesOutlineFace(font.key) || !hasPinnedBitmapGlyph(character)) {
      const inkWidth = residentInkWidth(font.key, advance);
      const outline = await engine.rasterizeBuiltIn(
        character,
        inkWidth,
        font.height
      );
      if (outline) {
        const cell = allocate(advance, Math.max(1, font.height));
        blitRaster(cell, outline, 0, 0);
        return { raster: cell, substituted: false };
      }
    }
    return {
      raster: rasterizeGlyph(
        character,
        font.width,
        font.height,
        proportional,
        font.key
      ),
      substituted: false,
    };
  }
  return {
    raster: rasterizeGlyph(
      character,
      font.width,
      font.height,
      proportional,
      "A"
    ),
    substituted: font.name !== undefined || font.key !== "A",
  };
}

function normalizedFontName(value: string): string {
  return value.trim().toUpperCase();
}

function aliasedFontName(
  value: string,
  aliases: ReadonlyMap<string, string> | undefined
): string {
  let normalized = normalizedFontName(value);
  if (!normalized.includes(":")) normalized = `R:${normalized}`;
  const mapped = aliases?.get(normalized[0]);
  return mapped
    ? `${mapped}:${normalized.slice(normalized.indexOf(":") + 1)}`
    : normalized;
}

function fontBasename(value: string): string {
  const normalized = normalizedFontName(value);
  const resource = normalized.includes(":") ? normalized : `R:${normalized}`;
  return resource.replace(/\.[A-Z0-9]+$/, "");
}

function findBitmapFont(
  fonts: ReadonlyMap<string, DownloadedBitmapFont> | undefined,
  name: string
): DownloadedBitmapFont | undefined {
  if (!fonts) return undefined;
  const normalized = normalizedFontName(name);
  const direct = fonts.get(normalized);
  if (direct) return direct;
  const basename = fontBasename(normalized);
  for (const [candidate, font] of fonts) {
    if (fontBasename(candidate) === basename) return font;
  }
  return undefined;
}

function wildcardMatches(pattern: string, value: string): boolean {
  const escaped = [...normalizedFontName(pattern)]
    .map((character) =>
      character === "*"
        ? ".*"
        : character === "?"
        ? "."
        : /[.+^${}()|[\]\\]/.test(character)
        ? `\\${character}`
        : character
    )
    .join("");
  return new RegExp(`^${escaped}$`).test(normalizedFontName(value));
}

function linkedFonts(
  links: ReadonlyMap<string, readonly string[]> | undefined,
  base: string
): string[] {
  if (!links) return [];
  const output: string[] = [];
  for (const [pattern, extensions] of links) {
    if (wildcardMatches(pattern, base)) output.push(...extensions);
  }
  return output;
}

function rasterizeBitmapFontGlyph(
  font: DownloadedBitmapFont,
  character: string,
  requestedWidth: number,
  requestedHeight: number,
  allocate: RasterAllocator
): MonochromeRaster | undefined {
  const glyph = font.glyphs.get(character.codePointAt(0) ?? -1);
  const nativeAdvance = glyph?.advance ?? font.spaceWidth;
  if (!glyph && character !== " ") return undefined;
  const outputWidth = Math.max(
    1,
    Math.round((nativeAdvance / Math.max(1, font.cellWidth)) * requestedWidth)
  );
  const output = allocate(outputWidth, Math.max(1, requestedHeight));
  if (!glyph) return output;
  const source = allocate(glyph.width, glyph.height);
  for (let y = 0; y < glyph.height; y++) {
    for (let x = 0; x < glyph.width; x++) {
      const byte = glyph.data[y * glyph.bytesPerRow + (x >> 3)] ?? 0;
      if ((byte & (0x80 >> (x & 7))) !== 0) setDot(source, x, y);
    }
  }
  const scaleX = requestedWidth / Math.max(1, font.cellWidth);
  const scaleY = requestedHeight / Math.max(1, font.cellHeight);
  const scaledWidth = Math.max(1, Math.round(glyph.width * scaleX));
  const scaledHeight = Math.max(1, Math.round(glyph.height * scaleY));
  const xOffset = Math.round(glyph.xOffset * scaleX);
  const yOffset = Math.round(
    Math.max(0, font.baseline - glyph.yOffset) * scaleY
  );
  for (let y = 0; y < scaledHeight; y++) {
    for (let x = 0; x < scaledWidth; x++) {
      const sourceX = Math.min(
        source.width - 1,
        Math.floor((x * source.width) / scaledWidth)
      );
      const sourceY = Math.min(
        source.height - 1,
        Math.floor((y * source.height) / scaledHeight)
      );
      const byte = source.data[sourceY * source.stride + (sourceX >> 3)] ?? 0;
      if ((byte & (0x80 >> (sourceX & 7))) !== 0) {
        setDot(output, xOffset + x, yOffset + y);
      }
    }
  }
  return output;
}

async function renderTextField(
  target: MonochromeRaster,
  field: TextLayoutField,
  engine: OpenTypeFontEngine,
  allocate: RasterAllocator,
  bitmapFonts?: ReadonlyMap<string, DownloadedBitmapFont>,
  fontLinks?: ReadonlyMap<string, readonly string[]>
): Promise<{
  x: number;
  y: number;
  width: number;
  height: number;
  substituted: boolean;
}> {
  if (field.advancedText) {
    field = {
      ...field,
      data: shapeAndOrderText(field.data, field.advancedText),
    };
  }
  if (field.direction === "V") {
    const characters = [...parseTextBlockEscapes(field.data)];
    const gap = Math.max(0, field.characterGap ?? 0);
    const blockWidth = field.block?.width;
    const blockHeight = field.block?.height;
    const logicalWidth = Math.max(1, blockWidth ?? field.font.width);
    const logicalHeight = Math.max(
      1,
      blockHeight ??
        characters.length * field.font.height +
          Math.max(0, characters.length - 1) * gap
    );
    const textRaster = allocate(logicalWidth, logicalHeight);
    let cursor = 0;
    let substituted = false;
    for (const character of characters) {
      if (character === "\n" || character === "\r") continue;
      const resolved = await glyphFor(
        engine,
        character,
        field.font,
        allocate,
        bitmapFonts,
        fontLinks
      );
      substituted ||= resolved.substituted;
      if (cursor + resolved.raster.height > logicalHeight) break;
      blitRaster(
        textRaster,
        resolved.raster,
        Math.max(0, Math.floor((logicalWidth - resolved.raster.width) / 2)),
        cursor
      );
      cursor += resolved.raster.height + gap;
    }
    const oriented = orientedSize(field.orientation, logicalWidth, logicalHeight);
    const rightAnchored = field.originJustification === "R";
    const x = rightAnchored ? field.x - oriented.width : field.x;
    const size = blitRaster(target, textRaster, x, field.y, {
      orientation: field.orientation,
      operation: operation(field.reverse),
    });
    return { x, y: field.y, ...size, substituted };
  }
  const lines = layoutTextLines(field);
  const effectiveBitmapFonts =
    field.font.resources?.bitmapFonts ?? bitmapFonts;
  const bitmapFont = field.font.name
    ? findBitmapFont(
        effectiveBitmapFonts,
        aliasedFontName(
          field.font.name,
          field.font.resources?.memoryAliases
        )
      )
    : undefined;
  if (bitmapFont) {
    for (const line of lines) {
      const characters = [...line.text];
      line.width = characters.reduce((width, character, index) => {
        const glyph = bitmapFont.glyphs.get(character.codePointAt(0) ?? -1);
        const nativeAdvance = glyph?.advance ?? bitmapFont.spaceWidth;
        return (
          width +
          (nativeAdvance / Math.max(1, bitmapFont.cellWidth)) * field.font.width +
          (index + 1 < characters.length ? field.characterGap ?? 0 : 0)
        );
      }, 0);
    }
  }
  if (lines.length === 0) {
    return {
      x: field.x,
      y: field.y,
      width: 0,
      height: 0,
      substituted: false,
    };
  }
  const lineStep = Math.max(1, field.font.height + (field.block?.lineSpacing ?? 0));
  const logicalWidth = Math.max(
    1,
    field.block?.width ?? Math.max(0, ...lines.map((line) => line.width))
  );
  const logicalHeight = Math.max(1, field.font.height + Math.max(0, lines.length - 1) * lineStep);
  const textRaster = allocate(logicalWidth, logicalHeight);
  const op = operation(field.reverse);
  let substituted = false;
  const drawLine = async (
    line: RasterTextLine,
    lineIndex: number,
    isLastLine: boolean
  ) => {
    const available = logicalWidth - line.indent;
    let cursor = line.indent;
    if (field.block?.justification === "C") {
      cursor += Math.max(0, (available - line.width) / 2);
    } else if (field.block?.justification === "R") {
      cursor += Math.max(0, available - line.width);
    }
    const characters = [...line.text];
    if (field.direction === "R") characters.reverse();
    const spaces = characters.filter((character) => character === " ").length;
    const extraGap =
      field.block?.justification === "J" &&
      !line.paragraphEnd &&
      !isLastLine &&
      spaces > 0
        ? Math.max(0, available - line.width) / spaces
        : 0;
    for (const character of characters) {
      const resolved = await glyphFor(
        engine,
        character,
        field.font,
        allocate,
        bitmapFonts,
        fontLinks
      );
      substituted ||= resolved.substituted;
      blitRaster(
        textRaster,
        resolved.raster,
        Math.round(cursor),
        lineIndex * lineStep,
        { operation: "set" }
      );
      cursor +=
        resolved.raster.width +
        Math.max(0, field.characterGap ?? 0) +
        (character === " " ? extraGap : 0);
    }
  };

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    await drawLine(lines[lineIndex], lineIndex, lineIndex === lines.length - 1);
    for (const overprint of lines[lineIndex].overprints ?? []) {
      await drawLine(overprint, lineIndex, lineIndex === lines.length - 1);
    }
  }
  const oriented = orientedSize(field.orientation, logicalWidth, logicalHeight);
  const autoRight =
    field.originJustification === "A" &&
    (field.direction === "R" ||
      [...field.data].map(bidiClass).find((value) => value !== "N") === "R");
  const originRight = field.originJustification === "R" || autoRight;
  const rightAnchored = field.direction === "R" ? !originRight : originRight;
  const x = rightAnchored ? field.x - oriented.width : field.x;
  const size = blitRaster(target, textRaster, x, field.y, {
    orientation: field.orientation,
    operation: op,
  });
  return { x, y: field.y, ...size, substituted };
}

function bitmapToRaster(
  field: BitmapLayoutField,
  allocate: RasterAllocator
): MonochromeRaster {
  const raster = allocate(field.width, field.height);
  for (let y = 0; y < field.height; y++) {
    for (let x = 0; x < field.width; x++) {
      const byte = field.data[y * field.bytesPerRow + (x >> 3)] ?? 0;
      if ((byte & (0x80 >> (x & 7))) !== 0) setDot(raster, x, y);
    }
  }
  return raster;
}

function graphicSymbolRaster(
  code: string,
  requestedWidth: number,
  requestedHeight: number,
  allocate: RasterAllocator
): MonochromeRaster {
  const data = zebraGraphicSymbolData(code);
  if (!data) throw new Error(`Unknown Zebra graphic symbol ${code}.`);
  const source = createMonochromeRaster(
    ZEBRA_GRAPHIC_SYMBOL_WIDTH,
    ZEBRA_GRAPHIC_SYMBOL_HEIGHT
  );
  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < source.width; x++) {
      const byte = data[y * ZEBRA_GRAPHIC_SYMBOL_BYTES_PER_ROW + (x >> 3)] ?? 0;
      if ((byte & (0x80 >> (x & 7))) !== 0) setDot(source, x, y);
    }
  }
  const width = Math.max(
    1,
    Math.ceil((requestedWidth * ZEBRA_GRAPHIC_SYMBOL_WIDTH) / 60)
  );
  const height = Math.max(1, Math.trunc(requestedHeight));
  const output = allocate(width, height);
  for (let y = 0; y < height; y++) {
    const sourceY = Math.min(
      source.height - 1,
      Math.floor((y * source.height) / height)
    );
    for (let x = 0; x < width; x++) {
      const sourceX = Math.min(
        source.width - 1,
        Math.floor((x * source.width) / width)
      );
      const byte = source.data[sourceY * source.stride + (sourceX >> 3)] ?? 0;
      if ((byte & (0x80 >> (sourceX & 7))) !== 0) setDot(output, x, y);
    }
  }
  return output;
}

type DataMatrixInputToken =
  | { kind: "byte"; value: number }
  | { kind: "codeword"; value: number };

function dataMatrixLiteralTokens(value: string): DataMatrixInputToken[] {
  const tokens: DataMatrixInputToken[] = [];
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 255) {
      tokens.push({ kind: "byte", value: codePoint });
    } else {
      for (const byte of new TextEncoder().encode(character)) {
        tokens.push({ kind: "byte", value: byte });
      }
    }
  }
  return tokens;
}

/**
 * Expands the quality-200 ^BX escape grammar into ECC-200 input tokens.
 * Zebra's FNC2 form deliberately supplies the three structured-append
 * codewords as nine decimal digits, so no sequence/file-id reinterpretation
 * is needed here.
 */
function dataMatrixEscapedTokens(
  value: string,
  escapeCharacter: string
): DataMatrixInputToken[] {
  const escape = escapeCharacter.slice(0, 1);
  if (escape === "") return dataMatrixLiteralTokens(value);
  const tokens: DataMatrixInputToken[] = [];
  let literal = "";
  const flushLiteral = () => {
    tokens.push(...dataMatrixLiteralTokens(literal));
    literal = "";
  };
  for (let index = 0; index < value.length; index++) {
    const character = value[index];
    if (character !== escape) {
      literal += character;
      continue;
    }
    flushLiteral();
    const selector = value[++index];
    if (selector === undefined) {
      throw new Error("Data Matrix escape character is truncated.");
    }
    if (selector === escape) {
      tokens.push({ kind: "byte", value: escape.charCodeAt(0) });
      continue;
    }
    if (selector === "0") {
      tokens.push({ kind: "codeword", value: 129 });
      continue;
    }
    if (selector === "1") {
      tokens.push({ kind: "codeword", value: 232 });
      continue;
    }
    if (selector === "2") {
      const digits = value.slice(index + 1, index + 10);
      if (!/^\d{9}$/.test(digits)) {
        throw new Error(
          "Data Matrix FNC2 must be followed by three three-digit codewords."
        );
      }
      const appendCodewords = [0, 3, 6].map((offset) =>
        Number(digits.slice(offset, offset + 3))
      );
      if (appendCodewords.some((codeword) => codeword < 1 || codeword > 254)) {
        throw new Error("Data Matrix FNC2 codewords must be between 001 and 254.");
      }
      tokens.push({ kind: "codeword", value: 233 });
      tokens.push(
        ...appendCodewords.map(
          (codeword): DataMatrixInputToken => ({ kind: "codeword", value: codeword })
        )
      );
      index += 9;
      continue;
    }
    if (selector === "3") {
      tokens.push({ kind: "codeword", value: 234 });
      continue;
    }
    if (selector === "5") {
      // Zebra emits the ECC-200 Macro 05 codeword and leaves the following
      // three code-page digits in the data stream.  This is observable on
      // current Link-OS firmware for the documented _5NNN form.
      if (!/^\d{3}$/.test(value.slice(index + 1, index + 4))) {
        throw new Error("Data Matrix code-page escape must be followed by three digits.");
      }
      tokens.push({ kind: "codeword", value: 236 });
      continue;
    }
    if (selector === "d") {
      const digits = value.slice(index + 1, index + 4);
      if (!/^\d{3}$/.test(digits) || Number(digits) > 255) {
        throw new Error(
          "Data Matrix decimal escape must contain a value from 000 through 255."
        );
      }
      tokens.push({ kind: "byte", value: Number(digits) });
      index += 3;
      continue;
    }
    const shifted = selector.charCodeAt(0) - 64;
    if (shifted >= 0 && shifted <= 31) {
      tokens.push({ kind: "byte", value: shifted });
      continue;
    }
    throw new Error(`Unknown Data Matrix escape sequence ${escape}${selector}.`);
  }
  flushLiteral();
  return tokens;
}

function dataMatrixRawInput(tokens: readonly DataMatrixInputToken[]): string {
  const codewords: number[] = [];
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token.kind === "codeword") {
      codewords.push(token.value);
      continue;
    }
    const next = tokens[index + 1];
    if (
      token.value >= 48 &&
      token.value <= 57 &&
      next?.kind === "byte" &&
      next.value >= 48 &&
      next.value <= 57
    ) {
      codewords.push(130 + (token.value - 48) * 10 + (next.value - 48));
      index++;
    } else if (token.value <= 127) {
      codewords.push(token.value + 1);
    } else {
      codewords.push(235, token.value - 127);
    }
  }
  return codewords.map((codeword) => `^${String(codeword).padStart(3, "0")}`).join("");
}

function dataMatrixOptimizedInput(
  tokens: readonly DataMatrixInputToken[]
): string | undefined {
  const macro05 = tokens[0]?.kind === "codeword" && tokens[0].value === 236;
  let value = macro05 ? "^091^041^062^03005^029" : "";
  for (const token of macro05 ? tokens.slice(1) : tokens) {
    if (token.kind === "byte") {
      value += `^${String(token.value).padStart(3, "0")}`;
    } else if (token.value === 232) {
      value += "^FNC1";
    } else if (token.value === 234) {
      value += "^PROG";
    } else {
      // PAD and structured append are valid ECC-200 codewords, but BWIPP's
      // high-level parser intentionally has no textual aliases for them.
      return undefined;
    }
  }
  if (macro05) value += "^030^004";
  return value;
}

function barcodeOptions(field: BarcodeLayoutField): {
  bcid: string;
  text: string;
  options: Record<string, string | number | boolean>;
  scaleX: number;
  scaleY: number;
  display: string;
} {
  if (field.symbology === "B3") {
    return {
      bcid: "code39",
      text: field.data,
      options: {
        includecheck: field.mod43CheckDigit,
        includecheckintext: field.mod43CheckDigit,
        ratio: field.ratio,
      },
      scaleX: field.moduleWidth,
      scaleY: field.height,
      display: `*${
        field.mod43CheckDigit ? field.data + code39CheckDigit(field.data) : field.data
      }*`,
    };
  }
  if (field.symbology === "BC") {
    if (field.mode === "U") {
      if (!/^\d+$/.test(field.data)) {
        throw new Error("Code 128 UCC Case Mode accepts numeric field data only.");
      }
      const nineteenDigits = field.data.slice(0, 19).padEnd(19, "0");
      const normalized = nineteenDigits + mod10CheckDigit(nineteenDigits);
      return {
        bcid: "code128",
        text: `^FNC1${normalized}`,
        options: { parsefnc: true },
        scaleX: field.moduleWidth,
        scaleY: field.height,
        display: normalized,
      };
    }
    if (field.mode === "D") {
      const compact = field.data.replace(/\s+/g, "");
      const ai00 = /^\(00\)(\d{18})(.*)$/.exec(compact);
      const normalized = ai00
        ? `(00)${ai00[1].slice(0, 17)}${mod10CheckDigit(
            ai00[1].slice(0, 17)
          )}${ai00[2]}`
        : compact;
      const hasApplicationIdentifiers = /^\(\d{2,4}\)/.test(normalized);
      return {
        bcid: hasApplicationIdentifiers ? "gs1-128" : "code128",
        text: hasApplicationIdentifiers
          ? normalized
          : `^FNC1${normalized.replace(/[()]/g, "")}`,
        options: hasApplicationIdentifiers ? {} : { parsefnc: true },
        scaleX: field.moduleWidth,
        scaleY: field.height,
        display: ai00 ? normalized : field.data,
      };
    }
    return {
      bcid: "code128",
      text: field.data,
      options: {},
      scaleX: field.moduleWidth,
      scaleY: field.height,
      display: field.data,
    };
  }
  if (field.symbology === "BQ") {
    if (field.model !== "2") {
      throw new Error("QR Model 1 is not supported; use Model 2.");
    }
    return {
      bcid: "qrcode",
      text: field.data,
      options: { eclevel: field.reliability, mask: field.mask },
      scaleX: field.magnification,
      scaleY: field.magnification,
      display: "",
    };
  }

  let encodedText = field.data;
  let display = field.data;
  const options = { ...field.encoderOptions };

  if (field.symbology === "BX") {
    const quality = Number(field.encoderOptions.zplQuality ?? 0);
    if (quality === 200) {
      // Zebra truncates quality-200 input at 3072 supplied bytes.  ZPL field
      // data is byte-oriented; the interpreter has already applied ^FH and
      // the active ^CI mapping before this point.
      encodedText = encodedText.slice(0, 3072);
      const escape = String(field.encoderOptions.zplEscape ?? "_").slice(0, 1);
      if (escape !== "" && encodedText.includes(escape)) {
        const tokens = dataMatrixEscapedTokens(encodedText, escape);
        const optimized = dataMatrixOptimizedInput(tokens);
        if (optimized === undefined) {
          encodedText = dataMatrixRawInput(tokens);
          options.raw = true;
        } else {
          encodedText = optimized;
          options.parse = true;
          options.parsefnc = true;
        }
      }
    }
    display = "";
  } else if (field.symbology === "B1") {
    const checkCount = Number(field.encoderOptions.zplCheckCount ?? 2);
    for (let count = 0; count < checkCount; count++) {
      encodedText += code11CheckDigit(encodedText, count === 0 ? 10 : 9);
    }
    display = `^${encodedText}^`;
  } else if (field.symbology === "B2") {
    if (!/^\d+$/.test(encodedText)) {
      if (field.validation) {
        throw new Error(
          "Interleaved 2 of 5 field data contains a character outside its character set."
        );
      }
      // The unchecked Zebra path discards non-numeric bytes, then applies
      // the normal even-length leading-zero rule.
      encodedText = encodedText.replace(/\D/g, "");
    }
    if (encodedText.length === 0) {
      throw new Error("Interleaved 2 of 5 field data is too short.");
    }
    if (field.encoderOptions.zplMod10) {
      const check = mod10CheckDigit(encodedText);
      encodedText += check;
      display += check;
    }
    if (encodedText.length % 2 !== 0) encodedText = `0${encodedText}`;
  } else if (field.symbology === "BA") {
    encodedText = decodeZebraCode93Data(encodedText);
    options.includecheck = true;
    const checks = code93CheckCharacters(encodedText);
    display = `□${encodedText.replace(/[\x00-\x1f\x7f]/g, " ")}${
      field.encoderOptions.zplPrintCheck ? checks : ""
    }□`;
  } else if (field.symbology === "BB") {
    if (field.encoderOptions.zplMode === "E") {
      encodedText = `^FNC1${encodedText}`;
      options.parsefnc = true;
    }
  } else if (field.symbology === "BD") {
    const mode = Number(field.encoderOptions.zplMode ?? 2);
    if (mode === 2) {
      if (!/^\d{15}/.test(encodedText)) {
        throw new Error("MaxiCode mode 2 requires a 15-digit high-priority message.");
      }
      const service = encodedText.slice(0, 3);
      const country = encodedText.slice(3, 6);
      const postal = encodedText.slice(6, 15);
      encodedText = `${postal}\x1d${country}\x1d${service}\x1d${encodedText.slice(15)}`;
    } else if (mode === 3) {
      if (!/^[0-9]{6}[0-9A-Z ]{6}/.test(encodedText)) {
        throw new Error("MaxiCode mode 3 requires a 12-character high-priority message.");
      }
      const service = encodedText.slice(0, 3);
      const country = encodedText.slice(3, 6);
      const postal = encodedText.slice(6, 12);
      encodedText = `${postal}\x1d${country}\x1d${service}\x1d${encodedText.slice(12)}`;
    }
    display = "";
  } else if (field.symbology === "BK") {
    encodedText = `${field.encoderOptions.zplStart ?? "A"}${encodedText}${
      field.encoderOptions.zplStop ?? "A"
    }`;
  } else if (field.symbology === "BL") {
    encodedText = encodedText.toUpperCase();
    display = encodedText;
  } else if (field.symbology === "BS") {
    const digits = encodedText.length <= 2 ? 2 : 5;
    encodedText = normalizeRetailData(encodedText, digits);
    display = encodedText;
    options.includetext = true;
  } else if (field.symbology === "BR") {
    const type = Number(field.encoderOptions.zplType ?? 1);
    if (type >= 1 && type <= 5 && /^\d{1,14}$/.test(encodedText)) {
      const gtin = encodedText.slice(-14).padStart(13, "0");
      encodedText = `(01)${withGtinCheckDigit(gtin, 14)}`;
    } else if (type === 7) {
      encodedText = normalizeRetailData(encodedText, 11);
    } else if (type === 8) {
      encodedText = normalizeRetailData(encodedText, 7);
    } else if (type === 9) {
      encodedText = normalizeRetailData(encodedText, 12);
    } else if (type === 10) {
      encodedText = normalizeRetailData(encodedText, 7);
    }
  }

  const retailDigits =
    field.symbology === "B8"
      ? 7
      : field.symbology === "B9"
      ? 7
      : field.symbology === "BE"
      ? 12
      : field.symbology === "BU"
      ? 11
      : undefined;
  if (retailDigits !== undefined) {
    encodedText = normalizeRetailData(field.data, retailDigits);
    const checked =
      field.symbology === "B8"
        ? withGtinCheckDigit(encodedText, 8)
        : field.symbology === "BE"
        ? withGtinCheckDigit(encodedText, 13)
        : field.symbology === "BU"
        ? withGtinCheckDigit(encodedText, 12)
        : encodedText;
    display = field.encoderOptions.zplPrintCheck === false ? encodedText : checked;
  }
  return {
    bcid:
      field.symbology === "BS"
        ? encodedText.length === 2
          ? "ean2"
          : "ean5"
        : field.encoder,
    text: encodedText,
    options: {
      ...options,
      includetext:
        Boolean(options.includetext) ||
        (!field.matrix &&
          (field.printInterpretationAbove || field.printInterpretationBelow)),
    },
    scaleX: field.moduleWidth,
    scaleY: Math.max(1, field.height),
    display,
  };
}

function code11CheckDigit(value: string, maximumWeight: 9 | 10): string {
  if (!/^[0-9-]+$/.test(value)) {
    throw new Error("Code 11 field data can contain digits and hyphens only.");
  }
  let sum = 0;
  let weight = 1;
  for (let index = value.length - 1; index >= 0; index--) {
    sum += (value[index] === "-" ? 10 : Number(value[index])) * weight;
    weight = weight === maximumWeight ? 1 : weight + 1;
  }
  const check = sum % 11;
  return check === 10 ? "-" : String(check);
}

const CODE93_BASIC = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%";

function decodeZebraCode93Data(value: string): string {
  let result = "";
  for (let index = 0; index < value.length; index++) {
    const lead = value[index];
    const next = value[index + 1];
    let code: number | undefined;
    if (lead === "&" && next && next >= "A" && next <= "Z") {
      code = next.charCodeAt(0) - 64;
    } else if (lead === "`" && next) {
      if (next === "U") code = 0;
      else if (next >= "A" && next <= "E") code = next.charCodeAt(0) - 38;
      else if (next >= "F" && next <= "J") code = next.charCodeAt(0) - 11;
      else if (next >= "K" && next <= "O") code = next.charCodeAt(0) + 16;
      else if (next >= "P" && next <= "T") code = next.charCodeAt(0) + 43;
      else if (next === "V") code = 64;
      else if (next === "W") code = 96;
    } else if (lead === "(" && next) {
      if (next >= "A" && next <= "C") code = next.charCodeAt(0) - 32;
      else if (next >= "F" && next <= "J") code = next.charCodeAt(0) - 32;
      else if (next === "L") code = 44;
      else if (next === "Z") code = 58;
    } else if (lead === ")" && next && next >= "A" && next <= "Z") {
      code = next.charCodeAt(0) + 32;
    }
    if (code === undefined) {
      result += lead;
    } else {
      result += String.fromCharCode(code);
      index++;
    }
  }
  return result;
}

function code93ExtendedValues(value: string): number[] {
  const values: number[] = [];
  const pair = (shift: number, character: string) => {
    values.push(shift, CODE93_BASIC.indexOf(character));
  };
  for (const character of value) {
    const code = character.charCodeAt(0);
    const basic = CODE93_BASIC.indexOf(character);
    if (basic >= 0) values.push(basic);
    else if (code === 0) pair(44, "U");
    else if (code >= 1 && code <= 26) pair(43, String.fromCharCode(64 + code));
    else if (code >= 27 && code <= 31) pair(44, String.fromCharCode(38 + code));
    else if (code >= 33 && code <= 35) pair(45, String.fromCharCode(32 + code));
    else if (code >= 38 && code <= 42) pair(45, String.fromCharCode(32 + code));
    else if (code === 44) pair(45, "L");
    else if (code === 58) pair(45, "Z");
    else if (code >= 59 && code <= 63) pair(44, String.fromCharCode(11 + code));
    else if (code === 64) pair(44, "V");
    else if (code >= 91 && code <= 95) pair(44, String.fromCharCode(code - 16));
    else if (code === 96) pair(44, "W");
    else if (code >= 97 && code <= 122) pair(46, String.fromCharCode(code - 32));
    else if (code >= 123 && code <= 127) pair(44, String.fromCharCode(code - 43));
    else throw new Error("Code 93 supports ASCII character values 0 through 127 only.");
  }
  return values;
}

function code93CheckCharacters(value: string): string {
  const values = code93ExtendedValues(value);
  const check = (source: readonly number[], maximumWeight: number) => {
    let sum = 0;
    let weight = 1;
    for (let index = source.length - 1; index >= 0; index--) {
      sum += source[index] * weight;
      weight = weight === maximumWeight ? 1 : weight + 1;
    }
    return sum % 47;
  };
  const c = check(values, 20);
  const k = check([...values, c], 15);
  const display = (code: number) =>
    code <= 42 ? CODE93_BASIC[code] : ["&", "`", "(", ")"][code - 43];
  return display(c) + display(k);
}

function normalizeRetailData(value: string, digits: number): string {
  if (!/^\d+$/.test(value)) {
    throw new Error("Retail barcode field data must contain digits only.");
  }
  return value.slice(-digits).padStart(digits, "0");
}

function mod10CheckDigit(value: string): string {
  if (!/^\d+$/.test(value)) {
    throw new Error("A Mod-10 check digit requires numeric field data.");
  }
  let sum = 0;
  for (let index = value.length - 1, position = 0; index >= 0; index--, position++) {
    sum += Number(value[index]) * (position % 2 === 0 ? 3 : 1);
  }
  return String((10 - (sum % 10)) % 10);
}

function withGtinCheckDigit(value: string, completeLength: number): string {
  if (value.length === completeLength) return value;
  if (value.length !== completeLength - 1) return value;
  return value + mod10CheckDigit(value);
}

type DrawingPoint = [number, number];

function fillPolygonRaster(
  raster: MonochromeRaster,
  points: readonly DrawingPoint[]
): void {
  const minX = Math.max(0, Math.floor(Math.min(...points.map(([x]) => x))));
  const maxX = Math.min(raster.width - 1, Math.ceil(Math.max(...points.map(([x]) => x))));
  const minY = Math.max(0, Math.floor(Math.min(...points.map(([, y]) => y))));
  const maxY = Math.min(raster.height - 1, Math.ceil(Math.max(...points.map(([, y]) => y))));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      let inside = false;
      for (let current = 0, previous = points.length - 1; current < points.length; previous = current++) {
        const [cx, cy] = points[current];
        const [px0, py0] = points[previous];
        if (
          (cy > py) !== (py0 > py) &&
          px < ((px0 - cx) * (py - cy)) / (py0 - cy) + cx
        ) {
          inside = !inside;
        }
      }
      if (inside) setDot(raster, x, y);
    }
  }
}

/**
 * Renders a BWIPP symbol without going through an intermediate PNG.  Matrix
 * composites expose compact rows through `raw()`, which loses the row-height
 * table.  The drawing API retains that table and therefore preserves the
 * one-module separator rows used by GS1 DataBar and Composite symbols.
 */
function renderBwippMonochrome(
  options: Readonly<
    { bcid: string; text: string } & Record<
      string,
      string | number | boolean
    >
  >,
  allocate: RasterAllocator
): MonochromeRaster {
  let raster = allocate(1, 1);
  let polygons: DrawingPoint[][] = [];
  const drawing = {
    setopts: () => undefined,
    scale: (scaleX: number, scaleY: number): [number, number] => [
      Math.max(1, Math.floor(scaleX)),
      Math.max(1, Math.floor(scaleY)),
    ],
    measure: () => ({ width: 0, ascent: 0, descent: 0 }),
    init: (width: number, height: number) => {
      raster = allocate(Math.ceil(width), Math.ceil(height));
    },
    line: (
      x0: number,
      y0: number,
      x1: number,
      y1: number,
      lineWidth: number
    ) => {
      x0 = Math.trunc(x0);
      y0 = Math.trunc(y0);
      x1 = Math.trunc(x1);
      y1 = Math.trunc(y1);
      const width = Math.max(1, Math.round(lineWidth));
      if (y1 < y0) [y0, y1] = [y1, y0];
      if (x1 < x0) [x0, x1] = [x1, x0];
      const half = Math.trunc(width / 2);
      if (x0 === x1) {
        x0 = x0 - width + half;
        x1 = x1 + half - 1;
      } else {
        y0 -= half;
        y1 += width - half - 1;
      }
      fillRect(raster, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    },
    polygon: (points: DrawingPoint[]) => {
      polygons.push(points);
    },
    hexagon: (points: DrawingPoint[]) => {
      polygons.push(points);
    },
    ellipse: () => undefined,
    fill: () => {
      for (const points of polygons) fillPolygonRaster(raster, points);
      polygons = [];
    },
    text: () => undefined,
    end: () => raster,
  };
  return bwipjs.render(options, drawing);
}

function padMonochromeRaster(
  raster: MonochromeRaster,
  left: number,
  right: number,
  allocate: RasterAllocator
): MonochromeRaster {
  const leftPadding = Math.max(0, Math.trunc(left));
  const rightPadding = Math.max(0, Math.trunc(right));
  if (leftPadding === 0 && rightPadding === 0) return raster;
  const padded = allocate(
    leftPadding + raster.width + rightPadding,
    raster.height
  );
  blitRaster(padded, raster, leftPadding, 0);
  return padded;
}

function renderMaxicode(
  text: string,
  scale: number,
  encoderOptions: Readonly<Record<string, string | number | boolean>>,
  allocate: RasterAllocator
): MonochromeRaster {
  let raster = allocate(1, 1);
  let polygons: DrawingPoint[][] = [];
  let ellipses: Array<{
    x: number;
    y: number;
    rx: number;
    ry: number;
    ccw: boolean;
  }> = [];
  const drawing = {
    setopts: () => undefined,
    scale: (scaleX: number, scaleY: number): [number, number] => [
      Math.max(1, Math.floor(scaleX)),
      Math.max(1, Math.floor(scaleY)),
    ],
    measure: () => ({ width: 0, ascent: 0, descent: 0 }),
    init: (width: number, height: number) => {
      raster = allocate(Math.ceil(width), Math.ceil(height));
    },
    line: (
      x0: number,
      y0: number,
      x1: number,
      y1: number,
      lineWidth: number
    ) => {
      if (Math.abs(x1 - x0) < Math.abs(y1 - y0)) {
        fillRect(
          raster,
          Math.round(x0 - lineWidth / 2),
          Math.round(Math.min(y0, y1)),
          Math.max(1, Math.round(lineWidth)),
          Math.max(1, Math.round(Math.abs(y1 - y0)))
        );
      } else {
        fillRect(
          raster,
          Math.round(Math.min(x0, x1)),
          Math.round(y0 - lineWidth / 2),
          Math.max(1, Math.round(Math.abs(x1 - x0))),
          Math.max(1, Math.round(lineWidth))
        );
      }
    },
    polygon: (points: DrawingPoint[]) => {
      polygons.push(points);
    },
    hexagon: (points: DrawingPoint[]) => {
      polygons.push(points);
    },
    ellipse: (
      x: number,
      y: number,
      rx: number,
      ry: number,
      ccw: boolean
    ) => {
      ellipses.push({ x, y, rx, ry, ccw });
    },
    fill: () => {
      for (const points of polygons) fillPolygonRaster(raster, points);
      if (ellipses.length > 0) {
        const minX = Math.max(
          0,
          Math.floor(Math.min(...ellipses.map((ellipse) => ellipse.x - ellipse.rx)))
        );
        const maxX = Math.min(
          raster.width - 1,
          Math.ceil(Math.max(...ellipses.map((ellipse) => ellipse.x + ellipse.rx)))
        );
        const minY = Math.max(
          0,
          Math.floor(Math.min(...ellipses.map((ellipse) => ellipse.y - ellipse.ry)))
        );
        const maxY = Math.min(
          raster.height - 1,
          Math.ceil(Math.max(...ellipses.map((ellipse) => ellipse.y + ellipse.ry)))
        );
        for (let y = minY; y <= maxY; y++) {
          for (let x = minX; x <= maxX; x++) {
            let winding = 0;
            for (const ellipse of ellipses) {
              const dx = (x + 0.5 - ellipse.x) / ellipse.rx;
              const dy = (y + 0.5 - ellipse.y) / ellipse.ry;
              if (dx * dx + dy * dy <= 1) winding += ellipse.ccw ? -1 : 1;
            }
            if (winding !== 0) setDot(raster, x, y);
          }
        }
      }
      polygons = [];
      ellipses = [];
    },
    text: () => undefined,
    end: () => raster,
  };
  const options = Object.fromEntries(
    Object.entries(encoderOptions).filter(
      ([key, value]) =>
        !key.startsWith("zpl") && value !== "" && value !== false && value !== 0
    )
  );
  return bwipjs.render(
    {
      bcid: "maxicode",
      text,
      scaleX: scale,
      scaleY: scale,
      ...options,
    },
    drawing
  );
}

function linearRaster(
  raw: RawLinearBarcode,
  moduleWidth: number,
  height: number,
  ratio: number | undefined,
  allocate: RasterAllocator
): MonochromeRaster {
  const widths = raw.sbs.map((value) =>
    value === 0
      ? 0
      : Math.max(
          1,
          Math.round(
            value > 1 && ratio !== undefined
              ? moduleWidth * ratio
              : value * moduleWidth
          )
        )
  );
  const raster = allocate(
    widths.reduce((sum, value) => sum + value, 0),
    Math.max(1, height)
  );
  const barExtents = (raw.bhs ?? []).map(
    (barHeight, index) => barHeight + (raw.bbs?.[index] ?? 0)
  );
  const maxExtent = Math.max(1, ...barExtents);
  const heightScale = raster.height / maxExtent;
  let x = 0;
  let barIndex = 0;
  widths.forEach((width, index) => {
    if (index % 2 === 0) {
      const barHeight = raw.bhs?.[barIndex] ?? maxExtent;
      const baseline = raw.bbs?.[barIndex] ?? 0;
      const y = Math.round((maxExtent - baseline - barHeight) * heightScale);
      const barPixelHeight = Math.max(1, Math.round(barHeight * heightScale));
      fillRect(raster, x, y, width, barPixelHeight);
      barIndex++;
    }
    x += width;
  });
  return raster;
}

function renderTlc39(
  field: ExtendedBarcodeLayoutField,
  allocate: RasterAllocator
): {
  raster: MonochromeRaster;
  display: string;
} {
  const eci = field.data.slice(0, 6);
  if (!/^\d{6}$/.test(eci)) {
    throw new Error("TLC39 field data must begin with a six-digit ECI number.");
  }
  const code39 = bwipjs.raw({ bcid: "code39", text: eci })[0] as unknown as
    | RawLinearBarcode
    | undefined;
  if (!code39 || !("sbs" in code39)) {
    throw new Error("The TLC39 Code 39 component could not be encoded.");
  }
  const linear = linearRaster(
    code39,
    field.moduleWidth,
    field.height,
    field.ratio,
    allocate
  );
  if (field.data[6] !== ",") return { raster: linear, display: "" };

  const payload = field.data.slice(7);
  if (payload.length === 0 || payload.length > 150) {
    throw new Error("TLC39 MicroPDF417 data must contain 1 to 150 bytes.");
  }
  const micro = bwipjs.raw({
    bcid: "micropdf417",
    // TLC39 links the ECI carrier and the secondary message by encoding the
    // six ECI digits at the front of the MicroPDF417 data, without the ZPL
    // comma that separates the two input components.
    text: eci + payload,
    columns: 4,
    rowmult: 1,
  })[0] as unknown as RawMatrixBarcode | undefined;
  if (!micro || !("pixx" in micro)) {
    throw new Error("The TLC39 MicroPDF417 component could not be encoded.");
  }
  const microModule = Number(field.encoderOptions.zplMicroModule ?? 2);
  const microRowHeight = Number(field.encoderOptions.zplMicroRowHeight ?? 4);
  const microRaster = allocate(
    micro.pixx * microModule,
    micro.pixy * microRowHeight
  );
  const rawMicro = allocate(micro.pixx, micro.pixy);
  for (let y = 0; y < micro.pixy; y++) {
    for (let x = 0; x < micro.pixx; x++) {
      if (micro.pixs[y * micro.pixx + x]) setDot(rawMicro, x, y);
    }
  }
  blitRaster(microRaster, rawMicro, 0, 0, {
    scaleX: microModule,
    scaleY: microRowHeight,
  });
  const gap = Math.max(1, field.moduleWidth);
  const linkageRuns = code39Runs("0").slice(-9);
  const linkageWidths = linkageRuns.map((run) =>
    run.units >= 3 ? Math.round(field.moduleWidth * (field.ratio ?? 2)) : field.moduleWidth * run.units
  );
  const linkage = allocate(
    linkageWidths.reduce((total, value) => total + value, 0),
    linear.height + field.moduleWidth * 8
  );
  let linkageX = 0;
  linkageRuns.forEach((run, index) => {
    if (run.black) {
      fillRect(linkage, linkageX, 0, linkageWidths[index], linkage.height);
    }
    linkageX += linkageWidths[index];
  });
  const linearY = microRaster.height + gap;
  const linkageOffsetX = linear.width + field.moduleWidth * 9;
  const linkageOffsetY = Math.max(0, linearY - field.moduleWidth * 4);
  const output = allocate(
    Math.max(microRaster.width, linkageOffsetX + linkage.width),
    Math.max(linearY + linear.height, linkageOffsetY + linkage.height)
  );
  blitRaster(output, microRaster, 0, 0);
  blitRaster(output, linear, 0, linearY);
  blitRaster(output, linkage, linkageOffsetX, linkageOffsetY);
  return { raster: output, display: "" };
}

function aztecMatrix(
  text: string,
  options: Record<string, string | number | boolean>
): RawMatrixBarcode {
  const raw = bwipjs.raw({ bcid: "azteccode", text, ...options })[0] as unknown as
    | RawMatrixBarcode
    | undefined;
  if (!raw || !("pixs" in raw) || !("pixx" in raw) || !("pixy" in raw)) {
    throw new Error("The Aztec encoder produced no module matrix.");
  }
  return raw;
}

function selectAutomaticAztec(
  text: string,
  baseOptions: Record<string, string | number | boolean>,
  readerInitialization: boolean
): RawMatrixBarcode {
  try {
    return aztecMatrix(text, { ...baseOptions, format: "compact" });
  } catch (compactError) {
    if (!readerInitialization) {
      try {
        return aztecMatrix(text, { ...baseOptions, format: "full" });
      } catch {
        throw compactError;
      }
    }
    for (let layers = 1; layers <= 22; layers++) {
      try {
        return aztecMatrix(text, {
          ...baseOptions,
          format: "full",
          layers,
        });
      } catch {
        // Reader-initialization symbols permit only full-range layers 1-22.
      }
    }
    throw compactError;
  }
}

function matrixModuleRaster(
  raw: RawMatrixBarcode,
  allocate: RasterAllocator
): MonochromeRaster {
  const raster = allocate(raw.pixx, raw.pixy);
  for (let y = 0; y < raw.pixy; y++) {
    for (let x = 0; x < raw.pixx; x++) {
      if (raw.pixs[y * raw.pixx + x]) setDot(raster, x, y);
    }
  }
  return raster;
}

function aztecRawSymbol(
  bits: string,
  field: ExtendedBarcodeLayoutField,
  containsEcic: boolean
): RawMatrixBarcode {
  const encoderOptions = field.encoderOptions;
  const readerInitialization = encoderOptions.readerinit === true;
  const fixedSize = encoderOptions.zplFixedSize === true;
  const requestedEcLevel = Number(encoderOptions.eclevel ?? 23);
  const baseOptions: Record<string, string | number | boolean> = {
    raw: true,
    eclevel: fixedSize ? 5 : requestedEcLevel,
  };
  if (readerInitialization) baseOptions.readerinit = true;
  const layers = Number(encoderOptions.layers ?? 0);
  const automatic = encoderOptions.zplAutoFormat === true;
  if (!automatic) {
    const format = String(encoderOptions.format ?? "full");
    try {
      return aztecMatrix(bits, {
        ...baseOptions,
        format,
        ...(layers > 0 ? { layers } : {}),
      });
    } catch (error) {
      // Zebra selects ECIC symbol size from the visible payload before the
      // FLG(n) overhead is inserted.  A fixed symbol therefore consumes the
      // otherwise spare error-correction words when that overhead is present.
      if (!containsEcic || requestedEcLevel <= 5) throw error;
      return aztecMatrix(bits, {
        ...baseOptions,
        eclevel: 5,
        format,
        ...(layers > 0 ? { layers } : {}),
      });
    }
  }
  if (containsEcic) {
    return selectAutomaticAztec(
      bits,
      { ...baseOptions, eclevel: 5 },
      readerInitialization
    );
  }
  return selectAutomaticAztec(bits, baseOptions, readerInitialization);
}

function structuredAztecSegments(bytes: Uint8Array, count: number): Uint8Array[] {
  if (count <= 1) return [bytes];
  // Zebra's partition is deliberately one byte larger than floor(n/count)
  // for every segment except the last.  For example, 12/3 becomes 5/5/2.
  const chunkSize = Math.floor(bytes.length / count) + 1;
  return Array.from({ length: count }, (_, index) =>
    bytes.slice(index * chunkSize, index === count - 1 ? bytes.length : (index + 1) * chunkSize)
  );
}

function renderAztec(
  field: ExtendedBarcodeLayoutField,
  allocate: RasterAllocator
): {
  raster: MonochromeRaster;
  display: string;
} {
  const bytes = new TextEncoder().encode(field.data);
  const count = Number(field.encoderOptions.zplStructuredCount ?? 1);
  const ecic = field.encoderOptions.zplEci === true;
  const id = String(field.encoderOptions.zplStructuredId ?? "");
  const idBytes = new TextEncoder().encode(id);
  const symbols = structuredAztecSegments(bytes, count).map((segment, index) => {
    const payload = parseZplAztecTokens(segment, ecic);
    const containsEcic = payload.some((token) => token.kind === "flag");
    let tokens: AztecHighLevelToken[] = payload;
    let prefix = "";
    if (count > 1) {
      const header: AztecHighLevelToken[] = [];
      if (idBytes.length > 0) {
        header.push(
          { kind: "byte", value: 32 },
          ...[...idBytes].map((value) => ({ kind: "byte" as const, value })),
          { kind: "byte", value: 32 }
        );
      }
      header.push(
        { kind: "byte", value: 65 + index },
        { kind: "byte", value: 64 + count }
      );
      tokens = [...header, ...payload];
      // ISO/IEC 24778 structured append begins M/L U/L before the visible
      // optional ID, sequence letter, total letter, and payload.
      prefix = "1110111101";
    }
    const bits = prefix + encodeAztecHighLevel(tokens);
    return aztecRawSymbol(bits, field, containsEcic);
  });
  const widthInModules =
    symbols.reduce((sum, symbol) => sum + symbol.pixx, 0) +
    Math.max(0, symbols.length - 1);
  const heightInModules = Math.max(...symbols.map((symbol) => symbol.pixy));
  const raster = allocate(
    widthInModules * field.moduleWidth,
    heightInModules * field.moduleWidth
  );
  let x = 0;
  for (const symbol of symbols) {
    blitRaster(raster, matrixModuleRaster(symbol, allocate), x * field.moduleWidth, 0, {
      scaleX: field.moduleWidth,
      scaleY: field.moduleWidth,
    });
    x += symbol.pixx + 1;
  }
  return { raster, display: "" };
}

function codablockACode39Row(
  contents: string,
  moduleWidth: number,
  ratio: number,
  allocate: RasterAllocator
): MonochromeRaster {
  const wide = Math.round(moduleWidth * ratio);
  const runs = code39Runs(contents);
  const widths = runs.map((run) =>
    run.units >= 3 ? wide : moduleWidth * run.units
  );
  const raster = allocate(
    widths.reduce((total, width) => total + width, 0),
    1
  );
  let x = 0;
  runs.forEach((run, index) => {
    if (run.black) fillRect(raster, x, 0, widths[index], 1);
    x += widths[index];
  });
  return raster;
}

function renderCodablockA(
  field: ExtendedBarcodeLayoutField,
  allocate: RasterAllocator
): {
  raster: MonochromeRaster;
  display: string;
} {
  const columnsSpecified = field.encoderOptions.zplColumnsSpecified === true;
  const rowsSpecified = field.encoderOptions.zplRowsSpecified === true;
  const symbol = encodeZplCodablockA(field.data, {
    security: field.encoderOptions.zplSecurity !== false,
    ...(columnsSpecified
      ? { columns: Number(field.encoderOptions.columns) }
      : {}),
    ...(rowsSpecified ? { rows: Number(field.encoderOptions.rows) } : {}),
  });
  const moduleWidth = field.moduleWidth;
  const rowHeight = Math.max(
    2,
    Math.trunc(Number(field.encoderOptions.rowheight ?? 8))
  );
  const separatorHeight = moduleWidth;
  const barHeight = Math.max(1, rowHeight - separatorHeight);
  const ratio = field.ratio ?? 3;
  const rowRasters = symbol.rowContents.map((contents) =>
    codablockACode39Row(contents, moduleWidth, ratio, allocate)
  );
  const fullWidth = rowRasters[0].width;
  const width =
    symbol.rows === 1 ? fullWidth : Math.max(1, fullWidth - moduleWidth);
  const raster = allocate(
    width,
    separatorHeight + symbol.rows * (barHeight + separatorHeight)
  );
  fillRect(raster, 0, 0, width, separatorHeight);
  const wide = Math.round(moduleWidth * ratio);
  const characterWidth = 3 * wide + 7 * moduleWidth;
  let y = separatorHeight;
  for (let row = 0; row < symbol.rows; row++) {
    blitRaster(raster, rowRasters[row], 0, y, { scaleY: barHeight });
    y += barHeight;
    if (row === symbol.rows - 1) {
      fillRect(raster, 0, y, width, separatorHeight);
    } else {
      const separator = allocate(width, 1);
      const rightStopStart = fullWidth - characterWidth - moduleWidth;
      fillRect(
        separator,
        characterWidth,
        0,
        Math.max(0, rightStopStart - characterWidth),
        1
      );
      for (let x = 0; x < width; x++) {
        if (
          (x < characterWidth || x >= rightStopStart) &&
          getDot(rowRasters[row], x, 0)
        ) {
          setDot(separator, x, 0);
        }
      }
      blitRaster(raster, separator, 0, y, { scaleY: separatorHeight });
    }
    y += separatorHeight;
  }
  return { raster, display: symbol.display };
}

function renderCodablockEF(
  field: ExtendedBarcodeLayoutField,
  allocate: RasterAllocator
): {
  raster: MonochromeRaster;
  display: string;
} {
  const config = barcodeOptions(field);
  const encoderOptions = Object.fromEntries(
    Object.entries(config.options).filter(
      ([key, value]) =>
        !key.startsWith("zpl") &&
        key !== "rows" &&
        value !== "" &&
        value !== false &&
        value !== 0
    )
  );
  const raw = bwipjs.raw({
    bcid: config.bcid,
    text: config.text,
    ...encoderOptions,
  })[0] as unknown as RawMatrixBarcode | undefined;
  if (!raw || !("pixs" in raw) || !("pixx" in raw)) {
    throw new Error("The CODABLOCK encoder produced no symbol.");
  }
  const compactRows = raw.pixs.length / raw.pixx;
  if (!Number.isInteger(compactRows) || (compactRows & 1) === 0) {
    throw new Error("The CODABLOCK encoder returned invalid compact rows.");
  }
  const moduleWidth = field.moduleWidth;
  const rowHeight = Math.max(
    2,
    Math.trunc(Number(field.encoderOptions.rowheight ?? 8))
  );
  const separatorHeight = moduleWidth;
  const barHeight = Math.max(1, rowHeight - separatorHeight);
  const dataRows = (compactRows - 1) / 2;
  const raster = allocate(
    raw.pixx * moduleWidth,
    separatorHeight + dataRows * (barHeight + separatorHeight)
  );
  let y = 0;
  for (let compactRow = 0; compactRow < compactRows; compactRow++) {
    const source = allocate(raw.pixx, 1);
    for (let x = 0; x < raw.pixx; x++) {
      if (raw.pixs[compactRow * raw.pixx + x]) setDot(source, x, 0);
    }
    const height = compactRow % 2 === 0 ? separatorHeight : barHeight;
    blitRaster(raster, source, 0, y, {
      scaleX: moduleWidth,
      scaleY: height,
    });
    y += height;
  }
  return { raster, display: "" };
}

const GS1_DATABAR_ENCODERS = [
  "",
  "databaromni",
  "databartruncated",
  "databarstacked",
  "databarstackedomni",
  "databarlimited",
  "databarexpanded",
  "upca",
  "upce",
  "ean13",
  "ean8",
  "gs1-128",
  "gs1-128",
] as const;

const GS1_DATABAR_COMPOSITE_ENCODERS = [
  "",
  "databaromnicomposite",
  "databartruncatedcomposite",
  "databarstackedcomposite",
  "databarstackedomnicomposite",
  "databarlimitedcomposite",
  "databarexpandedcomposite",
  "upcacomposite",
  "upcecomposite",
  "ean13composite",
  "ean8composite",
  "gs1-128composite",
  "gs1-128composite",
] as const;

function normalizeZplUpcaSource(value: string): string {
  if (!/^\d{1,11}$/.test(value)) {
    throw new Error("GS1 DataBar UPC-E data must contain at most 11 digits.");
  }
  return value.slice(-11).padStart(11, "0");
}

const UPC_E_L_BITS = [
  "0001101",
  "0011001",
  "0010011",
  "0111101",
  "0100011",
  "0110001",
  "0101111",
  "0111011",
  "0110111",
  "0001011",
] as const;

const UPC_E0_PARITY = [
  0x38, 0x34, 0x32, 0x31, 0x2c, 0x26, 0x23, 0x2a, 0x29, 0x25,
] as const;

function zplBrUpceDigits(source: string): { digits: string; check: number } {
  const upca = normalizeZplUpcaSource(source);
  let compressed: string | undefined;
  if (Number(upca[3]) <= 2 && upca.slice(4, 8) === "0000") {
    compressed = upca.slice(0, 3) + upca.slice(8, 11) + upca[3];
  } else if (upca.slice(4, 9) === "00000") {
    compressed = upca.slice(0, 4) + upca.slice(9, 11) + "3";
  } else if (upca.slice(5, 10) === "00000") {
    compressed = upca.slice(0, 5) + upca[10] + "4";
  } else if (Number(upca[10]) >= 5 && upca.slice(6, 10) === "0000") {
    compressed = upca.slice(0, 6) + upca[10];
  }
  if (compressed === undefined) {
    throw new Error("The UPC-A field data cannot be represented as UPC-E.");
  }
  // Zebra's ^BR type-8 path always uses UPC-E number system zero, while its
  // parity/check digit is calculated from the original eleven-digit source.
  return {
    digits: `0${compressed.slice(1)}`,
    check: Number(mod10CheckDigit(upca)),
  };
}

function renderZplBrUpce(
  source: string,
  moduleWidth: number,
  allocate: RasterAllocator
): MonochromeRaster {
  const { digits, check } = zplBrUpceDigits(source);
  const parity = UPC_E0_PARITY[check];
  let bits = "0000000" + "101";
  for (let index = 0; index < 6; index++) {
    const pattern = UPC_E_L_BITS[Number(digits[index + 1])];
    bits += (parity & (1 << (5 - index))) !== 0
      ? [...pattern]
          .reverse()
          .map((bit) => (bit === "1" ? "0" : "1"))
          .join("")
      : pattern;
  }
  bits += "010101";
  const raster = allocate(
    bits.length * moduleWidth,
    74 * moduleWidth
  );
  for (let index = 0; index < bits.length; index++) {
    if (bits[index] === "1") {
      fillRect(
        raster,
        index * moduleWidth,
        0,
        moduleWidth,
        raster.height
      );
    }
  }
  return raster;
}

function normalizeZplDataBarLinear(type: number, value: string): string {
  if (type >= 1 && type <= 5) {
    if (/^\d{1,14}$/.test(value)) {
      const gtin = value.slice(-14).padStart(13, "0");
      return `(01)${withGtinCheckDigit(gtin, 14)}`;
    }
    return value.startsWith("(") ? value : `()${value}`;
  }
  if (type === 6) {
    if (/^01\d{14}$/.test(value)) return `(01)${value.slice(2)}`;
    return value.startsWith("(") ? value : `()${value}`;
  }
  if (type === 7) return normalizeRetailData(value, 11);
  if (type === 8) return normalizeZplUpcaSource(value);
  if (type === 9) return normalizeRetailData(value, 12);
  if (type === 10) return normalizeRetailData(value, 7);
  // Zebra's ^FD contract contains the encoded GS1 bytes, not BWIPP's
  // parenthesized AI notation.  An empty AI is BWIPP's raw-data escape.
  return value.startsWith("()") ? value : `()${value}`;
}

function renderGs1DataBar(
  field: ExtendedBarcodeLayoutField,
  allocate: RasterAllocator
): {
  raster: MonochromeRaster;
  display: string;
} {
  const type = Math.max(
    1,
    Math.min(12, Math.trunc(Number(field.encoderOptions.zplType ?? 1)))
  );
  const separator = field.data.indexOf("|");
  const linearSource = separator < 0 ? field.data : field.data.slice(0, separator);
  const compositeSource = separator < 0 ? undefined : field.data.slice(separator + 1);
  if (type >= 11 && compositeSource === undefined) {
    throw new Error(`GS1 DataBar type ${type} requires a composite component after '|'.`);
  }
  if (type === 8 && compositeSource === undefined) {
    return {
      raster: renderZplBrUpce(linearSource, field.moduleWidth, allocate),
      display: "",
    };
  }
  const linear = normalizeZplDataBarLinear(type, linearSource);
  const segments = Math.max(
    2,
    Math.min(22, Math.trunc(Number(field.encoderOptions.segments ?? 22)))
  );
  const stackedExpanded = type === 6 && segments < 22;
  let bcid: string = compositeSource === undefined
    ? GS1_DATABAR_ENCODERS[type]
    : GS1_DATABAR_COMPOSITE_ENCODERS[type];
  if (stackedExpanded) {
    bcid = compositeSource === undefined
      ? "databarexpandedstacked"
      : "databarexpandedstackedcomposite";
  }
  const text = compositeSource === undefined
    ? linear
    : `${linear}|()${compositeSource}`;
  const options: { bcid: string; text: string } & Record<
    string,
    string | number | boolean
  > = {
    bcid,
    text,
    scaleX: field.moduleWidth,
    scaleY: field.moduleWidth,
    includetext: false,
    dontlint: true,
    sepheight: Math.max(
      1,
      Math.min(2, Math.trunc(Number(field.encoderOptions.sepheight ?? 1)))
    ),
  };
  if (type === 6) options.segments = segments;
  if (type >= 7 && type <= 10) {
    // Zebra uses 74-module UPC/EAN bars (60 for EAN-8) in ^BR, two
    // modules taller than BWIPP's UPC/EAN default.  Supplying the physical
    // height also extends only the linear half of a composite symbol.
    const logicalHeight = type === 10 ? 60 : 74;
    options.height = (logicalHeight * 25.4) / 72 - 0.005;
  } else if (type >= 11) {
    // ^BR's linear-component height is expressed before magnification.
    options.height = (Math.max(1, field.height) * 25.4) / 72;
  }

  const render = (ccversion?: "a" | "b" | "c") =>
    renderBwippMonochrome(
      ccversion === undefined ? options : { ...options, ccversion },
      allocate
    );
  let raster: MonochromeRaster;
  if (compositeSource === undefined) raster = render();
  else if (type === 12) raster = render("c");
  else {
    // CC-A is Zebra's compact choice.  Payloads that exceed it are promoted
    // to CC-B, matching the printer's automatic CC-A/CC-B selection.
    try {
      raster = render("a");
    } catch {
      raster = render("b");
    }
  }

  if (compositeSource !== undefined) {
    const leadingModules =
      type <= 6 ? 1 : type <= 10 ? 4 : type === 11 ? 10 : 3;
    raster = padMonochromeRaster(
      raster,
      leadingModules * field.moduleWidth,
      0,
      allocate
    );
  }

  if (compositeSource === undefined) {
    const logicalHeights: Partial<Record<number, number>> = {
      1: 33,
      2: 13,
      5: 10,
      7: 74,
      8: 74,
      9: 74,
      10: 60,
    };
    const logicalHeight = logicalHeights[type];
    if (logicalHeight !== undefined) {
      raster = cropRasterHeight(raster, logicalHeight * field.moduleWidth);
    }
    const module = field.moduleWidth;
    if (type === 1 || type === 2) {
      raster = padMonochromeRaster(
        raster,
        module,
        Math.max(0, 96 * module - raster.width - module),
        allocate
      );
    } else if (type === 5) {
      raster = padMonochromeRaster(
        raster,
        module,
        Math.max(0, 79 * module - raster.width - module),
        allocate
      );
    } else if (type === 6) {
      raster = padMonochromeRaster(raster, module, 0, allocate);
    } else if (type >= 7 && type <= 10) {
      raster = padMonochromeRaster(raster, 7 * module, 0, allocate);
    }
  }
  return { raster, display: "" };
}

function rawBarcodeRaster(
  field: BarcodeLayoutField,
  allocate: RasterAllocator
): { raster: MonochromeRaster; display: string } {
  if (field.symbology === "B7") {
    if (field.encoderOptions.raw !== true && field.data.length > 3 * 1024) {
      throw new Error("PDF417 field data exceeds Zebra's 3K limit.");
    }
    const columns = Number(field.encoderOptions.columns ?? 0);
    const rows = Number(field.encoderOptions.rows ?? 0);
    if (columns > 0 && rows > 0 && columns * rows >= 928) {
      throw new Error("PDF417 rows multiplied by columns must be less than 928.");
    }
  }
  if (field.symbology === "B3") {
    if (!/^[0-9A-Z\-. $/+%]+$/.test(field.data)) {
      throw new Error("Code 39 field data contains unsupported characters.");
    }
    const encoded = field.mod43CheckDigit
      ? field.data + code39CheckDigit(field.data)
      : field.data;
    const wide = Math.round(field.moduleWidth * field.ratio);
    const runs = code39Runs(encoded);
    const widths = runs.map((run) =>
      run.units >= 3 ? wide : field.moduleWidth * run.units
    );
    const raster = allocate(
      widths.reduce((total, value) => total + value, 0),
      field.height
    );
    let x = 0;
    runs.forEach((run, index) => {
      if (run.black) fillRect(raster, x, 0, widths[index], raster.height);
      x += widths[index];
    });
    return { raster, display: `*${encoded}*` };
  }
  if (
    field.symbology === "BC" &&
    (field.mode === "N" || field.mode === "A")
  ) {
    const encoded = encodeCode128Raster(
      field.data,
      field.mode,
      field.uccCheckDigit
    );
    const raster = allocate(
      encoded.bits.length * field.moduleWidth,
      field.height
    );
    for (let index = 0; index < encoded.bits.length; index++) {
      if (encoded.bits[index] === "1") {
        fillRect(
          raster,
          index * field.moduleWidth,
          0,
          field.moduleWidth,
          field.height
        );
      }
    }
    return { raster, display: encoded.display };
  }
  if (field.symbology === "B4") {
    const startingMode = String(
      field.encoderOptions.zplStartingMode ?? "A"
    ).toUpperCase();
    const rowHeight = Math.max(
      1,
      Math.trunc(Number(field.encoderOptions.rowheight ?? 8))
    );
    let modules: Uint8Array;
    let width: number;
    let display: string;
    if (startingMode === "A") {
      const raw = bwipjs.raw({
        bcid: "code49",
        text: field.data,
        rowheight: rowHeight,
        sepheight: 1,
      })[0] as unknown as RawMatrixBarcode | undefined;
      if (!raw || !("pixs" in raw) || !("pixx" in raw)) {
        throw new Error("The Code 49 encoder produced no symbol.");
      }
      modules = expandAutomaticCode49(raw.pixs, raw.pixx, rowHeight);
      width = raw.pixx;
      display = field.data;
    } else {
      const symbol = encodeZplCode49(
        field.data,
        Number(startingMode) as 0 | 1 | 2 | 3 | 4 | 5,
        rowHeight
      );
      modules = symbol.modules;
      width = symbol.width;
      display = symbol.display;
    }
    const height = modules.length / width;
    const rawRaster = allocate(width, height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (modules[y * width + x] !== 0) setDot(rawRaster, x, y);
      }
    }
    const raster = allocate(
      width * field.moduleWidth,
      height * field.moduleWidth
    );
    blitRaster(raster, rawRaster, 0, 0, {
      scaleX: field.moduleWidth,
      scaleY: field.moduleWidth,
    });
    return { raster, display };
  }
  if (field.symbology === "BB") {
    return field.encoderOptions.zplMode === "A"
      ? renderCodablockA(field, allocate)
      : renderCodablockEF(field, allocate);
  }
  if (field.symbology === "BR") return renderGs1DataBar(field, allocate);
  if (field.symbology === "BT") return renderTlc39(field, allocate);
  if (
    (field.symbology === "B0" || field.symbology === "BO") &&
    field.encoder === "azteccode"
  ) {
    return renderAztec(field, allocate);
  }
  if (field.symbology === "BQ") {
    const symbol =
      field.model === "1" ? encodeLegacyQrModel1(field) : encodeQrModel2(field);
    const modules = allocate(symbol.size, symbol.size);
    for (let y = 0; y < symbol.size; y++) {
      for (let x = 0; x < symbol.size; x++) {
        if (symbol.modules[y * symbol.size + x] !== 0) setDot(modules, x, y);
      }
    }
    const raster = allocate(
      symbol.size * field.magnification,
      symbol.size * field.magnification
    );
    blitRaster(raster, modules, 0, 0, {
      scaleX: field.magnification,
      scaleY: field.magnification,
    });
    return { raster, display: "" };
  }
  if (
    field.symbology === "BX" &&
    Number(field.encoderOptions.zplQuality ?? 0) !== 200
  ) {
    const symbol = encodeLegacyDataMatrix({
      data: field.data,
      quality: Number(
        field.encoderOptions.zplQuality ?? 0
      ) as LegacyDataMatrixQuality,
      format: Number(field.encoderOptions.zplFormat ?? 6),
      columns: Number(field.encoderOptions.columns ?? 0),
      rows: Number(field.encoderOptions.rows ?? 0),
    });
    const raw = allocate(symbol.size, symbol.size);
    for (let y = 0; y < symbol.size; y++) {
      for (let x = 0; x < symbol.size; x++) {
        if (symbol.modules[y * symbol.size + x] !== 0) setDot(raw, x, y);
      }
    }
    const module =
      field.encoderOptions.zplAutoModule === true
        ? Math.max(
            1,
            Math.round(
              Number(field.encoderOptions.zplTargetHeight ?? 10) / symbol.size
            )
          )
        : field.moduleWidth;
    const raster = allocate(
      symbol.size * module,
      symbol.size * module
    );
    blitRaster(raster, raw, 0, 0, { scaleX: module, scaleY: module });
    return { raster, display: "" };
  }
  const config = barcodeOptions(field);
  if (field.symbology === "BD") {
    return {
      raster: renderMaxicode(
        config.text,
        field.moduleWidth,
        config.options,
        allocate
      ),
      display: "",
    };
  }
  if (field.symbology === "BM" && config.options.includecheck === false) {
    delete config.options.checktype;
  }
  const encoderOptions = Object.fromEntries(
    Object.entries(config.options).filter(
      ([key, value]) =>
        !key.startsWith("zpl") &&
        value !== "" &&
        value !== false &&
        (value !== 0 || key === "mask" || key === "eclevel")
    )
  );
  const raw = bwipjs.raw({
    bcid: config.bcid,
    text: config.text,
    ...encoderOptions,
  })[0] as unknown as RawLinearBarcode | RawMatrixBarcode | undefined;
  if (!raw) throw new Error("The barcode encoder produced no symbol.");

  if ("pixs" in raw && "pixx" in raw && "pixy" in raw) {
    const raster = allocate(raw.pixx, raw.pixy);
    for (let y = 0; y < raw.pixy; y++) {
      for (let x = 0; x < raw.pixx; x++) {
        if (raw.pixs[y * raw.pixx + x]) setDot(raster, x, y);
      }
    }
    let scaleX = config.scaleX;
    let scaleY =
      "overallHeight" in field && field.overallHeight !== undefined
        ? Math.max(1, Math.floor(field.overallHeight / raw.pixy))
        : config.scaleY;
    if (
      field.symbology === "BX" &&
      field.encoderOptions.zplAutoModule === true
    ) {
      const targetHeight = Number(field.encoderOptions.zplTargetHeight ?? 10);
      const autoModule = Math.max(1, Math.round(targetHeight / raw.pixy));
      scaleX = autoModule;
      scaleY = autoModule;
    }
    const scaled = allocate(
      raster.width * scaleX,
      raster.height * scaleY
    );
    blitRaster(scaled, raster, 0, 0, {
      scaleX,
      scaleY,
    });
    return { raster: scaled, display: config.display };
  }

  if ("pixs" in raw) {
    throw new Error("The matrix encoder returned dimensions that cannot be rasterized.");
  }

  const ratio = "ratio" in field ? field.ratio : undefined;
  const raster = linearRaster(
    raw,
    config.scaleX,
    config.scaleY,
    ratio,
    allocate
  );
  const encodedDisplay = raw.txt?.map(([text]) => text).join("");
  const printerSpecificDisplay =
    field.symbology === "B1" ||
    field.symbology === "B2" ||
    field.symbology === "BA";
  return {
    raster,
    display: printerSpecificDisplay
      ? config.display
      : encodedDisplay || config.display,
  };
}

async function addInterpretation(
  bars: MonochromeRaster,
  display: string,
  field: BarcodeLayoutField,
  engine: OpenTypeFontEngine,
  allocate: RasterAllocator,
  bitmapFonts?: ReadonlyMap<string, DownloadedBitmapFont>,
  fontLinks?: ReadonlyMap<string, readonly string[]>
): Promise<{ raster: MonochromeRaster; substituted: boolean }> {
  if (
    display.length === 0 ||
    (!field.printInterpretationAbove && !field.printInterpretationBelow)
  ) {
    return { raster: bars, substituted: false };
  }
  const font = field.interpretationFont;
  const glyphs: MonochromeRaster[] = [];
  let substituted = false;
  let textWidth = 0;
  for (const character of display) {
    const resolved = await glyphFor(
      engine,
      character,
      font,
      allocate,
      bitmapFonts,
      fontLinks
    );
    glyphs.push(resolved.raster);
    substituted ||= resolved.substituted;
    textWidth += resolved.raster.width;
  }
  const margin = Math.max(1, field.moduleWidth * 2);
  const band = font.height + margin;
  const output = allocate(
    Math.max(bars.width, textWidth),
    bars.height +
      (field.printInterpretationAbove ? band : 0) +
      (field.printInterpretationBelow ? band : 0)
  );
  const barsY = field.printInterpretationAbove ? band : 0;
  blitRaster(output, bars, Math.floor((output.width - bars.width) / 2), barsY);
  const drawText = (y: number) => {
    let x = Math.floor((output.width - textWidth) / 2);
    for (const glyph of glyphs) {
      blitRaster(output, glyph, x, y);
      x += glyph.width;
    }
  };
  if (field.printInterpretationAbove) drawText(0);
  if (field.printInterpretationBelow) drawText(barsY + bars.height + margin);
  return { raster: output, substituted };
}

function validationErrorCode(error: unknown): "C" | "E" | "L" | "S" | "P" {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (/check.?digit|checksum/.test(message)) return "E";
  if (/too long|too large|exceeds|overflow|capacity/.test(message)) return "L";
  if (/too short|too few|empty|at least|requires .*digit/.test(message)) return "S";
  if (/character|digits only|numeric|alphabet|ascii|unsupported data/.test(message)) {
    return "C";
  }
  return "P";
}

async function validationBanner(
  code: "C" | "E" | "L" | "S" | "P",
  engine: OpenTypeFontEngine,
  allocate: RasterAllocator
): Promise<MonochromeRaster> {
  const message = `INVALID - ${code}`;
  const font: LayoutFont = {
    key: "0",
    height: 25,
    width: 15,
    orientation: "N",
  };
  const textWidth = measureText(message, font);
  const output = allocate(Math.max(156, textWidth + 10), 30);
  fillRect(output, 0, 0, output.width, output.height, "set");
  let x = Math.floor((output.width - textWidth) / 2);
  for (const character of message) {
    const glyph = await glyphFor(engine, character, font, allocate);
    blitRaster(output, glyph.raster, x, 2, { operation: "clear" });
    x += glyph.raster.width;
  }
  return output;
}

export async function renderLayoutToRaster(
  layout: LabelLayout,
  width: number,
  height: number,
  labelIndex = 0,
  options: {
    fontProvider?: FontProvider;
    initialRaster?: MonochromeRaster;
    bitmapFonts?: ReadonlyMap<string, DownloadedBitmapFont>;
    fontLinks?: ReadonlyMap<string, readonly string[]>;
    /** Maximum pixels permitted in any temporary field raster. */
    maxFieldPixels?: number;
    /** ^MNV nominal label length; the working raster is cropped to used dots. */
    minimumHeight?: number;
  } = {}
): Promise<RasterRenderResult> {
  let raster = createMonochromeRaster(width, height);
  if (options.initialRaster) {
    blitRaster(raster, options.initialRaster, 0, 0);
  }
  const diagnostics = [...layout.diagnostics];
  let highlightRegions: HighlightRegion[] = layout.origins.map((origin) => ({
    type: "origin",
    sourceSpan: origin.sourceSpan,
    x: origin.x,
    y: origin.y,
  }));
  const allocate = limitedRasterAllocator(
    options.maxFieldPixels ?? Math.max(0, width * height)
  );
  const fontEngine = new OpenTypeFontEngine(
    options.fontProvider,
    allocate.limit
  );

  for (const field of layout.fields) {
    try {
      if (field.kind === "text") {
        const { substituted, ...region } = await renderTextField(
          raster,
          field,
          fontEngine,
          allocate,
          options.bitmapFonts,
          options.fontLinks
        );
        if (
          substituted &&
          !hasFieldDiagnostic(
            diagnostics,
            "FONT_SUBSTITUTED",
            field,
            labelIndex
          )
        ) {
          diagnostics.push({
            code: "FONT_SUBSTITUTED",
            message: `Font ${
              field.font.name ?? field.font.key
            } could not be resolved and used the deterministic fallback.`,
            severity: "warning",
            phase: "render",
            span: field.sourceSpan,
            labelIndex,
          });
        }
        highlightRegions.push({
          type: "text",
          sourceSpan: field.sourceSpan,
          ...region,
        });
      } else if (field.kind === "box") {
        strokeRoundedRect(
          raster,
          field.x,
          field.y,
          field.width,
          field.height,
          field.thickness,
          field.rounding,
          operation(field.reverse, field.color)
        );
        highlightRegions.push({
          type: "box",
          sourceSpan: field.sourceSpan,
          x: field.x,
          y: field.y,
          width: field.width,
          height: field.height,
        });
      } else if (field.kind === "circle" || field.kind === "ellipse") {
        const ellipseWidth =
          field.kind === "circle" ? field.diameter : field.width;
        const ellipseHeight =
          field.kind === "circle" ? field.diameter : field.height;
        strokeEllipse(
          raster,
          field.x,
          field.y,
          ellipseWidth,
          ellipseHeight,
          field.thickness,
          operation(field.reverse, field.color)
        );
        highlightRegions.push(
          field.kind === "circle"
            ? {
                type: "circle",
                sourceSpan: field.sourceSpan,
                x: field.x + ellipseWidth / 2,
                y: field.y + ellipseHeight / 2,
                radius: ellipseWidth / 2,
              }
            : {
                type: "ellipse",
                sourceSpan: field.sourceSpan,
                x: field.x,
                y: field.y,
                width: ellipseWidth,
                height: ellipseHeight,
              }
        );
      } else if (field.kind === "diagonal") {
        drawDiagonal(
          raster,
          field.x,
          field.y,
          field.width,
          field.height,
          field.thickness,
          field.direction,
          operation(field.reverse, field.color)
        );
        highlightRegions.push({
          type: "box",
          sourceSpan: field.sourceSpan,
          x: field.x,
          y: field.y,
          width: field.width,
          height: field.height,
        });
      } else if (field.kind === "bitmap") {
        const source = bitmapToRaster(field, allocate);
        const size = blitRaster(raster, source, field.x, field.y, {
          orientation: field.orientation,
          scaleX: field.scaleX,
          scaleY: field.scaleY,
          operation: operation(field.reverse),
        });
        highlightRegions.push({
          type: "box",
          sourceSpan: field.sourceSpan,
          x: field.x,
          y: field.y,
          ...size,
        });
      } else if (field.kind === "symbol") {
        const source = graphicSymbolRaster(
          field.code,
          field.width,
          field.height,
          allocate
        );
        const size = blitRaster(raster, source, field.x, field.y, {
          orientation: field.orientation,
          operation: operation(field.reverse),
        });
        highlightRegions.push({
          type: "box",
          sourceSpan: field.sourceSpan,
          x: field.x,
          y: field.y,
          ...size,
        });
      } else {
        let encoded: ReturnType<typeof rawBarcodeRaster>;
        try {
          encoded = rawBarcodeRaster(field, allocate);
        } catch (error) {
          if (error instanceof RasterLimitError) throw error;
          if (field.validation) {
            const banner = await validationBanner(
              validationErrorCode(error),
              fontEngine,
              allocate
            );
            const oriented = orientedSize(
              field.orientation,
              banner.width,
              banner.height
            );
            fillRect(
              raster,
              field.x,
              field.y,
              oriented.width,
              oriented.height,
              "clear"
            );
            const size = blitRaster(raster, banner, field.x, field.y, {
              orientation: field.orientation,
              operation: "set",
            });
            highlightRegions.push({
              type: "barcode",
              sourceSpan: field.sourceSpan,
              x: field.x,
              y: field.y,
              ...size,
            });
          }
          diagnostics.push(
            diagnostic(
              "INVALID_BARCODE_DATA",
              error instanceof Error
                ? error.message
                : "The barcode could not be rendered.",
              field,
              labelIndex
            )
          );
          continue;
        }

        const interpreted = await addInterpretation(
          encoded.raster,
          encoded.display,
          field,
          fontEngine,
          allocate,
          options.bitmapFonts,
          options.fontLinks
        );
        if (
          interpreted.substituted &&
          !hasFieldDiagnostic(
            diagnostics,
            "FONT_SUBSTITUTED",
            field,
            labelIndex
          )
        ) {
          diagnostics.push({
            code: "FONT_SUBSTITUTED",
            message: `Font ${
              field.interpretationFont.name ?? field.interpretationFont.key
            } could not be resolved and used the deterministic fallback.`,
            severity: "warning",
            phase: "render",
            span: field.sourceSpan,
            labelIndex,
          });
        }
        const size = blitRaster(
          raster,
          interpreted.raster,
          field.x,
          field.y,
          {
            orientation: field.orientation,
            operation: operation(field.reverse),
          }
        );
        highlightRegions.push({
          type: "barcode",
          sourceSpan: field.sourceSpan,
          x: field.x,
          y: field.y,
          ...size,
        });
      }
    } catch (error) {
      if (!(error instanceof RasterLimitError)) throw error;
      diagnostics.push(
        diagnostic(
          "LABEL_LIMIT_EXCEEDED",
          error.message,
          field,
          labelIndex
        )
      );
    }
  }

  if (options.minimumHeight !== undefined) {
    const usedHeight = Math.max(
      Math.max(1, Math.trunc(options.minimumHeight)),
      lastDarkRow(raster) + 1
    );
    if (usedHeight < raster.height) raster = cropRasterHeight(raster, usedHeight);
  }

  if (layout.settings) {
    raster = transformRaster(raster, {
      mirrorX: layout.settings.mirror,
      rotate180: layout.settings.rotate180,
    });
    highlightRegions = transformHighlightRegions(
      highlightRegions,
      raster.width,
      raster.height,
      {
        mirror: layout.settings.mirror,
        rotate180: layout.settings.rotate180,
      }
    );
  }
  return { raster, diagnostics, highlightRegions };
}
