import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from "@zxing/library";
import { describe, expect, it } from "vitest";
import { createRenderSession, renderZpl } from "@/index.node";
import type { HighlightRegion } from "@/types/RenderContext";
import type { MonochromeRaster, RenderedLabel } from "@/types/RenderJob";
import { createMonochromeRaster, getDot, setDot } from "./raster";

const FIXTURE_NAMES = [
  "zplr.zpl",
  "retail-upc-ean.zpl",
  "asset-matrix-pdf417.zpl",
  "stored-resources.zpl",
] as const;

const EXPECTED_HASHES: Record<(typeof FIXTURE_NAMES)[number], string> = {
  "zplr.zpl":
    "477d1bbd0643dc03d09663e0f906a367d29d5c063bdadf724e6a71a7c249fc51",
  "retail-upc-ean.zpl":
    "34dd676b55ae568fbb62a2b23076055ae1dbbafedb603e8fa9d8bfe3dd546b3a",
  "asset-matrix-pdf417.zpl":
    "398a185a54c27c5394ba7141a2958c003d0e0ca7b75b5270273c33dc793d20ae",
  "stored-resources.zpl":
    "0956f96012849314aa40b5f9ebe05ff78acb33f5b283ba6dcba0cc660e5bbb8d",
};

async function fixture(name: (typeof FIXTURE_NAMES)[number]): Promise<string> {
  return readFile(new URL(`../../fixtures/${name}`, import.meta.url), "utf8");
}

function rasterHash(raster: MonochromeRaster): string {
  return createHash("sha256")
    .update(`${raster.width}x${raster.height}:${raster.stride}:`)
    .update(raster.data)
    .digest("hex");
}

function cropRegion(
  raster: MonochromeRaster,
  region: HighlightRegion,
  margin = 12
): MonochromeRaster {
  const sourceX = Math.floor(region.x);
  const sourceY = Math.floor(region.y);
  const width = Math.ceil(region.width ?? 0);
  const height = Math.ceil(region.height ?? 0);
  const target = createMonochromeRaster(width + margin * 2, height + margin * 2);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (getDot(raster, sourceX + x, sourceY + y)) {
        setDot(target, margin + x, margin + y);
      }
    }
  }
  return target;
}

function decodeRegion(
  label: RenderedLabel,
  region: HighlightRegion,
  format: BarcodeFormat
): string {
  // A pure Data Matrix crop needs a quiet-zone size aligned to its seven-dot
  // modules; the other readers tolerate the generic twelve-dot margin.
  const raster = cropRegion(
    label.raster,
    region,
    format === BarcodeFormat.DATA_MATRIX ? 14 : 12
  );
  const luminance = new Uint8ClampedArray(raster.width * raster.height);
  for (let y = 0; y < raster.height; y++) {
    for (let x = 0; x < raster.width; x++) {
      luminance[y * raster.width + x] = getDot(raster, x, y) ? 0 : 255;
    }
  }
  const bitmap = new BinaryBitmap(
    new HybridBinarizer(
      new RGBLuminanceSource(luminance, raster.width, raster.height)
    )
  );
  const hints = new Map<DecodeHintType, unknown>([
    [DecodeHintType.POSSIBLE_FORMATS, [format]],
    [DecodeHintType.TRY_HARDER, true],
  ]);
  if (format === BarcodeFormat.DATA_MATRIX) {
    hints.set(DecodeHintType.PURE_BARCODE, true);
  }
  return new MultiFormatReader().decode(bitmap, hints).getText();
}

function expectReleaseDiagnostics(label: RenderedLabel): void {
  expect(label.diagnostics.filter(({ severity }) => severity === "error")).toEqual(
    []
  );
  expect(label.diagnostics.map(({ code }) => code)).not.toEqual(
    expect.arrayContaining([
      "UNKNOWN_COMMAND",
      "INVALID_COMMAND_PREFIX",
      "UNSUPPORTED_COMMAND",
      "UNSUPPORTED_FIELD_SELECTION",
    ])
  );
}

describe("representative 0.2 labels", () => {
  it.each(FIXTURE_NAMES)("renders %s to its canonical raster hash", async (name) => {
    const result = await renderZpl(await fixture(name));
    expect(result.labels).toHaveLength(1);
    expectReleaseDiagnostics(result.labels[0]);
    expect(rasterHash(result.labels[0].raster)).toBe(EXPECTED_HASHES[name]);
  });

  it("decodes every barcode in the ZPLr sample", async () => {
    const [label] = (await renderZpl(await fixture("zplr.zpl"))).labels;
    const barcodes = label.highlightRegions.filter(({ type }) => type === "barcode");
    expect(barcodes).toHaveLength(3);
    expect(decodeRegion(label, barcodes[0], BarcodeFormat.QR_CODE)).toBe(
      "LENNART KOEBE"
    );
    expect(decodeRegion(label, barcodes[1], BarcodeFormat.CODE_39)).toBe("1234");
    expect(decodeRegion(label, barcodes[2], BarcodeFormat.CODE_128)).toBe(
      "0123456789ABC"
    );
  });

  it("decodes the retail EAN-13 and UPC-A check digits", async () => {
    const [label] = (await renderZpl(await fixture("retail-upc-ean.zpl"))).labels;
    const barcodes = label.highlightRegions.filter(({ type }) => type === "barcode");
    expect(barcodes).toHaveLength(2);
    expect(decodeRegion(label, barcodes[0], BarcodeFormat.EAN_13)).toBe(
      "5901234123457"
    );
    expect(decodeRegion(label, barcodes[1], BarcodeFormat.UPC_A)).toBe(
      "036000291452"
    );
  });

  it("decodes the asset Data Matrix and PDF417", async () => {
    const [label] = (await renderZpl(
      await fixture("asset-matrix-pdf417.zpl")
    )).labels;
    const barcodes = label.highlightRegions.filter(({ type }) => type === "barcode");
    expect(barcodes).toHaveLength(2);
    expect(decodeRegion(label, barcodes[0], BarcodeFormat.DATA_MATRIX)).toBe(
      "ASSET-DM-42"
    );
    expect(decodeRegion(label, barcodes[1], BarcodeFormat.PDF_417)).toBe(
      "ASSET-PDF-2026-0042"
    );
  });

  it("recalls stored resources identically in one job and two session calls", async () => {
    const source = await fixture("stored-resources.zpl");
    const single = await renderZpl(source);
    const splitAt = source.lastIndexOf("^XA\n^PW420");
    expect(splitAt).toBeGreaterThan(0);

    const session = createRenderSession();
    expect((await session.render(source.slice(0, splitAt))).labels).toHaveLength(0);
    const recalled = await session.render(source.slice(splitAt));
    expect(recalled.labels).toHaveLength(1);
    expect(recalled.labels[0].raster).toEqual(single.labels[0].raster);
    expect(getDot(recalled.labels[0].raster, 380, 20)).toBe(true);
  });

  it("pins selected border pixels as readable goldens", async () => {
    for (const name of FIXTURE_NAMES) {
      const [label] = (await renderZpl(await fixture(name))).labels;
      const x =
        name === "zplr.zpl"
          ? 406
          : name === "stored-resources.zpl"
            ? 200
            : name === "retail-upc-ean.zpl"
              ? 400
              : 450;
      const y = 20;
      expect(getDot(label.raster, x, y), name).toBe(true);
      expect(getDot(label.raster, x, y + 12), name).toBe(false);
    }
  });
});
