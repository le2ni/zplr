import { enumValOrDefault } from "@/helper/parsing/enumValOrDefault";
import { parseOrientation } from "@/helper/parsing/parseOrientation";
import { yesNoDefault } from "@/helper/parsing/yesNoDefault";
import { BarcodeCommand } from "@/types/CommandClass";
import { Orientation } from "@/types/Orientation";
import { RenderContext } from "@/types/RenderContext";
import JsBarcode from "jsbarcode";

const CODE39_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. $/+%";

function computeMod43(input: string): string {
  let sum = 0;
  for (let char of input) {
    const idx = CODE39_CHARSET.indexOf(char);
    // assume valid characters; if not found, skip
    if (idx !== -1) {
      sum += idx;
    }
  }
  const mod = sum % 43;
  return CODE39_CHARSET[mod];
}

/**
 * B3 - Code 39 Bar Code
 *
 * ^B3o,e,h,f,g
 */
export class BarcodeFieldCode39 implements BarcodeCommand {
  static readonly command = "B3";

  public orientation?: Orientation;
  public height?: number;
  public mod43CheckDigit: boolean;
  public printInterpretation: boolean;
  public printInterpretationAbove: boolean;

  constructor(paramString: string) {
    // split parameters in order: o, e, h, f, g
    const args = paramString.split(",");
    // o - orientation, default: current ^FW value (undefined)
    this.orientation = parseOrientation(args[0]);
    // e - Mod-43 check digit, default: N
    this.mod43CheckDigit = yesNoDefault(args[1], false);
    // h - bar code height, default: from ^BY
    this.height = parseInt(args[2]) || undefined;
    // f - print interpretation line, default: Y
    this.printInterpretation = yesNoDefault(args[3], true);
    // g - print interpretation line above code, default: N
    this.printInterpretationAbove = yesNoDefault(args[4], false);
  }

  applyToContext(context: RenderContext): void {
    context.barcodeCommand = this;
  }

  render(context: RenderContext): void {
    let fieldData = context.fieldData || "";
    if (this.mod43CheckDigit) {
      const checkDigit = computeMod43(fieldData);
      fieldData += checkDigit;
    }

    const nextCanvas = context.createCanvas();
    const textMargin = 2 * context.barcodeDefaults.moduleWidth;
    const fontSize = 10 * context.barcodeDefaults.moduleWidth;

    JsBarcode(nextCanvas, fieldData, {
      height: this.height || context.barcodeDefaults.height,
      width: context.barcodeDefaults.moduleWidth,
      textPosition: this.printInterpretation
        ? this.printInterpretationAbove
          ? "top"
          : "bottom"
        : undefined,
      text: `*${fieldData}*`,
      textAlign: "center",
      displayValue: this.printInterpretation,
      margin: 0,
      format: "CODE39",
      fontOptions: "normal",
      background: "#00000000",
      fontSize,
      textMargin,
    });

    const marginTop =
      this.printInterpretationAbove && this.printInterpretation
        ? -fontSize - textMargin
        : 0;

    context.drawCanvasToCanvas(
      context.ctx,
      nextCanvas,
      context.fieldX,
      context.fieldY + marginTop
    );

    const commandIndex =
      context.highlight.currentFieldStartIndex ??
      context.highlight.currentCommandIndex;
    context.highlight.regions.push({
      type: "barcode",
      commandIndex: commandIndex,
      x: context.fieldX,
      y: context.fieldY + marginTop,
      width: nextCanvas.width,
      height: nextCanvas.height,
    });
  }
}
