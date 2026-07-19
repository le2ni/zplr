import { interpretLabel } from "./interpreter";
import {
  CanvasPlatform,
  LayoutRenderResult,
  renderLayout,
} from "./layoutRenderer";
import { CanvasLike } from "@/helper/rendering/canvas";
import {
  RenderDocumentOptions,
  ZplDiagnostic,
  ZplDocument,
} from "@/types/ZplDocument";

export interface DocumentRenderResult<TCanvas extends CanvasLike = CanvasLike>
  extends LayoutRenderResult<TCanvas> {}

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

export async function renderDocumentWithPlatform<
  TCanvas extends CanvasLike = CanvasLike
>(
  document: ZplDocument,
  options: RenderDocumentOptions,
  platform: CanvasPlatform<TCanvas>
): Promise<DocumentRenderResult<TCanvas>[]> {
  const results: DocumentRenderResult<TCanvas>[] = [];
  for (let labelIndex = 0; labelIndex < document.labels.length; labelIndex++) {
    const layout = interpretLabel(document.labels[labelIndex], {
      dpi: options.dpi ?? 300,
      labelIndex,
    });
    const rendered = await renderLayout(
      layout,
      options.width,
      options.height,
      platform,
      labelIndex
    );
    results.push({
      ...rendered,
      diagnostics: uniqueDiagnostics([
        ...parseDiagnosticsForLabel(document, labelIndex),
        ...rendered.diagnostics,
      ]),
    });
  }
  return results;
}
