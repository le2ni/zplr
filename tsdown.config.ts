import { defineConfig } from "tsdown";

export default [
  // Node.js build
  defineConfig({
    entry: ["src/index.node.ts"],
    format: ["esm"],
    dts: true,
    outDir: "dist",
    sourcemap: true,
    hash: false,
    clean: true,
    fixedExtension: false,
    // Keep native modules external
    deps: {
      neverBundle: ["skia-canvas"],
    },
    target: "node18",
  }),
  // Web/Browser build
  defineConfig({
    entry: ["src/index.web.ts"],
    format: ["esm"],
    dts: true,
    outDir: "dist",
    sourcemap: true,
    hash: false,
    platform: "browser",
    target: "es2020",
    // Bundle all dependencies for the browser
    deps: {
      alwaysBundle: ["qrcode", "jsbarcode"],
      onlyBundle: ["qrcode", "jsbarcode", "dijkstrajs"],
    },
  }),
];
