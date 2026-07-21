import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const snapshot = JSON.parse(await readFile(new URL("../api/0.3.0.json", import.meta.url)));
const root = await import("zplr");
const node = await import("zplr/node");
const web = await import("zplr/web");

const publicKeys = (entry) => Object.keys(entry).sort();
const expectedRuntime = [...snapshot.runtimeExports].sort();
assert.deepEqual(publicKeys(root), expectedRuntime, "The root API no longer matches 0.3.0.");
assert.deepEqual(publicKeys(node), expectedRuntime, "The Node API no longer matches 0.3.0.");
assert.deepEqual(publicKeys(web), expectedRuntime, "The web API no longer matches 0.3.0.");

const nodeTypes = await readFile(new URL("../dist/index.node.d.ts", import.meta.url), "utf8");
const webTypes = await readFile(new URL("../dist/index.web.d.ts", import.meta.url), "utf8");

const declarationDigest = (declarations) => {
  const source = ts.createSourceFile(
    "public-api.d.ts",
    declarations,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  assert.equal(source.parseDiagnostics.length, 0, "Generated declarations are invalid.");
  const signature = ts
    .createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed })
    .printFile(source)
    .trim();
  return createHash("sha256").update(`${signature}\n`).digest("hex");
};

assert.equal(
  declarationDigest(nodeTypes),
  snapshot.declarationSha256.node,
  "Node declaration signatures no longer match the reviewed 0.3.0 snapshot."
);
assert.equal(
  declarationDigest(webTypes),
  snapshot.declarationSha256.web,
  "Web declaration signatures no longer match the reviewed 0.3.0 snapshot."
);

for (const name of snapshot.typeExports) {
  assert.match(nodeTypes, new RegExp(`\\b${name}\\b`), `Node declarations lost ${name}.`);
  assert.match(webTypes, new RegExp(`\\b${name}\\b`), `Web declarations lost ${name}.`);
}

for (const browserType of ["CanvasRenderingContext2D", "HTMLCanvasElement", "Blob"]) {
  assert.equal(
    nodeTypes.includes(browserType),
    false,
    `Node declarations expose browser-only ${browserType}.`
  );
}
for (const name of snapshot.nodeOnlyTypeExports) {
  assert.match(nodeTypes, new RegExp(`\\b${name}\\b`), `Node declarations lost ${name}.`);
}

for (const [label, declarations] of [["Node", nodeTypes], ["web", webTypes]]) {
  for (const forbidden of [
    "parseAndRender",
    "CommandClass",
    "RenderContext",
    "commandIndex",
    "zpl-ii-2006",
    "dpi?:",
  ]) {
    assert.equal(declarations.includes(forbidden), false, `${label} declarations expose ${forbidden}.`);
  }
  assert.doesNotMatch(declarations, /declare function (?:parse|render)\(/);
}

assert.equal(node.getCommandCapability("FO"), undefined);
assert.equal(node.getCommandCapability("^FO")?.canonical, "^FO");
assert.equal(node.getCommandCapability("~DG")?.canonical, "~DG");
console.log("Public API matches api/0.3.0.json.");
