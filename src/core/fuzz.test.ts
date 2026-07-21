import { describe, expect, it } from "vitest";
import { createRenderSession, renderZpl } from "../index.node";

function seededSources(seed: number, count: number): string[] {
  let state = seed >>> 0;
  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return state >>> 0;
  };
  const alphabet = "^~XAFOFDFSXZ0123456789,.:_ abcdef\n\u0000\u00ff";
  return Array.from({ length: count }, (_, index) => {
    const length = 1 + (next() % 160);
    let source = "";
    for (let offset = 0; offset < length; offset++) {
      source += alphabet[next() % alphabet.length];
    }
    return index % 3 === 0 ? `^XA${source}^XZ` : source;
  });
}

const constrainedOptions = {
  width: 48,
  height: 48,
  clock: new Date("2025-10-10T00:00:00Z"),
  limits: {
    maxDimension: 64,
    maxPixels: 2_304,
    maxGraphicBytes: 128,
    maxSessionBytes: 256,
    maxTemplateDepth: 2,
    maxExpandedCommands: 64,
    maxLabels: 2,
  },
} as const;

describe("seeded malformed-input and resource-limit fuzzing", () => {
  it("always resolves malformed jobs with deterministic diagnostics", async () => {
    for (const source of seededSources(0x5a17_0300, 64)) {
      const first = await renderZpl(source, constrainedOptions);
      const second = await renderZpl(source, constrainedOptions);
      expect(second.diagnostics.map(({ code }) => code)).toEqual(
        first.diagnostics.map(({ code }) => code)
      );
      expect(second.labels.map(({ raster }) => raster.data)).toEqual(
        first.labels.map(({ raster }) => raster.data)
      );
    }
  });

  it("reports representative limit violations instead of rejecting", async () => {
    const dimensions = await renderZpl("^XA^XZ", {
      ...constrainedOptions,
      width: 999_999,
      height: 999_999,
    });
    expect(dimensions.diagnostics.some(({ code }) => code === "LABEL_LIMIT_EXCEEDED")).toBe(true);

    const graphic = await renderZpl("~DGR:HUGE.GRF,999,1,00^XA^PW32^LL32^XZ", constrainedOptions);
    expect(graphic.diagnostics.some(({ code }) => code === "GRAPHIC_LIMIT_EXCEEDED")).toBe(true);

    const rawObject = await renderZpl(
      "~DYR:RAW,B,G,10,1,abcdefghij^XA^PW8^LL8^XZ",
      {
        ...constrainedOptions,
        limits: { ...constrainedOptions.limits, maxGraphicBytes: 1 },
      }
    );
    expect(
      rawObject.diagnostics.some(({ code }) => code === "GRAPHIC_LIMIT_EXCEEDED")
    ).toBe(true);

    const quantity = await renderZpl("^XA^PW32^LL32^PQ99999999^XZ", constrainedOptions);
    expect(quantity.labels).toHaveLength(2);
    expect(quantity.diagnostics.some(({ code }) => code === "LABEL_QUANTITY_LIMIT_EXCEEDED")).toBe(true);
  });

  it("rejects a user-provider failure without poisoning a session queue", async () => {
    const failure = new Error("provider unavailable");
    const options = {
      ...constrainedOptions,
      fontProvider: { async resolveFont() { throw failure; } },
    };
    const session = createRenderSession(options);
    await expect(
      session.render("^XA^PW48^LL48^FO2,2^A@N,20,20,R:USER.TTF^FDx^FS^XZ")
    ).rejects.toBe(failure);
    await expect(
      session.render(
        "^XA^PW48^LL48^FO2,2^A@N,20,20,R:USER.TTF^BCN,10,Y,N,N^FD12345^FS^XZ"
      )
    ).rejects.toBe(failure);
    await expect(session.render("^XA^PW48^LL48^FO2,2^GB8,8,1^FS^XZ")).resolves.toMatchObject({
      labels: [{ width: 48, height: 48 }],
    });
  });

  it("substitutes a malformed downloaded outline font instead of rejecting", async () => {
    const result = await renderZpl(
      "~DTR:BAD.TTF,2,FFFF^XA^PW48^LL48^FO2,2^A@N,20,20,R:BAD.TTF^FDx^FS^XZ",
      constrainedOptions
    );

    expect(result.labels).toHaveLength(1);
    expect(result.diagnostics.map(({ code }) => code)).toContain(
      "FONT_SUBSTITUTED"
    );
  });
});
