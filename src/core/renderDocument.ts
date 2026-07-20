import { interpretLabel, type StoredGraphic } from "./interpreter";
import type { CanvasPlatform } from "./layoutRenderer";
import { renderLayoutToRaster } from "./rasterRenderer";
import { rasterToRgba } from "./raster";
import type { CanvasLike } from "@/helper/rendering/canvas";
import type {
  DownloadedBitmapFont,
  FontProvider,
  MonochromeRaster,
  PrintDensity,
} from "@/types/RenderJob";
import type { HighlightRegion } from "@/types/RenderContext";
import type {
  RenderDocumentOptions,
  ZplDiagnostic,
  ZplDocument,
  ZplLabelNode,
} from "@/types/ZplDocument";

const DEFAULT_LIMITS = {
  maxDimension: 32_768,
  maxPixels: 40_000_000,
  maxGraphicBytes: 16 * 1024 * 1024,
  maxSessionBytes: 32 * 1024 * 1024,
  maxTemplateDepth: 16,
  maxExpandedCommands: 100_000,
  maxLabels: 10_000,
} as const;

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
  if (options.printDensity) return options.printDensity;
  if (options.dpi === 150) return 6;
  if (options.dpi === 200) return 8;
  if (options.dpi === 300) return 12;
  if (options.dpi === 600) return 24;
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
  for (const command of label.commands) {
    if (command.code === "MU") {
      const requested = command.parameters[0]?.trim().toUpperCase();
      if (requested === "D" || requested === "I" || requested === "M") {
        unit = requested;
      }
      const base = Number(command.parameters[1]);
      const desired = Number(command.parameters[2]);
      dotConversion =
        Number.isFinite(base) &&
        Number.isFinite(desired) &&
        base > 0 &&
        desired > 0
          ? desired / base
          : 1;
      continue;
    }
    if (command.code !== code) continue;
    const parsed = Number.parseInt(command.parameters[0]?.trim() ?? "", 10);
    const precise = Number(command.parameters[0]?.trim() ?? "");
    if (Number.isFinite(precise) && precise > 0) {
      const scale =
        unit === "I"
          ? printDensity * 25.4
          : unit === "M"
          ? printDensity
          : dotConversion;
      value = Math.round(precise * scale);
    } else if (Number.isFinite(parsed) && parsed > 0) {
      value = parsed;
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
    if (command.code === "MU") {
      const requested = command.parameters[0]?.trim().toUpperCase();
      if (requested === "D" || requested === "I" || requested === "M") {
        unit = requested;
      }
      const base = Number(command.parameters[1]);
      const desired = Number(command.parameters[2]);
      dotConversion =
        Number.isFinite(base) && Number.isFinite(desired) && base > 0 && desired > 0
          ? desired / base
          : 1;
    } else if (command.code === "MN") {
      variable = command.parameters[0]?.trim().toUpperCase() === "V";
    } else if (command.code === "ML") {
      const value = Number(command.parameters[0]);
      if (Number.isFinite(value) && value > 0) {
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
  const limits = { ...DEFAULT_LIMITS, ...options.limits };

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
    const maximumWorkingHeight = Math.max(
      nominalHeight,
      Math.min(
        limits.maxDimension,
        Math.floor(limits.maxPixels / Math.max(1, width)),
        variableMaximum ?? nominalHeight
      )
    );
    const height = variableMaximum === undefined ? nominalHeight : maximumWorkingHeight;
    const localDiagnostics = parseDiagnosticsForLabel(document, labelIndex);
    if (options.dpi !== undefined) {
      const dpiMessage =
        options.printDensity === undefined
          ? `The dpi option is deprecated; ${options.dpi} dpi maps to ${printDensity} dots/mm.`
          : `The dpi option is deprecated and was ignored because printDensity=${options.printDensity} was provided.`;
      localDiagnostics.push(
        renderDiagnostic(
          "DEPRECATED_DPI_OPTION",
          dpiMessage,
          labelIndex,
          "info"
        )
      );
    }
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
      width * nominalHeight > limits.maxPixels
    ) {
      const message = `Label ${width}x${nominalHeight} exceeds the configured raster limits.`;
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

    const layout = interpretLabel(label, {
      dpi: legacyDpi(printDensity),
      labelIndex,
      graphics: context.graphics,
      maxGraphicBytes: limits.maxGraphicBytes,
      fontAliases: context.fontAliases,
      hasFontProvider: context.fontProvider !== undefined,
      memoryAliases: context.memoryAliases,
      encodings: context.encodings,
    });
    const rendered = await renderLayoutToRaster(layout, width, height, labelIndex, {
      fontProvider: context.fontProvider,
      initialRaster: context.initialRaster,
      bitmapFonts: context.bitmapFonts,
      fontLinks: context.fontLinks,
      minimumHeight:
        variableMaximum === undefined ? undefined : nominalHeight,
    });
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
