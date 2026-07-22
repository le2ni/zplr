import { describe, expect, it } from "vitest";
import {
  collectZplFieldBindings,
  fieldValuesForVariableData,
  importVariableDataset,
  normalizeVariableData,
  parseVariableCsv,
  sourceEditForVariableBinding,
} from "./variableData";
import { collectVisualFields } from "./visualEditorSource";

describe("variable data", () => {
  it("parses quoted CSV cells and embedded newlines", () => {
    expect(parseVariableCsv('name,note\r\n"A, B","one\nline"\r\n')).toEqual([
      ["name", "note"],
      ["A, B", "one\nline"],
    ]);
  });

  it("imports JSON records and maps the active row to normalized field numbers", () => {
    const dataset = importVariableDataset('[{"sku":"001","price":12.5},{"sku":"002","price":15}]', "json", "Products");
    dataset.columns[0]!.fieldNumber = "001";
    const data = normalizeVariableData({ datasets: [dataset], activeDatasetId: dataset.id });
    expect(fieldValuesForVariableData(data)).toEqual({ "1": "001", "2": "12.5" });
  });

  it("recognizes prompt-bearing FN commands", () => {
    expect(collectZplFieldBindings('^XA^FO0,0^FN001"Customer name"^FDDefault^FS^XZ')).toMatchObject([
      { fieldNumber: "1", prompt: "Customer name", labelIndex: 0 },
    ]);
  });

  it("adds, changes, and removes a visual field binding", () => {
    const source = "^XA^PW100^LL40^FO1,2^A0N,12,8^FDHello^FS^XZ";
    const field = collectVisualFields(source, [{
      type: "text", x: 1, y: 2, width: 30, height: 12, sourceSpan: { start: source.indexOf("^FO"), end: source.indexOf("^XZ") },
    }])[0]!;
    const add = sourceEditForVariableBinding(source, field, "007", "Name")!;
    const bound = `${source.slice(0, add.start)}${add.text}${source.slice(add.end)}`;
    expect(bound).toContain('^FN7"Name"^FDHello');

    const boundField = collectVisualFields(bound, [{
      type: "text", x: 1, y: 2, width: 30, height: 12, sourceSpan: { start: bound.indexOf("^FO"), end: bound.indexOf("^XZ") },
    }])[0]!;
    const remove = sourceEditForVariableBinding(bound, boundField)!;
    expect(`${bound.slice(0, remove.start)}${remove.text}${bound.slice(remove.end)}`).not.toContain("^FN");
  });
});
