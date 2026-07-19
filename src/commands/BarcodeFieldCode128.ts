import { enumValOrDefault } from "@/helper/parsing/enumValOrDefault";
import { parseOrientation } from "@/helper/parsing/parseOrientation";
import { yesNoDefault } from "@/helper/parsing/yesNoDefault";
import { getFont } from "@/helper/rendering/font";
import { BarcodeCommand } from "@/types/CommandClass";
import { Orientation } from "@/types/Orientation";
import { RenderContext } from "@/types/RenderContext";
import JsBarcode from "jsbarcode";

/**
 * BC - Barcode Field (Code 128)
 *
 * ^BCo,h,f,g,e,m
 */
export class BarcodeFieldCode128 implements BarcodeCommand {
  static readonly command = "BC";

  public orientation?: Orientation;
  public height?: number;
  public printInterpretationBelow: boolean;
  public printInterpretationAbove: boolean;
  public uccCheckDigit: boolean;
  public mode: "N" | "U" | "A" | "D" = "N";

  constructor(paramString: string) {
    const args = paramString.split(",");

    this.orientation = parseOrientation(args[0]);
    this.height = parseInt(args[1]);
    this.printInterpretationBelow = yesNoDefault(args[2], true);
    this.printInterpretationAbove = yesNoDefault(args[3], false);
    this.uccCheckDigit = yesNoDefault(args[4], false);
    this.mode = enumValOrDefault(args[5], ["N", "U", "A", "D"], "N");
  }

  applyToContext(context: RenderContext): void {
    context.barcodeCommand = this;
  }

  render(context: RenderContext): void {
    if (this.mode === "U" || this.mode === "D") {
      throw new Error(`Code 128 mode ${this.mode} is not supported.`);
    }
    const nextCanvas = context.createCanvas();

    JsBarcode(nextCanvas, context.fieldData || "", {
      height: this.height || context.barcodeDefaults.height,
      width: context.barcodeDefaults.moduleWidth,
      // font: getFont(context),
      textPosition: this.printInterpretationBelow
        ? "bottom"
        : this.printInterpretationAbove
        ? "top"
        : undefined,
      textAlign: "center",
      displayValue:
        this.printInterpretationBelow || this.printInterpretationAbove,

      margin: 0,
      format: this.mode === "A" ? "CODE128" : "CODE128B",
      fontOptions: "normal",
      background: "#00000000",
      fontSize: 10 * context.barcodeDefaults.moduleWidth,
      textMargin: -context.barcodeDefaults.moduleWidth * 1.2,
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
      commandIndex: commandIndex,
      x: context.fieldX,
      y: context.fieldY,
      width: nextCanvas.width,
      height: nextCanvas.height,
    });
  }
}
