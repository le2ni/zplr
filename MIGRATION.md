# Migrating from ZPLr 0.2 to 0.3

0.3 intentionally removes the compatibility layer before the API freeze. Upgrade imports and behavior as follows.

| 0.2 | 0.3 replacement |
| :--- | :--- |
| `parse(source)` | `parseDocument(source)` |
| `render(label, width, height)` | `renderZpl(source, { width, height })` |
| top-level `renderDocument(document)` | `createRenderSession().renderDocument(document)` |
| `parseAndRender*` / advanced render helpers | `renderZpl` or `renderZplPNG` |
| browser command indexes | `HighlightRegion.sourceSpan`, `findCommandAtOffset`, `findHighlightRegionAtPoint` |
| `dpi: 150 / 200 / 300 / 600` | `printDensity: 6 / 8 / 12 / 24` dots/mm |
| profile `zpl-ii-2006` | profile `zpl-ii-2025` only |
| `getCommandCapability("FO")` | `getCommandCapability("^FO")` |
| `CommandClass`, `RenderContext`, legacy label types | AST, job, raster, diagnostic, font, session, limit, and highlight types |

## Rendering

Before:

```ts
import { parse, render } from "zplr/node";
const [label] = parse(source);
const canvas = await render(label, 812, 1218);
```

After:

```ts
import { renderZpl } from "zplr";
const job = await renderZpl(source, { width: 812, height: 1218 });
const { canvas, raster, diagnostics } = job.labels[0];
```

`RenderedLabel.canvas` is always present. Node returns `skia-canvas` and browsers return `HTMLCanvasElement`; optional chaining around the Canvas is no longer needed.

## Parsed workflows

```ts
import { createRenderSession, parseDocument } from "zplr";

const document = parseDocument(source);
const session = createRenderSession();
const job = await session.renderDocument(document);
```

Keeping `renderDocument` on a session makes persistence and FIFO ordering explicit. There is no top-level equivalent.

## Highlights and editor links

`commandIndex` was removed from highlight regions because indexes become unsafe when formats expand or session commands are injected. Use the required end-exclusive `sourceSpan`:

```ts
const region = findHighlightRegionAtPoint(label.highlightRegions, x, y);
editor.setSelection(region?.sourceSpan);
```

## Density and profiles

Use dots per millimetre. The mapping for old options is 150→6, 200/203→8, 300→12, and 600→24. ZPLr's single profile is pinned to the October 10, 2025 guide; remove explicit 2006-profile configuration.

## Error handling

Do not use promise rejection to detect syntax or semantic failures. Inspect `job.diagnostics` and `label.diagnostics`; documented parameter defaults and ignore rules can remain silent. Keep rejection handling for host Canvas failures and user `FontProvider` failures.

## TypeScript checklist

- Replace legacy command and render-context types with exported AST/job types.
- Treat result arrays and diagnostics as readonly.
- Install `skia-canvas` beside `zplr` in Node projects.
- Use `zplr/web` in browser code so native Node types and modules stay out of the graph.
- Regenerate any API snapshots that previously expected compatibility exports.
