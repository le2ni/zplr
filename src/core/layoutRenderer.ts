import QRCode, { QRCodeErrorCorrectionLevel } from "qrcode";
import {
  BarcodeLayoutField,
  BoxLayoutField,
  CircleLayoutField,
  LabelLayout,
  LayoutFieldBlock,
  TextLayoutField,
} from "@/types/LabelLayout";
import { Orientation } from "@/types/Orientation";
import { HighlightRegion } from "@/types/RenderContext";
import { ZplDiagnostic } from "@/types/ZplDocument";
import { CanvasFactory, CanvasLike } from "@/helper/rendering/canvas";

export interface CanvasPlatform<TCanvas extends CanvasLike = CanvasLike> {
  createCanvas: CanvasFactory;
  drawCanvasToCanvas: (
    targetCtx: CanvasRenderingContext2D,
    sourceCanvas: CanvasLike,
    x: number,
    y: number
  ) => void;
}

export interface LayoutRenderResult<TCanvas extends CanvasLike = CanvasLike> {
  canvas: TCanvas;
  diagnostics: ZplDiagnostic[];
  highlightRegions: HighlightRegion[];
}

interface LaidOutLine {
  text: string;
  width: number;
  indent: number;
  paragraphEnd: boolean;
  overprints?: LaidOutLine[];
}

const CODE39_CHARACTERS = [
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
  "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T",
  "U", "V", "W", "X", "Y", "Z", "-", ".", " ", "$",
  "/", "+", "%", "*",
] as const;

const CODE39_ENCODINGS = [
  20957, 29783, 23639, 30485, 20951, 29813, 23669, 20855, 29789, 23645,
  29975, 23831, 30533, 22295, 30149, 24005, 21623, 29981, 23837, 22301,
  30023, 23879, 30545, 22343, 30161, 24017, 21959, 30065, 23921, 22385,
  29015, 18263, 29141, 17879, 29045, 18293, 17783, 29021, 18269, 17477,
  17489, 17681, 20753, 35770,
] as const;

const CODE128_ENCODINGS = [
  11011001100, 11001101100, 11001100110, 10010011000, 10010001100,
  10001001100, 10011001000, 10011000100, 10001100100, 11001001000,
  11001000100, 11000100100, 10110011100, 10011011100, 10011001110,
  10111011000, 10011101100, 10011100110, 11001110010, 11001011100,
  11001001110, 11011100100, 11001110100, 11101101110, 11101001100,
  11100101100, 11100100110, 11101100100, 11100110100, 11100110010,
  11011011000, 11011000110, 11000110110, 10100011000, 10001011000,
  10001000110, 10110001000, 10001101000, 10001100010, 11010001000,
  11000101000, 11000100010, 10110111000, 10110001110, 10001101110,
  10111011000, 10111000110, 10001110110, 11101110110, 11010001110,
  11000101110, 11011101000, 11011100010, 11011101110, 11101011000,
  11101000110, 11100010110, 11101101000, 11101100010, 11100011010,
  11101111010, 11001000010, 11110001010, 10100110000, 10100001100,
  10010110000, 10010000110, 10000101100, 10000100110, 10110010000,
  10110000100, 10011010000, 10011000010, 10000110100, 10000110010,
  11000010010, 11001010000, 11110111010, 11000010100, 10001111010,
  10100111100, 10010111100, 10010011110, 10111100100, 10011110100,
  10011110010, 11110100100, 11110010100, 11110010010, 11011011110,
  11011110110, 11110110110, 10101111000, 10100011110, 10001011110,
  10111101000, 10111100010, 11110101000, 11110100010, 10111011110,
  10111101110, 11101011110, 11110101110, 11010000100, 11010010000,
  11010011100, 1100011101011,
] as const;

function renderDiagnostic(
  code: string,
  message: string,
  field: {
    sourceSpan: { start: number; end: number };
    symbology?: string;
  },
  labelIndex: number
): ZplDiagnostic {
  return {
    code,
    message,
    severity: "error",
    phase: "render",
    span: field.sourceSpan,
    command: field.symbology,
    labelIndex,
  };
}

