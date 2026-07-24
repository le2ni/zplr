# ZPLr

ZPLr 0.3 is a deterministic ZPL and ZPL II parser and label renderer for ESM applications on Node.js 22/24 and evergreen browsers. It parses complete jobs, interprets virtual-printer state, renders a packed one-bit raster, and expands that raster to a required platform Canvas.

The renderer profile is pinned to Zebra's ZPL programming guide published October 10, 2025. Deterministic output does not claim proprietary Zebra font parity or pixel parity with a physical printer.

## Install

Node rendering uses the optional `skia-canvas` peer:

```bash
pnpm add zplr skia-canvas
```

Browser consumers install only ZPLr; the `zplr/web` entry neither resolves nor bundles `skia-canvas`.

## Render a job

`zplr` is the Node-default alias. `zplr/node` is equivalent and `zplr/web` supplies browser canvases.

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

```ts
import { renderZpl } from "zplr/web";

const job = await renderZpl(source, { printDensity: 8 });
document.body.append(job.labels[0].canvas);
```

Every label contains resolved dimensions, print density, an MSB-first packed raster, diagnostics, source-linked highlight regions, and a required `Canvas`/`HTMLCanvasElement`. `renderZplPNG()` returns `Buffer[]` in Node and `Blob[]` in browsers.

## Code and WYSIWYG editor

The local `/editor` workbench keeps Monaco source and a selectable label canvas synchronized. It supports multi-layer layout, variable-data records, imported graphics and TrueType fonts, and portable workspace archives without hiding the generated ZPL. See the [editor guide](./docs/EDITOR.md) for workflows and shortcuts.

## Parse and navigate source

```ts
import {
  findCommandAtOffset,
  findHighlightRegionAtPoint,
  parseDocument,
} from "zplr";

const document = parseDocument(source);
const command = findCommandAtOffset(document, cursorOffset);
const region = findHighlightRegionAtPoint(job.labels[0].highlightRegions, x, y);
console.log(command?.canonical, region?.sourceSpan);
```

Command capability lookup requires the full identity: `getCommandCapability("^FO")` and `getCommandCapability("~DG")`. Prefixless lookups return `undefined`.

## Persistent sessions

`renderZpl()` starts with fresh virtual-printer state. Use a session when syntax characters, settings, graphics, stored formats, encodings, or fonts must persist:

```ts
import { createRenderSession, parseDocument } from "zplr";

const printer = createRenderSession({ printDensity: 8 });
await printer.render("~DGR:MARK.GRF,1,1,80");
const parsed = parseDocument("^XA^PW400^LL240^FO20,20^XGR:MARK.GRF,4,4^FS^XZ");
const result = await printer.renderDocument(parsed);
await printer.reset();
```

Session operations are FIFO-serialized and state is never global.

## Diagnostics, limits, and failure behavior

Syntax and semantic failures, unsupported behavior, missing resources, and safety-limit violations resolve through structured diagnostics. Parameters that Zebra defines as ignored or defaulted follow those rules without inventing an error. Operational failures from a host Canvas adapter or a user-supplied callback/provider reject the render promise. See the stable [diagnostic-code catalog](./docs/DIAGNOSTICS.md).

Defaults limit each dimension to 32,768 dots, each label or temporary field raster and the cumulative output of one render call to 40 million pixels, each decompressed graphic to 16 MiB, session resources to 32 MiB, stored-format depth to 16, expanded commands to 100,000, and output labels to 10,000. All limits are configurable downward or upward through `RenderJobOptions.limits`.

## Profile and evidence

The pinned profile currently contains 94 supported, 11 partially supported, and 2 unsupported rendering/job command identities. The remaining 116 device, network, printer, and RFID commands are recognized and raster-neutral. Exact limitations are listed in the generated [command table](./docs/COMMAND_SUPPORT.md) and [conformance map](./docs/CONFORMANCE.md).

Representative raster hashes, independent barcode decoding, source spans, session state, malformed input, resource limits, and Node/browser parity are tested. ZPLr does not perform printing, networking, RFID operations, or filesystem resource lookup.

## 0.3 API freeze

0.3.0 removes the 0.2 compatibility layer and freezes the API described in [api/0.3.0.json](./api/0.3.0.json). A 0.3.x release may add compatible functionality but cannot remove or reinterpret that surface. Read the [0.2 → 0.3 migration guide](./MIGRATION.md) before upgrading.

If stabilization reveals another necessary break, it will ship as 0.4.0 and restart the candidate cycle. 1.0.0 will promote the validated 0.3 API without a feature or API redesign. The complete process is in the [release policy](./docs/RELEASE.md).

## Development

```bash
pnpm install
pnpm exec playwright install chromium firefox webkit
pnpm run verify
pnpm run test:e2e
pnpm run audit
```

See [CONTRIBUTING.md](./CONTRIBUTING.md), [SECURITY.md](./SECURITY.md), and [SUPPORT.md](./SUPPORT.md). Bundled-font terms are in [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).

## License and affiliation

MIT. ZPL, ZPL II, Zebra, and related marks belong to Zebra Technologies Corp. ZPLr is an independent open-source project and is not affiliated with, endorsed by, or certified by Zebra Technologies. See [TRADEMARKS.md](./TRADEMARKS.md).
