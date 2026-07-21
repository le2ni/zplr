import {
  interpretLabel,
  type InterpretResourceContext,
  type StoredGraphic,
} from "./interpreter";
import type { CanvasPlatform } from "@/helper/rendering/canvas";
import { renderLayoutToRaster } from "./rasterRenderer";
import { rasterToRgba } from "./raster";
import type { CanvasLike } from "@/helper/rendering/canvas";
import type {
  DownloadedBitmapFont,
  FontProvider,
  MonochromeRaster,
  PrintDensity,
  RenderLimits,
} from "@/types/RenderJob";
import type { HighlightRegion } from "@/types/HighlightRegion";
import type {
  RenderDocumentOptions,
  ZplDiagnostic,
  ZplDocument,
  ZplLabelNode,
} from "@/types/ZplDocument";
import { zplDotConversion, zplNumber } from "./zplNumbers";

const DEFAULT_LIMITS = {
  maxDimension: 32_768,
  maxPixels: 40_000_000,
  maxGraphicBytes: 16 * 1024 * 1024,
  maxSessionBytes: 32 * 1024 * 1024,
  maxTemplateDepth: 16,
  maxExpandedCommands: 100_000,
  maxLabels: 10_000,
} as const;

export function resolveRenderLimits(
  overrides: Partial<RenderLimits> | undefined
): RenderLimits {
  const resolved: RenderLimits = { ...DEFAULT_LIMITS };
  for (const key of Object.keys(DEFAULT_LIMITS) as Array<keyof RenderLimits>) {
    const value = overrides?.[key];
    if (Number.isSafeInteger(value) && value! >= 0) resolved[key] = value!;
  }
  return resolved;
}

export interface DocumentRenderResult<TCanvas extends CanvasLike = CanvasLike> {
  canvas: TCanvas;
  raster: MonochromeRaster;
  width: number;
  height: number;
  printDensity: PrintDensity;
  diagnostics: ZplDiagnostic[];
  highlightRegions: HighlightRegion[];
}

export interface RenderDocumentContext {
  graphics?: ReadonlyMap<string, StoredGraphic>;
  fontAliases?: ReadonlyMap<string, string>;
  fontProvider?: FontProvider;
  initialRaster?: MonochromeRaster;
  memoryAliases?: ReadonlyMap<string, string>;
  bitmapFonts?: ReadonlyMap<string, DownloadedBitmapFont>;
  fontLinks?: ReadonlyMap<string, readonly string[]>;
  encodings?: ReadonlyMap<string, ReadonlyMap<number, number>>;
  resourcesAt?: (
    command: ZplLabelNode["commands"][number]
  ) => InterpretResourceContext | undefined;
  pixelBudget?: { remaining: number };
}

function parseDiagnosticsForLabel(
  document: ZplDocument,
  labelIndex: number
): ZplDiagnostic[] {
  return document.diagnostics.filter(
    (diagnostic) =>
      diagnostic.labelIndex === labelIndex ||
      (diagnostic.labelIndex === undefined && labelIndex === 0)
  );
}

