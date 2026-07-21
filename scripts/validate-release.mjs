import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url)));
const changelog = await readFile(new URL("../CHANGELOG.md", import.meta.url), "utf8");
const migration = await readFile(new URL("../MIGRATION.md", import.meta.url), "utf8");
const tag = process.argv.slice(2).find((argument) => argument !== "--") ?? process.env.GITHUB_REF_NAME;
assert.ok(tag, "Pass the immutable release tag (for example v0.3.0-rc.1).");
assert.equal(tag, `v${pkg.version}`, `Tag ${tag} does not match package.json ${pkg.version}.`);
const releaseHeading = pkg.version.includes("-") ? pkg.version.split("-")[0] : pkg.version;
const escapedHeading = releaseHeading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const headingPattern = new RegExp(
  `^## \\[${escapedHeading}\\] - ([^\\r\\n]+)$`,
  "m"
);
const headingMatch = headingPattern.exec(changelog);
assert.ok(
  headingMatch,
  `CHANGELOG.md needs an exact "## [${releaseHeading}] - <date>" heading.`
);

const headingStatus = headingMatch[1].trim();
const calendarDate = /^\d{4}-\d{2}-\d{2}$/.test(headingStatus)
  ? new Date(`${headingStatus}T00:00:00Z`)
  : undefined;
const hasValidDate =
  calendarDate !== undefined &&
  !Number.isNaN(calendarDate.valueOf()) &&
  calendarDate.toISOString().slice(0, 10) === headingStatus;

if (pkg.version.includes("-")) {
  assert.ok(
    headingStatus === "Unreleased" || hasValidDate,
    "A prerelease changelog heading must use Unreleased or a valid YYYY-MM-DD date."
  );
} else {
  assert.ok(
    hasValidDate,
    `Stable release ${pkg.version} cannot use "${headingStatus}"; set its YYYY-MM-DD release date.`
  );
}

const sectionStart = headingMatch.index + headingMatch[0].length;
const following = changelog.slice(sectionStart);
const nextReleaseOffset = following.search(/^## \[/m);
const section =
  nextReleaseOffset === -1 ? following : following.slice(0, nextReleaseOffset);
const subsections = [...section.matchAll(/^### ([^\r\n]+)\s*$/gm)];
const releaseNoteHeadings = new Set(["Added", "Changed", "Fixed", "Removed"]);
const hasReleaseNote = subsections.some((subsection, index) => {
  if (!releaseNoteHeadings.has(subsection[1].trim())) return false;
  const bodyStart = (subsection.index ?? 0) + subsection[0].length;
  const bodyEnd = subsections[index + 1]?.index ?? section.length;
  return /^- \S.+$/m.test(section.slice(bodyStart, bodyEnd));
});
assert.ok(
  hasReleaseNote,
  `The ${releaseHeading} changelog section has no Added, Changed, Fixed, or Removed release note.`
);
assert.ok(migration.length > 1_000, "The 0.2 to 0.3 migration guide is incomplete.");

if (process.env.GITHUB_ACTIONS === "true") {
  const exactTags = execFileSync("git", ["tag", "--points-at", "HEAD"], { encoding: "utf8" })
    .trim().split(/\s+/).filter(Boolean);
  assert.ok(exactTags.includes(tag), `${tag} does not point at the checked-out commit.`);
}

const distTag = pkg.version.includes("-") ? "next" : "latest";
console.log(JSON.stringify({ version: pkg.version, tag, distTag }));
