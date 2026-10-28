# Editor builds and website deployment

The public `le2ni/zplr` repository owns the library, editor, and command reference.
The landing page and Cloudflare deployment configuration live in the private
`le2ni/zplr-website` repository. Publishing an npm release or opening a pull
request here does not deploy to `zplr.de`.

## Standalone editor

```sh
pnpm install --frozen-lockfile
pnpm run dev:web
pnpm run build:web
pnpm run preview:web
```

The root route redirects to `/editor`. `/editor`, `/zpl-commands`, all 223 command
guides, and their static JSON API responses remain available. The standalone
artifact is `.output/public`; it needs no production server. CI builds it and
runs the editor, documentation, accessibility, and offline browser suites.

The build type-checks the application, ensures Playwright Chromium is available,
prerenders pages, captures ten light/dark editor screenshots, and validates the
result. GitHub CI preinstalls Chromium's Linux system dependencies. The committed
screenshots remain here because the README and editor documentation use them.
`pnpm run screenshots:update` refreshes those development baselines.

The static artifact includes `/license.txt` and `/third-party-notices.txt`,
copied from this repository. Preserve both when distributing a build. It also
includes version metadata, a sitemap, CSP hashes for executable inline scripts,
and exact `_redirects` aliases for older extensionless documentation API URLs.
The local preview does not emulate those Cloudflare redirects.

## Combined production website

The private website extends this repository as a Nuxt layer. It supplies the
landing page at `/` and reuses the public editor, documentation, assets, and
build checks. Shared navigation points to the production website when this
repository runs standalone and uses local landing-page links in the combined
application. URLs and the installed PWA's origin remain unchanged.

The consuming application sets `ZPLR_WEB_ROOT` to its own root when reusing
`scripts/build-web.mjs`. It provides its own finalizer that invokes this
repository's finalizer, then validates its landing page. `ZPLR_HAS_LANDING_PAGE=1`
includes `/` in the combined sitemap, and `ZPLR_EDITOR_COMMIT` records the public
source revision alongside the website commit. Screenshot capture uses this
repository's Playwright runner to keep tests and dependencies together.

The existing Cloudflare Pages project `zplr` serves `zplr.de`. Its Git source
must be the private website repository, with the build command and settings
recorded there. Disable the former public repository's automatic Pages builds
before pushing this split, so the standalone editor cannot replace the website.
GitHub release workflows here retain npm publishing and registry verification
but have no Cloudflare deployment jobs.

Commit and push these public changes before the first private website build.
The private repository can select a public branch, tag, or full commit SHA and
records the resolved revision in `version.json`. A stable npm release does not
automatically promote that editor version into the website.
