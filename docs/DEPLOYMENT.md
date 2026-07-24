# Cloudflare Pages deployment

The Pages project is `zplr`, with production branch `main`, custom domain `zplr.de`, build command `pnpm run build:web`, and output directory `.output/public`. Nuxt prerenders the SEO landing page and the `/editor` loading shell. Cloudflare serves only the generated static assets; no Pages Function or production server is required.

The deployable build requires Playwright Chromium. It type-checks the Nuxt application, installs Playwright's pinned Chromium binary when the build image does not already contain it, runs `nuxt generate`, starts a temporary local preview, captures paired light- and dark-mode editor screenshots used by the landing page, and finalizes the static artifact. GitHub workflows preinstall Chromium and its Linux dependencies, so this check is normally a no-op there; it also makes direct Cloudflare Pages builds self-contained. The landing page selects the matching image through `prefers-color-scheme`. The build fails if any of the eight screenshots is absent, stale, associated with another commit/run, assigned to the wrong color scheme, or has unexpected dimensions. `pnpm run screenshots:update` intentionally refreshes the committed development baselines after a successful build.

Pull requests from the repository deploy to `pr-<number>.zplr.pages.dev` through `.github/workflows/preview.yml`, using Cloudflare's [preview-deployment model](https://developers.cloudflare.com/pages/configuration/preview-deployments/). Fork previews do not receive deployment secrets. The workflow verifies prerendered SEO content, screenshot provenance, static metadata, security headers, the direct `/editor` route, hydration, responsive behavior, and accessibility. Normal CI independently covers Chromium, Firefox, and WebKit against the same generated artifact.

Release tags are deployed only after the exact npm publish and post-publish verification succeed. `.github/workflows/publish.yml` builds and captures the static site once, uploads `.output` as an immutable commit-specific artifact, and reuses it for deployment. Prereleases published under `next` deploy to a versioned `release-<semver>.zplr.pages.dev` preview. Stable releases published under `latest` deploy to zplr.de. Both paths deploy with the tag commit SHA, verify the version and commit in `version.json`, and require the screenshot manifest to carry that same commit; a prerelease can never enter the production deployment job.

The generated manifest is machine-readable:

```json
{
  "name": "zplr",
  "version": "0.3.0",
  "commit": "<full git SHA>",
  "api": "0.3.0",
  "profile": "zpl-ii-2025",
  "screenshots": {
    "source": "captured",
    "runId": "<unique build run>",
    "manifest": "/screenshots/manifest.json"
  }
}
```

The finalizer augments `public/_headers` with hashes for Nuxt's executable inline scripts, preserving the strict CSP without `unsafe-inline`. Hashed Nuxt assets are immutable, stable screenshot URLs revalidate, and deployment metadata is never cached. Preview deployments should retain Cloudflare's `X-Robots-Tag: noindex` behavior.

Rollback is a Cloudflare control-plane operation. Roll back the site only to an already verified production deployment; do not rebuild an old tag. npm releases are immutable and require a corrective version rather than replacement.
