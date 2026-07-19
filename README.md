# ZPLr

A TypeScript library for parsing and rendering a documented subset of ZPL II in Node.js and web browsers.

ZPLr targets the bundled 2006 ZPL II Programming Guide. Parsing is tolerant and source-preserving: unknown or unsupported commands remain in the document model and produce structured diagnostics instead of console output.

## Installation

```bash
npm install zplr
# or
pnpm add zplr
```

The Node entry point uses the optional `skia-canvas` package:

```bash
pnpm add skia-canvas
```

## Existing API

The existing environment-specific entry points remain supported.

### Node.js

```typescript
import { parse, render } from "zplr/node";

const labels = parse("^XA^FO100,100^FDHello World^FS^XZ");
const canvas = await render(labels[0], 400, 600);
await canvas.toFile("output.png");
```

### Browser

```typescript
import { parse, render } from "zplr/web";

const labels = parse("^XA^FO100,100^FDHello World^FS^XZ");
const canvas = await render(labels[0], 400, 600);
document.body.appendChild(canvas);
```

`parseAndRender` and the environment-specific PNG helpers remain available. Rendering a parsed label is immutable and repeatable.

The legacy command-object interfaces are deprecated but remain available through the 0.2 release line. Their removal is planned no earlier than 0.3.

## Document API

New integrations should use the document API when diagnostics or unsupported-command visibility matter.

```typescript
import { parseDocument, renderDocument } from "zplr/node";

const document = parseDocument("^XA^FO100,100^FDHello World^FS^XZ", {
  profile: "zpl-ii-2006",
});

const results = await renderDocument(document, {
  width: 400,
  height: 600,
  dpi: 300,
});

for (const diagnostic of results[0].diagnostics) {
  console.log(diagnostic.code, diagnostic.message, diagnostic.span);
}

await results[0].canvas.toFile("output.png");
```

`parseDocument` preserves label boundaries, command prefixes, raw parameters, active delimiters, and end-exclusive source spans. It recognizes changed caret, tilde, and delimiter characters as well as the STX, ETX, and SI control-character alternatives.

## Command support

The runtime source of truth is `commandCapabilities`, exported from both entry points.

| Status | Commands |
| --- | --- |
| Supported | `^A`, `^B3`, `^BY`, `^CC`/`~CC`, `^CD`/`~CD`, `^CF`, `^CT`/`~CT`, `^FB`, `^FD`, `^FH`, `^FO`, `^FR`, `^FS`, `^FW`, `^FX`, `^GB`, `^GC`, `^LH`, `^LR`, `^XA`, `^XZ` |
| Partial | `^BC` (modes N and A), `^BQ` (Model 2 normal mode; automatic/manual N, A, and B input) |
| Unsupported | `^A@`, `^B4`, `^CI`, and commands not listed above |

Unsupported commands are retained in `ZplDocument` and reported. They are never silently substituted with another symbology or behavior.

Font A and font 0 use cross-platform approximations. ZPLr honors requested dot dimensions, orientation, field-block layout, and field/label reverse behavior, but it does not promise dot-identical Zebra printer glyphs.

## Public types

- `ZplDocument`, `ZplLabelNode`, and `ZplCommandNode`
- `SourceSpan` and `ZplDiagnostic`
- `ParseDocumentOptions` and `RenderDocumentOptions`
- `CommandCapability` and `CommandCapabilityStatus`
- Legacy `CommandClass`, `Orientation`, and `RenderContext` types

## Development

```bash
pnpm install
pnpm test
pnpm run typecheck
pnpm run typecheck:web
pnpm run build
pnpm run dev:web
```

Use `pnpm run test:watch` for watch mode and `pnpm run test:conformance` for the parser, interpreter, and renderer suite.

The implementation pipeline is:

```text
ZPL source -> source-preserving document -> semantic field layout -> shared renderer -> Node/Web canvas
```

The command capability table and detailed profile notes are in [ZPLdocs.md](./ZPLdocs.md).

## License

MIT
