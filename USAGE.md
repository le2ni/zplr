# ZPLr Usage Guide

ZPLr exposes explicit Node.js and browser entry points. There is intentionally no ambiguous root export.

## Node.js

```typescript
import {
  parse,
  render,
  parseDocument,
  renderDocument,
} from "zplr/node";
```

### Compatibility API

The command-object interfaces used by this API are deprecated, retained through 0.2, and planned for removal no earlier than 0.3. The function signatures remain compatible during that window.

```typescript
const labels = parse("^XA^FO20,20^FDCompatibility API^FS^XZ");
const canvas = await render(labels[0], 400, 300);
await canvas.toFile("label.png");
```

### Diagnostic document API

```typescript
const document = parseDocument("^XA^FO20,20^FDDocument API^FS^XZ");
const [result] = await renderDocument(document, {
  width: 400,
  height: 300,
  dpi: 300,
});

for (const diagnostic of result.diagnostics) {
  console.log(diagnostic.severity, diagnostic.code, diagnostic.message);
}

await result.canvas.toFile("label.png");
```

Node rendering requires `skia-canvas`. It is optional at package-install time so browser-only consumers do not load a native dependency.

## Browser

```typescript
import {
  parse,
  render,
  parseDocument,
  renderDocument,
} from "zplr/web";

const document = parseDocument("^XA^FO20,20^FDWeb label^FS^XZ");
const [result] = await renderDocument(document, {
  width: 400,
  height: 300,
});

document.body.appendChild(result.canvas);
```

`renderAdvanced` and `parseAndRenderAdvanced` return highlight regions for editor integrations. `findCommandAtPosition` maps source offsets to legacy parsed commands, and `findCommandAtCoordinate` maps canvas coordinates to rendered regions.

## Multiple labels

```typescript
const document = parseDocument(`
^XA^FO20,20^FDLabel 1^FS^XZ
^XA^FO20,20^FDLabel 2^FS^XZ
`);

const results = await renderDocument(document, {
  width: 400,
  height: 300,
});
```

One render result is returned per explicit or tolerated implicit label.

## Diagnostics

Parsing retains malformed, unknown, and unsupported commands. Typical diagnostic codes include:

- `UNKNOWN_COMMAND`
- `UNSUPPORTED_COMMAND`
- `IMPLICIT_LABEL`
- `UNTERMINATED_FORMAT`
- `UNTERMINATED_FIELD`
- `INVALID_BARCODE_DATA`
- `FONT_SUBSTITUTED`

Parser diagnostics never throw for user-supplied ZPL. Canvas initialization and other platform failures can still throw.

## Profiles and DPI

The only current profile is `zpl-ii-2006`, based on the guide bundled with the repository. Later extensions such as `^CI28` are retained and diagnosed as unsupported.

The default render DPI is 300. Pass 150, 200, 300, or 600 when command defaults such as QR magnification need another print-head resolution.

## Capability discovery

```typescript
import { commandCapabilities } from "zplr/node";

for (const capability of commandCapabilities) {
  console.log(capability.code, capability.status, capability.limitations);
}
```

Only commands marked `supported` have complete behavior for the documented subset. `partial` entries list their unsupported modes explicitly.
