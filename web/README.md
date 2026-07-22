# ZPLr website and editor

The Vue/Vite site exposes the full-screen IDE at `/editor`. Parsing and rendering happen locally in the browser; source and generated images are not uploaded. Monaco, its worker, and the ZPL language services are bundled locally and loaded only on the editor route, keeping the landing page light.

The editor covers the complete ZPL II command catalog with command-aware syntax highlighting, completion, parameter snippets, signature help, hover documentation, source-linked diagnostics, quick fixes, document symbols, folding, formatting, and stored-resource definition/reference/rename support. It also includes persistent multi-file tabs with per-file undo and cursor history, multi-file open/drop, ZPL and workspace ZIP saving, editor preferences and a command palette, sample labels, a searchable command library, and a resizable live preview.

An optional full-canvas Designer view provides local WYSIWYG editing without replacing the source editor. Existing source-linked fields can be selected, dragged, nudged, duplicated, deleted, and edited through a property inspector. Text, Code 128, QR code, box, and line elements can be dragged from the toolbox onto the label. A Layers panel exposes source-backed paint order with safe forward/backward controls, while Designer-scoped shortcuts cover snap-aware movement, visual copy/paste, duplication, deletion, ordering, grid, fit, and zoom actions. Designer changes are emitted as single-range Monaco edits, so ZPL remains authoritative and normal undo/redo continues to work. Grid snapping, zoom-to-fit, multi-label switching, transform-aware coordinates, exact source reveal, and a compact mobile layout are included.

Preview tooling includes live or manual rendering, compatible and strict diagnostics, 150/203/300/600 dpi profiles, custom dot dimensions, source selection from rendered fields, zoom/fit controls, individual PNG download, and all-label ZIP export. The responsive source/preview switch keeps the same clean white workspace usable on narrow screens.

```bash
pnpm run dev:web
pnpm run build:web
pnpm run size:check
pnpm run test:e2e
```

The UI uses the 0.3 job API, structured diagnostics, required browser canvases, `HighlightRegion.sourceSpan`, and `findHighlightRegionAtPoint`. It shows the package version on the landing page and exposes release metadata through the generated `version.json`.

Deployment configuration, PR previews, headers, and immutable tagged production builds are described in `docs/DEPLOYMENT.md`.
