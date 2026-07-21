import { describe, expect, it } from "vitest";
import { commandCapabilities } from "../src/index.web";
import {
  findZplResourceDefinition,
  findZplResourceReferences,
  formatZpl,
  suggestZplCommands,
  zplSnippetForSource,
} from "./zplLanguage";

describe("ZPL document formatting", () => {
  it("places ordinary commands on lines without changing field payloads", () => {
    expect(formatZpl("^XA^FO10,20^FD  keep me  ^FS^XZ")).toBe(
      "^XA\n^FO10,20\n^FD  keep me  ^FS\n^XZ\n"
    );
  });

  it("preserves newlines that are part of comments and field data", () => {
    const source = "^XA\n^FX note\n^FO10,20^FDline 1\nline 2^FS\n^XZ\n";
    expect(formatZpl(source)).toBe(
      "^XA\n^FX note\n^FO10,20\n^FDline 1\nline 2^FS\n^XZ\n"
    );
  });

  it("formats documents that change their command prefix", () => {
    expect(formatZpl("^XA^CC!!FO10,20!FDcustom!FS!XZ")).toBe(
      "^XA\n^CC!\n!FO10,20\n!FDcustom!FS\n!XZ\n"
    );
  });

  it("localizes inserted snippets to the active prefix and delimiter", () => {
    const source = "^XA^CD;^CC!";
    expect(zplSnippetForSource("^FO", source, source.length)).toBe(
      "!FO${1:40};${2:40};${3:0}"
    );
  });
});

describe("ZPL language intelligence", () => {
  it("ranks typo corrections and wrong-prefix corrections", () => {
    expect(suggestZplCommands("^F0", commandCapabilities)[0]?.canonical).toBe("^FO");
    expect(suggestZplCommands("~FO", commandCapabilities)[0]?.canonical).toBe("^FO");
  });

  it("navigates from a recalled graphic to its download declaration", () => {
    const source = "~DGR:LOGO.GRF,1,1,00\n^XA\n^XGR:LOGO.GRF,1,1^FS\n^XZ";
    const referenceOffset = source.indexOf("^XG") + 4;
    const navigation = findZplResourceDefinition(source, referenceOffset);

    expect(navigation?.name).toBe("R:LOGO.GRF");
    expect(navigation?.definition.start).toBe(0);
    expect(navigation?.reference.start).toBe(source.indexOf("^XG"));
  });

  it("finds stored-format references with or without their declaration", () => {
    const source = "^DFR:FORM.ZPL^FS\n^XA\n^XFR:FORM.ZPL^FS\n^XZ";
    const declarationOffset = source.indexOf("^DF") + 4;
    const references = findZplResourceReferences(source, declarationOffset);
    const allLocations = findZplResourceReferences(source, declarationOffset, true);

    expect(references).toHaveLength(1);
    expect(references[0]?.start).toBe(source.indexOf("^XF"));
    expect(allLocations.map(({ start }) => start)).toEqual([source.indexOf("^DF"), source.indexOf("^XF")]);
  });
});
