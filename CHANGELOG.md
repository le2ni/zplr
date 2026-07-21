# Changelog

All notable changes follow Keep a Changelog. ZPLr uses semantic versioning from 0.3.0 onward.

## [0.3.0] - Unreleased

### Added

- Stable job APIs: `renderZpl`, `renderZplPNG`, `createRenderSession`, and `parseDocument` on Node-default, Node, and web entry points.
- UTF-16 source navigation with `findCommandAtOffset` and source-linked raster navigation with `findHighlightRegionAtPoint`.
- Required Node/browser canvases, packed one-bit rasters, stable diagnostic documentation, resource limits, font providers, and FIFO virtual-printer sessions.
- Pinned October 10, 2025 command catalog with capability smoke coverage, category-specific semantic/raster evidence, and raster-neutral device-command verification.
- Seeded malformed-input and resource-limit fuzzing, package/API snapshots, tarball consumers, bundle budgets, and cross-browser playground gates.

### Changed

- `zplr` is now the Node-default alias; ESM on Node 22/24 and evergreen browsers is the supported runtime baseline.
- Command capability lookup requires a full identity such as `^FO` or `~DG`.
- Rendering now has one canonical parser → interpreter → packed-raster → platform-canvas pipeline.
- Syntax and semantic failures plus safety limits resolve through diagnostics; documented parameter defaults remain silent, while operational host-adapter and user-callback/provider failures reject.

### Removed

- The 0.2 command-class renderer, legacy `parse`/`render`, top-level `renderDocument`, `parseAndRender*`, advanced render helpers, index-based browser helpers, and legacy command/context types.
- The `dpi` option, `zpl-ii-2006` alias, prefixless capability lookup, and dependencies used only by the superseded Canvas pipeline.

### Release status

The package remains unreleased until `0.3.0-rc.1` passes external npm installation and Cloudflare preview testing. See `docs/RELEASE.md`.

## [0.2.0] - 2025-10-11

- Last release carrying the compatibility command-object API.
