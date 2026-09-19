import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import packageJson from "../package.json" with { type: "json" };
import { assertIndexableHtml } from "./seo-assertions.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = path.join(repositoryRoot, ".output", "public");
const captureDirectory = path.resolve(process.env.ZPLR_SCREENSHOT_DIR ?? path.join(repositoryRoot, ".screenshots", "current"));
const expectedRunId = process.env.ZPLR_SCREENSHOT_RUN_ID;
const expectedCommit = process.env.ZPLR_COMMIT_SHA ?? process.env.GITHUB_SHA ?? "unknown";
const canonicalOrigin = "https://zplr.de";
const expectedScreenshots = {
  "zpl-editor-overview.png": [1440, 900],
  "zpl-editor-overview-dark.png": [1440, 900],
  "zpl-live-preview.png": [1384, 1376],
  "zpl-live-preview-dark.png": [1384, 1376],
  "zpl-visual-designer.png": [1384, 1640],
  "zpl-visual-designer-dark.png": [1384, 1640],
  "zpl-variable-data.png": [2432, 720],
  "zpl-variable-data-dark.png": [2432, 720],
  "zpl-editor-social.png": [1200, 630],
  "zpl-editor-social-dark.png": [1200, 630],
};
const staticScreenshotAssets = {
  "zpl-label-preview.png": [600, 800],
};
const expectedFaviconPngs = {
  "favicon-96x96.png": [96, 96],
  "apple-touch-icon.png": [180, 180],
};
const expectedPwaIcons = {
  "pwa/icon-192.png": [192, 192],
  "pwa/icon-512.png": [512, 512],
  "pwa/icon-192-maskable.png": [192, 192],
  "pwa/icon-512-maskable.png": [512, 512],
};

