import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import packageJson from "../package.json" with { type: "json" };

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(repositoryRoot, ".output", "public");
const captureDirectory = path.resolve(process.env.ZPLR_SCREENSHOT_DIR ?? path.join(repositoryRoot, ".screenshots", "current"));
const expectedRunId = process.env.ZPLR_SCREENSHOT_RUN_ID;
const expectedCommit = process.env.ZPLR_COMMIT_SHA ?? process.env.GITHUB_SHA ?? "unknown";
const canonicalOrigin = "https://zplr.de";
const expectedScreenshots = {
  "zpl-editor-overview.png": [1440, 900],
  "zpl-editor-overview-dark.png": [1440, 900],
  "zpl-visual-designer.png": [1440, 900],
  "zpl-visual-designer-dark.png": [1440, 900],
  "zpl-variable-data.png": [1440, 900],
  "zpl-variable-data-dark.png": [1440, 900],
  "zpl-editor-social.png": [1200, 630],
  "zpl-editor-social-dark.png": [1200, 630],
};

assert.ok(expectedRunId, "ZPLR_SCREENSHOT_RUN_ID is required");
await stat(outputDirectory);
const screenshotManifest = JSON.parse(await readFile(path.join(captureDirectory, "manifest.json"), "utf8"));
assert.equal(screenshotManifest.version, 1);
assert.equal(screenshotManifest.source, "captured");
assert.equal(screenshotManifest.runId, expectedRunId, "screenshot manifest came from another build run");
assert.equal(screenshotManifest.commit, expectedCommit, "screenshot manifest came from another commit");
assert.deepEqual(
  Object.keys(screenshotManifest.files ?? {}).sort(),
  Object.keys(expectedScreenshots).sort(),
  "screenshot manifest contains an unexpected file set",
);

const deployedScreenshotDirectory = path.join(outputDirectory, "screenshots");
await rm(deployedScreenshotDirectory, { recursive: true, force: true });
await mkdir(deployedScreenshotDirectory, { recursive: true });
for (const [filename, [width, height]] of Object.entries(expectedScreenshots)) {
  const sourcePath = path.join(captureDirectory, filename);
  const bytes = await readFile(sourcePath);
  const dimensions = pngDimensions(bytes);
  const colorScheme = filename.endsWith("-dark.png") ? "dark" : "light";
  assert.deepEqual(dimensions, { width, height }, `${filename} has unexpected dimensions`);
  assert.ok(bytes.byteLength > 10_000, `${filename} is unexpectedly small`);
  assert.equal(screenshotManifest.files?.[filename]?.width, width, `${filename} manifest width is incorrect`);
  assert.equal(screenshotManifest.files?.[filename]?.height, height, `${filename} manifest height is incorrect`);
  assert.equal(screenshotManifest.files?.[filename]?.colorScheme, colorScheme, `${filename} manifest color scheme is incorrect`);
  assert.equal(screenshotManifest.files?.[filename]?.bytes, bytes.byteLength, `${filename} manifest byte count is incorrect`);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    screenshotManifest.files?.[filename]?.sha256,
    `${filename} does not match the current capture manifest`,
  );
  await cp(sourcePath, path.join(deployedScreenshotDirectory, filename));
}
await writeFile(
  path.join(deployedScreenshotDirectory, "manifest.json"),
  `${JSON.stringify(screenshotManifest, null, 2)}\n`,
);

const versionManifest = {
  name: packageJson.name,
  version: packageJson.version,
  commit: expectedCommit,
  api: "0.3.0",
  profile: "zpl-ii-2025",
  screenshots: {
    source: screenshotManifest.source,
    runId: screenshotManifest.runId,
    manifest: "/screenshots/manifest.json",
  },
};
await writeFile(path.join(outputDirectory, "version.json"), `${JSON.stringify(versionManifest, null, 2)}\n`);
await writeFile(path.join(outputDirectory, "deployment.json"), `${JSON.stringify({
  mode: "static",
  serverRequired: false,
  outputDirectory: ".output/public",
  commit: expectedCommit,
  screenshotRunId: expectedRunId,
}, null, 2)}\n`);
await writeFile(path.join(outputDirectory, "robots.txt"), [
  "User-agent: *",
  "Allow: /",
  "",
  `Sitemap: ${canonicalOrigin}/sitemap.xml`,
  "",
].join("\n"));
await writeFile(path.join(outputDirectory, "sitemap.xml"), [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  "  <url>",
  `    <loc>${canonicalOrigin}/</loc>`,
  "  </url>",
  "</urlset>",
  "",
].join("\n"));

const htmlFiles = await findFiles(outputDirectory, (filename) => filename.endsWith(".html"));
assert.ok(htmlFiles.some((filename) => filename.endsWith("index.html")), "generated index.html is missing");
assert.ok(htmlFiles.some((filename) => filename.endsWith("editor.html")), "generated editor.html is missing");
assert.equal(await fileExists(path.join(outputDirectory, "404.html")), true, "generated 404.html is missing");
const inlineScriptHashes = new Set();
for (const htmlFile of htmlFiles) {
  const html = await readFile(htmlFile, "utf8");
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attributes = match[1] ?? "";
    const contents = match[2] ?? "";
    if (/\bsrc\s*=/i.test(attributes) || isDataScript(attributes) || !contents.trim()) continue;
    inlineScriptHashes.add(`'sha256-${createHash("sha256").update(contents).digest("base64")}'`);
  }
}

const headerTemplate = await readFile(path.join(repositoryRoot, "public", "_headers"), "utf8");
const scriptDirective = `script-src 'self'${inlineScriptHashes.size ? ` ${[...inlineScriptHashes].sort().join(" ")}` : ""}`;
assert.match(headerTemplate, /script-src 'self'[^;]*/);
await writeFile(
  path.join(outputDirectory, "_headers"),
  headerTemplate.replace(/script-src 'self'[^;]*/, scriptDirective),
);

const indexHtml = await readFile(path.join(outputDirectory, "index.html"), "utf8");
assert.match(indexHtml, /Free Online ZPL Editor, Viewer &amp; Visual Designer/);
assert.match(indexHtml, /rel="canonical" href="https:\/\/zplr\.de\/"/);
assert.match(indexHtml, /application\/ld\+json/);
assert.match(indexHtml, /Node\.js ZPL renderer/);
assert.match(indexHtml, /media="\(prefers-color-scheme: dark\)" srcset="\/screenshots\/zpl-editor-overview-dark\.png"/);
const editorHtml = await readFile(path.join(outputDirectory, "editor.html"), "utf8");
assert.match(editorHtml, /noindex, follow/);
assert.match(editorHtml, /Opening the local ZPL editor/);
assert.equal(await fileExists(path.join(outputDirectory, "_worker.js")), false, "static output must not contain a Pages Worker");

console.log(
  `Finalized static web build for ${expectedCommit} with ${Object.keys(expectedScreenshots).length} current screenshots and ${inlineScriptHashes.size} CSP script hashes.`,
);

function pngDimensions(bytes) {
  assert.equal(bytes.subarray(1, 4).toString("ascii"), "PNG", "file is not a PNG");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function isDataScript(attributes) {
  const type = attributes.match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
  return type === "application/json" || type === "application/ld+json";
}

async function findFiles(directory, predicate) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...await findFiles(entryPath, predicate));
    else if (predicate(entry.name)) found.push(entryPath);
  }
  return found;
}

async function fileExists(filename) {
  try {
    await stat(filename);
    return true;
  } catch {
    return false;
  }
}
