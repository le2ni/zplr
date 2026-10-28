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

The current catalog contains 95 supported, 11 partial, 1 unsupported, and 116
recognized non-rendering command identities. The generated table is the exact
source for each limitation.

Unknown commands and commands used with the wrong prefix are separate
diagnostics. Full identities matter: `^JB` and `~JB` do not collapse to
the same command.

## Rendering audit — October 3, 2026

The audit compared the implementation and regression tests with Zebra's command
reference. It began with 11 partial and two unsupported rendering/job commands.
`^JM` logical-dot scaling is now fully implemented in the preview profile.
Other fixes improve individual behaviors without claiming full printer-firmware
equivalence. No new third-party dependency or Unicode data is bundled; text
segmentation and localized clock names use native runtime APIs.

| Area | Fix and remaining boundary | Evidence |
| --- | --- | --- |
| [`^JM`](https://docs.zebra.com/content/tcm/us/en/printers/software/zpl-pg/advanced-techniques/set-dots-millimeter.html) | Full/half density, persistent state, logical-dot expansion, physical measurement units, clipping, highlights, and retained-raster composition. Physical `printDensity` remains the output raster's density. | `renderingGaps.test.ts` |
| [`^SF`](https://docs.zebra.com/us/en/printers/software/zpl-pg/zpl-commands/%5Esf.html) | Masks run after `^FH`/`^CI` decoding, ignore controls and bidi markers, and preserve skipped clusters and mixed-radix carries. Clusters use native `Intl.Segmenter` when available, otherwise code points; Unicode behavior depends on the runtime, so support remains partial. | `renderingGaps.test.ts` |
| [`^FT`](https://docs.zebra.com/us/en/printers/software/zpl-pg/zpl-commands/%5Eft.html), `^FW` | Continuation of omitted coordinates, resident-font baselines in all rotations, the last possible `^FB` baseline, unclamped clipping, inherited justification, and bottom anchors for graphics/barcodes. Downloaded outline-font baselines still use em-cell metrics. | `renderingGaps.test.ts` |
| [`^FP`](https://docs.zebra.com/content/tcm/us/en/printers/software/zpl-pg/zpl-commands/%5Efp.html) | Reverse/vertical flow, wrapping, and caret offsets preserve grapheme clusters when native `Intl.Segmenter` is available; canonically equivalent accented text then produces the same raster. Contextual shaping and non-composable mark positioning still need a full text-layout engine. | `renderingGaps.test.ts`, `crossPlatform.test.ts` |
| [`^PA`](https://docs.zebra.com/us/en/printers/software/zpl-pg/zpl-commands/%5Epa.html) | Missing characters use a blank or the selected font's actual default glyph according to the switch; linked fonts are tried first. Bidi, shaping, and OpenType tables remain a subset. | `renderingGaps.test.ts`, `renderingCommands.test.ts` |
| [`^TB`](https://docs.zebra.com/us/en/printers/software/zpl-pg/zpl-commands/%5Etb.html) | The complete `<< >` literal escape is consumed, wrapping preserves clusters when native segmentation is available, and auto justification follows the script. Other firmware escape instructions and complex layout remain partial. | `renderingGaps.test.ts` |
| `~DY` PNG images | All standard PNG color types/depths, Adam7 passes, and 16-bit transparency matching are decoded with bounded working memory. Other image formats retain their listed limitations; BAR-ONE AR compression remains unsupported. | `pngDecoder.test.ts`, [PNG specification](https://www.w3.org/TR/png-3/) |
| `^FC`, `^KL`, `^SL` | Localized names retain the existing native `Intl.DateTimeFormat` behavior. Host locale data and printer-specific translations/abbreviations can differ; no additional vocabulary is bundled. | `renderingGaps.test.ts`, `renderingCommands.test.ts` |
| [`^CI`](https://docs.zebra.com/us/en/printers/software/zpl-pg/c-zpl-zpl-commands/r-zpl-ci.html) | Resource-dependent Asian encodings require the corresponding downloaded conversion table; ambiguous EUC-CN and non-GB18030 variants are not guessed. No new mapping table is bundled. | `renderingCommands.test.ts` |
| [`^GF` C](https://docs.zebra.com/content/tcm/us/en/printers/software/zpl-pg/zpl-commands/%5Egf.html) | Zebra identifies a proprietary host compression algorithm without specifying its byte-level decoder on the command page. A verified format description and input/output fixtures are still needed; unsupported data remains diagnosed. | `graphicDecoder.test.ts`, `renderingCommands.test.ts` |
| [`^SZ` 1](https://docs.zebra.com/us/en/printers/software/zpl-pg/zpl-commands/%5Esz.html) | Selecting original ZPL requires a separate compatibility model and fixtures. It remains explicitly unsupported in this ZPL II profile. | `capabilities.test.ts`, `commandConformance.test.ts` |

The density tests also exposed overlapping edge writes in thick reversed boxes.
Those writes now visit each dot once, preserving `^FR`/`^LR` XOR behavior.
The catalog continues to report eleven partial commands and one unsupported
command; this audit does not claim complete Zebra firmware emulation.

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
time zone. Localized weekday and month names use native `Intl.DateTimeFormat`;
runtime locale data and printer firmware can use different wording or
abbreviations.

## Text

Font 0 uses bundled TeX Gyre Heros Condensed Bold outline data. Font A and the
built-in barcode interpretation line use bundled Spleen 5x8 bitmap data.
Width, height, baseline, and dot-grid behavior are calibrated against stable
printer-preview rasters. These are deterministic open-font assets.

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
