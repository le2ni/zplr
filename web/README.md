# ZPLr website and editor

The Vue/Vite site exposes the full-screen IDE at `/editor`. Parsing and rendering happen locally in the browser; source and generated images are not uploaded. Monaco, its worker, and the ZPL language services are bundled locally and loaded only on the editor route, keeping the landing page light.

The editor covers the complete ZPL II command catalog with command-aware syntax highlighting, completion, parameter snippets, signature help, hover documentation, source-linked diagnostics, quick fixes, document symbols, folding, formatting, and stored-resource definition/reference/rename support. It also includes persistent multi-file tabs with per-file undo and cursor history, multi-file open/drop, ZPL and workspace ZIP saving, editor preferences and a command palette, sample labels, a searchable command library, and a resizable live preview.

Preview tooling includes live or manual rendering, compatible and strict diagnostics, 150/203/300/600 dpi profiles, custom dot dimensions, source selection from rendered fields, zoom/fit controls, individual PNG download, and all-label ZIP export. The responsive source/preview switch keeps the same clean white workspace usable on narrow screens.

```bash
pnpm run dev:web
pnpm run build:web
pnpm run size:check
pnpm run test:e2e
```

The UI uses the 0.3 job API, structured diagnostics, required browser canvases, `HighlightRegion.sourceSpan`, and `findHighlightRegionAtPoint`. It shows the package version on the landing page and exposes release metadata through the generated `version.json`.

Deployment configuration, PR previews, headers, and immutable tagged production builds are described in `docs/DEPLOYMENT.md`.
