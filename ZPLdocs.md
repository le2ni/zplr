# ZPL II 2025 renderer profile

ZPLr targets deterministic label preview against Zebra's ZPL II guide published
October 10, 2025. The runtime catalog is the sole capability source
for parsing, lookup, playground explanations, and the generated
[223-command support table](./docs/COMMAND_SUPPORT.md).

## Capability meanings

- **supported** means the command is interpreted or rendered deterministically.
- **partial** means useful behavior is implemented and the catalog lists the
  remaining variants explicitly.
- **unsupported** means the identity is recognized but its rendering behavior
  is not implemented.
- **non-rendering** means printer, calibration, networking, or RFID behavior
  is recognized and reported but intentionally has no label-raster effect.

The current catalog contains 94 supported, 11 partial, 2 unsupported, and 116
recognized non-rendering command identities. The generated table is the exact
source for each limitation.

Unknown commands and commands used with the wrong prefix are separate
diagnostics. Full identities matter: `^JB` and `~JB` do not collapse to
the same command.

## Deterministic rendering model

The canonical surface is a one-bit raster:

```text
bit order:  MSB first
black dot:  1
stride:     ceil(width / 8)
tail bits:  always zero
```

Fields are resolved into ordered scene geometry, rasterized with integer or
fixed-point primitives, and only then expanded to RGBA. Canvas is an adapter,
not a source of geometry. Text uses embedded font bytes and outline
rasterization without host font APIs or antialiasing.

Implemented geometry includes boxes and rounded boxes, circles, ellipses,
diagonal lines, bitmap blits, four field orientations, 180-degree print
orientation, mirroring, field reverse, and label reverse/XOR composition.

## State and job behavior

The parser retains ordered commands outside `^XA` / `^XZ` and also
exposes `document.labels` as a label-only convenience view. The interpreter models
field, format, job, and printer-session scopes. An explicit render session
preserves:

- format and field defaults such as `^PW`, `^LL`, `^LS`, `^LT`, `^PO`,
  `^LR`, `^LH`, `^FW`, `^CF`, `^CI`, `^BY`, `^MU`, `^MN`, `^ML`,
  `^MC`, `^CV`, and `^PA`;
- changed caret, tilde, and delimiter characters;
- downloaded graphics, stored formats, memory aliases, and retained images;
- RTC settings and offsets;
- `^CW` font mappings, `^FL` font links, downloaded fonts, and encodings.

`renderZpl()` creates a fresh session for every job.
Virtual-printer clock components are read and updated in UTC so a fixed
`RenderJobOptions.clock` produces the same numeric `^FC` output in every host
time zone. Localized weekday and month names still depend on host `Intl` data.

## Text

Font 0 uses bundled Noto Sans Condensed outline data. Font A uses bundled
Spleen 5x8 bitmap data. These are deterministic open-font approximations; the
project does not claim proprietary Zebra glyph parity.

`^A@` and `^CW` use the asynchronous `FontProvider` interface. Native
TrueType/OpenType files downloaded with `~DY` render directly. Legacy `~DS`,
`~DT`, `~DU`, and TTE downloads are supplied to the provider as a
`DownloadedFontSource`; the provider returns an OpenType-compatible
representation. An unresolved name substitutes Font 0 and produces a warning.

`^CI` supports the documented international replacement tables, downloaded
single- and double-byte encodings, CP850/Windows code pages, Shift-JIS,
EUC-JP, GB18030, UTF-8, and UTF-16. Field-hex input and remapping pairs feed
the same decoder.

Field blocks implement wrapping, explicit line breaks, soft hyphenation,
alignment, justification, line spacing, hanging indents, and documented
last-line overprint behavior.

## Graphics

`^GF` accepts ASCII hexadecimal, Zebra ASCII compression, raw binary, B64, and
Z64. Proprietary compressed-binary (C) payloads are diagnosed. Declared byte
counts, bytes per row, Base64 CRCs, and decompressed limits are validated
before allocation.

`~DG`, `^XG`, and `^ID` operate on private job/session memory. Resource
names are normalized ZPL names and never become host filesystem paths.

## Barcodes

The encoder surface covers every documented barcode command, including:

- linear, postal, retail, GS1 DataBar, and stacked families;
- Code 11, Code 39, Code 49, Code 93, Code 128, CODABLOCK, TLC39, LOGMARS,
  Codabar, MSI, Plessey, Planet, and the 2-of-5 variants;
- QR Models 1 and 2, including automatic/manual mixed data, structured append,
  raw-byte segments, and Kanji;
- Data Matrix ECC 0-140 and ECC 200, Aztec, MaxiCode, PDF417, and MicroPDF417;
- EAN-8, EAN-13, UPC-A, UPC-E, and supplemental symbols.

Symbols feed the same one-bit raster primitives. Human-readable lines use the
deterministic font engine. Conformance tests decode the completed rasters with
an independent test-only decoder and verify payloads, computed check digits,
orientation, and geometry.

## Stored formats

`^DF`, `^XF`, and `^FN` provide in-memory templates. Expansion
supports assignments, nested recalls, definition/invocation related spans,
recursion detection, depth limits, and an expanded-command limit.

Physical printing, calibration, networking, RFID, and other device-only side
effects are recognized but deliberately do not alter the label raster.
