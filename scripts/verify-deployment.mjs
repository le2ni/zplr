import assert from "node:assert/strict";

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

    const page = await fetch(baseUrl, { cache: "no-store" });
    assert.equal(page.ok, true, `site returned ${page.status}`);
    assert.match(page.headers.get("content-security-policy") ?? "", /default-src 'self'/);
    assert.equal(page.headers.get("x-content-type-options"), "nosniff");
    assert.match(await page.text(), /ZPLr/);
    console.log(`Verified deployed version ${expectedVersion} at ${baseUrl}.`);
    process.exit(0);
  } catch (error) {
    lastError = error;
    if (attempt < 12) await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
}
throw lastError;
