declare module "bwip-js" {
  export interface RawBarcodeOptions {
    bcid: string;
    text: string;
    [key: string]: string | number | boolean;
  }

  export interface BarcodeDrawing<T> {
    setopts?(options: RawBarcodeOptions): void;
    scale(scaleX: number, scaleY: number): [number, number] | null;
    measure(
      value: string,
      font: string,
      width: number,
      height: number
    ): { width: number; ascent: number; descent: number };
    init(width: number, height: number): void;
    line(
      x0: number,
      y0: number,
      x1: number,
      y1: number,
      lineWidth: number,
      color: string
    ): void;
    polygon(points: Array<[number, number]>): void;
    hexagon(points: Array<[number, number]>, color?: string): void;
    ellipse(
      x: number,
      y: number,
      radiusX: number,
      radiusY: number,
      counterClockwise: boolean
    ): void;
    fill(color: string): void;
    text(
      x: number,
      y: number,
      value: string,
      color: string,
      font: Readonly<Record<string, string | number>>
    ): void;
    end(): T;
  }

  export interface BwipJsApi {
    raw(options: RawBarcodeOptions): Array<Record<string, unknown>>;
    render<T>(options: RawBarcodeOptions, drawing: BarcodeDrawing<T>): T;
  }

  const bwipjs: BwipJsApi;
  export default bwipjs;
}
