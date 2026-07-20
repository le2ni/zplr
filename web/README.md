# ZPLr Web Demo

The demo is a Vue 3 and Vite editor for the browser build of ZPLr. It uses
`renderZpl()` directly, resolves each label's own dimensions, and downloads
the canonical raster expansion as PNG.

## Run it

From the repository root:

```bash
pnpm install
pnpm run dev:web
```

Verification and production commands:

```bash
pnpm run typecheck:web
pnpm run build:web
pnpm run preview:web
```

## Source layout

```text
web/
  App.vue
  main.ts
  style.css
  components/MonacoEditor.vue
  assets/logo.svg
```

The playground offers dots/mm and explicit-size controls, source-linked
diagnostics, clickable resolved field geometry, representative release
fixtures, and explanations generated from the runtime command catalog. It
does not maintain a second highlight renderer.

The demo imports the browser entry point and uses native `HTMLCanvasElement`
instances. Shared parsing, state, raster geometry, fonts, barcodes, graphics,
and diagnostics live under `src/core`; the web-specific adapter only expands
the completed one-bit raster to RGBA.

When adding an example, use commands whose capability status is declared in `src/core/capabilities.ts`. Partial or unsupported examples should surface their diagnostics rather than imply full support.
