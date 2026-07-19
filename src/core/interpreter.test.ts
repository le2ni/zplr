import { describe, expect, it } from "vitest";
import { parseDocument } from "./documentParser";
import { interpretLabel } from "./interpreter";
import { layoutTextLines } from "./layoutRenderer";
import { TextLayoutField } from "@/types/LabelLayout";

function layout(source: string) {
  const document = parseDocument(source);
  return interpretLabel(document.labels[0]);
}

describe("semantic interpreter", () => {
  it("separates persistent defaults from field-scoped font state", () => {
    const result = layout(
      "^XA^CF0,20,10^FO10,20^A0R,30,15^FDOne^FS^FO30,40^FDTwo^FS^XZ"
    );
    const fields = result.fields as TextLayoutField[];
    expect(fields).toHaveLength(2);
    expect(fields[0]).toMatchObject({
      x: 10,
      y: 20,
      orientation: "R",
      font: { key: "0", height: 30, width: 15, orientation: "R" },
    });
    expect(fields[1]).toMatchObject({
      x: 30,
      y: 40,
      orientation: "N",
      font: { key: "0", height: 20, width: 10, orientation: "N" },
    });
  });

  it("applies FW and LH to following fields", () => {
    const result = layout("^XA^LH5,7^FWR^FO10,20^FDX^FS^XZ");
    expect(result.fields[0]).toMatchObject({ x: 15, y: 27, orientation: "R" });
  });

  it("treats FR as field-wide and LR as persistent for following fields", () => {
    const result = layout(
      "^XA^FO0,0^FDnormal^FS^LRY^FO0,20^FDlabel^FS^LRN^FO0,40^FDfield^FR^FS^XZ"
    );
    expect(result.fields.map((field) => field.reverse)).toEqual([
      false,
      true,
      true,
    ]);
  });

  it("decodes every FH hexadecimal escape", () => {
    const result = layout("^XA^FO0,0^FH_^FDHello_20World_21^FS^XZ");
    expect(result.fields[0]).toMatchObject({ data: "Hello World!" });
  });

  it("lays out repeated field-block line breaks and hanging indents", () => {
    const result = layout(
      "^XA^CF0,10,5^FO0,0^FB25,5,0,L,5^FDAA\\&BB\\&CC^FS^XZ"
    );
    const lines = layoutTextLines(result.fields[0] as TextLayoutField);
    expect(lines.map((line) => line.text)).toEqual(["AA", "BB", "CC"]);
    expect(lines.map((line) => line.indent)).toEqual([0, 5, 5]);
  });

  it("hyphenates long words within a field block", () => {
    const result = layout(
      "^XA^CF0,10,5^FO0,0^FB25,3,0,L^FDABCDEFGHI^FS^XZ"
    );
    const lines = layoutTextLines(result.fields[0] as TextLayoutField);
    expect(lines.map((line) => line.text)).toEqual(["ABCD-", "EFGHI"]);
  });

  it("finalizes a missing FS without mutating source commands", () => {
    const result = layout("^XA^FO0,0^FDX^XZ");
    expect(result.fields).toHaveLength(1);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "UNTERMINATED_FIELD"
    );
  });

  it("reports unsupported barcode modes instead of approximating them", () => {
    const result = layout("^XA^FO0,0^BCN,40,Y,N,N,U^FD123^FS^XZ");
    expect(result.fields).toHaveLength(0);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "UNSUPPORTED_CODE128_MODE"
    );

    const qr = layout("^XA^FO0,0^BQN,1,3,Q,7^FDQA,HELLO^FS^XZ");
    expect(qr.fields).toHaveLength(0);
    expect(qr.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "UNSUPPORTED_QR_MODEL"
    );
  });

  it("resolves omitted barcode defaults and snapshots them at selection time", () => {
    const result = layout(
      "^XA^FO0,0^B3N,N,,N,N^FD1^BY5,2,99^FS" +
        "^FO0,40^B3N,N,,N,N^FD2^FS^XZ"
    );
    expect(result.fields[0]).toMatchObject({
      symbology: "B3",
      moduleWidth: 2,
      ratio: 3,
      height: 10,
    });
    expect(result.fields[1]).toMatchObject({
      symbology: "B3",
      moduleWidth: 5,
      ratio: 2,
      height: 99,
    });
  });

  it("does not apply later label defaults retroactively to an open field", () => {
    const result = layout(
      "^XA^FO0,0^FDOne^CF0,20,10^LRY^FS^FO0,30^FDTwo^FS^XZ"
    );
    expect(result.fields[0]).toMatchObject({
      reverse: false,
      font: { key: "A", height: 9, width: 5 },
    });
    expect(result.fields[1]).toMatchObject({
      reverse: true,
      font: { key: "0", height: 20, width: 10 },
    });
  });

  it("skips unsupported field selectors instead of rendering their data as text", () => {
    const result = layout("^XA^FO0,0^B4N^FDNOT TEXT^FS^XZ");
    expect(result.fields).toHaveLength(0);
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "UNSUPPORTED_FIELD_SELECTION"
    );
  });

  it("creates immutable layout fields without freezing the parsed document", () => {
    const document = parseDocument("^XA^FO0,0^FDX^FS^XZ");
    const result = interpretLabel(document.labels[0]);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.fields)).toBe(true);
    expect(Object.isFrozen(result.fields[0])).toBe(true);
    expect(Object.isFrozen(document.labels[0].commands[1].span)).toBe(false);
  });

  it("validates normal-mode QR manual character data", () => {
    const numeric = layout("^XA^FO0,0^BQN,2,3,Q,7^FDQM,N12A^FS^XZ");
    expect(numeric.fields).toHaveLength(0);
    expect(numeric.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "INVALID_QR_NUMERIC_DATA"
    );

    const bytes = layout("^XA^FO0,0^BQN,2,3,Q,7^FDQM,B0004HELLO^FS^XZ");
    expect(bytes.fields).toHaveLength(0);
    expect(bytes.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "INVALID_QR_BYTE_LENGTH"
    );
  });

  it("uses the profile DPI defaults for QR magnification and mask", () => {
    const document = parseDocument(
      "^XA^FO0,0^BQN,2,,,^FDQA,HELLO^FS^XZ"
    );
    expect(interpretLabel(document.labels[0]).fields[0]).toMatchObject({
      symbology: "BQ",
      magnification: 3,
      mask: 7,
    });
    expect(
      interpretLabel(document.labels[0], { dpi: 150 }).fields[0]
    ).toMatchObject({ magnification: 1 });
  });

  it("handles soft hyphens and maximum-line overflow without changing field data", () => {
    const result = layout(
      "^XA^CF0,10,5^FO0,0^FB25,2,0,L^FDAB\\xCDEFG HIJKLM^FS^XZ"
    );
    const field = result.fields[0] as TextLayoutField;
    expect(field.data).toBe("AB\\xCDEFG HIJKLM");
    const lines = layoutTextLines(field);
    expect(lines).toHaveLength(2);
    expect(lines[0].text).toBe("AB-");
    expect(lines[1].text).toBe("CDEFG");
    expect(lines[1].overprints?.map((line) => line.text)).toEqual([
      "HIJK-",
      "LM",
    ]);
  });

  it("resets every field-scoped selector while preserving label defaults", () => {
    const result = layout(
      "^XA^CF0,12,6" +
        "^FO1,2^A0R,20,10^FB40,2,1,C,3^FR^FDOne^FS" +
        "^FO3,4^FDTwo^FS" +
        "^FO5,6^B3N,N,20,N,N^FD123^FS" +
        "^FO7,8^FDThree^FS^XZ"
    );
    expect(result.fields[0]).toMatchObject({
      kind: "text",
      x: 1,
      y: 2,
      reverse: true,
      orientation: "R",
      block: { width: 40 },
    });
    expect(result.fields[1]).toMatchObject({
      kind: "text",
      x: 3,
      y: 4,
      reverse: false,
      orientation: "N",
      font: { key: "0", height: 12, width: 6 },
      block: undefined,
    });
    expect(result.fields[2]).toMatchObject({ kind: "barcode", symbology: "B3" });
    expect(result.fields[3]).toMatchObject({
      kind: "text",
      data: "Three",
      x: 7,
      y: 8,
    });
  });

  it("warns when substituting an unsupported text or interpretation font", () => {
    const result = layout(
      "^XA^FO0,0^ABN,12,6^FDText^FS" +
        "^FO0,20^ABN,12,6^B3N,N,20,Y,N^FD123^FS^XZ"
    );
    expect(
      result.diagnostics.filter(
        (diagnostic) => diagnostic.code === "FONT_SUBSTITUTED"
      )
    ).toHaveLength(2);
  });

  it("tracks unsupported CI state for following fields", () => {
    const result = layout(
      "^XA^FO0,0^FDbefore^FS^CI13^FO0,20^FDafter^FS^XZ"
    );
    expect(
      result.diagnostics.filter(
        (diagnostic) => diagnostic.code === "UNSUPPORTED_CHARACTER_SET"
      )
    ).toHaveLength(1);
  });
});
