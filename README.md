# ZPLr — TypeScript ZPL parser and renderer

**Parse, render, inspect, and preview ZPL labels in Node.js or the browser.** ZPLr is a deterministic, open-source ZPL and ZPL II library for JavaScript and TypeScript. It turns complete Zebra Programming Language jobs into packed one-bit rasters, Canvas surfaces, PNG images, structured diagnostics, and source-linked layout data.

The same local-first engine powers the [free online ZPL editor, viewer, and visual designer](https://zplr.de/editor).

[![npm version](https://img.shields.io/npm/v/zplr?label=npm&color=cb3837)](https://www.npmjs.com/package/zplr)
[![CI](https://github.com/le2ni/zplr/actions/workflows/ci.yml/badge.svg)](https://github.com/le2ni/zplr/actions/workflows/ci.yml)
[![Node.js 22+](https://img.shields.io/badge/Node.js-22%2B-339933?logo=nodedotjs&logoColor=white)](https://www.npmjs.com/package/zplr)
[![MIT license](https://img.shields.io/badge/license-MIT-18181b.svg)](./LICENSE)

[Try the online editor](https://zplr.de/editor) · [Install from npm](https://www.npmjs.com/package/zplr) · [Read the usage guide](./USAGE.md) · [Check ZPL command support](./docs/COMMAND_SUPPORT.md)

[![ZPLr free online ZPL editor showing source code beside a locally rendered shipping label](https://raw.githubusercontent.com/le2ni/zplr/main/public/screenshots/zpl-editor-overview.png)](https://zplr.de/editor)

## A ZPL library for two runtimes

ZPLr provides typed ESM entry points for backend label jobs and in-browser ZPL previews. Both runtimes use the same parser, virtual-printer state, command capabilities, diagnostics, safety limits, and deterministic raster model.

| | Node.js | Browser |
| --- | --- | --- |
| Import | `zplr` or `zplr/node` | `zplr` or `zplr/web` |
| Canvas | `skia-canvas` `Canvas` | `HTMLCanvasElement` |
| PNG | `Buffer[]` | `Blob[]` |
| Processing | Local and offline | Local and offline |
| Runtime | Node.js 22+ | Evergreen browsers |

### Why use ZPLr?

- **Deterministic ZPL rendering** — complete jobs are interpreted into an MSB-first, one-bit raster before being expanded to the platform Canvas.
- **Real job state** — syntax characters, print settings, encodings, downloaded graphics and fonts, stored formats, and numbered fields are modeled instead of treating every label as an isolated string.
- **Typed integration data** — each rendered label includes dimensions, print density, diagnostics, source-linked highlight regions, its packed raster, and a required Canvas.
- **Source-aware tooling APIs** — connect code editors, label canvases, command documentation, and diagnostics with UTF-16 source spans and hit-testing helpers.
- **Production guardrails** — configurable limits bound dimensions, pixels, decompressed resources, stored-format expansion, and output quantity.
- **No remote render API** — normal parsing and rendering are deterministic, offline, and identical across the Node.js and browser builds.

## Install

Node.js rendering uses the optional `skia-canvas` peer:

```bash
pnpm add zplr skia-canvas
```

Browser applications install only ZPLr:

```bash
pnpm add zplr
```

Browser bundlers select the web entry when importing `zplr`. The explicit `zplr/web` entry also works without browser export conditions. Both keep `skia-canvas` out of the browser bundle.

## Render ZPL in Node.js

In Node.js, `zplr` selects the Node entry. `zplr/node` always exposes the Node API.

```ts
import { renderZpl } from "zplr";

const job = await renderZpl(`
^XA
^CI28
^PW812
^LL1218
^FO40,40^A0N,42,24^FDDeterministic label^FS
^FO40,120^BQN,2,5,Q,7^FDQA,HELLO-ZPL^FS
^XZ
`);

const label = job.labels[0];
console.log(label.raster.bitOrder, label.diagnostics);
await label.canvas.toFile("label.png");
```

Use `renderZplPNG()` when the PNG bytes are the only output you need:

```ts
import { renderZplPNG } from "zplr";
import { writeFile } from "node:fs/promises";

const [png] = await renderZplPNG(source, { printDensity: 8 });
await writeFile("label.png", png);
```

## Render ZPL in a browser

```ts
import { renderZpl, renderZplPNG } from "zplr/web";

const job = await renderZpl(source, { printDensity: 8 });
document.querySelector("main")?.append(job.labels[0].canvas);

const [png] = await renderZplPNG(source);
const downloadUrl = URL.createObjectURL(png);
```

The browser library returns native `HTMLCanvasElement` and `Blob` values and does not send label source to a server.

For TypeScript projects importing the root `zplr` entry in browser code, add `"customConditions": ["browser"]` with `"moduleResolution": "bundler"` to select the matching browser types. Import `zplr/web` to select browser code and types explicitly, including in SSR projects.

## Library API

| API | Purpose |
| --- | --- |
| `parseDocument(source, options?)` | Parse a complete ZPL job synchronously, including commands outside `^XA`/`^XZ`. |
| `renderZpl(source, options?)` | Parse and render every printable label with fresh virtual-printer state. |
| `renderZplPNG(source, options?)` | Render every printable label directly to PNG buffers or blobs. |
| `createRenderSession(options?)` | Keep printer settings, syntax, stored resources, encodings, and fonts between FIFO-serialized renders. |
| `findCommandAtOffset(document, offset)` | Resolve an editor position to its parsed ZPL command. |
| `findHighlightRegionAtPoint(regions, x, y)` | Resolve a label-canvas point back to its source span. |
| `commandCapabilities` / `getCommandCapability()` | Inspect the versioned command-support catalog at runtime. |

See [USAGE.md](./USAGE.md) for field values, fonts, parsed documents, safety limits, capabilities, and complete integration examples. The frozen public surface is recorded in [api/0.3.0.json](./api/0.3.0.json).

## Parse ZPL and navigate source

```ts
import {
  findCommandAtOffset,
  findHighlightRegionAtPoint,
  parseDocument,
} from "zplr";

const document = parseDocument(source);
const command = findCommandAtOffset(document, cursorOffset);
const region = findHighlightRegionAtPoint(
  job.labels[0].highlightRegions,
  labelX,
  labelY,
);

console.log(command?.canonical, region?.sourceSpan);
```

Command capability lookup requires the full identity because `^` and `~` commands can differ: use `getCommandCapability("^FO")` or `getCommandCapability("~DG")`. Prefixless lookups return `undefined`.

## Reuse virtual-printer state and variable data

`renderZpl()` starts with fresh state. Create a private session when syntax characters, settings, graphics, stored formats, encodings, or fonts must persist:

```ts
import { createRenderSession } from "zplr";

const printer = createRenderSession({ printDensity: 8 });

await printer.render("~DGR:MARK.GRF,1,1,80");

const job = await printer.render(
  "^XA^PW400^LL240^FO20,20^XGR:MARK.GRF,4,4^FS^FO20,160^FN1^FS^XZ",
  { fieldValues: { 1: "Ada Lovelace" } },
);

await job.labels[0].canvas.toFile("personalized-label.png");
await printer.reset();
```

Per-render `fieldValues` fill numbered `^FN` fields without rewriting the template. Session operations are FIFO-serialized, and state is never global.

## Free online ZPL editor, viewer, and visual designer

[Open the browser editor](https://zplr.de/editor) to take a label from raw ZPL to a visual preview without installing anything or creating an account. It uses the library locally in your browser and adds:

- A Monaco-based ZPL editor with syntax highlighting, formatting, command guidance, and source-linked diagnostics.
- A live ZPL viewer with true label dimensions, configurable print density, multiple-label support, and PNG export.
- A WYSIWYG ZPL label designer with drag, resize, rotation, snapping, guides, alignment, layers, properties, and synchronized source selection.
- CSV and JSON variable-data records bound to `^FN` fields, live record previews, and batch PNG export.
- Imported graphics and TrueType fonts plus portable ZPL and workspace ZIP exports.
- Self-contained shareable links that compress a label's source (and bound data) into the URL — no upload, no account.

[![Visual ZPL label designer with a drag-and-drop canvas, layers, guides, and field properties](https://raw.githubusercontent.com/le2ni/zplr/main/public/screenshots/zpl-visual-designer.png)](https://zplr.de/editor)

### Variable-data label workflows

Import CSV or JSON, map columns to numbered ZPL fields, preview each record, and export a PNG batch from one label template.

[![ZPL variable-data manager with CSV and JSON records prepared for batch label export](https://raw.githubusercontent.com/le2ni/zplr/main/public/screenshots/zpl-variable-data.png)](https://zplr.de/editor)

Your ZPL, imported datasets, images, and fonts are processed on your device. The editor has no account requirement, label-upload endpoint, or server-side label processing. See the [editor guide](./docs/EDITOR.md) for workflows and shortcuts.

## Supported ZPL commands and barcodes

The `zpl-ii-2025` renderer profile is pinned to the Zebra Programming Guide published October 10, 2025. It recognizes more than 200 ZPL command identities across rendering, job state, storage, control, printer, network, and RFID categories.

The current profile contains:

- **95 supported** rendering and job commands.
- **11 partially supported** commands with explicit limitations.
- **1 unsupported** rendering or job commands.
- **116 recognized, raster-neutral** device, network, printer, and RFID commands.

Supported barcode paths include Code 128, Code 39, UPC, EAN, QR Code, Data Matrix, PDF417, Aztec, MaxiCode, Codablock, Code 49, and additional linear, postal, stacked, and 2D formats. Check the generated [command-support table](./docs/COMMAND_SUPPORT.md) and [conformance map](./docs/CONFORMANCE.md) for the exact status and limitations of each command.

ZPLr renders labels; it does not perform printing, networking, RFID operations, or filesystem resource lookup.

## Diagnostics, limits, and failure behavior

Syntax and semantic failures, unsupported behavior, missing resources, and safety-limit violations resolve through structured diagnostics:

```ts
const job = await renderZpl(maybeInvalidSource);

for (const diagnostic of job.diagnostics) {
  console.log(
    diagnostic.code,
    diagnostic.severity,
    diagnostic.phase,
    diagnostic.command,
    diagnostic.span,
  );
}
```

Parameters that Zebra defines as ignored or defaulted follow those rules without inventing an error. Operational failures from a host Canvas adapter or user-supplied callback/provider reject the render promise. Stable codes are documented in the [diagnostic catalog](./docs/DIAGNOSTICS.md).

Defaults limit each dimension to 32,768 dots; each label or temporary field raster and the cumulative output of one render call to 40 million pixels; each decompressed graphic to 16 MiB; session resources to 32 MiB; stored-format depth to 16; expanded commands to 100,000; and output labels to 10,000. Every limit is configurable through `RenderJobOptions.limits`.

## Determinism and conformance

Rendering algorithms are verified against stable physical-printer preview captures. Representative raster hashes, physical-printer dot-matrix fixtures, independent barcode decoding, source spans, session state, malformed input, resource limits, and Node/browser parity are tested.

The external preview oracle is development-only. Normal rendering remains deterministic and offline. Bundled text uses only redistributable open-source font data.

## Common use cases

- **Shipping labels** — inspect addresses, tracking barcodes, routing blocks, and print dimensions.
- **Retail and inventory labels** — render UPC, EAN, Code 128, Data Matrix, QR, and item-label templates.
- **Variable-data templates** — supply values for `^FN` fields or bind CSV/JSON records in the editor.
- **Application previews** — embed ZPL parsing and rendering in Node.js services or browser interfaces.
- **Developer tooling** — build validators, source-aware editors, label inspectors, and regression tests.

## Documentation

- [Usage guide](./USAGE.md)
- [ZPL command support](./docs/COMMAND_SUPPORT.md)
- [Conformance map](./docs/CONFORMANCE.md)
- [Diagnostic codes](./docs/DIAGNOSTICS.md)
- [Online editor guide](./docs/EDITOR.md)
- [0.2 → 0.3 migration guide](./MIGRATION.md)
- [Release policy](./docs/RELEASE.md)

## Frequently asked questions

### Can I preview ZPL online without uploading my label?

Yes. The [online ZPL viewer](https://zplr.de/editor) runs the parser and renderer locally, so your label source and imported data do not need to leave the browser for processing.

### Can I use ZPLr in both Node.js and a browser application?

Yes. The `zplr` import selects the browser entry in browser bundlers and the Node entry in Node.js. Use `zplr/node` or `zplr/web` to choose explicitly. Both entries expose typed parsing and rendering APIs from the same engine.

### Can ZPLr export labels as PNG images?

Yes. `renderZplPNG()` returns `Buffer[]` in Node.js and `Blob[]` in browsers. The online editor can export the active label or a batch of variable-data records as PNG files.

### Is ZPLr a full Zebra printer emulator?

No. ZPLr models the ZPL behavior needed to parse jobs and produce label rasters. Device-only actions such as physical printing, network configuration, RFID operations, and filesystem lookup are recognized where documented but are not executed.

## 0.3 API stability

0.3.0 removes the 0.2 compatibility layer and freezes the API described in [api/0.3.0.json](./api/0.3.0.json). A 0.3.x release may add compatible functionality but cannot remove or reinterpret that surface. Read the [migration guide](./MIGRATION.md) before upgrading.

If stabilization reveals another necessary break, it will ship as 0.4.0 and restart the candidate cycle. 1.0.0 will promote the validated 0.3 API without a feature or API redesign. The complete process is in the [release policy](./docs/RELEASE.md).

## Development

```bash
pnpm install
pnpm exec playwright install chromium firefox webkit
pnpm run verify
pnpm run test:e2e
pnpm run audit
```

See [CONTRIBUTING.md](./CONTRIBUTING.md), [SECURITY.md](./SECURITY.md), and [SUPPORT.md](./SUPPORT.md).

## License and affiliation

ZPLr is available under the [MIT License](./LICENSE).

Third-party code and fonts retain the licenses recorded in
[THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md). Keep these notices when
redistributing bundled builds. The npm package includes both documents; the
static website build includes `/license.txt` and `/third-party-notices.txt`.

ZPL, ZPL II, Zebra, Zebra Programming Language, and related marks belong to Zebra Technologies Corp. ZPLr is an independent open-source project and is not affiliated with, sponsored by, endorsed by, or certified by Zebra Technologies. See [TRADEMARKS.md](./TRADEMARKS.md).
