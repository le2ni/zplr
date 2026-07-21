import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { appendFileSync, mkdtempSync, rmSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const pkg = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8")
);
const specification = `${pkg.name}@${pkg.version}`;
const expectedCommit = (
  process.env.GITHUB_SHA ??
  execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" })
).trim();

function run(command, args, cwd = process.cwd()) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  assert.equal(
    result.status,
    0,
    `${command} ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`
  );
  return result.stdout.trim();
}

const lookup = spawnSync(
  "npm",
  ["view", specification, "version", "--json"],
  { encoding: "utf8" }
);
let exists = false;

if (lookup.status === 0) {
  assert.equal(JSON.parse(lookup.stdout), pkg.version);
  exists = true;
} else {
  const output = `${lookup.stdout}\n${lookup.stderr}`;
  assert.match(
    output,
    /(?:\bE404\b|404 Not Found|No match found|not in this registry)/i,
    `Registry lookup failed for a reason other than an unpublished version:\n${output}`
  );
}

if (exists) {
  const temporary = mkdtempSync(join(tmpdir(), "zplr-existing-release-"));
  try {
    const packed = JSON.parse(
      run("npm", ["pack", specification, "--json", "--pack-destination", temporary])
    );
    const filename = Array.isArray(packed) ? packed[0]?.filename : packed.filename;
    assert.ok(filename, `npm pack did not report a tarball for ${specification}.`);
    const release = JSON.parse(
      run("tar", ["-xOf", join(temporary, filename), "package/dist/release.json"])
    );
    assert.deepEqual(
      release,
      { name: pkg.name, version: pkg.version, gitCommit: expectedCommit },
      `${specification} already exists, but it was not built from this exact commit.`
    );
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `exists=${exists}\n`);
}
console.log(`${specification} ${exists ? "already exists from this commit" : "is unpublished"}.`);
