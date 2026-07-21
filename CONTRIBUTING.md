# Contributing

Use Node 24 and the pinned pnpm version. Node 22 remains a CI compatibility target.

```bash
pnpm install --frozen-lockfile
pnpm run verify
pnpm run test:e2e
pnpm run audit:prod
```

Add parser, semantic, and raster evidence when changing command behavior. Update the capability catalog only when all rendering-affecting behavior is complete; device-only commands must remain byte-for-byte raster-neutral. Run the documentation generators rather than editing generated command, diagnostic, or conformance files.

Changes to the 0.3 public surface must be backward compatible with `api/0.3.0.json`. Breaking proposals target a new 0.4 candidate cycle. Keep diagnostics structured, deterministic, source-linked, and free of console output.

Pull requests should explain behavior, tests, security/resource implications, and migration impact. By contributing, you agree that your contribution is licensed under MIT.
