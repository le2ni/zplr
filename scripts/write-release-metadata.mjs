import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const pkg = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8")
);
const gitCommit =
  process.env.GITHUB_SHA ??
  execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

assert.match(gitCommit, /^[0-9a-f]{40}$/i, "Release metadata needs a full Git commit.");

const dist = new URL("../dist/", import.meta.url);
await mkdir(dist, { recursive: true });
await writeFile(
  new URL("release.json", dist),
  `${JSON.stringify({ name: pkg.name, version: pkg.version, gitCommit }, null, 2)}\n`
);

console.log(`Recorded ${pkg.name}@${pkg.version} from ${gitCommit}.`);
