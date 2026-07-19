import { describe, expect, it } from "vitest";
import { commandCapabilities, getCommandCapability } from "./capabilities";

describe("command capability registry", () => {
  it("contains one authoritative entry per declared command", () => {
    const codes = commandCapabilities.map((capability) => capability.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(commandCapabilities.every((capability) => capability.status)).toBe(
      true
    );
  });

  it("marks limitations at command and parameter level", () => {
    expect(getCommandCapability("B4")?.status).toBe("unsupported");
    expect(getCommandCapability("CI")?.status).toBe("unsupported");
    expect(getCommandCapability("BC")).toMatchObject({
      status: "partial",
      limitations: [expect.stringContaining("U and D")],
    });
    expect(getCommandCapability("BQ")).toMatchObject({
      status: "partial",
      limitations: [expect.stringContaining("mixed/divided")],
    });
  });
});