function fontFamily(key: string): string {
  if (key === "A") {
    return '"Prima Sans Mono BT", "DejaVu Sans Mono", "Liberation Mono", Consolas, Menlo, monospace';
  }
  if (key === "0") {
    return '"Arial Narrow", "Liberation Sans Narrow", Arial, sans-serif';
  }
  return "Arial, sans-serif";
}

function parseBlockEscapes(data: string): string {
  let result = "";
  for (let index = 0; index < data.length; index++) {
    if (data[index] !== "\\") {
      result += data[index];
      continue;
    }

    const next = data[index + 1];
    if (next === "&") {
      result += "\n";
      index++;
    } else if (next === "\\") {
      result += "\\";
      index++;
    } else if (next && /[A-Za-z0-9]/.test(next)) {
      result += "\u00ad";
      index++;
    } else {
      result += "\\";
    }
  }
  return result;
}

function visibleText(value: string): string {
  return value.replace(/\u00ad/g, "");
}

function textWidth(value: string, characterWidth: number): number {
  return [...visibleText(value)].length * characterWidth;
}

function splitLongWord(
  word: string,
  capacity: number
): { head: string; tail: string } {
  if (capacity <= 1) {
    return { head: visibleText(word.slice(0, 1)), tail: word.slice(1) };
  }

  let visibleCharacters = 0;
  let softHyphen = -1;
  for (let index = 0; index < word.length; index++) {
    if (word[index] === "\u00ad") {
      if (visibleCharacters > 0 && visibleCharacters < capacity) {
        softHyphen = index;
      }
    } else {
      visibleCharacters++;
    }
    if (visibleCharacters >= capacity) break;
  }
  if (softHyphen >= 0) {
    return {
      head: visibleText(word.slice(0, softHyphen)) + "-",
      tail: word.slice(softHyphen + 1),
    };
  }

  const visible = visibleText(word);
  if (visible.length <= capacity) return { head: visible, tail: "" };
  return {
    head: visible.slice(0, capacity - 1) + "-",
    tail: visible.slice(capacity - 1),
  };
}

function wrapParagraph(
  paragraph: string,
  block: LayoutFieldBlock,
  characterWidth: number,
  lineOffset: number
): LaidOutLine[] {
  if (paragraph.length === 0) {
    return [{ text: "", width: 0, indent: lineOffset === 0 ? 0 : block.hangingIndent, paragraphEnd: true }];
  }

  const words = paragraph.split(/\s+/).filter(Boolean);
  const lines: LaidOutLine[] = [];
  let current = "";
  let wordIndex = 0;

  const indentForLine = () =>
    lineOffset + lines.length === 0 ? 0 : block.hangingIndent;
  const capacityForLine = () =>
    Math.max(1, Math.floor((block.width - indentForLine()) / characterWidth));

  while (wordIndex < words.length) {
    let word = words[wordIndex];
    const candidate = current ? `${current} ${visibleText(word)}` : visibleText(word);
    const capacity = capacityForLine();

    if ([...candidate].length <= capacity) {
      current = candidate;
      wordIndex++;
      continue;
    }

    if (current) {
      const indent = indentForLine();
      lines.push({
        text: current,
        width: textWidth(current, characterWidth),
        indent,
        paragraphEnd: false,
      });
      current = "";
      continue;
    }

    const split = splitLongWord(word, capacity);
    const indent = indentForLine();
    lines.push({
      text: split.head,
      width: textWidth(split.head, characterWidth),
      indent,
      paragraphEnd: false,
    });
    if (split.tail) words[wordIndex] = split.tail;
    else wordIndex++;
  }

  if (current || lines.length === 0) {
    const indent = indentForLine();
    lines.push({
      text: current,
      width: textWidth(current, characterWidth),
      indent,
      paragraphEnd: true,
    });
  } else {
    lines[lines.length - 1].paragraphEnd = true;
  }
  return lines;
}

