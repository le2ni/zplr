import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Canvas } from "skia-canvas";
import {
  parseDocument,
  renderDocument as renderNodeDocument,
} from "@/index.node";
import { renderDocument as renderWebDocument } from "@/index.web";

describe("Node and browser adapters", () => {
  const originalDocument = globalThis.document;

  beforeEach(() => {
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        createElement: (name: string) => {
          if (name !== "canvas") throw new Error(`Unexpected element ${name}.`);
          return new Canvas(300, 150);
        },
      },
    });
  });

  afterEach(() => {
    if (originalDocument === undefined) {
      Reflect.deleteProperty(globalThis, "document");
    } else {
      Object.defineProperty(globalThis, "document", {
        configurable: true,
        value: originalDocument,
      });
    }
  });

  it("returns identical geometry and highlight regions", async () => {
    const document = parseDocument(
      "^XA^CF0,12,6^FO5,5^FB60,2,2,C^FDNode and web^FS" +
        "^FO5,40^GB30,20,2,B,2^FS" +
        "^FO50,40^BY2,2,20^B3N,Y,20,N,N^FD123^FS" +
        "^FO130,40^BQN,2,2,Q,7^FDQA,QR^FS^XZ"
    );
    const [nodeResult] = await renderNodeDocument(document, {
      width: 220,
      height: 120,
    });
    const [webResult] = await renderWebDocument(document, {
      width: 220,
      height: 120,
    });

    expect(webResult.diagnostics).toEqual(nodeResult.diagnostics);
    expect(webResult.highlightRegions).toEqual(nodeResult.highlightRegions);
  });
});
