import { describe, expect, it } from "vitest";
import { zlibSync } from "fflate";
import {
  crc16Ccitt,
  decodeBinaryGraphic,
  decodeGraphic,
  GraphicDecodeError,
} from "./graphicDecoder";

function expectGraphicError(operation: () => unknown, code: string): void {
  try {
    operation();
    throw new Error("Expected graphic decoding to fail.");
  } catch (error) {
    expect(error).toBeInstanceOf(GraphicDecodeError);
    expect((error as GraphicDecodeError).code).toBe(code);
  }
}

function base64(data: Uint8Array): string {
  return Buffer.from(data).toString("base64");
}

function binary(data: Uint8Array): string {
  return String.fromCharCode(...data);
}

describe("graphic decoding", () => {
  it("decodes raw and Zebra-compressed ASCII hexadecimal data", () => {
    expect([...decodeGraphic("AA55", 2, 2, 16).data]).toEqual([0xaa, 0x55]);
    expect([...decodeGraphic(",!: ", 1, 3, 16).data]).toEqual([0x00, 0xff, 0xff]);

    const repeated = decodeGraphic("hA", 20, 20, 32);
    expect([...repeated.data]).toEqual(new Array(20).fill(0xaa));
  });

  it("validates B64 data with Zebra's CRC-16/CCITT checksum", () => {
    expect(crc16Ccitt("AQID")).toBe("CEC2");
    expect([
      ...decodeGraphic(":B64:AQID:CEC2", 3, 3, 16).data,
    ]).toEqual([1, 2, 3]);

    expectGraphicError(
      () => decodeGraphic(":B64:AQID:0001", 3, 3, 16),
      "GRAPHIC_CRC_MISMATCH"
    );
    expectGraphicError(
      () => decodeGraphic(":B64:AQID:", 3, 3, 16),
      "INVALID_GRAPHIC_WRAPPER"
    );
  });

  it("decompresses Z64 and checks declared sizes before allocation", () => {
    const source = Uint8Array.from([0xf0, 0x0f, 0xaa, 0x55]);
    const encoded = base64(zlibSync(source));
    const wrapped = `:Z64:${encoded}:${crc16Ccitt(encoded)}`;
    expect([...decodeGraphic(wrapped, 2, 4, 16).data]).toEqual([...source]);

    expectGraphicError(
      () => decodeGraphic(wrapped, 2, 5, 16),
      "GRAPHIC_BYTE_COUNT_MISMATCH"
    );
    expectGraphicError(
      () => decodeGraphic(wrapped, 2, 17, 16),
      "GRAPHIC_LIMIT_EXCEEDED"
    );

    const oversizedOutput = Uint8Array.from(new Array(32).fill(0xaa));
    const oversizedEncoded = base64(zlibSync(oversizedOutput));
    expectGraphicError(
      () =>
        decodeGraphic(
          `:Z64:${oversizedEncoded}:${crc16Ccitt(oversizedEncoded)}`,
          1,
          1,
          16
        ),
      "GRAPHIC_BYTE_COUNT_MISMATCH"
    );
  });

  it("decodes raw and zlib-compressed binary graphic fields", () => {
    const source = Uint8Array.from([0x80, 0x5e, 0x7e, 0x2c]);
    expect([
      ...decodeBinaryGraphic(binary(source), 1, 4, 4, false, 16).data,
    ]).toEqual([...source]);

    const compressed = zlibSync(source);
    expect([
      ...decodeBinaryGraphic(
        binary(compressed),
        1,
        compressed.length,
        source.length,
        true,
        16
      ).data,
    ]).toEqual([...source]);
  });

  it("rejects expanding ASCII and encoded input before oversized output allocation", () => {
    expectGraphicError(
      () => decodeGraphic("0000", 1, 1, 16),
      "GRAPHIC_BYTE_COUNT_MISMATCH"
    );
    expectGraphicError(
      () => decodeGraphic(`:B64:${"A".repeat(2000)}:0000`, 1, 1, 16),
      "GRAPHIC_LIMIT_EXCEEDED"
    );
  });
});