export function layoutTextLines(field: TextLayoutField): LaidOutLine[] {
  if (!field.block) {
    return [
      {
        text: field.data,
        width: textWidth(field.data, field.font.width),
        indent: 0,
        paragraphEnd: true,
      },
    ];
  }
  if (field.block.width < field.font.width) return [];

  const parsed = parseBlockEscapes(field.data);
  const paragraphs = parsed.split("\n");
  const lines: LaidOutLine[] = [];
  for (const paragraph of paragraphs) {
    lines.push(
      ...wrapParagraph(paragraph, field.block, field.font.width, lines.length)
    );
  }

  if (lines.length > field.block.maxLines) {
    const retained = lines.slice(0, field.block.maxLines);
    const overflow = lines.slice(field.block.maxLines - 1);
    const last = { ...overflow[0], overprints: overflow.slice(1) };
    retained[retained.length - 1] = last;
    return retained;
  }
  return lines;
}

function transformedSize(
  orientation: Orientation,
  width: number,
  height: number
): { width: number; height: number } {
  return orientation === "R" || orientation === "B"
    ? { width: height, height: width }
    : { width, height };
}

function applyOrientation(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  orientation: Orientation,
  width: number,
  height: number
): void {
  switch (orientation) {
    case "R":
      ctx.translate(x + height, y);
      ctx.rotate(Math.PI / 2);
      break;
    case "I":
      ctx.translate(x + width, y + height);
      ctx.rotate(Math.PI);
      break;
    case "B":
      ctx.translate(x, y + width);
      ctx.rotate((3 * Math.PI) / 2);
      break;
    case "N":
    default:
      ctx.translate(x, y);
      break;
  }
}

function setFieldPaint(
  ctx: CanvasRenderingContext2D,
  reverse: boolean,
  color: "B" | "W" = "B"
): void {
  if (reverse) {
    ctx.globalCompositeOperation = "difference";
    ctx.fillStyle = "white";
    ctx.strokeStyle = "white";
  } else {
    ctx.globalCompositeOperation = "source-over";
    const paint = color === "B" ? "black" : "white";
    ctx.fillStyle = paint;
    ctx.strokeStyle = paint;
  }
}

function drawTextLine(
  ctx: CanvasRenderingContext2D,
  field: TextLayoutField,
  line: LaidOutLine,
  y: number,
  isLastLine: boolean
): void {
  const block = field.block;
  const availableWidth = block ? block.width - line.indent : line.width;
  let x = line.indent;
  if (block?.justification === "C") {
    x += (availableWidth - line.width) / 2;
  } else if (block?.justification === "R") {
    x += availableWidth - line.width;
  }

  const measuredCharacter = Math.max(ctx.measureText("M").width, 0.001);
  const scaleX = field.font.width / measuredCharacter;

  if (
    block?.justification === "J" &&
    !line.paragraphEnd &&
    !isLastLine &&
    line.text.includes(" ")
  ) {
    const words = line.text.split(" ");
    const wordsWidth = words.reduce(
      (sum, word) => sum + textWidth(word, field.font.width),
      0
    );
    const gap = (availableWidth - wordsWidth) / (words.length - 1);
    let cursor = x;
    for (const word of words) {
      ctx.save();
      ctx.scale(scaleX, 1);
      ctx.fillText(word, cursor / scaleX, y);
      ctx.restore();
      cursor += textWidth(word, field.font.width) + gap;
    }
    return;
  }

  ctx.save();
  ctx.scale(scaleX, 1);
  ctx.fillText(line.text, x / scaleX, y);
  ctx.restore();
}