assert.ok(expectedRunId, "ZPLR_SCREENSHOT_RUN_ID is required");
await stat(outputDirectory);
for (const [filename, [width, height]] of Object.entries(expectedFaviconPngs)) {
  const bytes = await readFile(path.join(outputDirectory, filename));
  assert.deepEqual(pngDimensions(bytes), { width, height }, `${filename} has unexpected dimensions`);
}
for (const [filename, [width, height]] of Object.entries(expectedPwaIcons)) {
  const bytes = await readFile(path.join(outputDirectory, filename));
  assert.deepEqual(pngDimensions(bytes), { width, height }, `${filename} has unexpected dimensions`);
}
const documentationSocialImage = await readFile(path.join(outputDirectory, "og.png"));
assert.deepEqual(
  pngDimensions(documentationSocialImage),
  { width: 1200, height: 630 },
  "og.png has unexpected dimensions",
);
const faviconIco = await readFile(path.join(outputDirectory, "favicon.ico"));
assert.equal(faviconIco.subarray(0, 6).toString("hex"), "000001000100", "favicon.ico has an invalid header");
const faviconSvg = await readFile(path.join(outputDirectory, "favicon.svg"), "utf8");
assert.match(faviconSvg, /viewBox="-100 -100 1200 1200"/);
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
for (const [filename, [width, height]] of Object.entries(staticScreenshotAssets)) {
  const sourcePath = path.join(repositoryRoot, "public", "screenshots", filename);
  const bytes = await readFile(sourcePath);
  assert.deepEqual(pngDimensions(bytes), { width, height }, `${filename} has unexpected dimensions`);
  assert.ok(bytes.byteLength > 5_000, `${filename} is unexpectedly small`);
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
const htmlFiles = await findFiles(outputDirectory, (filename) => filename.endsWith(".html"));
assert.ok(htmlFiles.some((filename) => filename.endsWith("index.html")), "generated index.html is missing");
assert.ok(htmlFiles.some((filename) => filename.endsWith("editor.html")), "generated editor.html is missing");
assert.equal(await fileExists(path.join(outputDirectory, "404.html")), true, "generated 404.html is missing");
const commandHtmlFiles = htmlFiles.filter((filename) =>
  path.relative(outputDirectory, filename).replaceAll(path.sep, "/").startsWith("zpl-commands/"));
assert.equal(commandHtmlFiles.length, 223, "generated command detail page count is incorrect");
assert.equal(await fileExists(path.join(outputDirectory, "zpl-commands.html")), true, "generated command index is missing");
assert.equal(await fileExists(path.join(outputDirectory, "zpl-commands", "caret-fo.html")), true, "generated ^FO page is missing");
assert.equal(await fileExists(path.join(outputDirectory, "zpl-commands", "tilde-dg.html")), true, "generated ~DG page is missing");
const serviceWorker = await readFile(path.join(outputDirectory, "sw.js"), "utf8");
assert.match(serviceWorker, /precacheAndRoute/, "service worker must precache the static build");
assert.match(serviceWorker, /\{url:"editor",revision:/, "service worker must precache the editor route");
assert.match(serviceWorker, /\{url:"\/",revision:/, "service worker must precache the homepage route");
const webManifest = JSON.parse(await readFile(path.join(outputDirectory, "manifest.webmanifest"), "utf8"));
assert.equal(webManifest.start_url, "/editor", "web manifest must start in the editor");
assert.equal(webManifest.display, "standalone", "web manifest must install standalone");
assert.ok(webManifest.icons.some((icon) => icon.sizes === "192x192" && icon.purpose === "any"), "web manifest is missing a 192px icon");
assert.ok(webManifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable"), "web manifest is missing a maskable 512px icon");
const commandIndexData = JSON.parse(
  await readFile(path.join(outputDirectory, "zpl-command-index.json"), "utf8"),
);
assert.equal(commandIndexData.length, 223, "generated client command index is incomplete");
assert.equal(new Set(commandIndexData.map(({ slug }) => slug)).size, 223, "generated client command slugs are not unique");

// Nuxt normally hydrates from page payloads, but a missing or stale payload
// falls back to useFetch. Those responses must exist on the static host too.
const documentationIndex = JSON.parse(
  await readFile(path.join(outputDirectory, "api", "zpl-documentation.json"), "utf8"),
);
assert.equal(documentationIndex.coverage.commands, 223, "static documentation API is incomplete");
assert.deepEqual(
  documentationIndex.directory.map(({ slug }) => slug).sort(),
  commandIndexData.map(({ slug }) => slug).sort(),
  "static documentation API directory does not match the command index",
);
for (const { slug } of commandIndexData) {
  const data = JSON.parse(await readFile(
    path.join(outputDirectory, "api", "zpl-documentation", `${slug}.json`), "utf8",
  ));
  assert.equal(data.guide.slug, slug, `static documentation API is missing ${slug}`);
}
// Exact aliases keep cached clients working without redirecting .json targets
// back to themselves, which a /:slug -> /:slug.json wildcard would do.
await writeFile(path.join(outputDirectory, "_redirects"), [
  "# Compatibility for documentation clients using the previous API URLs.",
  "/api/zpl-documentation /api/zpl-documentation.json 301",
  ...commandIndexData.map(({ slug }) =>
    `/api/zpl-documentation/${slug} /api/zpl-documentation/${slug}.json 301`),
  "",
].join("\n"));

const sitemapRoutes = htmlFiles.flatMap((filename) => {
  const relative = path.relative(outputDirectory, filename).replaceAll(path.sep, "/");
  if (relative === "index.html") return ["/"];
  if (relative === "editor.html") return ["/editor"];
  if (relative === "zpl-commands.html") return ["/zpl-commands"];
  if (relative.startsWith("zpl-commands/") && relative.endsWith(".html")) {
    return [`/${relative.slice(0, -".html".length)}`];
  }
  return [];
}).sort((left, right) => left === "/" ? -1 : right === "/" ? 1 : left.localeCompare(right));
assert.ok(sitemapRoutes.includes("/editor"), "the public editor must be in the sitemap");
for (const route of sitemapRoutes) {
  const filename = route === "/" ? "index.html" : `${route.slice(1)}.html`;
  assertIndexableHtml(await readFile(path.join(outputDirectory, filename), "utf8"), `${canonicalOrigin}${route}`);
}
await writeFile(path.join(outputDirectory, "sitemap.xml"), [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...sitemapRoutes.flatMap((route) => [
    "  <url>",
    `    <loc>${canonicalOrigin}${route}</loc>`,
    "  </url>",
  ]),
  "</urlset>",
  "",
].join("\n"));

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
const outputHeaders = headerTemplate.replace(/script-src 'self'[^;]*/, scriptDirective);
assert.match(outputHeaders, /\/sw\.js\n  Cache-Control: public, max-age=0, must-revalidate/, "service worker must be revalidated on every load");
assert.match(outputHeaders, /\/manifest\.webmanifest\n  Cache-Control: public, max-age=0, must-revalidate/, "web manifest must be revalidated on every load");
await writeFile(path.join(outputDirectory, "_headers"), outputHeaders);

const indexHtml = await readFile(path.join(outputDirectory, "index.html"), "utf8");
assert.match(indexHtml, /Free Online ZPL Viewer &amp; Editor/);
assert.match(indexHtml, /aria-label="Interactive ZPL viewer"/);
assert.match(indexHtml, /rel="canonical" href="https:\/\/zplr\.de\/"/);
assert.match(indexHtml, /application\/ld\+json/);
assert.match(indexHtml, /Node\.js ZPL renderer/);
assert.match(indexHtml, /<link(?=[^>]*rel="icon")(?=[^>]*href="\/favicon-96x96\.png")[^>]*>/);
assert.doesNotMatch(indexHtml, /<link[^>]*rel="icon"[^>]*href="data:/);
assert.match(indexHtml, /media="\(prefers-color-scheme: dark\)" srcset="\/screenshots\/zpl-live-preview-dark\.png"/);
assert.match(indexHtml, /href="\/screenshots\/zpl-label-preview\.png"/);
assert.match(indexHtml, /<link[^>]*rel="manifest"[^>]*href="\/manifest\.webmanifest"[^>]*>/, "index.html must link the web manifest");
const prefetchedHomepageScripts = [...indexHtml.matchAll(/<link rel="prefetch" as="script"[^>]*href="\/_nuxt\/([^"]+)"/g)]
  .map((match) => match[1]);
for (const filename of prefetchedHomepageScripts) {
  const { size } = await stat(path.join(outputDirectory, "_nuxt", filename));
  assert.ok(size < 250_000, `${filename} is too large to prefetch from the homepage (${size} bytes)`);
}
const editorHtml = await readFile(path.join(outputDirectory, "editor.html"), "utf8");
assert.match(editorHtml, /name="robots" content="index, follow"/);
assert.match(editorHtml, /Opening the local ZPL editor/);
assert.match(editorHtml, /How to edit and export a ZPL label/);
assert.match(editorHtml, /<link(?=[^>]*rel="icon")(?=[^>]*href="\/favicon-96x96\.png")[^>]*>/);
const commandIndexHtml = await readFile(path.join(outputDirectory, "zpl-commands.html"), "utf8");
assert.match(commandIndexHtml, /Every ZPL command, explained and ready to render/);
assert.match(commandIndexHtml, /rel="canonical" href="https:\/\/zplr\.de\/zpl-commands"/);
assert.match(commandIndexHtml, /property="og:image" content="https:\/\/zplr\.de\/og\.png"/);
const linkedCommandRoutes = new Set(
  [...commandIndexHtml.matchAll(/href="(\/zpl-commands\/[^"#?]+)"/g)].map((match) => match[1]),
);
assert.equal(linkedCommandRoutes.size, 223, "command index must link every command guide in static HTML");
const fieldOriginHtml = await readFile(path.join(outputDirectory, "zpl-commands", "caret-fo.html"), "utf8");
assert.match(fieldOriginHtml, /\^FO Field Origin/);
assert.match(fieldOriginHtml, /Edit in editor/);
assert.match(fieldOriginHtml, /application\/ld\+json/);
assert.match(fieldOriginHtml, /property="og:image" content="https:\/\/zplr\.de\/og\.png"/);
assert.match(fieldOriginHtml, /href="\/editor#example=caret-fo-/);
assert.doesNotMatch(fieldOriginHtml, /href="\/editor\?example=/);
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