function uniqueDiagnostics(diagnostics: ZplDiagnostic[]): ZplDiagnostic[] {
  const seen = new Set<string>();
  return diagnostics.filter((diagnostic) => {
    const key = `${diagnostic.code}:${diagnostic.span?.start ?? ""}:${
      diagnostic.span?.end ?? ""
    }`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function density(options: RenderDocumentOptions): PrintDensity {
  if ([6, 8, 12, 24].includes(options.printDensity ?? 0)) {
    return options.printDensity as PrintDensity;
  }
  return 8;
}

function legacyDpi(printDensity: PrintDensity): 150 | 200 | 300 | 600 {
  return printDensity === 6 ? 150 : printDensity === 8 ? 200 : printDensity === 12 ? 300 : 600;
}

function commandDimension(
  label: ZplLabelNode,
  code: "PW" | "LL",
  printDensity: PrintDensity
): number | undefined {
  let value: number | undefined;
  let unit: "D" | "I" | "M" = "D";
  let dotConversion = 1;
  let fieldSeparated = false;
  for (const command of label.commands) {
    if (command.canonical === "^FS") {
      fieldSeparated = true;
      continue;
    }
    if (command.canonical === "^MU") {
      const requested = command.parameters[0]?.trim().toUpperCase();
      if (!requested) {
        unit = "D";
      } else if (requested === "D" || requested === "I" || requested === "M") {
        unit = requested;
      }
      dotConversion = zplDotConversion(
        command.parameters[1],
        command.parameters[2],
        dotConversion
      );
      continue;
    }
    if (command.canonical !== `^${code}`) continue;
    if (code === "LL" && fieldSeparated) continue;
    const precise = zplNumber(command.parameters[0]);
    if (precise !== undefined && precise > 0) {
      const scale =
        unit === "I"
          ? printDensity * 25.4
          : unit === "M"
          ? printDensity
          : dotConversion;
      value = Math.round(precise * scale);
    }
  }
  return value;
}

function variableMediaMaximum(
  label: ZplLabelNode,
  printDensity: PrintDensity
): number | undefined {
  let variable = false;
  let maximum: number | undefined;
  let unit: "D" | "I" | "M" = "D";
  let dotConversion = 1;
  for (const command of label.commands) {
    if (command.canonical === "^MU") {
      const requested = command.parameters[0]?.trim().toUpperCase();
      if (!requested) {
        unit = "D";
      } else if (requested === "D" || requested === "I" || requested === "M") {
        unit = requested;
      }
      dotConversion = zplDotConversion(
        command.parameters[1],
        command.parameters[2],
        dotConversion
      );
    } else if (command.canonical === "^MN") {
      variable = command.parameters[0]?.trim().toUpperCase() === "V";
    } else if (command.canonical === "^ML") {
      const value = zplNumber(command.parameters[0]);
      if (value !== undefined && value > 0) {
        const scale =
          unit === "I"
            ? printDensity * 25.4
            : unit === "M"
            ? printDensity
            : dotConversion;
        maximum = Math.round(value * scale);
      }
    }
  }
  return variable ? maximum ?? Number.POSITIVE_INFINITY : undefined;
}

function fallbackDots(
  options: RenderDocumentOptions,
  printDensity: PrintDensity
): { width: number; height: number } {
  const fallback = options.fallbackSize ?? { width: 4, height: 6, unit: "in" as const };
  if (fallback.unit === "dots") {
    return { width: Math.round(fallback.width), height: Math.round(fallback.height) };
  }
  if (fallback.unit === "mm") {
    return {
      width: Math.round(fallback.width * printDensity),
      height: Math.round(fallback.height * printDensity),
    };
  }
  return {
    width: Math.round(fallback.width * 25.4 * printDensity),
    height: Math.round(fallback.height * 25.4 * printDensity),
  };
}

function renderDiagnostic(
  code: string,
  message: string,
  labelIndex: number,
  severity: "info" | "error"
): ZplDiagnostic {
  return { code, message, labelIndex, severity, phase: "render" };
}

function canvasFromRaster<TCanvas extends CanvasLike>(
  raster: MonochromeRaster,
  platform: CanvasPlatform<TCanvas>
): TCanvas {
  const canvas = platform.createCanvas(raster.width, raster.height) as TCanvas;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not get a 2D canvas context.");
  const image = context.createImageData(raster.width, raster.height);
  image.data.set(rasterToRgba(raster));
  context.putImageData(image, 0, 0);
  return canvas;
}

export async function renderDocumentWithPlatform<
  TCanvas extends CanvasLike = CanvasLike
>(
  document: ZplDocument,
  options: RenderDocumentOptions = {},
  platform: CanvasPlatform<TCanvas>,
  context: RenderDocumentContext = {}
): Promise<DocumentRenderResult<TCanvas>[]> {
  const results: DocumentRenderResult<TCanvas>[] = [];
  const printDensity = density(options);
  const fallback = fallbackDots(options, printDensity);
  const limits = resolveRenderLimits(options.limits);
  const pixelBudget = context.pixelBudget ?? { remaining: limits.maxPixels };

  for (let labelIndex = 0; labelIndex < document.labels.length; labelIndex++) {
    const label = document.labels[labelIndex];
    const sourceWidth = commandDimension(label, "PW", printDensity);
    const sourceHeight = commandDimension(label, "LL", printDensity);
    const width = Math.trunc(options.width ?? sourceWidth ?? fallback.width);
    const nominalHeight = Math.trunc(
      options.height ?? sourceHeight ?? fallback.height
    );
    const variableMaximum =
      options.height === undefined
        ? variableMediaMaximum(label, printDensity)
        : undefined;
    const availablePixels = Math.min(limits.maxPixels, pixelBudget.remaining);
    const maximumWorkingHeight = Math.max(
      nominalHeight,
      Math.min(
        limits.maxDimension,
        Math.floor(availablePixels / Math.max(1, width)),
        variableMaximum ?? nominalHeight
      )
    );
    const height = variableMaximum === undefined ? nominalHeight : maximumWorkingHeight;
    const localDiagnostics = parseDiagnosticsForLabel(document, labelIndex);
    if (options.width === undefined && sourceWidth === undefined) {
      localDiagnostics.push(
        renderDiagnostic(
          "FALLBACK_LABEL_WIDTH",
          `No explicit width or ^PW was provided; ${width} dots were assumed.`,
          labelIndex,
          "info"
        )
      );
    }
    if (options.height === undefined && sourceHeight === undefined) {
      localDiagnostics.push(
        renderDiagnostic(
          "FALLBACK_LABEL_HEIGHT",
          `No explicit height or ^LL was provided; ${height} dots were assumed.`,
          labelIndex,
          "info"
        )
      );
    }

    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      width <= 0 ||
      nominalHeight <= 0 ||
      width > limits.maxDimension ||
      nominalHeight > limits.maxDimension ||
      width * nominalHeight > availablePixels
    ) {
      const message = `Label ${width}x${nominalHeight} exceeds the configured per-label or remaining job raster budget.`;
      const raster = { width: 0, height: 0, stride: 0, bitOrder: "msb-first" as const, data: new Uint8Array() };
      const canvas = platform.createCanvas(0, 0) as TCanvas;
      results.push({
        canvas,
        raster,
        width: 0,
        height: 0,
        printDensity,
        diagnostics: uniqueDiagnostics([
          ...localDiagnostics,
          renderDiagnostic("LABEL_LIMIT_EXCEEDED", message, labelIndex, "error"),
        ]),
        highlightRegions: [],
      });
      continue;
    }

    const hasFontResources =
      context.fontProvider !== undefined ||
      context.bitmapFonts !== undefined ||
      context.fontLinks !== undefined ||
      context.memoryAliases !== undefined;
    const layout = interpretLabel(label, {
      dpi: legacyDpi(printDensity),
      labelIndex,
      graphics: context.graphics,
      maxGraphicBytes: limits.maxGraphicBytes,
      fontAliases: context.fontAliases,
      memoryAliases: context.memoryAliases,
      encodings: context.encodings,
      ...(hasFontResources
        ? {
            fontResources: {
              bitmapFonts: context.bitmapFonts ?? new Map(),
              fontLinks: context.fontLinks ?? new Map(),
              memoryAliases: context.memoryAliases ?? new Map(),
              ...(context.fontProvider
                ? { fontProvider: context.fontProvider }
                : {}),
            },
          }
        : {}),
      resourcesAt: context.resourcesAt,
    });
    const rendered = await renderLayoutToRaster(layout, width, height, labelIndex, {
      fontProvider: context.fontProvider,
      initialRaster: context.initialRaster,
      bitmapFonts: context.bitmapFonts,
      fontLinks: context.fontLinks,
      maxFieldPixels: availablePixels,
      minimumHeight:
        variableMaximum === undefined ? undefined : nominalHeight,
    });
    pixelBudget.remaining -= rendered.raster.width * rendered.raster.height;
    results.push({
      canvas: canvasFromRaster(rendered.raster, platform),
      raster: rendered.raster,
      width: rendered.raster.width,
      height: rendered.raster.height,
      printDensity,
      diagnostics: uniqueDiagnostics([...localDiagnostics, ...rendered.diagnostics]),
      highlightRegions: rendered.highlightRegions,
    });
  }
  return results;
}

export { DEFAULT_LIMITS };
