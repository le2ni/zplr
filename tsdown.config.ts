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
    // Keep native modules external
    external: ["skia-canvas"],
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
    noExternal: ["qrcode", "jsbarcode"],
  }),
];
