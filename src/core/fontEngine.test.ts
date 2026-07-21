import { describe, expect, it } from "vitest";
import { OpenTypeFontEngine } from "./fontEngine";

describe("OpenTypeFontEngine", () => {
  it("does not retain glyph rasters beyond its cache pixel budget", async () => {
    const bounded = new OpenTypeFontEngine(undefined, 4);
    const uncachedFirst = bounded.rasterizeBuiltIn("A", 3, 2);
    const uncachedSecond = bounded.rasterizeBuiltIn("A", 3, 2);

    expect(uncachedSecond).not.toBe(uncachedFirst);
    await Promise.all([uncachedFirst, uncachedSecond]);

    const cached = new OpenTypeFontEngine(undefined, 6);
    const cachedFirst = cached.rasterizeBuiltIn("A", 3, 2);
    const cachedSecond = cached.rasterizeBuiltIn("A", 3, 2);

    expect(cachedSecond).toBe(cachedFirst);
    await cachedFirst;
  });
});
