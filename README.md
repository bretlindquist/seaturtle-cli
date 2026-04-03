# Claude Code 2.1.88 — Custom Build With OpenAI/Codex OAuth Port

![](<img/2026-03-31 14-58-01-combined.gif>)

Rebuilt from source maps with real source preservation for `@ant/*` packages.

This fork keeps Andrew Kramer-Inno's Claude Code source-build as the product
surface base, and adds a native OpenAI/Codex provider path for the main loop.

Current fork goals:

- preserve as much of the local Claude Code feature surface as possible
- run the main conversation loop on OpenAI/Codex OAuth when selected
- keep tools, MCP, replay, and streaming working on that provider path
- avoid silent fallback into Anthropic-only helper behavior

Current OpenAI/Codex status:

- supported:
  - main-loop OpenAI/Codex execution
  - local tool use
  - replay/resume
  - stream-json text and tool-use event parity
  - strict OpenAI tool-schema coverage for `TodoWrite`
  - provider-aware `status` and `auth status`
- still gated or Anthropic-only:
  - auto-mode safety classifier
  - permission explainer
  - Claude in Chrome lightning inference path

See [`docs/OPENAI-CODEX.md`](./docs/OPENAI-CODEX.md) for provider behavior,
setup, validation, and current gaps.

## Prerequisites

- Node.js >= 20
- Bun >= 1.1
- npm (for overlay dependency install on first build)

## Build

```bash
# Production (minified)
node scripts/build-cli.mjs

# Development (unminified, faster builds)
node scripts/build-cli.mjs --no-minify

# Custom output path
node scripts/build-cli.mjs --outfile /path/to/output/cli.js
```

Output: `dist/cli.js` (wrapper) + `dist/cli.bundle/` (bundle).

First build runs `npm install` for ~80 overlay packages. Subsequent builds skip this.

## Run

```bash
node dist/cli.js
```

### Run With OpenAI/Codex

This fork supports an OpenAI/Codex-backed main loop when the provider is
enabled:

```bash
CLAUDE_CODE_USE_OPENAI_CODEX=1 node dist/cli.js
```

Useful checks:

```bash
CLAUDE_CODE_USE_OPENAI_CODEX=1 node dist/cli.js auth status --json
CLAUDE_CODE_USE_OPENAI_CODEX=1 node dist/cli.js -p "say hello in five words"
```

### Computer Use (macOS)

Computer use runs in-process automatically when the `CHICAGO_MCP` flag is enabled. The native addons are resolved from `prebuilds/` relative to the bundled package, or via env var overrides:

```bash
# Override native addon paths if the default resolution fails
COMPUTER_USE_SWIFT_NODE_PATH="/path/to/computer-use-swift.node" \
COMPUTER_USE_INPUT_NODE_PATH="/path/to/computer-use-input.node" \
node dist/cli.js
```

## Feature Flags

| Flag | What it does |
|------|-------------|
| `BUILDING_CLAUDE_APPS` | Skill content for building Claude apps |
| `BASH_CLASSIFIER` | Bash command safety classifier |
| `TRANSCRIPT_CLASSIFIER` | Transcript-level auto-mode classifier |
| `CHICAGO_MCP` | Computer use via MCP (screenshot, click, type, etc.) |

Toggle in `enabledBundleFeatures` inside `scripts/build-cli.mjs`. ~90 flags available — search `feature('` in source.

## Native Addons

In `source/native-addons/`:

| File | Purpose |
|------|---------|
| `computer-use-swift.node` | Screen capture, app management (macOS) |
| `computer-use-input.node` | Mouse/keyboard input (macOS) |
| `image-processor.node` | Sharp image processing |
| `audio-capture.node` | Audio capture |

## Clean Rebuild

```bash
rm -f .cache/workspace/.prepared.json
node scripts/build-cli.mjs --no-minify
```

## Development Check

Use the canonical repo check:

```bash
npm run dev-check
npm run openai-codex-check
```

That verifies `node` / `npm` / `bun`, runs the unminified build, and smoke-tests
the built CLI. The OpenAI/Codex check runs the provider regression harness.
When the live ChatGPT/Codex account is quota-limited, that harness exits with
an explicit skip rather than a false failure.

## Auth And Secrets

Do not commit live auth state to this repo.

- OpenAI/Codex auth is expected to come from local Codex CLI auth state
  (for example `~/.codex/auth.json`) and/or secure storage
- local machine config and credential dumps should stay untracked
- if additional setup docs or examples are needed, add sanitized examples such
  as `.env.example` or `*.example.json`, not real credentials

## Structure

```
scripts/build-cli.mjs    — Build script (source map extraction + bun bundling)
source/cli.js.map         — Original source map (4756 modules)
source/native-addons/     — Pre-built .node binaries
source/src/               — Overlay assets (.md skill files)
.cache/workspace/         — Extracted workspace (generated, gitignored)
dist/                     — Build output (generated)
docs/OPENAI-CODEX.md      — Provider port behavior, setup, and validation
```
