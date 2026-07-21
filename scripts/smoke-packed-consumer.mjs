import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const temporary = mkdtempSync(join(tmpdir(), "zplr-packed-consumer-"));
const consumer = join(temporary, "consumer");
const packageDirectory = join(consumer, "node_modules", "zplr");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? process.cwd(),
    encoding: "utf8",
    env: { ...process.env, CI: "true" },
  });
  assert.equal(result.status, 0, `${command} ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

try {
  mkdirSync(packageDirectory, { recursive: true });
  const packed = JSON.parse(run("pnpm", ["pack", "--json", "--pack-destination", temporary]));
  run("tar", ["-xzf", packed.filename, "--strip-components=1", "-C", packageDirectory]);

  const pkg = JSON.parse(await import("node:fs/promises").then(({ readFile }) =>
    readFile(new URL("../package.json", import.meta.url), "utf8")
  ));
  for (const dependency of new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.peerDependencies ?? {}),
    "@types/node",
  ])) {
    const target = join(consumer, "node_modules", dependency);
    mkdirSync(dirname(target), { recursive: true });
    symlinkSync(resolve("node_modules", dependency), target, "junction");
  }

  writeFileSync(join(consumer, "package.json"), JSON.stringify({ private: true, type: "module" }));
  writeFileSync(join(consumer, "smoke.mjs"), `
    import assert from "node:assert/strict";
    import * as root from "zplr";
    import * as node from "zplr/node";
    import * as web from "zplr/web";
    assert.deepEqual(Object.keys(root), Object.keys(node));
    assert.equal(typeof web.renderZpl, "function");
    assert.equal(node.getCommandCapability("FO"), undefined);
    const source = "^XA^PW80^LL40^FO4,4^GB20,10,1^FS^XZ";
    const parsed = node.parseDocument(source);
    assert.equal(node.findCommandAtOffset(parsed, source.indexOf("GB") + 1)?.canonical, "^GB");
    const result = await root.renderZpl(source);
    assert.equal(result.labels.length, 1);
    assert.ok(result.labels[0].canvas);
    assert.ok(result.labels[0].highlightRegions.every((region) => region.sourceSpan));
    for (const removed of ["parse", "render", "renderDocument", "parseAndRender"]) {
      assert.equal(removed in root, false, removed + " leaked into the packed API");
    }
  `);
  run(process.execPath, ["smoke.mjs"], { cwd: consumer });

  writeFileSync(join(consumer, "types-node.ts"), `
    import { renderZpl, parseDocument, type RenderJobResult, type NodeCanvas } from "zplr";
    const parsed = parseDocument("^XA^XZ");
    const nodeJob: Promise<RenderJobResult<NodeCanvas>> = renderZpl(parsed.source);
    void nodeJob;
    // @ts-expect-error The 0.2 command-object parser was removed in 0.3.
    const removed = import("zplr").then((entry) => entry.parse);
    void removed;
  `);
  writeFileSync(join(consumer, "sharp.d.ts"), `
    declare module "sharp" { export interface Sharp {} }
  `);
  run(process.execPath, [
    resolve("node_modules/typescript/bin/tsc"), "--noEmit", "--strict",
    "--target", "ES2022", "--module", "ESNext", "--moduleResolution", "Bundler",
    "--lib", "ES2022", "--types", "node", "types-node.ts", "sharp.d.ts",
  ], { cwd: consumer });

  writeFileSync(join(consumer, "types-web.ts"), `
    import { renderZpl, type RenderJobResult } from "zplr/web";
    const webJob: Promise<RenderJobResult<HTMLCanvasElement>> = renderZpl("^XA^XZ");
    void webJob;
  `);
  run(process.execPath, [
    resolve("node_modules/typescript/bin/tsc"), "--noEmit", "--strict",
    "--target", "ES2022", "--module", "ESNext", "--moduleResolution", "Bundler",
    "--lib", "ES2022,DOM", "--types", "node", "types-web.ts",
  ], { cwd: consumer });
  console.log("Packed npm tarball passed runtime and TypeScript consumer checks.");
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
