# Copilot instructions for ZPLr

ZPLr 0.3 is an ESM library for Node 22/24 and evergreen browsers. The renderer profile is pinned to the October 10, 2025 ZPL guide.

The only render architecture is:

```text
source → documentParser → job/session semantics → interpreter → packed raster → host Canvas
```

Do not add command classes, a Canvas-geometry renderer, global printer state, host-font rendering, prefixless capability lookup, or any removed 0.2 API. `zplr` and `zplr/node` are the Node surface; `zplr/web` is browser-only. Public API changes must remain compatible with `api/0.3.0.json` throughout 0.3.x.

Syntax and semantic failures plus exceeded safety limits use structured diagnostics; documented parameter defaults and ignore rules remain silent. Operational failures from Canvas adapters and user-supplied callbacks/providers reject. Every highlight uses an end-exclusive UTF-16 `sourceSpan`, and every rendered label has a Canvas.

Before claiming command support, add parser, semantic, and raster evidence. Device-only commands must be recognized and packed-raster neutral. Regenerate support, diagnostic, and conformance documentation and run `pnpm run verify`.
