# ZPLr usage

ZPLr exposes explicit `zplr/node` and `zplr/web` entry points. New code
should use the job API.

## Fresh render

```ts
import { renderZpl, type RenderJobOptions } from "zplr/node";

const options: RenderJobOptions = {
  printDensity: 8,
  // width: 812,  // optional dot override
  // height: 1218,
  limits: {
    maxPixels: 40_000_000,
  },
};

const job = await renderZpl(source, options);

for (const diagnostic of job.diagnostics) {
  console.log(
    diagnostic.severity,
    diagnostic.code,
    diagnostic.span,
    diagnostic.message
  );
}

for (const label of job.labels) {
  console.log(label.width, label.height, label.raster.stride);
  await label.canvas.toFile("label.png");
}
```

The packed raster uses MSB-first rows, a stride of `ceil(width / 8)`, and a
set bit for a black dot. Unused tail bits are zero.

In the browser, import from `zplr/web`; each label's `canvas` is an
`HTMLCanvasElement`. `renderZplPNG()` returns PNG buffers in Node and PNG
`Blob` objects in the browser.

## Stateful render session

```ts
import { createRenderSession } from "zplr/node";

const session = createRenderSession({ printDensity: 12 });

await session.render("^CC!");                 // changed syntax persists
await session.render("!XA!PW600!LL400!XZ");   // settings persist

const parsedElsewhere = parseDocument("!XA!FO20,20!FDHi!FS!XZ", {
  initialSyntax: { formatPrefix: "!" },
});
await session.renderDocument(parsedElsewhere);

await session.reset();
```

Calls made concurrently are executed in FIFO order, including `reset()`.
Downloaded graphics, stored formats, font aliases, syntax characters, and
session-scoped settings are private to that session.

## Custom fonts

Font 0 and Font A are bundled. Resolve `^A@` and `^CW` names without
granting filesystem access to the renderer. When `source` is present, it is a
font downloaded by `~DS`; convert its Intellifont bytes and return
OpenType-compatible bytes:

```ts
const job = await renderZpl(source, {
  fontProvider: {
    async resolveFont(name, source) {
      if (source?.format === "intellifont") {
        return convertIntellifontToOpenType(source.data);
      }
      if (name !== "R:BRAND.TTF") return undefined;
      return fetch("/fonts/brand.ttf").then((response) => response.arrayBuffer());
    },
  },
});
```

The provider is asynchronous and cached per render operation. Missing or
invalid fonts fall back to deterministic Font 0 with `FONT_SUBSTITUTED`.

## Graphics and stored formats

The session recognizes normalized ZPL resource names such as
`R:LOGO.GRF` and `R:PACKING.ZPL`. Resources never map to host paths.

```zpl
~DGR:DOT.GRF,1,1,80
^XA
^DFR:CARD.ZPL
^FO20,20^XGR:DOT.GRF,4,4^FS
^FO40,40^FN1^FS
^XZ
^XA
^PW400
^LL240
^XFR:CARD.ZPL
^FN1^FDOrder 42^FS
^XZ
```

Recursive recalls, missing resources, corrupt CRCs, invalid lengths, and
resource limits are diagnostics. `^GF` supports ASCII, compressed ASCII, raw
binary, compressed binary, B64, and Z64 payloads.

## Capability lookup

```ts
import {
  commandCapabilities,
  getCommandCapability,
} from "zplr/node";

getCommandCapability("^JB"); // distinct from ~JB
getCommandCapability("FO");  // compatibility lookup, only if unambiguous
```

New code should always pass the full command identity. The generated
[command support table](./docs/COMMAND_SUPPORT.md) comes from the same runtime
catalog.

## Legacy compatibility

```ts
import { parse, render } from "zplr/node";

const labels = parse(source);
const canvas = await render(labels[0], 812, 1218);
```

These compatibility signatures remain operational and parsed labels use the
canonical raster renderer. New code should use `renderZpl()` or
`createRenderSession()`.
