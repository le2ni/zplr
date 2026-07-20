import { describe, expect, it } from "vitest";
import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  MultiFormatReader,
  RGBLuminanceSource,
} from "@zxing/library";
import { renderZpl } from "@/index.node";
import type { MonochromeRaster } from "@/types/RenderJob";
import { createMonochromeRaster, getDot, setDot } from "./raster";

function decode(
  raster: MonochromeRaster,
  format: BarcodeFormat
): { text: string; format: BarcodeFormat } {
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
    [
      DecodeHintType.POSSIBLE_FORMATS,
      format === BarcodeFormat.UPC_E
        ? [
            BarcodeFormat.UPC_E,
            BarcodeFormat.UPC_A,
            BarcodeFormat.EAN_13,
            BarcodeFormat.EAN_8,
          ]
        : [format],
    ],
    [DecodeHintType.TRY_HARDER, true],
  ]);
  if (
    format === BarcodeFormat.DATA_MATRIX ||
    format === BarcodeFormat.UPC_E
  ) {
    hints.set(DecodeHintType.PURE_BARCODE, true);
  }
  const result = new MultiFormatReader().decode(bitmap, hints);
  return { text: result.getText(), format: result.getBarcodeFormat() };
}

async function renderSingle(source: string) {
  const result = await renderZpl(`^XA^PW1200^LL240^FO40,40${source}^FS^XZ`);
  expect(
    result.diagnostics.filter((diagnostic) => diagnostic.severity === "error")
  ).toEqual([]);
  expect(result.labels[0].highlightRegions).toContainEqual(
    expect.objectContaining({ type: "barcode" })
  );
  return result.labels[0].raster;
}

function rotateRaster(
  source: MonochromeRaster,
  clockwiseQuarterTurns: 0 | 1 | 2 | 3
): MonochromeRaster {
  if (clockwiseQuarterTurns === 0) return source;
  const swap = clockwiseQuarterTurns % 2 === 1;
  const target = createMonochromeRaster(
    swap ? source.height : source.width,
    swap ? source.width : source.height
  );
  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < source.width; x++) {
      if (!getDot(source, x, y)) continue;
      if (clockwiseQuarterTurns === 1) {
        setDot(target, source.height - 1 - y, x);
      } else if (clockwiseQuarterTurns === 2) {
        setDot(target, source.width - 1 - x, source.height - 1 - y);
      } else {
        setDot(target, y, source.width - 1 - x);
      }
    }
  }
  return target;
}

describe("independently decoded barcode rasters", () => {
  it.each([
    ["Code 39", "^BY3,2,100^B3N,N,100,N,N^FDTEST-39", BarcodeFormat.CODE_39, "TEST-39"],
    ["Code 128 N", "^BY3^BCN,100,N,N,N,N^FDABC123", BarcodeFormat.CODE_128, "ABC123"],
    ["Code 128 A", "^BY3^BCN,100,N,N,N,A^FDABCD123456", BarcodeFormat.CODE_128, "ABCD123456"],
    [
      "Code 128 U",
      "^BY3^BCN,100,N,N,N,U^FD12345",
      BarcodeFormat.CODE_128,
      "12345000000000000007",
    ],
    [
      "Code 128 D",
      "^BY3^BCN,100,N,N,N,D^FD(01)09501101530003(10)ABC123",
      BarcodeFormat.CODE_128,
      "010950110153000310ABC123",
    ],
    ["QR Model 2", "^BQN,2,6,Q,7^FDQA,HELLO-QR", BarcodeFormat.QR_CODE, "HELLO-QR"],
    ["Data Matrix ECC 200", "^BXN,6,200^FDASSET-DM-42", BarcodeFormat.DATA_MATRIX, "ASSET-DM-42"],
    ["PDF417", "^B7N,4,4,6,8,N^FDASSET-PDF-42", BarcodeFormat.PDF_417, "ASSET-PDF-42"],
    ["EAN-8", "^BY3^B8N,100,N,N^FD1234567", BarcodeFormat.EAN_8, "12345670"],
    ["EAN-13", "^BY3^BEN,100,N,N^FD590123412345", BarcodeFormat.EAN_13, "5901234123457"],
    ["UPC-A", "^BY3^BUN,100,N,N^FD03600029145", BarcodeFormat.UPC_A, "036000291452"],
    [
      "Interleaved 2 of 5",
      "^BY3,2.5^B2N,100,N,N,N^FD123456",
      BarcodeFormat.ITF,
      "123456",
    ],
    ["Code 93", "^BY3^BAN,100,N,N,N^FDASSET-93", BarcodeFormat.CODE_93, "ASSET-93"],
    ["Codabar", "^BY3,2.5^BKN,N,100,N,N,A,B^FD123456", BarcodeFormat.CODABAR, "A123456B"],
    [
      "GS1 DataBar Omnidirectional",
      "^BRN,1,3,1,100,22^FD0952123454321",
      BarcodeFormat.RSS_14,
      "09521234543213",
    ],
    [
      "Code 128 D AI 00 check digit",
      "^BY3^BCN,100,N,N,N,D^FD(00)123456789012345670",
      BarcodeFormat.CODE_128,
      "00123456789012345675",
    ],
  ])("decodes %s payload and check digits", async (_name, zpl, format, payload) => {
    const decoded = decode(await renderSingle(zpl as string), format as BarcodeFormat);
    expect(decoded).toEqual({ text: payload, format });
  });

  it("decodes UPC-E parity and its computed check digit", async () => {
    const raster = await renderSingle("^BY3^B9N,100,N,N^FD0421000");
    expect(decodeUpce(raster, 80)).toBe("04210007");
  });

  it("left-pads and left-truncates retail data to Zebra field widths", async () => {
    expect(
      decode(
        await renderSingle("^BY3^B8N,100,N,N^FD123"),
        BarcodeFormat.EAN_8
      ).text
    ).toBe("00001236");
    expect(
      decode(
        await renderSingle("^BY3^BEN,100,N,N^FD9123456789012"),
        BarcodeFormat.EAN_13
      ).text
    ).toBe("1234567890128");
    expect(
      decode(
        await renderSingle("^BY3^BUN,100,N,N^FD123"),
        BarcodeFormat.UPC_A
      ).text
    ).toBe("000000001236");
    expect(
      decodeUpce(
        await renderSingle("^BY3^B9N,100,N,N^FD90421000"),
        80
      )
    ).toBe("04210007");
  });

  it("uses ^B7 height as the exact height of each PDF417 row", async () => {
    const result = await renderZpl(
      "^XA^PW500^LL100^FO10,10^B7N,4,0,6,8,N^FDPDF417-HEIGHT^FS^XZ"
    );
    expect(result.labels[0].highlightRegions).toContainEqual(
      expect.objectContaining({ type: "barcode", x: 10, y: 10, height: 32 })
    );
  });

  it("rejects PDF417 data and geometry beyond Zebra's limits", async () => {
    const oversizedData = await renderZpl(
      `^XA^PW100^LL100^FO0,0^B7N,2,0,1,3,N^FD${"A".repeat(3073)}^FS^XZ`
    );
    expect(oversizedData.diagnostics).toContainEqual(
      expect.objectContaining({ code: "INVALID_BARCODE_DATA" })
    );

    const oversizedGrid = await renderZpl(
      "^XA^PW100^LL100^FO0,0^B7N,2,0,16,58,N^FDA^FS^XZ"
    );
    expect(oversizedGrid.diagnostics).toContainEqual(
      expect.objectContaining({ code: "INVALID_BARCODE_DATA" })
    );
  });

  it("preserves payload and swaps geometry for all barcode orientations", async () => {
    const result = await renderZpl(
      ["N", "R", "I", "B"]
        .map(
          (orientation) =>
            `^XA^PW700^LL700^FO100,100^BY3,2,80^B3${orientation},N,80,N,N^FDORIENT^FS^XZ`
        )
        .join("")
    );
    expect(result.labels).toHaveLength(4);
    const regions = result.labels.map((label) =>
      label.highlightRegions.find((region) => region.type === "barcode")!
    );
    expect(regions[0].width).toBe(regions[2].width);
    expect(regions[0].height).toBe(regions[2].height);
    expect(regions[1].width).toBe(regions[3].width);
    expect(regions[1].height).toBe(regions[3].height);
    expect(regions[1].width).toBe(regions[0].height);
    expect(regions[1].height).toBe(regions[0].width);

    const undoRotations = [0, 3, 2, 1] as const;
    result.labels.forEach((label, index) => {
      expect(
        decode(
          rotateRaster(label.raster, undoRotations[index]),
          BarcodeFormat.CODE_39
        ).text
      ).toBe("ORIENT");
    });
  });
});

