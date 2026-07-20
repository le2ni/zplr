import { describe, expect, it } from "vitest";
import { renderZpl } from "@/index.node";

const representativeBarcodes = [
  ["B0 Aztec", "^B0N,3,N,0,N,1^FDHELLO AZTEC"],
  ["B1 Code 11", "^BY2,2.5,40^B1N,N,40,N,N^FD1234567890"],
  ["B2 Interleaved 2 of 5", "^BY2,2.5,40^B2N,40,N,N,Y^FD12345"],
  ["B4 Code 49", "^BY2,3,8^B4N,8,N,A^FDCODE49"],
  ["B5 PLANET", "^BY2^B5N,40,N,N^FD01234567890"],
  ["BA Code 93", "^BY2^BAN,40,N,N,N^FDABC-123"],
  ["BB CODABLOCK F", "^BY2^BBN,8,Y,8,0,F^FDCODABLOCK"],
  ["BD MaxiCode mode 4", "^BD4,1,1^FDMAXICODE"],
  ["BF MicroPDF417", "^BY2^BFN,3,0^FDABC"],
  ["BI Industrial 2 of 5", "^BY2,2.5^BIN,40,N,N^FD123456"],
  ["BJ Standard 2 of 5", "^BY2,2.5^BJN,40,N,N^FD123456"],
  ["BK Codabar", "^BY2,2.5^BKN,N,40,N,N,A,B^FD1234"],
  ["BL LOGMARS", "^BY2,2.5^BLN,40,N^FDLOGMARS"],
  ["BM MSI", "^BY2,2.5^BMN,B,40,N,N,Y^FD123456"],
  ["BO Aztec", "^BON,3,N,0,N,1^FDHELLO AZTEC"],
  ["BP Plessey", "^BY2,2.5^BPN,Y,40,N,N^FD1234ABCD"],
  ["BR GS1 DataBar", "^BRN,1,2,1,25,22^FD0952123454321"],
  ["BS EAN extension", "^BY2^BSN,40,N,N^FD05"],
  ["BT TLC39", "^BTN,2,2,40,2,4^FD123456,SERIAL123"],
  ["BZ POSTNET", "^BY2^BZN,40,N,N,0^FD01234"],
] as const;

