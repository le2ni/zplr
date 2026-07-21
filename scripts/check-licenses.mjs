import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join, parse } from "node:path";

const rootPackage = JSON.parse(readFileSync(new URL("../package.json", import.meta.url)));
const allowed = new Set([
  "0BSD", "Apache-2.0", "BSD", "BSD-2-Clause", "BSD-3-Clause", "CC0-1.0",
  "ISC", "MIT", "MIT-0", "Unlicense", "BlueOak-1.0.0",
]);
const seen = new Map();

function packageFile(name, fromDirectory) {
  const scopedRequire = createRequire(join(fromDirectory, "license-check.cjs"));
  try {
    return scopedRequire.resolve(`${name}/package.json`);
  } catch {
    let directory = dirname(scopedRequire.resolve(name));
    while (directory !== parse(directory).root) {
      const candidate = join(directory, "package.json");
      try {
        const value = JSON.parse(readFileSync(candidate));
        if (value.name === name) return candidate;
      } catch {}
      directory = dirname(directory);
    }
  }
  throw new Error(`Cannot resolve package metadata for ${name} from ${fromDirectory}.`);
}

function visit(name, fromDirectory, optional = false) {
  let file;
  try {
    file = packageFile(name, fromDirectory);
  } catch (error) {
    if (optional) return;
    throw error;
  }
  const pkg = JSON.parse(readFileSync(file));
  const key = `${pkg.name}@${pkg.version}`;
  if (seen.has(key)) return;
  const license = typeof pkg.license === "string" ? pkg.license : "UNKNOWN";
  seen.set(key, license);
  const identifiers = license.replace(/[()]/g, " ").split(/\s+(?:AND|OR|WITH)\s+/i);
  assert.ok(identifiers.every((id) => allowed.has(id.trim())), `${key} uses unapproved license ${license}.`);
  const directory = dirname(file);
  for (const dependency of Object.keys(pkg.dependencies ?? {})) visit(dependency, directory);
  for (const dependency of Object.keys(pkg.optionalDependencies ?? {})) visit(dependency, directory, true);
}

for (const dependency of Object.keys(rootPackage.dependencies ?? {})) visit(dependency, process.cwd());
for (const dependency of Object.keys(rootPackage.peerDependencies ?? {})) visit(dependency, process.cwd(), true);
console.log(`Approved production licenses for ${seen.size} installed packages.`);
