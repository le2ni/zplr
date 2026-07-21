# Cloudflare Pages deployment

The Pages project is `zplr`, with production branch `main`, custom domain `zplr.de`, build command `pnpm run build:web`, and output directory `dist-playground`. `wrangler.jsonc` records the project and output directory. The full-screen IDE is served at `https://zplr.de/editor`; Cloudflare Pages' SPA fallback must return the application shell for a direct request to that path.

Pull requests from the repository deploy to `pr-<number>.zplr.pages.dev` through `.github/workflows/preview.yml`, using Cloudflare's [preview-deployment model](https://developers.cloudflare.com/pages/configuration/preview-deployments/). Fork previews do not receive deployment secrets. The workflow verifies `version.json`, security headers, the direct `/editor` route, a Chromium IDE pass, responsive behavior, and accessibility after deployment; normal CI independently covers Chromium, Firefox, and WebKit.

Release tags are deployed only after the exact npm publish and post-publish verification succeed. `.github/workflows/publish.yml` checks out the immutable tag again and builds with `pnpm run build:web`. Prereleases published under `next` deploy to a versioned `release-<semver>.zplr.pages.dev` preview. Stable releases published under `latest` deploy to zplr.de. Both paths deploy with the tag commit SHA and verify that `version.json` contains the same version and commit; a prerelease can never enter the production deployment job.

The generated manifest is machine-readable:

```json
{
  "name": "zplr",
  "version": "0.3.0",
  "commit": "<full git SHA>",
  "api": "0.3.0",
  "profile": "zpl-ii-2025"
}
```

Cloudflare copies `public/_headers` into the deployment. Hashed assets are immutable; `version.json` is never cached. Preview deployments should retain Cloudflare's `X-Robots-Tag: noindex` behavior.

Rollback is a Cloudflare control-plane operation. Roll back the site only to an already verified production deployment; do not rebuild an old tag. npm releases are immutable and require a corrective version rather than replacement.