function renderText(
  ctx: CanvasRenderingContext2D,
  field: TextLayoutField,
  regions: HighlightRegion[]
): void {
  const lines = layoutTextLines(field);
  if (lines.length === 0) return;
  const lineSpacing = field.block?.lineSpacing ?? 0;
  const lineStep = field.font.height + lineSpacing;
  const logicalWidth = field.block?.width ?? Math.max(...lines.map((line) => line.width));
  const logicalHeight = Math.max(
    field.font.height,
    field.font.height + (lines.length - 1) * lineStep
  );

  ctx.save();
  applyOrientation(
    ctx,
    field.x,
    field.y,
    field.orientation,
    logicalWidth,
    logicalHeight
  );
  setFieldPaint(ctx, field.reverse);
  ctx.font = `${field.font.key === "0" ? "bold " : ""}${field.font.height}px ${fontFamily(
    field.font.key
  )}`;
  ctx.textBaseline = "top";

  lines.forEach((line, index) => {
    drawTextLine(
      ctx,
      field,
      line,
      index * lineStep,
      index === lines.length - 1
    );
    for (const overprint of line.overprints ?? []) {
      drawTextLine(
        ctx,
        field,
        overprint,
        index * lineStep,
        index === lines.length - 1
      );
    }
  });
  ctx.restore();

  const size = transformedSize(field.orientation, logicalWidth, logicalHeight);
  regions.push({
    type: "text",
    commandIndex: field.commandIndex,
    x: field.x,
    y: field.y,
    width: size.width,
    height: size.height,
  });
}

function renderBox(
  ctx: CanvasRenderingContext2D,
  field: BoxLayoutField,
  regions: HighlightRegion[]
): void {
  ctx.save();
  setFieldPaint(ctx, field.reverse, field.color);
  ctx.lineWidth = field.thickness;
  const radius =
    (field.rounding / 8) * (Math.min(field.width, field.height) / 2);
  ctx.beginPath();
  ctx.roundRect(field.x, field.y, field.width, field.height, radius);
  ctx.save();
  ctx.clip();
  ctx.lineWidth = field.thickness * 2;
  ctx.stroke();
  ctx.restore();
  ctx.restore();
  regions.push({
    type: "box",
    commandIndex: field.commandIndex,
    x: field.x,
    y: field.y,
    width: field.width,
    height: field.height,
  });
}

function renderCircle(
  ctx: CanvasRenderingContext2D,
  field: CircleLayoutField,
  regions: HighlightRegion[]
): void {
  const radius = field.diameter / 2;
  ctx.save();
  setFieldPaint(ctx, field.reverse, field.color);
  ctx.beginPath();
  ctx.arc(field.x + radius, field.y + radius, radius, 0, Math.PI * 2);
  ctx.save();
  ctx.clip();
  ctx.lineWidth = field.thickness * 2;
  ctx.stroke();
  ctx.restore();
  ctx.restore();
  regions.push({
    type: "circle",
    commandIndex: field.commandIndex,
    x: field.x + radius,
    y: field.y + radius,
    radius,
  });
}

function code39CheckDigit(data: string): string {
  const sum = [...data].reduce(
    (total, character) => total + CODE39_CHARACTERS.indexOf(character as never),
    0
  );
  return CODE39_CHARACTERS[sum % 43];
}

function code39Bits(character: string): string {
  const index = CODE39_CHARACTERS.indexOf(character as never);
  return index < 0 ? "" : CODE39_ENCODINGS[index].toString(2);
}

function code39Runs(data: string): Array<{ black: boolean; units: number }> {
  const bits =
    code39Bits("*") +
    [...data].map((character) => `${code39Bits(character)}0`).join("") +
    code39Bits("*");
  const runs: Array<{ black: boolean; units: number }> = [];
  let current = bits[0];
  let length = 0;
  for (const bit of bits) {
    if (bit === current) {
      length++;
    } else {
      runs.push({ black: current === "1", units: length });
      current = bit;
      length = 1;
    }
  }
  if (length > 0) runs.push({ black: current === "1", units: length });
  return runs;
}

