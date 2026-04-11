# CT / seaturtle Branding And Compatibility

SeaTurtle uses `CT` as the primary user-facing name and `seaturtle` as an
equivalent wrapper alias.

The branding goal is:

- make the local app experience feel like CT
- keep the OpenAI/Codex-first wrapper entrypoint simple
- avoid risky internal renames that would break compatibility with the
  underlying source-build base

## Recommended Entry Points

Use these first:

- `ct`
- `seaturtle`
- `ct-dev`

Install them locally with:

```bash
./scripts/install-local-cli.sh --build
```

Optional compatibility install:

```bash
./scripts/install-local-cli.sh --build --as-default-claude
```

That keeps a `claude` command available locally, but points it at the CT
wrapper.

## What Is Rebranded

These are intentionally branded as CT where it is safe:

- README and user docs
- wrapper scripts
- startup and welcome copy
- help and status copy
- user-facing auth/logout wording
- general app-shell labels such as loading, permissions, and resume dialogs

## What Stays Unchanged For Compatibility

These are intentionally not renamed in the current production-safe approach:

- `CLAUDE_*` environment variables
- `~/.claude` paths and config storage
- `dist/cli.js` as the underlying built runtime entrypoint
- the npm package name
- upstream protocol, analytics, remote-control, and service-contract identifiers
- Anthropic- or Claude-specific upstream product features that this fork still
  inherits

Examples:

- `CLAUDE_CODE_USE_OPENAI_CODEX`
- `CLAUDE_CODE_TELEGRAM_*`
- `~/.claude/...`
- `node dist/cli.js`

## Why The Compatibility Boundary Exists

SeaTurtle started from Andrew Kramer-Inno's source-build base. It is not a
clean-room reimplementation.

That means the safest branding strategy is:

1. brand the wrapper and UX layer
2. document compatibility-sensitive internals clearly
3. avoid deep internal renames until there is a strong reason and a tested
   migration path

## How To Answer Branding Questions

If a user asks:

- "Why does the app say CT but the env vars still say CLAUDE?"
- "Should I run `ct` or `node dist/cli.js`?"
- "Why is `~/.claude` still used?"

Answer with:

1. the recommended command first
2. one short explanation of the compatibility boundary
3. this doc only if more detail is needed

Examples:

- "Run `ct`. It is the preferred CT wrapper for SeaTurtle."
- "The internal `CLAUDE_*` names remain for compatibility with the underlying source-build base."
