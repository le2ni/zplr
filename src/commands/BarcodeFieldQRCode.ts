import { enumValOrDefault } from "@/helper/parsing/enumValOrDefault";
import { BarcodeCommand } from "@/types/CommandClass";
import { RenderContext } from "@/types/RenderContext";
import QRCode, { QRCodeErrorCorrectionLevel } from "qrcode";

type QRModel = "1" | "2";
type QRReliability = "H" | "Q" | "M" | "L";

/**
 * BQ - Barcode Field (QR Code)
 *
 * ^BQa,b,c,d,e
 *
 * a = field orientation (fixed as normal)
 * b = model (1=original, 2=enhanced)
 * c = magnification factor (1-10)
 * d = reliability level (H,Q,M,L)
 * e = mask value (1-7)
 */
export class BarcodeFieldQRCode implements BarcodeCommand {
  static readonly command = "BQ";

  public model: QRModel;
  public magnification: number;
  public reliability: QRReliability;
  public mask: number;

  constructor(paramString: string) {
    const args = paramString.split(",");

    // a is fixed as normal orientation
    this.model = enumValOrDefault(args[1], ["1", "2"], "2");
    this.magnification = args[2]
      ? Math.min(Math.max(parseInt(args[2]), 1), 10)
      : this.getDefaultMagnification();
    this.reliability = enumValOrDefault(args[3], ["H", "Q", "M", "L"], "Q");
    const mask = Number.parseInt(args[4]);
    this.mask = Number.isFinite(mask) ? Math.min(Math.max(mask, 1), 7) : 7;
  }

  private getDefaultMagnification(): number {
    return 3;
  }

  applyToContext(context: RenderContext): void {
    context.barcodeCommand = this;
  }

  async render(context: RenderContext): Promise<void> {
    if (!context.fieldData) return;
    if (this.model === "1") {
      throw new Error("QR Model 1 is not supported.");
    }

    const match = /^([HQML])([AM]),/.exec(context.fieldData);
    if (!match) {
      throw new Error("QR field data requires an error level and A or M input mode.");
    }
    const errorCorrectionLevel = match[1] as QRCodeErrorCorrectionLevel;
    const inputMode = match[2];
    let fieldData = context.fieldData.slice(3);
    if (inputMode === "M") {
      const characterMode = fieldData[0];
      if (characterMode === "K") {
        throw new Error("QR Kanji manual input is not supported.");
      }
      if (!["N", "A", "B"].includes(characterMode)) {
        throw new Error("QR manual input requires N, A, B, or K character mode.");
      }
      fieldData = fieldData.slice(1);
      if (characterMode === "B") {
        if (!/^\d{4}/.test(fieldData)) {
          throw new Error("QR manual byte input requires a four-digit byte count.");
        }
        fieldData = fieldData.slice(4);
      }
    }

    const nextCanvas = context.createCanvas();
    await QRCode.toCanvas(nextCanvas, fieldData, {
      errorCorrectionLevel,
      scale: this.magnification,
      margin: 0,
      maskPattern: this.mask as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7,
    });

    context.drawCanvasToCanvas(
      context.ctx,
      nextCanvas,
      context.fieldX,
      context.fieldY
    );

    const commandIndex =
      context.highlight.currentFieldStartIndex ??
      context.highlight.currentCommandIndex;
    context.highlight.regions.push({
      type: "barcode",
      commandIndex,
      x: context.fieldX,
      y: context.fieldY,
      width: nextCanvas.width,
      height: nextCanvas.height,
    });
  }
}
