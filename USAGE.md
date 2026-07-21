# ZPLr 0.3 usage

## Node

`zplr` and `zplr/node` expose the same Node API. Install the optional native peer before rendering.

```bash
pnpm add zplr skia-canvas
```

```ts
import { renderZpl, renderZplPNG, type RenderJobOptions } from "zplr";

const options: RenderJobOptions = {
  printDensity: 8,
  // Virtual-printer clock components are interpreted in UTC.
  clock: new Date("2025-10-10T12:00:00Z"),
  limits: { maxPixels: 10_000_000, maxLabels: 10 },
};
const job = await renderZpl(source, options);
const pngs = await renderZplPNG(source, options);
await job.labels[0].canvas.toFile("label.png");
console.log(pngs[0].byteLength, job.labels[0].raster.stride);
```

The packed raster uses MSB-first rows, `ceil(width / 8)` stride, one bit per black dot, and zeroed tail bits.

## Browser

```ts
import { renderZpl, renderZplPNG } from "zplr/web";

const job = await renderZpl(source);
const [png] = await renderZplPNG(source);
document.querySelector("main")!.append(job.labels[0].canvas);
const url = URL.createObjectURL(png);
```

The browser entry returns `HTMLCanvasElement` and `Blob` values and never references the Node Canvas peer.

## Parsed documents and sessions

```ts
import { createRenderSession, parseDocument } from "zplr";

const session = createRenderSession({ printDensity: 12 });
await session.render("^CC!");
await session.render("!XA!PW600!LL400!XZ");

const document = parseDocument("!XA!FO20,20!FDHi!FS!XZ", {
  initialSyntax: { formatPrefix: "!" },
});
const job = await session.renderDocument(document);
await session.reset();
```

Concurrent `render`, `renderDocument`, and `reset` calls execute in FIFO order. A rejected host/provider operation does not poison the queue.

## Source-linked UI

```ts
import { findCommandAtOffset, findHighlightRegionAtPoint, parseDocument } from "zplr/web";

const document = parseDocument(source);
const command = findCommandAtOffset(document, editorOffset);
const region = findHighlightRegionAtPoint(job.labels[0].highlightRegions, labelX, labelY);
if (region) selectEditorRange(region.sourceSpan.start, region.sourceSpan.end);
```

Offsets are UTF-16 and spans are end-exclusive. Point lookup evaluates regions from topmost to bottommost.

## Fonts

Font 0 and Font A are bundled deterministic open-font approximations. Resolve named or downloaded outline fonts without granting filesystem access:

```ts
const job = await renderZpl(source, {
  fontProvider: {
    async resolveFont(name, downloaded) {
      if (downloaded) {
        return convertPrinterFontToOpenType(downloaded.format, downloaded.data);
      }
      if (name !== "R:BRAND.TTF") return undefined;
      return fetch("/fonts/brand.ttf").then((response) => response.arrayBuffer());
    },
  },
});
```

Returning `undefined` produces deterministic `FONT_SUBSTITUTED`; throwing or rejecting is a user-provider failure and rejects rendering.

## Diagnostics

```ts
const job = await renderZpl(maybeInvalidSource);
for (const diagnostic of job.diagnostics) {
  console.log(
    diagnostic.code,
    diagnostic.severity,
    diagnostic.phase,
    diagnostic.command,
    diagnostic.span,
    diagnostic.relatedSpans,
  );
}
```

Syntax and semantic failures plus configured safety limits do not reject. Documented parameter defaults and ignore rules can remain silent. Use the stable [code catalog](./docs/DIAGNOSTICS.md) for control flow.

## Limits

`maxPixels` applies to each label or temporary field raster and cumulatively across all output labels produced by one `render` or `renderDocument` call. This bounds oversized fields as well as preventing a large `^PQ` quantity from multiplying an otherwise acceptable label allocation.

```ts
const safePreview = await renderZpl(untrustedSource, {
  width: 812,
  height: 1218,
  limits: {
    maxDimension: 4096,
    maxPixels: 5_000_000,
    maxGraphicBytes: 1_000_000,
    maxSessionBytes: 4_000_000,
    maxTemplateDepth: 8,
    maxExpandedCommands: 10_000,
    maxLabels: 5,
  },
});
```

## Capabilities

```ts
import { commandCapabilities, getCommandCapability } from "zplr";

getCommandCapability("^JB"); // distinct from ~JB
getCommandCapability("~DG");
getCommandCapability("FO");  // undefined: full identity required
```

No 0.2 command-object or index-based helper remains. See [MIGRATION.md](./MIGRATION.md).
