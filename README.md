# ZPLr

ZPLr is a deterministic ZPL and ZPL II label renderer for Node.js and browsers.
It parses complete jobs, interprets printer state, renders to a packed one-bit
raster, and then expands that raster to a platform Canvas. The canonical
output never depends on Canvas drawing, host fonts, antialiasing, or locale.

The declared profile is pinned to Zebra's
[ZPL guide](https://docs.zebra.com/us/en/printers/software/zpl-pg/zpl-ii,-zbi-2,-set-get-do,-mirror,-wml-programming-guide.html)
published October 10, 2025. Every command that can affect label dots or an
in-memory rendering resource is implemented. The remaining documented
printer, network, and RFID commands are recognized as non-rendering device
operations. Unknown commands produce structured diagnostics; they are never
silently discarded.

## Install

```bash
pnpm add zplr
```

Node rendering uses the optional `skia-canvas` adapter:

```bash
pnpm add skia-canvas
```

## Render a job

```ts
import { renderZpl } from "zplr/node";

const result = await renderZpl(`
^XA
^CI28
^PW812
^LL1218
^FO40,40^A0N,42,24^FDDeterministic label^FS
^FO40,120^BQN,2,5,Q,7^FDQA,HELLO-ZPL^FS
^XZ
`);

const label = result.labels[0];
console.log(label.width, label.height, label.raster.bitOrder);
console.log(result.diagnostics);
await label.canvas.toFile("label.png");
```

The browser entry point has the same API and attaches an
`HTMLCanvasElement`:

```ts
import { renderZpl } from "zplr/web";

const result = await renderZpl(source, { printDensity: 8 });
document.body.append(result.labels[0].canvas);
```

Each rendered label includes its resolved dimensions, print density,
MSB-first packed raster, diagnostics, source-linked highlight regions, and
the platform Canvas.

## Persistent sessions

`renderZpl()` always starts with a fresh virtual printer. Use an explicit
session for settings, syntax characters, downloaded graphics, stored formats,
and font mappings that must survive between calls:

```ts
import { createRenderSession } from "zplr/node";

const printer = createRenderSession({ printDensity: 8 });

await printer.render("~DGR:MARK.GRF,1,1,80");
const result = await printer.render(
  "^XA^PW400^LL240^FO20,20^XGR:MARK.GRF,4,4^FS^XZ"
);

await printer.reset();
```

`render`, `renderDocument`, and `reset` operations are FIFO-serialized.
No state is global or shared between sessions.

## Dimensions and density

Each label is resolved independently:

1. explicit `width` / `height` options;
2. active `^PW` / `^LL`;
3. a documented 4 × 6 inch fallback.

Fallback use is reported with informational diagnostics. `printDensity`
accepts `6 | 8 | 12 | 24` dots/mm and defaults to 8. The deprecated
`dpi` values 150, 200, 300, and 600 remain available for compatibility.

## Rendering coverage

The renderer includes:

- all rendering layout, text, graphic, barcode, serialization, clock, and
  format-state commands in the pinned guide;
- every documented barcode family and relevant parameter mode, including
  structured `^FM` PDF417 and MicroPDF417;
- ASCII, compressed ASCII, raw binary, compressed binary, B64, and Z64 graphic
  payloads;
- session-scoped graphics, images, encodings, bitmap/outline fonts, stored
  formats, memory aliases, transfers, and deletion;
- ZPL and ZPL II selection through persistent `^SZ` state.

Font 0 and Font A are bundled. `^A@`, `^CW`, downloaded TrueType fonts, and
downloaded Intellifont resources use the asynchronous font-provider contract.
For `~DS`, the provider receives the original Intellifont bytes and returns an
OpenType-compatible representation for deterministic rasterization.

See the generated [complete command table](./docs/COMMAND_SUPPORT.md) for the
exact status and limitations of all 223 command identities. Prefix collisions
such as `^JB` and `~JB` are distinct capabilities.

## Diagnostics and limits

Malformed ZPL returns diagnostics and omits only affected output. Programmer
errors and unavailable platform adapters may still reject. Stable diagnostic
codes distinguish unknown commands, invalid prefixes, resource failures, and
allocation limits.

Default safety limits are 32,768 dots per dimension, 40 million pixels per
label, 16 MiB per decompressed graphic, 32 MiB of session resources, 16
stored-format expansion levels, and 100,000 expanded commands.

## Compatibility

The command-object `parse` / `render`, `parseAndRender*`, and current
`renderDocument` signatures remain available for compatibility. Parsed legacy
labels delegate to the canonical raster pipeline. These APIs are deprecated;
new code should use `renderZpl()` or `createRenderSession()`.

`"zpl-ii-2025"` is the default profile. `"zpl-ii-2006"` remains a deprecated
compatibility alias and emits a migration diagnostic.

## Development

```bash
pnpm install
pnpm test
pnpm run docs:support:check
pnpm run typecheck
pnpm run typecheck:web
pnpm run build
pnpm run build:web
```

The test suite pins representative raster hashes, verifies Node/browser
bit-for-bit equality, and decodes generated barcodes with an independent
test-only decoder.

Bundled-font redistribution terms are in
[THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).

## License

MIT
