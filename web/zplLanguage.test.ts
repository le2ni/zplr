import { describe, expect, it } from "vitest";
import { commandCapabilities } from "../src/index.web";
import {
  findZplParameterContext,
  findZplResourceDefinition,
  findZplResourceReferences,
  formatZpl,
  getZplCommandDefinition,
  suggestZplCommands,
  validateZplParameters,
  zplCommandDefinitions,
  zplLanguageCoverage,
  zplSnippetForSource,
  zplSnippetsFor,
} from "./zplLanguage";

function snippetDefaults(snippet: string): string {
  return snippet
    .replace(/\$\{\d+:((?:\\.|[^}])*)\}/g, (_match, value: string) => value.replace(/\\}/g, "}"))
    .replace(/\$\d+/g, "");
}

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
  it("covers every current ZPL command with syntax, snippets, and parameter docs", () => {
    const capabilityCommands = commandCapabilities.map(({ canonical }) => canonical).sort();
    const documentedCommands = Object.keys(zplCommandDefinitions).sort();

    expect(documentedCommands).toEqual(capabilityCommands);
    expect(zplLanguageCoverage).toEqual({ commands: 223, signatures: 225, parameters: 630 });

    for (const [command, definition] of Object.entries(zplCommandDefinitions)) {
      expect(definition.title, `${command} title`).not.toBe("");
      expect(definition.summary, `${command} summary`).not.toBe("");
      expect(definition.reference, `${command} reference`).toMatch(/^https:\/\/docs\.zebra\.com\//);
      expect(definition.signatures.length, `${command} signatures`).toBeGreaterThan(0);
      for (const signature of definition.signatures) {
        expect(signature.syntax, `${command} syntax`).toMatch(new RegExp(`^\\${command[0]}${command.slice(1)}`));
        expect(signature.snippet, `${command} snippet`).toMatch(new RegExp(`^\\${command[0]}${command.slice(1)}`));
        for (const parameter of signature.parameters) {
          expect(parameter.key, `${command} parameter key`).not.toBe("");
          expect(parameter.name, `${command} ${parameter.key} name`).not.toBe("");
          expect(parameter.documentation, `${command} ${parameter.key} docs`).not.toBe("");
          expect(parameter.choices.length, `${command} ${parameter.key} completions`).toBeGreaterThan(0);
          expect(parameter.slot, `${command} ${parameter.key} slot`).toBeGreaterThanOrEqual(0);
          expect(parameter.component, `${command} ${parameter.key} component`).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it("generates a valid default snippet for every documented command form", () => {
    for (const [command, definition] of Object.entries(zplCommandDefinitions)) {
      expect(zplSnippetsFor(command)).toHaveLength(definition.signatures.length);
      for (const signature of definition.signatures) {
        expect(validateZplParameters(snippetDefaults(signature.snippet)), `${command} ${signature.syntax}`).toEqual([]);
      }
    }
  });

  it("preserves literal syntax and exposes every multi-form RFID lock signature", () => {
    expect(zplSnippetsFor("^FN")).toEqual(['^FN${1:0}"${2:Name}"']);
    expect(zplSnippetsFor("^RL")).toEqual([
      "^RLP",
      "^RLB,${1:0},${2:1}",
      "^RLM,${1:U},${2:U},${3:U},${4:U}",
    ]);
    expect(getZplCommandDefinition("^RL")?.signatures.map(({ syntax }) => syntax)).toEqual([
      "^RLP",
      "^RLB,s,n",
      "^RLM,k,a,e,u",
    ]);
  });

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

  it("resolves delimited, adjacent, literal-separated, and custom-delimiter parameters", () => {
    const fieldOrigin = "^FO10,20,0";
    expect(findZplParameterContext(fieldOrigin, fieldOrigin.indexOf("10") + 1)?.parameter.key).toBe("x");
    expect(findZplParameterContext(fieldOrigin, fieldOrigin.indexOf("20") + 1)?.parameter.key).toBe("y");
    expect(findZplParameterContext(fieldOrigin, fieldOrigin.length)?.parameter.key).toBe("z");

    expect(findZplParameterContext("^A0", 3)?.parameter.key).toBe("o");
    expect(findZplParameterContext("^A0N,30,30", 5)?.parameter.key).toBe("h");
    const beforeFollowingCommand = "^XA\n^FW\n^XZ";
    const contextBeforeFollowingCommand = findZplParameterContext(
      beforeFollowingCommand,
      beforeFollowingCommand.indexOf("^FW") + 3,
    );
    expect(contextBeforeFollowingCommand?.parameter.key).toBe("r");
    expect(contextBeforeFollowingCommand?.span).toEqual({ start: 7, end: 7 });

    const storedFormat = "^DFR:FORM.ZPL";
    expect(findZplParameterContext(storedFormat, 4)?.parameter.key).toBe("d");
    expect(findZplParameterContext(storedFormat, 5)?.parameter.key).toBe("o");
    expect(findZplParameterContext(storedFormat, 10)?.parameter.key).toBe("x");

    const customDelimiter = "^CD;^FO10;20;0";
    expect(findZplParameterContext(customDelimiter, customDelimiter.indexOf("20") + 1)?.parameter.key).toBe("y");
  });

  it("keeps commas inside field data and field variables in one recognized payload", () => {
    for (const source of ["^FDQA,https://example.com", "^FVone,two,three"]) {
      const payloadStart = 3;
      const context = findZplParameterContext(source, source.lastIndexOf(",") + 2);
      expect(context?.parameterIndex).toBe(0);
      expect(context?.parameter.key).toBe("a");
      expect(context?.value).toBe(source.slice(payloadStart));
      expect(context?.span).toEqual({ start: payloadStart, end: source.length });
    }
  });

  it("diagnoses invalid, out-of-range, missing, and extra parameter values", () => {
    expect(validateZplParameters("^FWX")).toMatchObject([{ code: "INVALID_PARAMETER_VALUE", parameter: "rotate field" }]);
    expect(validateZplParameters("^FO40000,0")).toMatchObject([{ code: "PARAMETER_OUT_OF_RANGE" }]);
    expect(validateZplParameters("^JB")).toMatchObject([{ code: "MISSING_REQUIRED_PARAMETER" }]);
    expect(validateZplParameters("^FO1,2,0,4")).toMatchObject([{ code: "EXTRA_PARAMETER" }]);
    expect(validateZplParameters("^A0N,30,30")).toEqual([]);
    expect(validateZplParameters("^CI28")).toEqual([]);
  });
});
