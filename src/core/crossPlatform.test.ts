import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Canvas } from "skia-canvas";
import {
  createRenderSession as createNodeSession,
  parseDocument,
} from "@/index.node";
import { createRenderSession as createWebSession } from "@/index.web";

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

  it("returns bit-identical rasters, RGBA pixels, diagnostics, and geometry", async () => {
    const document = parseDocument(
      "^XA^CF0,12,6^FO5,5^FB60,2,2,C^FDNode and web^FS" +
        "^FO5,40^GB30,20,2,B,2^FS" +
        "^FO50,40^BY2,2,20^B3N,Y,20,N,N^FD123^FS" +
        "^FO130,40^BQN,2,2,Q,7^FDQA,QR^FS^XZ"
    );
    const [nodeResult] = (
      await createNodeSession({ width: 220, height: 120 }).renderDocument(document)
    ).labels;
    const [webResult] = (
      await createWebSession({ width: 220, height: 120 }).renderDocument(document)
    ).labels;

    expect(webResult.diagnostics).toEqual(nodeResult.diagnostics);
    expect(webResult.highlightRegions).toEqual(nodeResult.highlightRegions);
    expect(webResult.raster).toEqual(nodeResult.raster);

    const nodePixels = nodeResult.canvas
      .getContext("2d")!
      .getImageData(0, 0, nodeResult.width, nodeResult.height).data;
    const webPixels = webResult.canvas
      .getContext("2d")!
      .getImageData(0, 0, webResult.width, webResult.height).data;
    expect(webPixels).toEqual(nodePixels);
    for (let index = 0; index < nodePixels.length; index += 4) {
      expect([0, 255]).toContain(nodePixels[index]);
      expect(nodePixels[index + 1]).toBe(nodePixels[index]);
      expect(nodePixels[index + 2]).toBe(nodePixels[index]);
      expect(nodePixels[index + 3]).toBe(255);
    }
  });

  it("keeps new typeset, density, and combining-cluster behavior identical", async () => {
    const source = "^XA^CI28^PW90^LL60^JMB^FT10,20^A0N,12,8^FPH,2^FDa\u0301B^FS" +
      "^FT^A0N,12,8^FD09e\u0301^SFdd%,1%^FS^PQ2^XZ";
    const node = await createNodeSession().render(source);
    const web = await createWebSession().render(source);
    for (let index = 0; index < node.labels.length; index++) {
      expect(web.labels[index].raster).toEqual(node.labels[index].raster);
      expect(web.labels[index].highlightRegions).toEqual(node.labels[index].highlightRegions);
      expect(web.labels[index].diagnostics).toEqual(node.labels[index].diagnostics);
    }
  });
});
