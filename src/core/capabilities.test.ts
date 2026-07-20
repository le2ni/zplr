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
    expect(
      commandCapabilities.filter(({ status }) => status === "partial")
    ).toEqual([]);
    expect(getCommandCapability("B4")).toMatchObject({
      status: "supported",
      category: "barcode",
      effect: "raster",
    });
    expect(getCommandCapability("CI")).toMatchObject({
      status: "supported",
      effect: "raster",
    });
    expect(getCommandCapability("BC")?.status).toBe("supported");
    expect(getCommandCapability("BB")?.status).toBe("supported");
    expect(getCommandCapability("BQ")).toMatchObject({
      status: "supported",
      effect: "raster",
    });
    expect(getCommandCapability("^MD")).toMatchObject({
      status: "non-rendering",
      effect: "device",
    });
    expect(getCommandCapability("^SF")).toMatchObject({
      status: "supported",
      category: "text",
      effect: "raster",
    });
    expect(getCommandCapability("~DS")?.status).toBe("supported");
    expect(getCommandCapability("^FM")?.status).toBe("supported");
    expect(getCommandCapability("^SZ")?.status).toBe("supported");
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
