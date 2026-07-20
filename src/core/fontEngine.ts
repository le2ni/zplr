import * as opentypeModule from "opentype.js";
import type { Font, PathCommand } from "opentype.js";
import {
  NOTO_SANS_VARIATION,
  notoSansCondensedTtf,
} from "@/assets/notoSansCondensed.generated";
import type { FontProvider, MonochromeRaster } from "@/types/RenderJob";
import { createMonochromeRaster, setDot } from "./raster";

interface Point {
  x: number;
  y: number;
}

interface GlyphOutline {
  index?: number;
  advanceWidth?: number;
  path: { commands: readonly PathCommand[] };
}

interface VariableFont extends Font {
  variation?: {
    getTransform(
      glyph: GlyphOutline,
      coordinates: Readonly<Record<string, number>>
    ): GlyphOutline;
  };
}

function arrayBuffer(data: Uint8Array): ArrayBuffer {
  return data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength
  ) as ArrayBuffer;
}

function parseFont(data: Uint8Array | ArrayBuffer): Font {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  // opentype.js 2 exposes named exports from its bundler entry but only a
  // CommonJS default from Node's package entry. Supporting both shapes keeps
  // the canonical font engine identical in native Node and browser builds.
  const moduleWithDefault = opentypeModule as typeof opentypeModule & {
    default?: typeof opentypeModule;
  };
  const parser = opentypeModule.parse ?? moduleWithDefault.default?.parse;
  if (!parser) throw new Error("The OpenType parser is unavailable.");
  return parser(arrayBuffer(bytes));
}

export class OpenTypeFontEngine {
  private readonly fonts = new Map<string, Promise<Font | undefined>>();
  private readonly glyphs = new Map<
    string,
    Promise<MonochromeRaster | undefined>
  >();
  private readonly builtIn = Promise.resolve().then(() => {
    try {
      return parseFont(notoSansCondensedTtf());
    } catch {
      return undefined;
    }
  });

  constructor(private readonly provider?: FontProvider) {}

  private load(name: string): Promise<Font | undefined> {
    const key = name.trim().toUpperCase();
    const existing = this.fonts.get(key);
    if (existing) return existing;
    const loaded = (async () => {
      try {
        const data = await this.provider?.resolveFont(name);
        return data ? parseFont(data) : undefined;
      } catch {
        return undefined;
      }
    })();
    this.fonts.set(key, loaded);
    return loaded;
  }

  rasterizeBuiltIn(
    character: string,
    width: number,
    height: number
  ): Promise<MonochromeRaster | undefined> {
    const key = `0:${character}:${width}:${height}`;
    const existing = this.glyphs.get(key);
    if (existing) return existing;
    const raster = this.builtIn.then((font) =>
      font
        ? rasterizeOutline(
            font,
            character,
            width,
            height,
            NOTO_SANS_VARIATION
          )
        : undefined
    );
    this.glyphs.set(key, raster);
    return raster;
  }

  rasterize(
    name: string,
    character: string,
    width: number,
    height: number
  ): Promise<MonochromeRaster | undefined> {
    const key = `${name.trim().toUpperCase()}:${character}:${width}:${height}`;
    const existing = this.glyphs.get(key);
    if (existing) return existing;
    const raster = this.load(name).then((font) =>
      font ? rasterizeOutline(font, character, width, height) : undefined
    );
    this.glyphs.set(key, raster);
    return raster;
  }
}

function rasterizeOutline(
  font: Font,
  character: string,
  width: number,
  height: number,
  variation?: Readonly<Record<string, number>>
): MonochromeRaster | undefined {
  const variableFont = font as VariableFont;
  let glyph = font.charToGlyph(character) as unknown as GlyphOutline;
  if (glyph.index === 0 && character !== "\0") return undefined;
  if (variation && variableFont.variation) {
    glyph = variableFont.variation.getTransform(glyph, variation);
  }

  const raster = createMonochromeRaster(
    Math.max(1, Math.trunc(width)),
    Math.max(1, Math.trunc(height))
  );
  if (glyph.path.commands.length === 0) return raster;

  const advance = Math.max(1, glyph.advanceWidth ?? font.unitsPerEm);
  // ZPL scalable-font height is an em cell whose top aligns with the cap
  // height. Scaling against ascender-to-descender would make resident Font 0
  // visibly too short and push its ink down inside the requested field box.
  const verticalUnits = Math.max(1, font.unitsPerEm);
  const capHeight = Math.max(
    1,
    font.tables.os2?.sCapHeight ?? Math.round(font.ascender * 0.7)
  );
  const scaleX = raster.width / advance;
  const scaleY = raster.height / verticalUnits;
  const map = (point: Point): Point => ({
    x: point.x * scaleX,
    y: (capHeight - point.y) * scaleY,
  });
  const contours = flatten(glyph.path.commands).map((contour) =>
    contour.map(map)
  );
  for (let y = 0; y < raster.height; y++) {
    const intersections: number[] = [];
    const scanY = y + 0.5;
    for (const contour of contours) {
      for (let index = 0; index < contour.length; index++) {
        const start = contour[index];
        const end = contour[(index + 1) % contour.length];
        if ((start.y > scanY) === (end.y > scanY) || start.y === end.y) continue;
        intersections.push(
          start.x + ((scanY - start.y) * (end.x - start.x)) / (end.y - start.y)
        );
      }
    }
    intersections.sort((left, right) => left - right);
    for (let index = 0; index + 1 < intersections.length; index += 2) {
      const start = Math.ceil(intersections[index] - 0.5);
      const end = Math.floor(intersections[index + 1] - 0.5);
      for (let x = start; x <= end; x++) setDot(raster, x, y);
    }
  }
  return raster;
}

function flatten(commands: readonly PathCommand[]): Point[][] {
  const contours: Point[][] = [];
  let contour: Point[] = [];
  let current: Point = { x: 0, y: 0 };
  const finish = () => {
    if (contour.length > 1) contours.push(contour);
    contour = [];
  };
  for (const command of commands) {
    if (command.type === "M") {
      finish();
      current = { x: command.x, y: command.y };
      contour.push(current);
    } else if (command.type === "L") {
      current = { x: command.x, y: command.y };
      contour.push(current);
    } else if (command.type === "Q") {
      const start = current;
      for (let step = 1; step <= 12; step++) {
        const t = step / 12;
        const inverse = 1 - t;
        contour.push({
          x:
            inverse * inverse * start.x +
            2 * inverse * t * command.x1 +
            t * t * command.x,
          y:
            inverse * inverse * start.y +
            2 * inverse * t * command.y1 +
            t * t * command.y,
        });
      }
      current = { x: command.x, y: command.y };
    } else if (command.type === "C") {
      const start = current;
      for (let step = 1; step <= 16; step++) {
        const t = step / 16;
        const inverse = 1 - t;
        contour.push({
          x:
            inverse ** 3 * start.x +
            3 * inverse * inverse * t * command.x1 +
            3 * inverse * t * t * command.x2 +
            t ** 3 * command.x,
          y:
            inverse ** 3 * start.y +
            3 * inverse * inverse * t * command.y1 +
            3 * inverse * t * t * command.y2 +
            t ** 3 * command.y,
        });
      }
      current = { x: command.x, y: command.y };
    } else if (command.type === "Z") {
      finish();
    }
  }
  finish();
  return contours;
}
