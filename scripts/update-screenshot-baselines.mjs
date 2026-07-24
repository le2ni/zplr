import assert from "node:assert/strict";
import { cp, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedDirectory = path.join(repositoryRoot, ".output", "public", "screenshots");
const baselineDirectory = path.join(repositoryRoot, "public", "screenshots");
const manifest = JSON.parse(await readFile(path.join(generatedDirectory, "manifest.json"), "utf8"));

assert.equal(manifest.source, "captured", "only pipeline-captured screenshots can become baselines");
assert.ok(Object.keys(manifest.files ?? {}).length === 8, "the complete light and dark screenshot set is required");
await mkdir(baselineDirectory, { recursive: true });
for (const filename of [...Object.keys(manifest.files), "manifest.json"]) {
  await cp(path.join(generatedDirectory, filename), path.join(baselineDirectory, filename));
}
console.log(`Updated ${Object.keys(manifest.files).length} committed screenshot baselines.`);
