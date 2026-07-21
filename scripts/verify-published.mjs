import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import packageJson from "../package.json" with { type: "json" };

function run(command, args, cwd = process.cwd()) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  assert.equal(result.status, 0, `${command} ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`);
  return result.stdout.trim();
}

const expectedCommit = (
  process.env.GITHUB_SHA ?? run("git", ["rev-parse", "HEAD"])
).trim();

let metadata;
for (let attempt = 1; attempt <= 12; attempt++) {
  try {
    metadata = JSON.parse(
      run("npm", ["view", `${packageJson.name}@${packageJson.version}`, "--json"])
    );
    break;
  } catch (error) {
    if (attempt === 12) throw error;
    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }
}
assert.equal(metadata.version, packageJson.version);
assert.equal(metadata.repository?.url ?? metadata.repository, packageJson.repository.url);
assert.ok(metadata.dist?.integrity, "Published metadata has no integrity digest.");
assert.ok(metadata.dist?.attestations?.url, "Published metadata has no provenance attestation.");

const temporary = mkdtempSync(join(tmpdir(), "zplr-published-"));
try {
  mkdirSync(join(temporary, "consumer"));
  const consumer = join(temporary, "consumer");
  writeFileSync(join(consumer, "package.json"), JSON.stringify({ private: true, type: "module" }));
  run(
    "npm",
    ["install", `${packageJson.name}@${packageJson.version}`, "skia-canvas"],
    consumer
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
    gitCommit: expectedCommit,
  });
  writeFileSync(join(consumer, "smoke.mjs"), `
    import assert from "node:assert/strict";
    import { renderZpl } from "zplr";
    const result = await renderZpl("^XA^PW32^LL32^FO2,2^GB8,8,1^FS^XZ");
    assert.equal(result.labels[0].canvas.width, 32);
  `);
  run(process.execPath, ["smoke.mjs"], consumer);
  console.log(`Verified npm installation and provenance for zplr@${packageJson.version}.`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
