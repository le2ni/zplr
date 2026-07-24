# Release policy

## Required repository and registry settings

1. In npm package settings, configure the [GitHub trusted publisher](https://docs.npmjs.com/trusted-publishers/) for user `le2ni`, repository `zplr`, workflow filename `publish.yml`, environment `production`, and the `npm publish` action.
2. Protect the GitHub `production` environment with required reviewers and restrict it to protected release tags.
3. Protect `v*` tags so only release maintainers can create or update them. Tags are immutable; never force-move a release tag.
4. Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` to both the GitHub `preview` and `production` environments. Scope the token to Pages deployment for the `zplr` project, and protect `preview` with reviewers because same-repository pull requests execute code before deployment.
5. After the first trusted publish has verified provenance, revoke the long-lived npm automation token and remove `NPM_TOKEN` from GitHub.

The publish workflow deliberately has no `NODE_AUTH_TOKEN`. It checks the tag against `package.json`, performs the full release suite without dependency caching, packs and tests the tarball, publishes from the tagged commit, verifies registry integrity/provenance, and only then permits the matching Pages deployment. The tarball records the full tag commit in `dist/release.json`; a workflow rerun may skip the immutable npm publish only when the registry tarball contains that exact commit marker. Registry verification runs as a separate downstream job so a transient verification failure can be retried without republishing.

## Candidate and final sequence

1. Set the version to `0.3.0-rc.1`, complete non-empty release notes, commit, and create immutable tag `v0.3.0-rc.1`.
2. The tag workflow publishes with npm dist-tag `next` and deploys only to the versioned `release-0-3-0-rc-1.zplr.pages.dev` preview. Test the registry package from a clean external project and that exact preview.
3. Fix release blockers without changing the frozen API. Increment the prerelease only when another candidate is necessary.
4. Set `0.3.0`, update the release date/message, and tag `v0.3.0`. The workflow uses `latest` and deploys that exact commit to zplr.de.
5. Confirm npm installation, provenance, documentation links, all examples, three browser engines, `version.json`, `deployment.json`, screenshot provenance, and production security headers.
6. Publish backward-compatible stabilization fixes as 0.3.x under `latest`.
7. Promote to 1.0.0 only after at least one clean 0.3.x stabilization cycle and no open release blocker. The 1.0 commit changes version/release messaging and compatible fixes already validated in 0.3.x—never a new API or feature redesign.

If stabilization requires a breaking change, publish 0.4.0 and repeat the candidate cycle. Do not hide a break in 0.3.x or introduce it directly in 1.0. If a breaking defect escapes in 1.0.0, deprecate the affected npm version and publish a corrective 1.0.x.

## Mandatory gates

- Node 22/24 verification and native Node smoke on Linux, macOS, and Windows.
- A prerendered static site with current light/dark editor captures, Lighthouse performance/accessibility/best-practices/SEO gates, and strict CSP hashes.
- Chromium, Firefox, and WebKit rendering/site tests, light/dark axe checks, and narrow-layout smoke.
- Fresh npm and pnpm tarball consumers with TypeScript resolution.
- Public API snapshot, generated command/diagnostic/conformance docs, strict publint, package contents, license policy, dependency audit, and tag/version equality.
- Gzip budgets: Node 225 KiB, web 260 KiB, and prerendered landing-page JavaScript 180 KiB. Large editor and Monaco chunks must stay asynchronous and off the landing page.
- Capability-regression smoke coverage plus category and command-specific semantic/raster evidence, raster neutrality for every device-only command, deterministic fuzz/limit behavior, representative raster hashes, and independent barcode decoding.
- No high or critical dependency vulnerability in the published library or deployed web toolchain.

Physical-printer certification, CommonJS, Node below 22, device/network/RFID side effects, framework wrappers, and new ZPL profiles remain outside this sequence.

The runtime matrix follows the official [Node.js release schedule](https://github.com/nodejs/release#release-schedule).
