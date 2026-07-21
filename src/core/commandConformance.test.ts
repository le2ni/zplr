import { describe, expect, it } from "vitest";
import { commandCapabilities } from "./capabilities";
import { parseDocument } from "./documentParser";
import { renderZpl } from "../index.node";

const supported = commandCapabilities.filter(({ status }) => status === "supported");
const partial = commandCapabilities.filter(({ status }) => status === "partial");
const unsupported = commandCapabilities.filter(({ status }) => status === "unsupported");
const deviceOnly = commandCapabilities.filter(({ status }) => status === "non-rendering");

function parsedCommands(source: string) {
  const document = parseDocument(source);
  return document.items.flatMap((item) => item.kind === "label" ? item.commands : [item]);
}

function commandFixture(canonical: string): string {
  return canonical.startsWith("~")
    ? `${canonical}^XA^PW32^LL32^XZ`
    : `^XA^PW32^LL32${canonical}^XZ`;
}

describe("command capability smoke map", () => {
  it("parses every pinned command under its full identity", () => {
    for (const capability of commandCapabilities) {
      const command = parsedCommands(capability.canonical).find(
        ({ canonical }) => canonical === capability.canonical
      );
      expect(command, capability.canonical).toBeDefined();
      expect(command?.capability, capability.canonical).toBe(capability.status);
    }
  });

  it("accepts every supported identity without a capability downgrade", async () => {
    for (const capability of supported) {
      const result = await renderZpl(commandFixture(capability.canonical), {
        width: 32,
        height: 32,
        clock: new Date("2025-10-10T00:00:00Z"),
        limits: { maxLabels: 2, maxPixels: 1_024 },
      });
      expect(
        result.diagnostics.some(
          ({ code, command }) =>
            command === capability.canonical &&
            (code === "PARTIALLY_SUPPORTED_COMMAND" || code === "UNSUPPORTED_COMMAND")
        ),
        capability.canonical
      ).toBe(false);
    }
  });

  it("keeps every recognized device-only command raster-neutral", async () => {
    const baseline = await renderZpl("^XA^PW32^LL32^XZ");
    const expected = baseline.labels[0].raster.data;
    for (const capability of deviceOnly) {
      const result = await renderZpl(`^XA^PW32^LL32${capability.canonical}^XZ`);
      expect(result.labels, capability.canonical).toHaveLength(1);
      expect(result.labels[0].raster.data, capability.canonical).toEqual(expected);
      expect(
        result.diagnostics.some(
          ({ code, command }) => code === "NON_RENDERING_COMMAND" && command === capability.canonical
        ),
        capability.canonical
      ).toBe(true);
    }
  });

  it("keeps incomplete rendering behavior explicit and documented", async () => {
    for (const capability of [...partial, ...unsupported]) {
      expect(capability.limitations?.length, capability.canonical).toBeGreaterThan(0);
      const result = await renderZpl(commandFixture(capability.canonical), {
        width: 32,
        height: 32,
      });
      expect(
        result.diagnostics.some(
          ({ code, command }) =>
            code ===
              (capability.status === "partial"
                ? "PARTIALLY_SUPPORTED_COMMAND"
                : "UNSUPPORTED_COMMAND") &&
            command === capability.canonical
        ),
        capability.canonical
      ).toBe(true);
    }
  });
});
