# ZPLr playground

The Vue/Vite playground imports only `zplr/web`. Parsing and rendering happen locally in the browser; source and generated images are not uploaded. Monaco and its worker are bundled locally and loaded only after the playground opens.

```bash
pnpm run dev:web
pnpm run build:web
pnpm run size:check
pnpm run test:e2e
```

The UI uses the 0.3 job API, structured diagnostics, required browser canvases, `HighlightRegion.sourceSpan`, and `findHighlightRegionAtPoint`. It shows the package version in the page and exposes release metadata through the generated `version.json`.

Deployment configuration, PR previews, headers, and immutable tagged production builds are described in `docs/DEPLOYMENT.md`.
