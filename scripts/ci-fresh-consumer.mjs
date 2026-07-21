import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const manager = process.argv[2];
assert.ok(manager === "npm" || manager === "pnpm", "Choose npm or pnpm.");
const requireRelease = process.argv.includes("--require-release");
const packageJson = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8")
);
const temporary = mkdtempSync(join(tmpdir(), `zplr-${manager}-consumer-`));
const consumer = join(temporary, "consumer");
mkdirSync(consumer);

function run(command, args, cwd = process.cwd()) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", env: { ...process.env, CI: "true" } });
  assert.equal(result.status, 0, `${command} ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

try {
  const packed = JSON.parse(run("pnpm", ["pack", "--json", "--pack-destination", temporary]));
  writeFileSync(join(consumer, "package.json"), JSON.stringify({ private: true, type: "module" }));
  const installArgs = manager === "npm"
    ? ["install", packed.filename, "skia-canvas", "typescript", "@types/node"]
    : ["add", packed.filename, "skia-canvas", "typescript", "@types/node"];
  run(manager, installArgs, consumer);

  if (requireRelease) {
    assert.match(
      process.env.GITHUB_SHA ?? "",
      /^[0-9a-f]{40}$/i,
      "--require-release needs the full GITHUB_SHA."
    );
    const release = JSON.parse(
      readFileSync(
        join(consumer, "node_modules", packageJson.name, "dist", "release.json"),
        "utf8"
      )
    );
    assert.deepEqual(release, {
      name: packageJson.name,
      version: packageJson.version,
      gitCommit: process.env.GITHUB_SHA,
    });
  }

  writeFileSync(join(consumer, "smoke.mjs"), `
    import assert from "node:assert/strict";
    import { renderZpl, findCommandAtOffset, parseDocument } from "zplr";
    import * as web from "zplr/web";
    const source = "^XA^PW64^LL32^FO2,2^GB12,8,1^FS^XZ";
    assert.equal(findCommandAtOffset(parseDocument(source), source.indexOf("GB") + 1)?.canonical, "^GB");
    const result = await renderZpl(source);
    assert.equal(result.labels[0].canvas.width, 64);
    assert.equal(typeof web.renderZpl, "function");
  `);
  run(process.execPath, ["smoke.mjs"], consumer);

  writeFileSync(join(consumer, "types-node.ts"), `
    import { renderZpl, type NodeCanvas, type RenderJobResult } from "zplr";
    const nodeResult: Promise<RenderJobResult<NodeCanvas>> = renderZpl("^XA^XZ");
    void nodeResult;
  `);
  // skia-canvas exposes an optional toSharp() return type without declaring
  // sharp as a dependency. Isolate that upstream issue so this check can keep
  // declaration checking enabled and detect accidental DOM globals.
  writeFileSync(join(consumer, "sharp.d.ts"), `
    declare module "sharp" { export interface Sharp {} }
  `);
  run(process.execPath, [
    resolve(consumer, "node_modules/typescript/bin/tsc"), "--noEmit", "--strict",
    "--target", "ES2022", "--module", "ESNext", "--moduleResolution", "Bundler",
    "--lib", "ES2022", "--types", "node", "types-node.ts", "sharp.d.ts",
  ], consumer);

  writeFileSync(join(consumer, "types-web.ts"), `
    import { renderZpl as renderWeb, type RenderJobResult } from "zplr/web";
    const webResult: Promise<RenderJobResult<HTMLCanvasElement>> = renderWeb("^XA^XZ");
    void webResult;
  `);
  run(process.execPath, [
    resolve(consumer, "node_modules/typescript/bin/tsc"), "--noEmit", "--strict",
    "--target", "ES2022", "--module", "ESNext", "--moduleResolution", "Bundler",
    "--lib", "ES2022,DOM", "--types", "node", "types-web.ts",
  ], consumer);
  console.log(`${manager} fresh tarball consumer passed runtime and TypeScript resolution.`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
