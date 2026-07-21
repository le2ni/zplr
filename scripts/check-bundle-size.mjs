import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { readFile, readdir } from "node:fs/promises";
import { basename, resolve } from "node:path";

const kib = 1024;
async function gzipSize(path) {
  return gzipSync(await readFile(path), { level: 9 }).byteLength;
}
function within(label, size, limit) {
  assert.ok(size <= limit, `${label} is ${(size / kib).toFixed(1)} KiB gzip; budget is ${limit / kib} KiB.`);
  console.log(`${label}: ${(size / kib).toFixed(1)} / ${limit / kib} KiB gzip`);
}

within("Node library", await gzipSize(resolve("dist/index.node.js")), 225 * kib);
within("Web library", await gzipSize(resolve("dist/index.web.js")), 260 * kib);

const html = await readFile(resolve("dist-playground/index.html"), "utf8");
const assets = await readdir(resolve("dist-playground/assets"));
const initialScripts = [...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)]
  .map((match) => resolve("dist-playground", match[1].replace(/^\//, "")));
assert.ok(initialScripts.length > 0, "The playground has no initial JavaScript entry.");
const rendererChunks = assets
  .filter((name) => /^index\.web-[^.]+\.js$/.test(name))
  .map((name) => resolve("dist-playground/assets", name));
assert.ok(
  rendererChunks.length > 0,
  "The renderer was not emitted as a separately measurable startup chunk."
);
const startupScripts = [...new Set([...initialScripts, ...rendererChunks])];
const startupSize = (await Promise.all(startupScripts.map(gzipSize))).reduce(
  (sum, size) => sum + size,
  0
);
within("Pre-interaction playground JavaScript", startupSize, 650 * kib);

const monacoChunks = assets.filter((name) => /MonacoEditor|monaco/i.test(name) && name.endsWith(".js"));
assert.ok(monacoChunks.length > 0, "Monaco was not emitted as an asynchronous chunk.");
for (const chunk of monacoChunks) {
  assert.equal(html.includes(basename(chunk)), false, `Monaco chunk ${chunk} is loaded initially.`);
}

const webOutput = await readFile(resolve("dist/index.web.js"), "utf8");
const webTypes = await readFile(resolve("dist/index.web.d.ts"), "utf8");
assert.equal(webOutput.includes("skia-canvas"), false, "Web JavaScript resolves skia-canvas.");
assert.equal(webTypes.includes("skia-canvas"), false, "Web declarations resolve skia-canvas.");
console.log(`Monaco is asynchronous (${monacoChunks.join(", ")}).`);
