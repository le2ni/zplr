import { describe, expect, it } from "vitest";
import { renderZpl } from "@/index.node";
import { encodeZplCodablockA } from "./codablockA";

function packedHash(data: Uint8Array): number {
  let hash = 0x811c9dc5;
  for (const byte of data) hash = Math.imul(hash ^ byte, 0x01000193);
  return hash >>> 0;
}

describe("printer-conformant CODABLOCK", () => {
  it("builds CODABLOCK A row indicators, padding, and block checks", () => {
    expect(
      encodeZplCodablockA("CODABLOCK", {
        security: true,
        columns: 8,
      }).rowContents
    ).toEqual(["MCODABLOCM", "0K     Y+0"]);
    expect(
      encodeZplCodablockA("ABCDEFGHIJ", {
        security: true,
        columns: 4,
      }).rowContents
    ).toEqual(["NABCDN", "0EFGH0", "1IJK41"]);
    expect(
      encodeZplCodablockA("ABC", {
        security: true,
        columns: 6,
        rows: 3,
      }).rowContents
    ).toEqual(["NABC   N", "0      0", "1    K91"]);
  });

  it("uses Zebra's special single-row form without padding or checks", () => {
    expect(
      encodeZplCodablockA("ABC", {
        security: true,
        columns: 6,
        rows: 1,
      }).rowContents
    ).toEqual(["LABC"]);
  });

  it.each([
    ["security checks", "^BY2^BBN,8,Y,8,0,A", "CODABLOCK", 0x29edae89],
    ["no security checks", "^BY2^BBN,8,N,8,0,A", "CODABLOCK", 0x9fbf1189],
    ["automatic rows", "^BY2^BBN,8,Y,4,0,A", "ABCDEFGHIJ", 0x325fd9c5],
    ["fixed rows", "^BY2^BBN,8,Y,6,3,A", "123456789ABC", 0xeda8d9fd],
    ["derived columns", "^BY2^BBN,8,Y,,5,A", "ABCDEFGHIJ", 0xd30ff9a9],
    ["variable ratio", "^BY3^BBN,8,Y,4,0,A", "ABCDEFGHIJ", 0x8dfaf5ba],
    ["CODABLOCK F geometry", "^BY2^BBN,8,Y,8,0,F", "CODABLOCK", 0x298ffd25],
  ] as const)("matches the Zebra preview for %s", async (_name, command, data, hash) => {
    const result = await renderZpl(
      `^XA^PW448^LL222^FO20,20${command}^FD${data}^FS^XZ`
    );
    expect(result.diagnostics.filter(({ severity }) => severity === "error")).toEqual(
      []
    );
    expect(packedHash(result.labels[0].raster.data)).toBe(hash);
  });

  it("rejects characters and geometry outside CODABLOCK A", () => {
    expect(() =>
      encodeZplCodablockA("lowercase", { security: true, columns: 8 })
    ).toThrow(/unsupported character/);
    expect(() =>
      encodeZplCodablockA("ABCDEFG", {
        security: true,
        columns: 6,
        rows: 1,
      })
    ).toThrow(/row width/);
  });
});
