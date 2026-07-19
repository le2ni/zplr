# Copilot Instructions for ZPLr

ZPLr is a TypeScript library with explicit `zplr/node` and `zplr/web` entry points. The bundled 2006 ZPL II guide is the conformance baseline (`zpl-ii-2006`). Do not claim command support without parser, semantic, and rendering fixtures.

## Architecture

The primary pipeline is:

```text
ZPL source
  -> src/core/documentParser.ts
  -> src/core/interpreter.ts
  -> src/core/layoutRenderer.ts
  -> Node or browser canvas adapter
```

- `parseDocument()` preserves labels, commands, raw parameters, active delimiters, end-exclusive source spans, and diagnostics.
- `interpretLabel()` separates persistent label defaults from field-scoped state and creates immutable layout fields.
- `renderLayout()` is shared by Node and browser. Only canvas creation and canvas transfer are platform-specific.
- `src/core/capabilities.ts` is the sole command-capability registry. Documentation summaries must agree with it.
- The command classes under `src/commands/` are compatibility adapters. Do not add new behavior only to those classes.

Unknown, malformed, partial, and unsupported behavior must produce structured diagnostics. Do not use `console` output or silently substitute another command or symbology.

## Public compatibility

- Keep the explicit `./node` and `./web` package exports; do not add a root export.
- Preserve `parse`, `render`, `parseAndRender`, and the advanced browser signatures.
- Prefer `parseDocument` and `renderDocument` for new integrations.
- Legacy command interfaces remain through 0.2 and are planned for removal no earlier than 0.3.

## Development

Use pnpm and the `@/*` TypeScript alias. Before handing off changes, run:

```bash
pnpm test
pnpm run typecheck
pnpm run typecheck:web
pnpm run build
```

Use `pnpm run test:watch` only for interactive watch mode. Add conformance fixtures whenever capability status or parameter behavior changes.