function withInterpretationLines(
  bars: CanvasLike,
  text: string,
  field: Pick<
    BarcodeLayoutField,
    | "moduleWidth"
    | "printInterpretationAbove"
    | "printInterpretationBelow"
    | "interpretationFont"
  >,
  platform: CanvasPlatform
): CanvasLike {
  if (!field.printInterpretationAbove && !field.printInterpretationBelow) {
    return bars;
  }

  const fontSize = field.interpretationFont.height;
  const characterWidth = field.interpretationFont.width;
  const textMargin = Math.max(0, field.moduleWidth * 2);
  const textBandHeight = fontSize + textMargin;
  const deterministicTextWidth = [...text].length * characterWidth;
  const width = Math.max(bars.width, Math.ceil(deterministicTextWidth));
  const height =
    bars.height +
    (field.printInterpretationAbove ? textBandHeight : 0) +
    (field.printInterpretationBelow ? textBandHeight : 0);
  const canvas = platform.createCanvas(Math.max(1, width), Math.max(1, height));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create a barcode interpretation canvas.");

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const barsY = field.printInterpretationAbove ? textBandHeight : 0;
  platform.drawCanvasToCanvas(ctx, bars, (canvas.width - bars.width) / 2, barsY);
  ctx.fillStyle = "black";
  ctx.font = `${field.interpretationFont.key === "0" ? "bold " : ""}${fontSize}px ${fontFamily(
    field.interpretationFont.key
  )}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  const measuredCharacter = Math.max(ctx.measureText("M").width, 0.001);
  const scaleX = characterWidth / measuredCharacter;
  const drawInterpretation = (y: number) => {
    ctx.save();
    ctx.scale(scaleX, 1);
    ctx.fillText(text, canvas.width / (2 * scaleX), y);
    ctx.restore();
  };
  if (field.printInterpretationAbove) drawInterpretation(0);
  if (field.printInterpretationBelow) {
    drawInterpretation(barsY + bars.height + textMargin);
  }
  return canvas;
}

function createCode39Canvas(
  field: Extract<BarcodeLayoutField, { symbology: "B3" }>,
  platform: CanvasPlatform
): CanvasLike {
  const input = field.data;
  if (!/^[0-9A-Z\-. $/+%]+$/.test(input)) {
    throw new Error("Code 39 field data contains unsupported characters.");
  }
  const encoded = field.mod43CheckDigit ? input + code39CheckDigit(input) : input;
  const runs = code39Runs(encoded);
  const wideElementWidth = Math.round(field.moduleWidth * field.ratio);
  const runWidth = (units: number) =>
    units >= 3 ? wideElementWidth : field.moduleWidth * units;
  const barcodeWidth = runs.reduce((sum, run) => sum + runWidth(run.units), 0);
  const bars = platform.createCanvas(
    Math.max(1, Math.ceil(barcodeWidth)),
    Math.max(1, Math.ceil(field.height))
  );
  const ctx = bars.getContext("2d");
  if (!ctx) throw new Error("Could not create a Code 39 canvas context.");
  ctx.clearRect(0, 0, bars.width, bars.height);
  ctx.fillStyle = "black";
  let x = 0;
  for (const run of runs) {
    const width = runWidth(run.units);
    if (run.black) ctx.fillRect(x, 0, width, field.height);
    x += width;
  }
  return withInterpretationLines(bars, `*${encoded}*`, field, platform);
}

function mod10CheckDigit(data: string): string {
  if (!/^\d+$/.test(data)) {
    throw new Error("A Code 128 UCC check digit requires numeric field data.");
  }
  let sum = 0;
  let weight = 3;
  for (let index = data.length - 1; index >= 0; index--) {
    sum += Number(data[index]) * weight;
    weight = weight === 3 ? 1 : 3;
  }
  return String((10 - (sum % 10)) % 10);
}

type Code128Set = "A" | "B" | "C";

function code128DisplayValue(value: number, set: Code128Set): string {
  if (set === "C") return String(value).padStart(2, "0");
  if (set === "A") {
    return String.fromCharCode(value < 64 ? value + 32 : value - 64);
  }
  return String.fromCharCode(value + 32);
}

function code128Value(character: string, set: Exclude<Code128Set, "C">): number {
  const codePoint = character.charCodeAt(0);
  if (set === "A") {
    if (codePoint < 0 || codePoint > 95) {
      throw new Error("Code 128 subset A field data contains an invalid character.");
    }
    return codePoint < 32 ? codePoint + 64 : codePoint - 32;
  }
  if (codePoint < 32 || codePoint > 127) {
    throw new Error("Code 128 subset B field data contains an invalid character.");
  }
  return codePoint - 32;
}

function encodeCode128NoSelectedMode(data: string): {
  values: number[];
  display: string;
} {
  if (data.length === 0) throw new Error("Code 128 field data is empty.");

  let sourceIndex = 0;
  let set: Code128Set = "B";
  let start = 104;
  const startCode = data.slice(0, 2);
  if (startCode === ">9" || startCode === ">:" || startCode === ">;") {
    set = startCode === ">9" ? "A" : startCode === ">:" ? "B" : "C";
    start = set === "A" ? 103 : set === "B" ? 104 : 105;
    sourceIndex = 2;
  }

  const values: number[] = [];
  let display = "";
  let shift = false;
  const appendDirectValue = (value: number) => {
    values.push(value);
    display += code128DisplayValue(value, set);
  };

  while (sourceIndex < data.length) {
    if (data[sourceIndex] === ">") {
      const invocation = data[sourceIndex + 1];
      if (invocation === undefined) {
        throw new Error("A Code 128 invocation marker is incomplete.");
      }
      sourceIndex += 2;
      if (invocation === "<") {
        if (set === "C") {
          throw new Error("A literal > cannot be encoded while Code 128 subset C is active.");
        }
        values.push(code128Value(">", set));
        display += ">";
      } else if (invocation === "0") {
        appendDirectValue(30);
      } else if (invocation === "=") {
        appendDirectValue(94);
      } else if (invocation === "1") {
        appendDirectValue(95);
      } else if (invocation === "2") {
        values.push(96);
      } else if (invocation === "3") {
        values.push(97);
      } else if (invocation === "4") {
        if (set === "C") {
          throw new Error("Code 128 SHIFT is invalid in subset C.");
        }
        values.push(98);
        shift = true;
      } else if (invocation === "5") {
        values.push(99);
        set = "C";
      } else if (invocation === "6") {
        values.push(100);
        set = "B";
      } else if (invocation === "7") {
        values.push(101);
        set = "A";
      } else if (invocation === "8") {
        values.push(102);
      } else {
        throw new Error(`Unsupported Code 128 invocation code >${invocation}.`);
      }
      continue;
    }

    if (set === "C") {
      const pair = data.slice(sourceIndex, sourceIndex + 2);
      if (!/^\d{2}$/.test(pair)) {
        throw new Error("Code 128 subset C requires pairs of numeric digits.");
      }
      values.push(Number(pair));
      display += pair;
      sourceIndex += 2;
      continue;
    }

    const character = data[sourceIndex++];
    const activeSet: "A" | "B" = shift ? (set === "A" ? "B" : "A") : set;
    values.push(code128Value(character, activeSet));
    display += character;
    shift = false;
  }
  if (shift) throw new Error("Code 128 SHIFT requires a following character.");

  const checksum =
    (start + values.reduce((sum, value, index) => sum + value * (index + 1), 0)) %
    103;
  return { values: [start, ...values, checksum, 106], display };
}

function createCode128NoSelectedModeCanvas(
  data: string,
  field: Extract<BarcodeLayoutField, { symbology: "BC" }>,
  platform: CanvasPlatform
): CanvasLike {
  const encoded = encodeCode128NoSelectedMode(data);
  return createCode128ValuesCanvas(
    encoded.values,
    encoded.display,
    field,
    platform
  );
}

function createCode128ValuesCanvas(
  values: number[],
  display: string,
  field: Extract<BarcodeLayoutField, { symbology: "BC" }>,
  platform: CanvasPlatform
): CanvasLike {
  const bits = values
    .map((value) => CODE128_ENCODINGS[value]?.toString() ?? "")
    .join("");
  if (bits.length === 0) throw new Error("Code 128 produced no encoded data.");
  const bars = platform.createCanvas(
    bits.length * field.moduleWidth,
    Math.max(1, field.height)
  );
  const ctx = bars.getContext("2d");
  if (!ctx) throw new Error("Could not create a Code 128 canvas context.");
  ctx.clearRect(0, 0, bars.width, bars.height);
  ctx.fillStyle = "black";
  for (let index = 0; index < bits.length; index++) {
    if (bits[index] === "1") {
      ctx.fillRect(index * field.moduleWidth, 0, field.moduleWidth, field.height);
    }
  }
  return withInterpretationLines(bars, display, field, platform);
}

function normalizeCode128LiteralGreater(data: string): string | undefined {
  let normalized = "";
  for (let index = 0; index < data.length; index++) {
    if (data[index] !== ">") {
      normalized += data[index];
      continue;
    }
    if (data[index + 1] !== "<") return undefined;
    normalized += ">";
    index++;
  }
  return normalized;
}

function digitRunLength(data: string, from: number): number {
  let length = 0;
  while (/^\d$/.test(data[from + length] ?? "")) length++;
  return length;
}

function preferredCode128Set(character: string): "A" | "B" {
  const codePoint = character.charCodeAt(0);
  if (codePoint < 32) return "A";
  if (codePoint <= 127) return "B";
  throw new Error("Code 128 automatic mode supports ASCII field data only.");
}

function encodeCode128AutomaticMode(data: string): {
  values: number[];
  display: string;
} {
  if (data.length === 0) throw new Error("Code 128 field data is empty.");
  const initialDigits = digitRunLength(data, 0);
  let set: Code128Set =
    initialDigits >= 4 && initialDigits % 2 === 0
      ? "C"
      : preferredCode128Set(data[0]);
  const start = set === "A" ? 103 : set === "B" ? 104 : 105;
  const dataValues: number[] = [];
  let index = 0;

  while (index < data.length) {
    const digits = digitRunLength(data, index);
    if (set !== "C" && digits >= 4) {
      if (digits % 2 === 1) {
        dataValues.push(code128Value(data[index], set));
        index++;
      }
      dataValues.push(99);
      set = "C";
      continue;
    }

    if (set === "C") {
      if (digits >= 2) {
        dataValues.push(Number(data.slice(index, index + 2)));
        index += 2;
        continue;
      }
      const nextSet = preferredCode128Set(data[index]);
      dataValues.push(nextSet === "A" ? 101 : 100);
      set = nextSet;
      continue;
    }

    const character = data[index];
    const codePoint = character.charCodeAt(0);
    if ((set === "A" && codePoint > 95) || (set === "B" && codePoint < 32)) {
      const nextSet = set === "A" ? "B" : "A";
      dataValues.push(nextSet === "A" ? 101 : 100);
      set = nextSet;
      continue;
    }
    dataValues.push(code128Value(character, set));
    index++;
  }

  const checksum =
    (start +
      dataValues.reduce(
        (sum, value, valueIndex) => sum + value * (valueIndex + 1),
        0
      )) %
    103;
  return {
    values: [start, ...dataValues, checksum, 106],
    display: data,
  };
}

function createCode128AutomaticModeCanvas(
  data: string,
  field: Extract<BarcodeLayoutField, { symbology: "BC" }>,
  platform: CanvasPlatform
): CanvasLike {
  const normalized = normalizeCode128LiteralGreater(data);
  if (normalized === undefined) {
    return createCode128NoSelectedModeCanvas(data, field, platform);
  }
  const encoded = encodeCode128AutomaticMode(normalized);
  return createCode128ValuesCanvas(
    encoded.values,
    encoded.display,
    field,
    platform
  );
}

async function createBarcodeCanvas(
  field: BarcodeLayoutField,
  platform: CanvasPlatform
): Promise<CanvasLike> {
  if (field.symbology === "B3") return createCode39Canvas(field, platform);

  if (field.symbology === "BC") {
    const encoded = field.uccCheckDigit
      ? field.data + mod10CheckDigit(field.data)
      : field.data;
    if (field.mode === "N") {
      return createCode128NoSelectedModeCanvas(encoded, field, platform);
    }
    return createCode128AutomaticModeCanvas(encoded, field, platform);
  }

  const canvas = platform.createCanvas();
  await QRCode.toCanvas(canvas as any, field.data, {
    errorCorrectionLevel: field.reliability as QRCodeErrorCorrectionLevel,
    scale: field.magnification,
    margin: 0,
    maskPattern: field.mask as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7,
  });
  return canvas;
}

function whiteMask(
  source: CanvasLike,
  platform: CanvasPlatform
): CanvasLike {
  const mask = platform.createCanvas(source.width, source.height);
  const maskContext = mask.getContext("2d");
  if (!maskContext) throw new Error("Could not create a barcode mask context.");
  platform.drawCanvasToCanvas(maskContext, source, 0, 0);
  maskContext.globalCompositeOperation = "source-in";
  maskContext.fillStyle = "white";
  maskContext.fillRect(0, 0, mask.width, mask.height);
  return mask;
}

async function renderBarcode(
  ctx: CanvasRenderingContext2D,
  field: BarcodeLayoutField,
  platform: CanvasPlatform,
  regions: HighlightRegion[],
  diagnostics: ZplDiagnostic[],
  labelIndex: number
): Promise<void> {
  try {
    const barcode = await createBarcodeCanvas(field, platform);
    const source = field.reverse ? whiteMask(barcode, platform) : barcode;
    ctx.save();
    applyOrientation(
      ctx,
      field.x,
      field.y,
      field.orientation,
      source.width,
      source.height
    );
    if (field.reverse) ctx.globalCompositeOperation = "difference";
    platform.drawCanvasToCanvas(ctx, source, 0, 0);
    ctx.restore();

    const size = transformedSize(
      field.orientation,
      source.width,
      source.height
    );
    regions.push({
      type: "barcode",
      commandIndex: field.commandIndex,
      x: field.x,
      y: field.y,
      width: size.width,
      height: size.height,
    });
  } catch (error) {
    diagnostics.push(
      renderDiagnostic(
        "INVALID_BARCODE_DATA",
        error instanceof Error ? error.message : "The barcode could not be rendered.",
        field,
        labelIndex
      )
    );
  }
}

export async function renderLayout<TCanvas extends CanvasLike>(
  layout: LabelLayout,
  width: number,
  height: number,
  platform: CanvasPlatform<TCanvas>,
  labelIndex = 0
): Promise<LayoutRenderResult<TCanvas>> {
  const canvas = platform.createCanvas(width, height) as TCanvas;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get a 2D canvas context.");

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "black";
  ctx.strokeStyle = "black";
  ctx.globalCompositeOperation = "source-over";

  const diagnostics = [...layout.diagnostics];
  const highlightRegions: HighlightRegion[] = layout.origins.map((origin) => ({
    type: "origin",
    commandIndex: origin.commandIndex,
    x: origin.x,
    y: origin.y,
  }));

  for (const field of layout.fields) {
    if (field.kind === "text") renderText(ctx, field, highlightRegions);
    else if (field.kind === "box") renderBox(ctx, field, highlightRegions);
    else if (field.kind === "circle") renderCircle(ctx, field, highlightRegions);
    else {
      await renderBarcode(
        ctx,
        field,
        platform,
        highlightRegions,
        diagnostics,
        labelIndex
      );
    }
  }

  return { canvas, diagnostics, highlightRegions };
}
