import { parseNumber } from "@/helper/parsing/parseNumber";
import { CommandClass } from "@/types/CommandClass";
import { RenderContext } from "@/types/RenderContext";

/**
 * CI - Change International Font/Encoding
 *
 * ^CIa
 */
export class ChangeInternationalFont implements CommandClass {
  static readonly command = "CI";

  public a: number;

  constructor(paramString: string) {
    this.a = parseNumber(paramString, 0, 0, 36);
  }

  applyToContext(context: RenderContext): void {
    throw new Error(
      `^CI${this.a} is not supported by the zpl-ii-2006 renderer profile.`
    );
  }
}
