import { RenderContext } from "./RenderContext";

/** @deprecated Use ZplCommandNode with parseDocument() for new integrations. */
export interface CommandClass {
  applyToContext(context: RenderContext): void | Promise<void>;
  /**
   * Start position in the source ZPL string (inclusive)
   */
  sourceStart?: number;
  /**
   * End position in the source ZPL string (exclusive)
   */
  sourceEnd?: number;
}

/** @deprecated Barcode rendering is represented by BarcodeLayoutField internally. */
export interface BarcodeCommand extends CommandClass {
  render(context: RenderContext): Promise<void> | void;
}
