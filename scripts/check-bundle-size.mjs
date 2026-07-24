import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { readFile, readdir } from "node:fs/promises";
import { basename, resolve } from "node:path";

const kib = 1024;
const libraryOnly = process.argv.includes("--library-only");
async function gzipSize(path) {
  return gzipSync(await readFile(path), { level: 9 }).byteLength;
}
function within(label, size, limit) {
  assert.ok(size <= limit, `${label} is ${(size / kib).toFixed(1)} KiB gzip; budget is ${limit / kib} KiB.`);
  console.log(`${label}: ${(size / kib).toFixed(1)} / ${limit / kib} KiB gzip`);
}

within("Node library", await gzipSize(resolve("dist/index.node.js")), 225 * kib);
within("Web library", await gzipSize(resolve("dist/index.web.js")), 260 * kib);

const webOutput = await readFile(resolve("dist/index.web.js"), "utf8");
const webTypes = await readFile(resolve("dist/index.web.d.ts"), "utf8");
assert.equal(webOutput.includes("skia-canvas"), false, "Web JavaScript resolves skia-canvas.");
assert.equal(webTypes.includes("skia-canvas"), false, "Web declarations resolve skia-canvas.");
if (!libraryOnly) {
  const publicDirectory = resolve(".output/public");
  const assetDirectory = resolve(publicDirectory, "_nuxt");
  const html = await readFile(resolve(publicDirectory, "index.html"), "utf8");
  const assets = await readdir(assetDirectory);
  const initialScripts = [
    ...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g),
    ...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+\.js)"/g),
  ].map((match) => resolve(publicDirectory, match[1].replace(/^\//, "")));
  assert.ok(initialScripts.length > 0, "The prerendered landing page has no JavaScript entry.");
  const startupScripts = [...new Set(initialScripts)];
  const startupSize = (await Promise.all(startupScripts.map(gzipSize))).reduce(
    (sum, size) => sum + size,
    0
  );
  within("Prerendered landing JavaScript", startupSize, 180 * kib);

  const editorChunks = [];
  for (const name of assets.filter((name) => name.endsWith(".js"))) {
    const filename = resolve(assetDirectory, name);
    if ((await readFile(filename)).byteLength >= 1_000_000) editorChunks.push(filename);
  }
  assert.ok(editorChunks.length > 0, "The editor did not emit a separately measurable asynchronous chunk.");
  for (const chunk of editorChunks) {
    assert.equal(html.includes(basename(chunk)), false, `Editor chunk ${basename(chunk)} is loaded on the landing page.`);
  }
  console.log(`Large editor code remains asynchronous (${editorChunks.map((chunk) => basename(chunk)).join(", ")}).`);
}