const UPC_L_PATTERNS = [
  [3, 2, 1, 1],
  [2, 2, 2, 1],
  [2, 1, 2, 2],
  [1, 4, 1, 1],
  [1, 1, 3, 2],
  [1, 2, 3, 1],
  [1, 1, 1, 4],
  [1, 3, 1, 2],
  [1, 2, 1, 3],
  [3, 1, 1, 2],
] as const;

const UPC_E_PARITY = [
  [0x38, 0x34, 0x32, 0x31, 0x2c, 0x26, 0x23, 0x2a, 0x29, 0x25],
  [0x07, 0x0b, 0x0d, 0x0e, 0x13, 0x19, 0x1c, 0x15, 0x16, 0x01],
] as const;

function decodeUpce(raster: MonochromeRaster, row: number): string {
  const runs: number[] = [];
  let x = 0;
  while (x < raster.width && !getDot(raster, x, row)) x++;
  let black = true;
  let length = 0;
  for (; x < raster.width; x++) {
    const current = getDot(raster, x, row);
    if (current === black) {
      length++;
    } else {
      runs.push(length);
      length = 1;
      black = current;
    }
  }
  if (length > 0 && black) runs.push(length);
  const moduleWidth = Math.min(...runs);
  const modules = runs.map((run) => Math.round(run / moduleWidth));
  expect(modules.slice(0, 3)).toEqual([1, 1, 1]);
  expect(modules.slice(-6)).toEqual([1, 1, 1, 1, 1, 1]);

  let parity = 0;
  let digits = "";
  for (let index = 0; index < 6; index++) {
    const pattern = modules.slice(3 + index * 4, 7 + index * 4);
    let digit = UPC_L_PATTERNS.findIndex((candidate) =>
      candidate.every((value, position) => value === pattern[position])
    );
    if (digit < 0) {
      digit = UPC_L_PATTERNS.findIndex((candidate) =>
        [...candidate]
          .reverse()
          .every((value, position) => value === pattern[position])
      );
      if (digit >= 0) parity |= 1 << (5 - index);
    }
    expect(digit).toBeGreaterThanOrEqual(0);
    digits += String(digit);
  }
  for (let numberSystem = 0; numberSystem < UPC_E_PARITY.length; numberSystem++) {
    const checkDigit = UPC_E_PARITY[numberSystem].indexOf(parity);
    if (checkDigit >= 0) return `${numberSystem}${digits}${checkDigit}`;
  }
  throw new Error(`Invalid UPC-E parity ${parity.toString(16)}.`);
}
