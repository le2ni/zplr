import { describe, expect, it } from "vitest";
import { zlibSync } from "fflate";
import {
  crc16Ccitt,
  decodeBinaryGraphic,
  decodeDownloadData,
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

    const padded = "AQ==";
    expect([
      ...decodeGraphic(
        `:B64:${padded}:${crc16Ccitt(padded)}`,
        1,
        1,
        16
      ).data,
    ]).toEqual([1]);
    for (const invalid of ["A", "AB=="]) {
      expectGraphicError(
        () => decodeGraphic(`:B64:${invalid}:${crc16Ccitt(invalid)}`, 1, 1, 16),
        "INVALID_GRAPHIC_BASE64"
      );
    }
  });

  it("decompresses Z64 and checks declared sizes before allocation", () => {
    const source = Uint8Array.from([0xf0, 0x0f, 0xaa, 0x55]);
    const encoded = base64(zlibSync(source));
    const wrapped = `:Z64:${encoded}:${crc16Ccitt(encoded)}`;
    expect([...decodeGraphic(wrapped, 2, 4, 16).data]).toEqual([...source]);

    const invalidAdler = zlibSync(source);
    invalidAdler[invalidAdler.length - 1] ^= 1;
    const invalidAdlerEncoded = base64(invalidAdler);
    expectGraphicError(
      () =>
        decodeGraphic(
          `:Z64:${invalidAdlerEncoded}:${crc16Ccitt(invalidAdlerEncoded)}`,
          2,
          4,
          16
        ),
      "INVALID_GRAPHIC_ZLIB"
    );

    expectGraphicError(
      () => decodeGraphic(wrapped, 1, 5, 16),
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

  it("decodes raw binary fields and diagnoses proprietary compressed binary", () => {
    const source = Uint8Array.from([0x80, 0x5e, 0x7e, 0x2c]);
    expect([
      ...decodeBinaryGraphic(binary(source), 1, 4, 4, false, 16).data,
    ]).toEqual([...source]);

    expectGraphicError(
      () => decodeBinaryGraphic(binary(source), 1, 4, 4, true, 16),
      "UNSUPPORTED_GRAPHIC_FORMAT"
    );
  });

  it("ignores surplus ASCII after the declared count and bounds encoded input", () => {
    expect([...decodeGraphic("0000", 1, 1, 16).data]).toEqual([0]);
    expectGraphicError(
      () => decodeGraphic(`:B64:${"A".repeat(2000)}:0000`, 1, 1, 16),
      "GRAPHIC_LIMIT_EXCEEDED"
    );
  });

  it("bounds raster row geometry as well as decoded payload bytes", () => {
    expectGraphicError(
      () => decodeGraphic("AA", 100_000, 1, 8),
      "GRAPHIC_LIMIT_EXCEEDED"
    );
    expectGraphicError(
      () => decodeBinaryGraphic("\x80", 100_000, 1, 1, false, 8),
      "GRAPHIC_LIMIT_EXCEEDED"
    );
    expectGraphicError(
      () => decodeGraphic("AA", 2, 1, 16),
      "INVALID_GRAPHIC_DIMENSIONS"
    );
  });

  it("decodes plain object hex within its declared allocation", () => {
    expect([...decodeDownloadData("00 ff", 2, 2)]).toEqual([0, 255]);
    expectGraphicError(
      () => decodeDownloadData("0001", 1, 8),
      "OBJECT_BYTE_COUNT_MISMATCH"
    );
    expectGraphicError(
      () => decodeDownloadData("0", 1, 8),
      "INVALID_OBJECT_DATA"
    );
    expectGraphicError(
      () => decodeDownloadData("", Number.NaN, 8),
      "OBJECT_BYTE_COUNT_MISMATCH"
    );
  });
});
