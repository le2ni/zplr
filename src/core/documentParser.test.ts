import { describe, expect, it } from "vitest";
import { parseDocument } from "./documentParser";

describe("parseDocument", () => {
  it("preserves structural commands and exact source spans", () => {
    const source = "^XA^FO100,100^FDHello^FS^XZ";
    const document = parseDocument(source);
    expect(document.diagnostics).toEqual([]);
    expect(document.labels).toHaveLength(1);
    expect(document.labels[0].explicit).toBe(true);
    expect(document.labels[0].commands.map((command) => command.code)).toEqual([
      "XA",
      "FO",
      "FD",
      "FS",
      "XZ",
    ]);
    expect(document.labels[0].commands.map((command) => command.span)).toEqual([
      { start: 0, end: 3 },
      { start: 3, end: 13 },
      { start: 13, end: 21 },
      { start: 21, end: 24 },
      { start: 24, end: 27 },
    ]);
  });

  it("distinguishes A and A@ from two-character commands", () => {
    const document = parseDocument("^XA^A0R,20,10^A@N,20,10,R:FONT.FNT^XZ");
    expect(document.labels[0].commands.map((command) => command.code)).toEqual([
      "XA",
      "A",
      "A@",
      "XZ",
    ]);
    expect(document.labels[0].commands[2]).toMatchObject({
      canonical: "^A@",
      capability: "supported",
    });
    expect(document.diagnostics).toEqual([]);
  });

  it("tracks changed caret, control prefix, and delimiter characters", () => {
    const caret = parseDocument("^XA^CC//FO10,20/FDx/FS/XZ");
    expect(caret.labels[0].commands.map((command) => command.code)).toEqual([
      "XA",
      "CC",
      "FO",
      "FD",
      "FS",
      "XZ",
    ]);

    const delimiter = parseDocument("^XA^CD;^FO10;20^FDx^FS^XZ");
    expect(
      delimiter.labels[0].commands.find((command) => command.code === "FO")
        ?.parameters
    ).toEqual(["10", "20"]);

    const control = parseDocument("^XA^CT++HS^XZ");
    expect(control.labels[0].commands.map((command) => command.code)).toEqual([
      "XA",
      "CT",
      "HS",
      "XZ",
    ]);
    expect(control.labels[0].commands[2].canonical).toBe("~HS");
    expect(control.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "NON_RENDERING_COMMAND",
        command: "~HS",
        severity: "info",
      })
    );

    const invalidPrefix = parseDocument("^XA^DGname^XZ");
    expect(
      invalidPrefix.diagnostics.map((diagnostic) => diagnostic.code)
    ).toContain("INVALID_COMMAND_PREFIX");
  });

  it("recognizes STX, ETX, and SI command alternatives", () => {
    const document = parseDocument("\u0002^FO1,2^FDx\u000f\u0003");
    expect(document.labels[0].commands.map((command) => command.code)).toEqual([
      "XA",
      "FO",
      "FD",
      "FS",
      "XZ",
    ]);
    expect(document.labels[0].commands[0].prefixKind).toBe(
      "control-character"
    );
  });

  it("retains fragments, unknown commands, and supported commands", () => {
    const document = parseDocument("junk^FO1,2^QZabc^B4^FS");
    expect(document.labels[0].explicit).toBe(false);
    expect(document.labels[0].commands.map((command) => command.code)).toEqual([
      "FO",
      "QZ",
      "B4",
      "FS",
    ]);
    const codes = document.diagnostics.map((diagnostic) => diagnostic.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        "TEXT_OUTSIDE_COMMAND",
        "UNKNOWN_COMMAND",
        "IMPLICIT_LABEL",
      ])
    );
    expect(codes).not.toContain("PARTIALLY_SUPPORTED_COMMAND");
  });

  it("reports unmatched and incomplete format boundaries", () => {
    const nested = parseDocument("^XA^FDone^XA^FDtwo^FS^XZ");
    expect(nested.labels).toHaveLength(2);
    expect(nested.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "NESTED_FORMAT"
    );

    const unmatched = parseDocument("^XZ");
    expect(unmatched.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "UNMATCHED_FORMAT_END"
    );

    const incomplete = parseDocument("^XA^FDx");
    expect(incomplete.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "UNTERMINATED_FORMAT"
    );
  });

  it("preserves multiple labels, comments, unknown parameters, and raw field data", () => {
    const source =
      "lead^XA^FXcomment one^ZZa,b^XZ" +
      "^XA^CD;^FO1;2^FDkeep;this;raw^FS^XZ";
    const document = parseDocument(source);
    expect(document.labels).toHaveLength(2);
    expect(
      document.labels[0].commands.find((command) => command.code === "FX")
        ?.rawParameters
    ).toBe("comment one");
    expect(
      document.labels[0].commands.find((command) => command.code === "ZZ")
        ?.rawParameters
    ).toBe("a,b");
    const fieldData = document.labels[1].commands.find(
      (command) => command.code === "FD"
    );
    expect(fieldData?.rawParameters).toBe("keep;this;raw");
    expect(fieldData?.span.end).toBe(
      fieldData?.span.start === undefined
        ? undefined
        : fieldData.span.start + "^FDkeep;this;raw".length
    );
  });

  it("returns diagnostics for malformed input without throwing", () => {
    expect(() => parseDocument("plain text ^")).not.toThrow();
    const document = parseDocument("plain text ^");
    expect(document.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining(["TEXT_OUTSIDE_COMMAND", "INVALID_COMMAND"])
    );

    const invalidType = parseDocument(null as unknown as string);
    expect(invalidType.diagnostics).toMatchObject([
      { code: "INVALID_INPUT", severity: "error" },
    ]);

    const profile = parseDocument("^XA^XZ", {
      profile: "future-profile" as "zpl-ii-2006",
    });
    expect(profile.profile).toBe("zpl-ii-2025");
    expect(profile.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "UNSUPPORTED_PROFILE"
    );

    const legacy = parseDocument("^XA^XZ", { profile: "zpl-ii-2006" });
    expect(legacy.profile).toBe("zpl-ii-2025");
    expect(legacy.diagnostics).toContainEqual(
      expect.objectContaining({ code: "DEPRECATED_PROFILE", severity: "warning" })
    );
  });
});