describe("extended ZPL barcode families", () => {
  it.each(representativeBarcodes)("renders %s", async (_name, command) => {
    const result = await renderZpl(
      `^XA^PW1600^LL500^FO20,20${command}^FS^XZ`,
      { dpi: 200 }
    );
    expect(
      result.diagnostics.filter((diagnostic) => diagnostic.severity === "error")
    ).toEqual([]);
    expect(result.labels[0].highlightRegions).toContainEqual(
      expect.objectContaining({
        type: "barcode",
        width: expect.any(Number),
        height: expect.any(Number),
      })
    );
  });

  it("uses printer-conformant TLC39 component order and linkage geometry", async () => {
    const result = await renderZpl(
      "^XA^PW448^LL222^FO10,40^BTN,2,2,40,2,4" +
        "^FD123456,SERIAL123,US^FS^XZ",
      { printDensity: 8 }
    );
    expect(result.labels[0].highlightRegions.at(-1)).toMatchObject({
      type: "barcode",
      x: 10,
      y: 40,
      width: 250,
      height: 74,
    });
    expect(result.diagnostics.map(({ code }) => code)).not.toContain(
      "PARTIALLY_SUPPORTED_COMMAND"
    );
  });

  it.each([
    [1, "0952123454321", 22, 192, 66],
    [2, "0952123454321", 22, 192, 26],
    [3, "0952123454321", 22, 100, 26],
    [4, "0952123454321", 22, 100, 138],
    [5, "0952123454321", 22, 158, 20],
    [6, "0109521234543213", 4, 204, 142],
    [7, "12345678901", 22, 204, 148],
    [8, "04210000526", 22, 116, 148],
    [9, "123456789012", 22, 204, 148],
    [10, "1234567", 22, 148, 120],
  ] as const)(
    "matches printer ^BR type %i geometry",
    async (type, data, segments, width, height) => {
      const result = await renderZpl(
        `^XA^PW800^LL400^FO0,0^BRN,${type},2,1,50,${segments}` +
          `^FD${data}^FS^XZ`,
        { printDensity: 8 }
      );
      expect(result.diagnostics).toEqual([]);
      expect(result.labels[0].highlightRegions.at(-1)).toMatchObject({
        type: "barcode",
        x: 0,
        y: 0,
        width,
        height,
      });
    }
  );

  it("matches the printer's ^BR UPC-E0 source compression and parity", async () => {
    const result = await renderZpl(
      "^XA^PW448^LL222" +
        "^FO0,0^BRN,8,1,1,50,22^FD04210000526^FS" +
        "^FO0,148^BRN,8,1,1,50,22^FD12345000006^FS" +
        "^FO220,148^BRN,8,1,1,50,22^FD01200000345^FS^XZ",
      { printDensity: 8 }
    );
    let hash = 2166136261;
    for (const byte of result.labels[0].raster.data) {
      hash = Math.imul(hash ^ byte, 16777619);
    }
    expect(hash >>> 0).toBe(0x252a53bd);
  });

  it("accepts Zebra linear|composite ^BR data and matches CC-A/B geometry", async () => {
    const result = await renderZpl(
      "^XA^PW448^LL222^FO20,20^BRN,11,2,1,50,22" +
        "^FD0109521234543213|ABC123^FS^XZ",
      { printDensity: 8 }
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.labels[0].highlightRegions.at(-1)).toMatchObject({
      type: "barcode",
      x: 20,
      y: 20,
      width: 310,
      height: 114,
    });
    let hash = 2166136261;
    for (const byte of result.labels[0].raster.data) {
      hash = Math.imul(hash ^ byte, 16777619);
    }
    expect(hash >>> 0).toBe(0x99de73f5);
  });

  it("matches printer Aztec structured-append partitioning and modules", async () => {
    const result = await renderZpl(
      "^XA^PW448^LL222^FO0,0^B0N,4,N,0,N,2,TEST" +
        "^FDABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789^FS^XZ",
      { printDensity: 8 }
    );
    expect(result.diagnostics.map(({ code }) => code)).not.toContain(
      "PARTIALLY_SUPPORTED_COMMAND"
    );
    expect(result.labels[0].highlightRegions.at(-1)).toMatchObject({
      type: "barcode",
      x: 0,
      y: 0,
      width: 156,
      height: 76,
    });
    const raster = result.labels[0].raster;
    const moduleHash = (left: number) => {
      let hash = 2166136261;
      for (let y = 0; y < 19; y++) {
        for (let x = 0; x < 19; x++) {
          const px = left + x * 4 + 2;
          const py = y * 4 + 2;
          const module =
            (raster.data[py * raster.stride + (px >> 3)] &
              (0x80 >> (px & 7))) !==
            0
              ? 1
              : 0;
          hash = Math.imul(hash ^ module, 16777619);
        }
      }
      return hash >>> 0;
    };
    // Real-printer hashes for the 19/17-byte 2-symbol partition.  Zebra's
    // one-module inter-symbol gap places the second 19x19 symbol at x=80.
    expect(moduleHash(0)).toBe(0x4611ce50);
    expect(moduleHash(80)).toBe(0x9fedbe45);
  });

  it("matches printer Aztec ECIC flags including non-canonical digit lengths", async () => {
    const result = await renderZpl(
      "^XA^PW448^LL222" +
        "^FO0,0^B0N,3,Y,0,N,1^FH_^FD_1B19HELLO^FS" +
        "^FO110,0^B0N,3,Y,0,N,1^FH_^FD_1B6000026HELLO^FS^XZ",
      { printDensity: 8 }
    );
    expect(
      result.labels[0].highlightRegions.filter(({ type }) => type === "barcode")
    ).toEqual([
      expect.objectContaining({ x: 0, y: 0, width: 45, height: 45 }),
      expect.objectContaining({ x: 110, y: 0, width: 45, height: 45 }),
    ]);
    const raster = result.labels[0].raster;
    const moduleHash = (left: number) => {
      let hash = 2166136261;
      for (let y = 0; y < 15; y++) {
        for (let x = 0; x < 15; x++) {
          const px = left + x * 3 + 1;
          const py = y * 3 + 1;
          const module =
            (raster.data[py * raster.stride + (px >> 3)] &
              (0x80 >> (px & 7))) !==
            0
              ? 1
              : 0;
          hash = Math.imul(hash ^ module, 16777619);
        }
      }
      return hash >>> 0;
    };
    expect(moduleHash(0)).toBe(0x93047379);
    expect(moduleHash(110)).toBe(0x2aeaf730);
  });

  it("matches printer Data Matrix size, aspect, and automatic module geometry", async () => {
    const result = await renderZpl(
      "^XA^PW448^LL300" +
        "^FO10,10^BXN,4,200,18,18,6,_,1^FDABC123^FS" +
        "^FO150,10^BXN,4,200,32,8,6,_,2^FDRECT^FS" +
        "^BY2,3,100^FO10,170^BXN,0,200^FDAUTO^FS^XZ",
      { printDensity: 8 }
    );
    expect(
      result.labels[0].highlightRegions.filter(({ type }) => type === "barcode")
    ).toEqual([
      expect.objectContaining({ x: 10, y: 10, width: 72, height: 72 }),
      expect.objectContaining({ x: 150, y: 10, width: 128, height: 32 }),
      expect.objectContaining({ x: 10, y: 170, width: 96, height: 96 }),
    ]);
  });

  it("matches printer ECC-200 escape codewords exactly", async () => {
    const result = await renderZpl(
      "^XA^PW448^LL222" +
        "^FO10,10^BXN,3,200,20,20,6,_,1^FD_1ABC__DEF_d029_G^FS" +
        "^FO90,10^BXN,3,200,20,20,6,_,1^FD_5009ABC^FS" +
        "^FO170,10^BXN,3,200,20,20,6,_,1^FD_3ABC^FS" +
        "^FO250,10^BXN,3,200,20,20,6,_,1^FD_2214001001ABC^FS^XZ",
      { printDensity: 8 }
    );
    // FNV-1a of the packed 448x222 printer preview.  This covers FNC1,
    // literal escape, decimal/control bytes, Macro 05, FNC3, and FNC2
    // structured-append data in one compact external-oracle fixture.
    let hash = 2166136261;
    for (const byte of result.labels[0].raster.data) {
      hash = Math.imul(hash ^ byte, 16777619);
    }
    expect(hash >>> 0).toBe(0xf8a26802);
  });

  it("renders legacy Data Matrix through the public ZPL pipeline", async () => {
    const result = await renderZpl(
      "^XA^PW196^LL196^FO0,0^BXN,4,140,49,49,6" +
        "^FDABCDEFGHIJKLMNOPQRSTUVWXYZ012345^FS^XZ",
      { printDensity: 8 }
    );
    expect(result.diagnostics.filter(({ severity }) => severity === "error")).toEqual(
      []
    );
    expect(result.labels[0].highlightRegions.at(-1)).toMatchObject({
      type: "barcode",
      x: 0,
      y: 0,
      width: 196,
      height: 196,
    });
    let hash = 2166136261;
    const raster = result.labels[0].raster;
    for (let y = 0; y < 49; y++) {
      for (let x = 0; x < 49; x++) {
        const px = x * 4 + 2;
        const py = y * 4 + 2;
        const module =
          (raster.data[py * raster.stride + (px >> 3)] &
            (0x80 >> (px & 7))) !==
          0
            ? 1
            : 0;
        hash = Math.imul(hash ^ module, 16777619);
      }
    }
    expect(hash >>> 0).toBe(0x8c9a91da);
  });
});
