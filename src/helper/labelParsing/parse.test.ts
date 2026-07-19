import { BarcodeFieldDefault } from "@/commands/BarcodeFieldDefault";
import { BarcodeFieldCode128 } from "@/commands/BarcodeFieldCode128";
import { FieldData } from "@/commands/FieldData";
import { FieldOrigin } from "@/commands/FieldOrigin";
import { FieldSeparator } from "@/commands/FieldSeparator";
import { describe, expect, it } from "vitest";
import {
  getCommandEnd,
  getCommandInfo,
  parse,
  skipToCommandStart,
} from "./parse";

describe("skip to start", () => {
  it("skips correctly to caret", () => {
    const input = "foo  ^TEst~";
    const skipped = skipToCommandStart(input, "^", "~");
    expect(skipped).eq("^TEst~");
  });

  it("skips correctly to tilde", () => {
    const input = "foo  ~TEst^";
    const skipped = skipToCommandStart(input, "^", "~");
    expect(skipped).eq("~TEst^");
  });
});

describe("getCommandEnd", () => {
  it("gets correct end for caret", () => {
    const input = "^TEst~";
    const end = getCommandEnd(input, "^", "~");
    expect(end).eq(5);
  });

  it("gets correct end for tilde", () => {
    const input = "~TEst^";
    const end = getCommandEnd(input, "^", "~");
    expect(end).eq(5);
  });

  it("gets correct end for empty command", () => {
    const input = "^BC^FD123";
    const end = getCommandEnd(input, "^", "~");
    expect(end).eq(3);
  });
});

describe("getCommandInfo", () => {
  it("gets correct command info", () => {
    const input = "^FO100,100^FDHello, World!^FS";
    const info = getCommandInfo(input, "^", "~");
    expect(info).toEqual({
      name: "FO",
      paramText: "100,100",
      remaining: "^FDHello, World!^FS",
    });
  });
  it("gets correct command info for FieldData", () => {
    const input = "^FDHello, World!^FS";
    const info = getCommandInfo(input, "^", "~");
    expect(info).toEqual({
      name: "FD",
      paramText: "Hello, World!",
      remaining: "^FS",
    });
  });
  it("gets correct command info for empty commands", () => {
    const input = "^BC^FD123";
    const info = getCommandInfo(input, "^", "~");
    expect(info).toEqual({
      name: "BC",
      paramText: "",
      remaining: "^FD123",
    });
  });
});

describe("parse", () => {
  it("parses simple commands", () => {
    const input = "^XA^FO100,100^FDHello, World!^FS^XZ";
    const parsed = parse(input);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toHaveLength(3);
    expect(parsed[0][0]).toBeInstanceOf(FieldOrigin);
    expect(parsed[0][0]).toMatchObject({
      x: 100,
      y: 100,
      sourceStart: 3,
      sourceEnd: 13,
    });
    expect(parsed[0][1]).toBeInstanceOf(FieldData);
    expect(parsed[0][1]).toMatchObject({
      data: "Hello, World!",
      sourceStart: 13,
      sourceEnd: 29,
    });
    expect(parsed[0][2]).toBeInstanceOf(FieldSeparator);
    expect(parsed[0][2]).toMatchObject({ sourceStart: 29, sourceEnd: 32 });
  });

  it("parses a barcode command", () => {
    const input = `^BY5,2,270
^FO100,550^BC^FD12345678^FS`;
    const parsed = parse(input);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toHaveLength(5);
    expect(parsed[0][0]).toBeInstanceOf(BarcodeFieldDefault);
    expect(parsed[0][0]).toMatchObject({ width: 5, ratio: 2, height: 270 });
    expect(parsed[0][1]).toBeInstanceOf(FieldOrigin);
    expect(parsed[0][1]).toMatchObject({ x: 100, y: 550 });
    expect(parsed[0][2]).toBeInstanceOf(BarcodeFieldCode128);
    expect(parsed[0][3]).toBeInstanceOf(FieldData);
    expect(parsed[0][4]).toBeInstanceOf(FieldSeparator);
  });

  it("does not parse XA as the one-character A command", () => {
    const [commands] = parse("^XA^A0R,20,10^FDX^FS^XZ");
    expect(commands.map((command) => command.constructor.name)).toEqual([
      "ScalableBitmappedFont",
      "FieldData",
      "FieldSeparator",
    ]);
  });

  it("preserves legacy field data when a custom delimiter is active", () => {
    const [commands] = parse("^XA^CD;^FO1;2^FDhello;world^FS^XZ");
    expect(commands[1]).toBeInstanceOf(FieldData);
    expect(commands[1]).toMatchObject({ data: "hello;world" });
  });
});
