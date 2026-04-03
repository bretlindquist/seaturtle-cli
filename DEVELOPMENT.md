# Development

This repo is not a normal source checkout with a committed lockfile, tsconfig,
and lint/test setup.

The authoritative development path is the build script:

```bash
node scripts/build-cli.mjs --no-minify
```

That script:

- extracts the source-map-backed workspace into `.cache/workspace/`
- writes the generated workspace `package.json` and `tsconfig.json`
- installs overlay dependencies with `npm`
- bundles the CLI with `bun`

## Prerequisites

- Node.js `>=20`
- npm
- Bun `>=1.1`

## Canonical Checks

Use the repo-level check script:

```bash
npm run dev-check
```

Today that means:

1. verify `node`, `npm`, and `bun`
2. run the unminified build
3. smoke-test the built CLI with `node dist/cli.js --help`

## Generated Paths

- `.cache/workspace/`
  - generated overlay workspace
  - do not edit directly
- `dist/`
  - generated build output

## Editing Guidance

- edit source under `source/src/`
- rebuild after changes
- treat `.cache/workspace/` as disposable/generated
- if the workspace gets stale, remove `.cache/workspace/.prepared.json` and rebuild

## Shell Environment

For scripted and login-shell use, make sure `bun` is available outside
interactive shells too. A login shell should resolve:

```bash
zsh -lc 'bun --version'
```
