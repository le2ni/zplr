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
    target: "node22",
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
    // Keep the package build within its documented budget while allowing the
    // consumer's browser bundler to deduplicate declared dependencies.
    deps: {
      alwaysBundle: ["qrcode", "dijkstrajs"],
      onlyBundle: ["qrcode", "dijkstrajs"],
    },
  }),
];
