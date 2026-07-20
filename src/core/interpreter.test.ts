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

  it("decodes FH byte sequences for CI0, CI27, and UTF-8 CI28", () => {
    const result = layout(
      "^XA^CI0^FO0,0^FH^FD_82^FS" +
        "^CI27^FO0,10^FH^FD_80^FS" +
        "^CI28^FO0,20^FH^FD_C3_A9^FS^XZ"
    );
    expect(
      result.fields.map((field) =>
        field.kind === "text" ? field.data : undefined
      )
    ).toEqual(["é", "€", "é"]);

    const invalid = layout("^XA^CI28^FO0,0^FH^FD_C3^FS^XZ");
    expect(invalid.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "INVALID_ENCODED_FIELD_DATA",
        severity: "error",
      })
    );
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

  it("supports documented Code 128 modes and QR Model 1", () => {
    const result = layout("^XA^FO0,0^BCN,40,Y,N,N,U^FD123^FS^XZ");
    expect(result.fields).toHaveLength(1);
    expect(result.fields[0]).toMatchObject({ symbology: "BC", mode: "U" });
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain(
      "UNSUPPORTED_CODE128_MODE"
    );

    const qr = layout("^XA^FO0,0^BQN,1,3,Q,7^FDQA,HELLO^FS^XZ");
    expect(qr.fields).toHaveLength(1);
    expect(qr.fields[0]).toMatchObject({
      symbology: "BQ",
      model: "1",
      data: "HELLO",
    });
    expect(qr.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain(
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

    const pdf417 = layout("^XA^BY4,3,72^FO0,0^B7N^FDABC^FS^XZ");
    expect(pdf417.fields[0]).toMatchObject({
      symbology: "B7",
      moduleWidth: 4,
      height: 1,
      overallHeight: 72,
      encoderOptions: { eclevel: 0, rowmult: 1 },
    });

    expect(layout("^XA^BY1^FO0,0^B7N,4,0,6,8,N^FDABC^FS^XZ").fields[0]).toMatchObject({
      symbology: "B7",
      moduleWidth: 1,
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

  it("creates a Code 49 field for the formerly unsupported B4 selector", () => {
    const result = layout("^XA^FO0,0^B4N^FDNOT TEXT^FS^XZ");
    expect(result.fields).toHaveLength(1);
    expect(result.fields[0]).toMatchObject({
      kind: "barcode",
      symbology: "B4",
      encoder: "code49",
    });
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain(
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

    const mixed = layout(
      "^XA^FO0,0^BQN,2,3,Q,7^FDD03040C,QM," +
        "N0123456789,A12AABB,B0006qrcode^FS^XZ"
    );
    expect(mixed.fields).toHaveLength(1);
    expect(mixed.fields[0]).toMatchObject({
      symbology: "BQ",
      data: "012345678912AABBqrcode",
      structuredAppend: { index: 2, total: 4, parity: 12 },
      segments: [
        { mode: "N", data: "0123456789" },
        { mode: "A", data: "12AABB" },
        { mode: "B", data: "qrcode" },
      ],
    });
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

  it("warns when substituting an unknown text or interpretation font", () => {
    const result = layout(
      "^XA^FO0,0^AWN,12,6^FDText^FS" +
        "^FO0,20^AWN,12,6^B3N,N,20,Y,N^FD123^FS^XZ"
    );
    expect(
      result.diagnostics.filter(
        (diagnostic) => diagnostic.code === "FONT_SUBSTITUTED"
      )
    ).toHaveLength(2);
  });

  it("uses density-aware resident bitmap cells and integer magnification", () => {
    const source =
      "^XA" +
      ["A", "B", "C", "D", "E", "F", "G", "H", "P", "Q", "R", "S", "T", "U", "V"]
        .map((key, index) => `^FO0,${index}^A${key}N^FDX^FS`)
        .join("") +
      "^FO0,20^ABN,22,14^FDX^FS^XZ";
    const document = parseDocument(source);
    const result = interpretLabel(document.labels[0], { dpi: 200 });
    expect(
      result.fields.map((field) =>
        field.kind === "text"
          ? [field.font.key, field.font.height, field.font.width]
          : undefined
      )
    ).toEqual([
      ["A", 9, 5],
      ["B", 11, 7],
      ["C", 18, 10],
      ["D", 18, 10],
      ["E", 28, 15],
      ["F", 26, 13],
      ["G", 60, 40],
      ["H", 21, 13],
      ["P", 20, 18],
      ["Q", 28, 24],
      ["R", 35, 31],
      ["S", 40, 35],
      ["T", 48, 42],
      ["U", 59, 53],
      ["V", 80, 71],
      ["B", 22, 14],
    ]);
    expect(result.diagnostics.map(({ code }) => code)).not.toContain(
      "FONT_SUBSTITUTED"
    );

    const sixDpmm = interpretLabel(document.labels[0], { dpi: 150 });
    const twelveDpmm = interpretLabel(document.labels[0], { dpi: 300 });
    expect((sixDpmm.fields[4] as TextLayoutField).font).toMatchObject({
      key: "E",
      height: 21,
      width: 10,
    });
    expect((twelveDpmm.fields[4] as TextLayoutField).font).toMatchObject({
      key: "E",
      height: 42,
      width: 20,
    });
    expect((sixDpmm.fields[7] as TextLayoutField).font).toMatchObject({
      key: "H",
      height: 17,
      width: 11,
    });
    expect((twelveDpmm.fields[7] as TextLayoutField).font).toMatchObject({
      key: "H",
      height: 34,
      width: 22,
    });
  });

  it("carries ^A@ font names and falls back to ^CF before one is selected", () => {
    const carried = layout(
      "^XA^FO0,0^A@N,20,10,R:ONE.TTF^FDOne^FS" +
        "^FO0,20^A@N,30,15,^FDTwo^FS^XZ"
    );
    expect((carried.fields[0] as TextLayoutField).font).toMatchObject({
      key: "@",
      name: "R:ONE.TTF",
      height: 20,
      width: 10,
    });
    expect((carried.fields[1] as TextLayoutField).font).toMatchObject({
      key: "@",
      name: "R:ONE.TTF",
      height: 30,
      width: 15,
    });

    const fallback = layout("^XA^CFB^FO0,0^A@N,,,^FDDefault^FS^XZ");
    expect((fallback.fields[0] as TextLayoutField).font).toMatchObject({
      key: "B",
      height: 11,
      width: 7,
    });
  });

  it("tracks reserved CI state for following fields", () => {
    const result = layout(
      "^XA^FO0,0^FDbefore^FS^CI18^FO0,20^FDafter^FS^XZ"
    );
    expect(
      result.diagnostics.filter(
        (diagnostic) => diagnostic.code === "UNSUPPORTED_CHARACTER_SET"
      )
    ).toHaveLength(1);
  });
});
