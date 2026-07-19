import { parseNumber } from "@/helper/parsing/parseNumber";
import { CommandClass } from "@/types/CommandClass";
import { RenderContext } from "@/types/RenderContext";

/** BY - Bar Code Field Default (^BYw,r,h). */
export class BarcodeFieldDefault implements CommandClass {
  static readonly command = "BY";

  /** Module width, 1 to 10 dots; initial value 2. */
  public width: number;
  /** Wide-to-narrow ratio, 2.0 to 3.0; default value 3.0. */
  public ratio: number;
  /** Bar-code height in dots; initial value 10. */
  public height: number;

  constructor(paramString: string) {
    const args = paramString.split(",");
    this.width = parseNumber(args[0], 2, 1, 10);
    this.ratio = parseNumber(args[1], 3, 2, 3);
    this.height = parseNumber(args[2], 10, 1, 32000);
  }

  applyToContext(context: RenderContext): void {
    context.barcodeDefaults.moduleWidth = this.width;
    context.barcodeDefaults.ratio = this.ratio;
    context.barcodeDefaults.height = this.height;
  }
}
