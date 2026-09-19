import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { assertIndexableHtml } from "./seo-assertions.mjs";

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
const expectedStaticScreenshotAssets = {
  "zpl-label-preview.png": [600, 800],
};

const [baseUrl, expectedVersion, expectedCommit] = process.argv.slice(2);
assert.ok(baseUrl && expectedVersion && expectedCommit, "Usage: verify-deployment <url> <version> <commit>");

let lastError;
for (let attempt = 1; attempt <= 12; attempt++) {
  try {
    const versionResponse = await fetch(new URL("/version.json", baseUrl), { cache: "no-store" });
    assert.equal(versionResponse.ok, true, `version.json returned ${versionResponse.status}`);
    const manifest = await versionResponse.json();
    assert.equal(manifest.version, expectedVersion);
    assert.equal(manifest.commit, expectedCommit);
    assert.equal(manifest.api, "0.3.0");
    assert.equal(manifest.profile, "zpl-ii-2025");
    assert.equal(manifest.screenshots?.source, "captured");
    assert.equal(typeof manifest.screenshots?.runId, "string");

    const deploymentResponse = await fetch(new URL("/deployment.json", baseUrl), { cache: "no-store" });
    assert.equal(deploymentResponse.ok, true, `deployment.json returned ${deploymentResponse.status}`);
    const deployment = await deploymentResponse.json();
    assert.equal(deployment.mode, "static");
    assert.equal(deployment.serverRequired, false);
    assert.equal(deployment.commit, expectedCommit);
    assert.equal(deployment.screenshotRunId, manifest.screenshots.runId);

    const page = await fetch(baseUrl, { cache: "no-store" });
    assert.equal(page.ok, true, `site returned ${page.status}`);
    assert.match(page.headers.get("content-security-policy") ?? "", /default-src 'self'/);
    assert.match(page.headers.get("content-security-policy") ?? "", /script-src 'self' 'sha256-/);
    assert.equal(page.headers.get("x-content-type-options"), "nosniff");
    const pageHtml = await page.text();
    assertIndexableHtml(pageHtml, "https://zplr.de/");
    if (new URL(baseUrl).hostname === "zplr.de") {
      assert.doesNotMatch(page.headers.get("x-robots-tag") ?? "", /\b(noindex|none)\b/i, "production homepage must allow indexing");
    }
    assert.match(pageHtml, /Free Online ZPL Viewer &amp; Editor/);
    assert.match(pageHtml, /aria-label="Interactive ZPL viewer"/);
    assert.match(pageHtml, /rel="canonical" href="https:\/\/zplr\.de\/"/);
    assert.match(pageHtml, /application\/ld\+json/);
    assert.match(pageHtml, /Node\.js ZPL renderer/);
    assert.match(pageHtml, /<link(?=[^>]*rel="icon")(?=[^>]*href="\/favicon-96x96\.png")[^>]*>/);
    assert.doesNotMatch(pageHtml, /<link[^>]*rel="icon"[^>]*href="data:/);

    for (const [filename, [width, height]] of Object.entries({
      "favicon-96x96.png": [96, 96],
      "apple-touch-icon.png": [180, 180],
    })) {
      const faviconResponse = await fetch(new URL(`/${filename}`, baseUrl), { cache: "no-store" });
      assert.equal(faviconResponse.ok, true, `${filename} returned ${faviconResponse.status}`);
      assert.match(faviconResponse.headers.get("content-type") ?? "", /^image\/png/);
      const faviconBytes = Buffer.from(await faviconResponse.arrayBuffer());
      assert.equal(faviconBytes.readUInt32BE(16), width);
      assert.equal(faviconBytes.readUInt32BE(20), height);
    }
    const faviconIcoResponse = await fetch(new URL("/favicon.ico", baseUrl), { cache: "no-store" });
    assert.equal(faviconIcoResponse.ok, true, `favicon.ico returned ${faviconIcoResponse.status}`);
    assert.match(faviconIcoResponse.headers.get("content-type") ?? "", /^image\/(x-icon|vnd\.microsoft\.icon)/);

    const screenshotManifestResponse = await fetch(new URL(manifest.screenshots.manifest, baseUrl), { cache: "no-store" });
    assert.equal(screenshotManifestResponse.ok, true, `screenshot manifest returned ${screenshotManifestResponse.status}`);
    const screenshotManifest = await screenshotManifestResponse.json();
    assert.equal(screenshotManifest.source, "captured");
    assert.equal(screenshotManifest.runId, manifest.screenshots.runId);
    assert.equal(screenshotManifest.commit, expectedCommit);
    assert.equal(Object.keys(screenshotManifest.files ?? {}).length, Object.keys(expectedScreenshots).length);
    for (const [filename, [width, height]] of Object.entries(expectedScreenshots)) {
      const fileManifest = screenshotManifest.files?.[filename];
      assert.equal(fileManifest?.width, width);
      assert.equal(fileManifest?.height, height);
      assert.equal(fileManifest?.colorScheme, filename.endsWith("-dark.png") ? "dark" : "light");
      const screenshotResponse = await fetch(new URL(`/screenshots/${filename}`, baseUrl), { cache: "no-store" });
      assert.equal(screenshotResponse.ok, true, `${filename} returned ${screenshotResponse.status}`);
      assert.match(screenshotResponse.headers.get("content-type") ?? "", /^image\/png/);
      assert.match(screenshotResponse.headers.get("cache-control") ?? "", /max-age=0/);
      const bytes = Buffer.from(await screenshotResponse.arrayBuffer());
      assert.ok(bytes.byteLength > 10_000);
      assert.equal(bytes.readUInt32BE(16), width);
      assert.equal(bytes.readUInt32BE(20), height);
      assert.equal(createHash("sha256").update(bytes).digest("hex"), fileManifest.sha256);
    }
    for (const [filename, [width, height]] of Object.entries(expectedStaticScreenshotAssets)) {
      const screenshotResponse = await fetch(new URL(`/screenshots/${filename}`, baseUrl), { cache: "no-store" });
      assert.equal(screenshotResponse.ok, true, `${filename} returned ${screenshotResponse.status}`);
      assert.match(screenshotResponse.headers.get("content-type") ?? "", /^image\/png/);
      const bytes = Buffer.from(await screenshotResponse.arrayBuffer());
      assert.equal(bytes.readUInt32BE(16), width, `${filename} has unexpected width`);
      assert.equal(bytes.readUInt32BE(20), height, `${filename} has unexpected height`);
    }

    const robotsResponse = await fetch(new URL("/robots.txt", baseUrl), { cache: "no-store" });
    assert.equal(robotsResponse.ok, true, `robots.txt returned ${robotsResponse.status}`);
    assert.match(await robotsResponse.text(), /Sitemap: https:\/\/zplr\.de\/sitemap\.xml/);
    const sitemapResponse = await fetch(new URL("/sitemap.xml", baseUrl), { cache: "no-store" });
    assert.equal(sitemapResponse.ok, true, `sitemap.xml returned ${sitemapResponse.status}`);
    const sitemap = await sitemapResponse.text();
    assert.match(sitemap, /<loc>https:\/\/zplr\.de\/<\/loc>/);
    assert.match(sitemap, /<loc>https:\/\/zplr\.de\/editor<\/loc>/);

    for (const route of ["/api/zpl-documentation.json", "/api/zpl-documentation/caret-fo.json"]) {
      const response = await fetch(new URL(route, baseUrl), { cache: "no-store" });
      assert.equal(response.ok, true, `${route} returned ${response.status}`);
      assert.match(response.headers.get("content-type") ?? "", /^application\/json/);
      const data = await response.json();
      assert.equal(data.coverage.commands, 223, `${route} contains an incomplete catalog`);
      if (route.endsWith("caret-fo.json")) assert.equal(data.guide.slug, "caret-fo");
      else assert.equal(data.directory.length, 223);
    }

    // The editor is prerendered as an extensionless static Pages route and
    // hydrates the browser-only IDE from its local loading shell.
    const editorPage = await fetch(new URL("/editor", baseUrl), { cache: "no-store" });
    assert.equal(editorPage.ok, true, `/editor returned ${editorPage.status}`);
    assert.match(editorPage.headers.get("content-security-policy") ?? "", /default-src 'self'/);
    const editorHtml = await editorPage.text();
    assertIndexableHtml(editorHtml, "https://zplr.de/editor");
    if (new URL(baseUrl).hostname === "zplr.de") {
      assert.doesNotMatch(editorPage.headers.get("x-robots-tag") ?? "", /\b(noindex|none)\b/i, "production editor must allow indexing");
    }
    assert.match(editorHtml, /Opening the local ZPL editor/);
    assert.match(editorHtml, /How to edit and export a ZPL label/);
    console.log(`Verified deployed version ${expectedVersion} at ${baseUrl}.`);
    process.exit(0);
  } catch (error) {
    lastError = error;
    if (attempt < 12) await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
}
throw lastError;
