import { describe, expect, it } from "vitest";
import { parseNumber } from "./parseNumber";
import { yesNoDefault } from "./yesNoDefault";

describe("parameter parsing", () => {
  it("honors zero-valued numeric bounds", () => {
    expect(parseNumber("-10", 5, 0, 100)).toBe(0);
    expect(parseNumber("10", 5, -100, 0)).toBe(0);
  });

  it("accepts only exact Y and N values", () => {
    expect(yesNoDefault("Y", false)).toBe(true);
    expect(yesNoDefault(" N ", true)).toBe(false);
    expect(yesNoDefault("NY", false)).toBe(false);
    expect(yesNoDefault("YES", false)).toBe(false);
  });
});
