import assert from "node:assert/strict";

// Inspect the generated HTML, before JavaScript runs. This is also used by
// deployment verification so a successful Lighthouse run cannot hide noindex.
export function assertIndexableHtml(html, canonical) {
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
  const metas = [...head.matchAll(/<meta\b[^>]*>/gi)].map(([tag]) => attributes(tag));
  const robots = metas.filter((meta) => /^(robots|googlebot)$/i.test(meta.name ?? ""));
  assert.ok(robots.some((meta) => /\bindex\b/i.test(meta.content ?? "")), `${canonical}: missing explicit index directive`);
  for (const meta of robots) {
    assert.doesNotMatch(meta.content ?? "", /\b(noindex|none|nofollow)\b/i, `${canonical}: blocks indexing or link discovery`);
  }
  const canonicals = [...head.matchAll(/<link\b[^>]*>/gi)]
    .map(([tag]) => attributes(tag))
    .filter((link) => link.rel?.toLowerCase() === "canonical");
  assert.deepEqual(canonicals.map((link) => link.href), [canonical], `${canonical}: must have one matching canonical`);
  assert.ok(/<title>\s*[^<]+<\/title>/i.test(head), `${canonical}: missing title`);
  assert.equal(metas.filter((meta) => meta.name === "description" && meta.content?.trim()).length, 1, `${canonical}: missing or duplicate description`);
  assert.equal([...html.matchAll(/<h1\b/gi)].length, 1, `${canonical}: needs one prerendered main heading`);
}

function attributes(tag) {
  return Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)]
      .map(([, name, doubleQuoted, singleQuoted]) => [name.toLowerCase(), doubleQuoted ?? singleQuoted]),
  );
}
