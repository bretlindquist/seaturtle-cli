# Production Handoff

This doc lists the smallest practical file sets for handing SeaTurtle to
someone else without dragging along caches, git metadata, or other local noise.

It separates two use cases:

- source-complete handoff
- already-built runtime handoff

## Source-Complete Handoff

Use this when the recipient should be able to build SeaTurtle themselves.

Keep:

- `source/`
- `scripts/`
- `bin/`
- `docs/`
- `package.json`
- `README.md`
- `.gitignore`

Current approximate payload size:

- `123.7 MB`

Current largest contributor:

- `source/` at about `122 MB`

## Built Runtime Handoff

Use this when the recipient should receive a runnable built artifact rather
than the full source needed to rebuild.

Keep:

- `dist/`
- `bin/`
- `package.json`
- `README.md`
- `.gitignore`

Current approximate payload size:

- `57.1 MB`

Current largest contributor:

- `dist/` at about `54 MB`

## Intentionally Excluded

These are not part of the minimal production handoff:

- `.git/`
- `.cache/`
- `.ct/`
- `node_modules/`
- `.claude/`
- `.codex/`
- coverage and other local build/test leftovers

## Why This Exists

The raw working folder size is much larger than the real handoff payload.

Current rough sizes:

- working folder: `516 MB`
- tracked repo contents: `123.8 MB`

So this doc exists to keep the handoff honest:

- what is actually needed
- what is just local weight

## Notes

- This is a practical handoff list, not a legal or packaging manifest.
- If SeaTurtle later gains a formal release packaging workflow, that workflow
  should supersede this manual list.
