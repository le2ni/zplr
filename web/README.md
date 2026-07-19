# ZPLr Web Demo

The demo is a Vue 3 and Vite editor for the browser build of ZPLr. It renders labels while editing, exposes command highlight regions, provides example labels, and can download rendered canvases as PNG files.

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

The demo imports the browser entry point and uses native `HTMLCanvasElement` instances. Shared parsing, semantic layout, rendering geometry, and diagnostics live under `src/core`; the web-specific code only creates canvases and transfers canvas images.

When adding an example, use commands whose capability status is declared in `src/core/capabilities.ts`. Partial or unsupported examples should surface their diagnostics rather than imply full support.
