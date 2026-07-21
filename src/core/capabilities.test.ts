import { describe, expect, it } from "vitest";
import { commandCapabilities, getCommandCapability } from "./capabilities";

describe("command capability registry", () => {
  it("contains one authoritative entry per declared command", () => {
    const identities = commandCapabilities.map(
      (capability) => capability.canonical
    );
    expect(new Set(identities).size).toBe(identities.length);
    // The pinned 2025 Zebra index contains 223 distinct ^/~ command identities.
    expect(commandCapabilities).toHaveLength(223);
    expect(
      commandCapabilities.every(
        (capability) =>
          capability.status &&
          capability.reference.startsWith("https://docs.zebra.com/")
      )
    ).toBe(true);
    expect(getCommandCapability("^JB")?.canonical).toBe("^JB");
    expect(getCommandCapability("~JB")?.canonical).toBe("~JB");
    expect(getCommandCapability("JB")).toBeUndefined();
  });

  it("marks limitations at command and parameter level", () => {
    const partial = commandCapabilities.filter(
      ({ status }) => status === "partial"
    );
    expect(partial).toHaveLength(11);
    expect(partial).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          canonical: "~DY",
          effect: "job",
          limitations: expect.arrayContaining([
            expect.stringContaining("AR-compressed"),
          ]),
        }),
        expect.objectContaining({
          canonical: "^GF",
          effect: "raster",
          limitations: expect.arrayContaining([
            expect.stringContaining("compressed-binary"),
          ]),
        }),
        expect.objectContaining({
          canonical: "^FC",
          effect: "raster",
          limitations: expect.arrayContaining([
            expect.stringContaining("Intl"),
          ]),
        }),
        expect.objectContaining({ canonical: "^KL", effect: "job" }),
        expect.objectContaining({ canonical: "^CI", effect: "raster" }),
        expect.objectContaining({ canonical: "^FP", effect: "raster" }),
        expect.objectContaining({ canonical: "^FT", effect: "raster" }),
        expect.objectContaining({ canonical: "^PA", effect: "raster" }),
        expect.objectContaining({
          canonical: "^SF",
          effect: "raster",
          limitations: expect.arrayContaining([
            expect.stringContaining("combining-cluster"),
          ]),
        }),
        expect.objectContaining({ canonical: "^SL", effect: "raster" }),
        expect.objectContaining({ canonical: "^TB", effect: "raster" }),
      ])
    );
    expect(getCommandCapability("^B4")).toMatchObject({
      status: "supported",
      category: "barcode",
      effect: "raster",
    });
    expect(getCommandCapability("^CI")).toMatchObject({
      status: "partial",
      effect: "raster",
    });
    expect(getCommandCapability("^BC")?.status).toBe("supported");
    expect(getCommandCapability("^BB")?.status).toBe("supported");
    expect(getCommandCapability("^BQ")).toMatchObject({
      status: "supported",
      effect: "raster",
    });
    expect(getCommandCapability("^MD")).toMatchObject({
      status: "non-rendering",
      effect: "device",
    });
    expect(getCommandCapability("^SF")).toMatchObject({
      status: "partial",
      category: "text",
      effect: "raster",
    });
    expect(getCommandCapability("~DS")?.status).toBe("supported");
    expect(getCommandCapability("^FM")?.status).toBe("supported");
    expect(getCommandCapability("^SZ")).toMatchObject({
      status: "unsupported",
      effect: "job",
      limitations: expect.arrayContaining([
        expect.stringContaining("mode 1"),
      ]),
    });
    expect(getCommandCapability("^JM")).toMatchObject({
      status: "unsupported",
      effect: "job",
      limitations: expect.arrayContaining([
        expect.stringContaining("printDensity"),
      ]),
    });
    expect(getCommandCapability("^CW")).toMatchObject({
      status: "supported",
      effect: "job",
    });
    expect(getCommandCapability("^FN")).toMatchObject({
      status: "supported",
      effect: "raster",
    });
    expect(getCommandCapability("^XF")).toMatchObject({
      status: "supported",
      effect: "job",
    });
    expect(getCommandCapability("~HS")).toMatchObject({
      status: "non-rendering",
      category: "printer",
      effect: "device",
    });
  });
});
