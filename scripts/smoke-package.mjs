import assert from "node:assert/strict";

const rootEntry = await import("zplr");
const nodeEntry = await import("zplr/node");
const webEntry = await import("zplr/web");

for (const [name, value] of Object.entries({
  renderZpl: nodeEntry.renderZpl,
  rootRenderZpl: rootEntry.renderZpl,
  createRenderSession: nodeEntry.createRenderSession,
  webRenderZpl: webEntry.renderZpl,
  webCreateRenderSession: webEntry.createRenderSession,
})) {
  assert.equal(typeof value, "function", `Missing package export: ${name}`);
}

const result = await nodeEntry.renderZpl(
  "^XA^PW80^LL40^FO4,4^GB20,10,1^FS^XZ"
);
assert.equal(result.labels.length, 1);
assert.equal(result.labels[0].width, 80);
assert.equal(result.labels[0].height, 40);
assert.ok(result.labels[0].raster.data.some((byte) => byte !== 0));
assert.ok(result.labels[0].canvas, "Node rendering did not attach a canvas");

const session = nodeEntry.createRenderSession();
await session.reset();

console.log("Package export and render smoke tests passed.");
