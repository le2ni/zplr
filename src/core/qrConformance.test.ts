import { describe, expect, it } from "vitest";
import type { QrLayoutField } from "@/types/LabelLayout";
import { parseDocument } from "./documentParser";
import { interpretLabel } from "./interpreter";
import {
  encodeLegacyQrModel1,
  encodeLegacyQrModel1WithMask,
} from "./legacyQrModel1";
import { encodeQrModel2, encodeQrModel2WithMask } from "./qrModel2";

function qrField(zpl: string): QrLayoutField {
  const field = interpretLabel(parseDocument(zpl).labels[0]).fields[0];
  if (field?.kind !== "barcode" || field.symbology !== "BQ") {
    throw new Error("Fixture did not produce a QR field.");
  }
  return field;
}

function fnv1a(modules: Uint8Array): number {
  let hash = 2166136261;
  for (const module of modules) hash = Math.imul(hash ^ module, 16777619);
  return hash >>> 0;
}

describe("printer-conformant QR encoding", () => {
  it.each([
    ["A", 7, 1, 0x0de1b506],
    ["HELLO", 1, 1, 0x03a17b34],
    ["1234567890", 0, 1, 0xa2089ec0],
    ["ABCDEFGHIJK", 6, 1, 0xa0e11e0b],
    ["ABCDEFGHIJKLMNOPQRST", 4, 2, 0x02547646],
    ["012345678901234567890123456789", 0, 2, 0xe4a2a1c8],
  ] as const)(
    "matches the printer's QR Model 1 modules for %s",
    (data, mask, version, expectedHash) => {
      const field = qrField(
        `^XA^FO0,0^BQN,1,4,Q,0^FDQA,${data}^FS^XZ`
      );
      const symbol = encodeLegacyQrModel1WithMask(field, mask);
      expect(symbol).toMatchObject({ mask, version });
      expect(fnv1a(symbol.modules)).toBe(expectedHash);
    }
  );

  it("selects valid Model 1 versions and masks without honoring the ignored mask argument", () => {
    const one = qrField("^XA^FO0,0^BQN,1,4,Q,1^FDQA,HELLO QR^FS^XZ");
    const seven = qrField("^XA^FO0,0^BQN,1,4,Q,7^FDQA,HELLO QR^FS^XZ");
    expect(encodeLegacyQrModel1(one)).toEqual(encodeLegacyQrModel1(seven));
  });

  it.each([
    [
      "automatic",
      "^XA^FO0,0^BQN,2,4,Q,0^FDQA,HELLO QR^FS^XZ",
      0,
      1,
      0x92042ff5,
    ],
    [
      "mixed manual",
      "^XA^FO0,0^BQN,2,4,Q,0^FDQM,N0123456789,A12AABB,B0006qrcode^FS^XZ",
      7,
      2,
      0x63da8541,
    ],
    [
      "structured append",
      "^XA^FO0,0^BQN,2,4,Q,0^FDD03040C,QA,012345678912AABBqrcode^FS^XZ",
      0,
      2,
      0xbcd6f189,
    ],
  ] as const)(
    "matches the printer's QR Model 2 %s modules",
    (_name, zpl, mask, version, expectedHash) => {
      const symbol = encodeQrModel2(qrField(zpl));
      expect(symbol).toMatchObject({ mask, version });
      expect(fnv1a(symbol.modules)).toBe(expectedHash);
    }
  );

  it("encodes Shift-JIS Kanji mode exactly for a printer-selected mask", () => {
    const field = qrField(
      "^XA^CI15^FO0,0^BQN,2,4,Q,0^FH_^FDQM,K_93_FA_96_7B^FS^XZ"
    );
    expect(field).toMatchObject({
      data: "日本",
      characterMode: "K",
      segments: [{ mode: "K", data: "日本" }],
    });
    const symbol = encodeQrModel2WithMask(field, 1);
    expect(symbol).toMatchObject({ mask: 1, version: 1 });
    expect(fnv1a(symbol.modules)).toBe(0xc65c62c3);
  });
});
