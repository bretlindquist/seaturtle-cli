# SeaTurtle CLI (CT)

SeaTurtle CLI, or `CT`, is a working fork of Andrew Kramer-Inno's Claude Code
source-build. The goal of this fork is to preserve as much of the local
feature surface as possible while porting the main runtime toward native
OpenAI/Codex OAuth support.

This is not a clean-room reimplementation. It is a heavily modified derivative
of the Andrew source-build base, with a branded wrapper layer, provider-aware
runtime changes, and additional operator-facing features such as Telegram
integration, project-local reminders, and a private project-local CT working
layer.

## What This Fork Is Trying To Do

- keep the source-build local UX useful and familiar
- run the main conversation loop on OpenAI/Codex when selected
- preserve local tools, MCP, replay/resume, and streaming where possible
- avoid hidden fallback into Anthropic-only helpers when OpenAI/Codex is active
- make unsupported surfaces explicit instead of pretending they work
- provide a more approachable user-facing shell through `ct` / `seaturtle`

## Current Status

### Working

- branded local entrypoints:
  - `ct`
  - `seaturtle`
  - `ct-dev`
- OpenAI/Codex-backed main loop
- local tool use on the OpenAI/Codex path
- replay/resume on the OpenAI/Codex path
- streamed text and tool-use event translation
- strict OpenAI tool-schema coverage for `TodoWrite`
- provider-aware `/login`, `/logout`, `/model`, `/effort`, `/status`
- Telegram pairing and project binding from inside the app
- Telegram text, photos, documents, and voice-note transcription
- safe tracked-plan orchestration with `/autowork` and `/swim`
- per-project reminders with `/remindme` / `/rm`
- rainbow theme control with `/lolcat`, including animated and persistent modes

### Intentionally Gated Or Still Anthropic-Bound

- auto-mode safety classifier itself
- permission explainer
- Claude in Chrome lightning inference path
- some remaining Anthropic-only helper/account surfaces
- OpenAI/Codex GitHub Actions setup for OAuth-only installs

The goal is explicit capability truthfulness. If a surface is not production
ready on OpenAI/Codex, the app should say so directly.

## Quick Start

### 1. Install local wrappers

```bash
./scripts/install-local-cli.sh --build
```

That installer:

- builds the repo with the development bundle
- installs `ct`, `seaturtle`, and `ct-dev`
- checks for the build prerequisites it needs
- explains the next step instead of dumping raw downstream errors

### 2. Start CT

```bash
ct
```

If `ct` is not on your `PATH` yet, the installer will tell you:

- where it installed the wrappers
- whether your shell can see them now
- what to add to `PATH` or whether to run `rehash`

### 3. Choose auth and runtime

At startup, CT can guide you through:

- Anthropic account auth
- Anthropic Console auth
- OpenAI Codex OAuth

For OpenAI mode, CT uses local Codex auth and can launch `codex login` from the
startup flow when needed.

### 4. Use the app

Inside CT, the next-step commands to know first are:

- `/login`
- `/model`
- `/effort`
- `/status`
- `/telegram`
- `/autowork`
- `/remindme`
- `/lolcat`

## Installation And Prerequisites

### Required To Build

- `node` 18+
- `npm`
- `bun`

The installer now checks those before it tries to build.

### Required For OpenAI/Codex OAuth

- `codex` CLI on your `PATH`

CT can still install without `codex`, but OpenAI/Codex login/setup will remain
unavailable until the Codex CLI is installed.

### Install Commands

Normal local install:

```bash
./scripts/install-local-cli.sh --build
```

Install to a custom prefix:

```bash
./scripts/install-local-cli.sh --build --prefix "$HOME/.local/bin"
```

Also expose a compatibility `claude` command locally:

```bash
./scripts/install-local-cli.sh --build --as-default-claude
```

### Underlying Runtime Entry Point

The user-facing command should be:

```bash
ct
```

Compatibility entry point:

```bash
node dist/cli.js
```

The runtime still uses internal compatibility names such as `CLAUDE_*`,
`~/.claude`, and `dist/cli.js` where changing them would create unnecessary
breakage.

For a fuller explanation, see [docs/BRANDING.md](./docs/BRANDING.md).

## OpenAI/Codex Support

This fork adds a native OpenAI/Codex provider path to the Andrew source-build
runtime.

### What Currently Works On OpenAI/Codex

- normal prompts
- local tools
- replay/resume
- `TodoWrite` strict-schema turns
- provider-aware auth and status reporting
- provider-aware model and effort selection
- provider-neutral auto-mode critique

### What To Run

Check runtime/auth:

```bash
ct auth status --json
```

Quick smoke test:

```bash
ct -p "say hello in five words"
```

Tool-use smoke test:

```bash
ct -p "Use the Bash tool to run 'pwd' and reply with only the resulting path."
```

### What Is Still Limited

Some inherited surfaces are still Anthropic-shaped. CT tries to gate those
cleanly instead of silently leaking providers.

For provider details, known gates, and validation commands, see
[docs/OPENAI-CODEX.md](./docs/OPENAI-CODEX.md).

## Telegram Integration

This fork supports Telegram as an external control and messaging channel.

### Supported Today

- inbound text
- inbound photos
- inbound documents
- inbound voice-note transcription through OpenAI transcription
- outbound text
- outbound photos
- outbound documents
- multiple saved bot profiles
- per-project bot binding
- project-local allowlisted chats
- in-app pairing, test, and doctor flows

### Start Here

Run:

```text
/telegram
```

That is the primary setup and diagnostics entrypoint. It can:

- pair a bot in-app
- bind a saved bot to the current project
- manage allowlisted chats
- send a Telegram test message
- run a Telegram doctor pass

Short in-app summary:

```text
/telegram help
```

Full reference:

- [docs/TELEGRAM.md](./docs/TELEGRAM.md)

## Core Commands Added Or Hardened In This Fork

### Auth And Runtime

- `/login`
- `/logout`
- `/model`
- `/effort`
- `/status`

These are provider-aware and should guide the user toward the next step rather
than dropping them into Anthropic-first wording.

### Telegram

- `/telegram`
- `/telegram help`

### Tracked-Plan Orchestration

- `/autowork`
- `/swim`

These start the same tracked-plan orchestration harness.

Current contract:

- requires one tracked root-level dated `*-state.md` plan file
- runs one chunk at a time
- safe mode enforces validation and commit gates between chunks
- safe mode stops on checkpoint failure instead of continuing blindly
- dangerous mode is available, but heavily discouraged
- when dangerous mode continues, it records checkpoint debt instead of hiding it
- can send Telegram stop notices and dangerous-mode debt notices when Telegram is bound for the project

Current subcommands:

- `/autowork`
- `/autowork dangerous`
- `/autowork run`
- `/autowork status`
- `/autowork doctor`
- `/swim`
- `/swim dangerous`
- `/swim run`
- `/swim status`
- `/swim doctor`

`/swim` is the more whimsical entrypoint. The execution guarantees are the same.

### Reminders

- `/remindme`
- `/rm`
- `/remindmeclear`
- `/rmc`

These store a short project-local reminder and surface it after responses.

## Build And Development

### Build

Production bundle:

```bash
node scripts/build-cli.mjs
```

Development bundle:

```bash
node scripts/build-cli.mjs --no-minify
```

Custom output:

```bash
node scripts/build-cli.mjs --outfile /path/to/output/cli.js
```

Output:

- `dist/cli.js`
- `dist/cli.bundle/`

The first build performs the overlay dependency install. Later builds reuse it.

### Validation

Canonical repo checks:

```bash
npm run lint:openai-codex
npm run dev-check
npm run openai-codex-check
```

What they do:

- `lint:openai-codex`
  - checks the OpenAI/Codex port surfaces and shell scripts
- `dev-check`
  - runs the main repo build/smoke path
- `openai-codex-check`
  - runs the OpenAI/Codex regression harness

When the live Codex account is quota-limited, the OpenAI/Codex regression
harness exits with an explicit skip instead of reporting a false regression.

### Autowork Safety Model

`/autowork` and `/swim` are not the existing permission auto mode.

They are a higher-level tracked-plan orchestrator with these guarantees:

- safe mode requires a clean working tree before chunk launch
- safe mode launches exactly one chunk at a time
- safe mode queues a verification step after the execution turn
- safe mode requires validation and a new commit before it advances
- safe mode requires a clean tree after the checkpoint commit
- failures persist a stop reason instead of silently continuing

Dangerous mode keeps these hard refusals:

- not in a git repo
- missing or untracked plan file
- plan parse failure
- no pending chunks
- secret-hygiene failures

Dangerous mode relaxes these checkpoint gates into recorded debt:

- dirty tree before launch
- validation failure
- missing new commit after a chunk
- dirty tree after verification

Dangerous-mode behavior:

- it is heavily discouraged
- it still runs one chunk at a time
- it still re-checks the previous chunk before advancing
- it persists checkpoint debt into state instead of pretending the run was clean
- it can send a Telegram notice when it continues with dangerous-mode debt

Cost and operator expectations:

- it uses more tokens, time, and runtime than ordinary interactive work
- it is meant for a tracked, surgical chunk plan, not open-ended exploration
- safe mode remains the recommended default

### Clean Rebuild

```bash
rm -f .cache/workspace/.prepared.json
node scripts/build-cli.mjs --no-minify
```

## Computer Use / Native Addons

When `CHICAGO_MCP` is enabled, computer-use features run through the packaged
native addons and MCP path.

Native addons live under:

- `source/native-addons/`

Current addon set includes:

- `computer-use-swift.node`
- `computer-use-input.node`
- `image-processor.node`
- `audio-capture.node`

If default addon resolution fails, you can override paths with env vars:

```bash
COMPUTER_USE_SWIFT_NODE_PATH="/path/to/computer-use-swift.node" \
COMPUTER_USE_INPUT_NODE_PATH="/path/to/computer-use-input.node" \
ct
```

## Feature Flags

The current external build enables a narrow subset of the available bundle
flags.

Enabled in the current build pipeline:

- `BUILDING_CLAUDE_APPS`
- `BASH_CLASSIFIER`
- `TRANSCRIPT_CLASSIFIER`
- `CHICAGO_MCP`

Toggle points:

- `scripts/build-cli.mjs`

There are many more flags in the source tree, but most are not simply “one flag
away” from being ready in this external build.

## Security And Auth Model

Do not commit live auth state or machine-specific credentials to this repo.

Expected model:

- OpenAI/Codex auth comes from local Codex CLI auth state and/or secure storage
- repo-local token dumps stay untracked
- local machine config stays untracked
- examples and docs should be sanitized

If another user needs setup instructions, add:

- `.env.example`
- `*.example.json`
- setup docs

Do not add:

- real `.env` files
- copied token files
- `.codex/`
- `.claude/`
- `.mcp.json`

## Branding And Compatibility Boundaries

This repo uses `CT` as the primary user-facing name and `seaturtle` as an
equivalent alias.

What is intentionally rebranded:

- wrappers
- startup and shell copy
- help and status text
- docs and guidance

What intentionally remains unchanged for compatibility:

- `CLAUDE_*` env vars
- `~/.claude`
- `dist/cli.js`
- package names
- upstream protocol and service identifiers

See [docs/BRANDING.md](./docs/BRANDING.md) for the explicit compatibility
boundary.

## Repository Structure

```text
bin/ct                          — primary branded wrapper
bin/seaturtle                   — alias wrapper
bin/ct-dev                      — development wrapper
scripts/build-cli.mjs           — build pipeline
scripts/install-local-cli.sh    — local installer
source/cli.js.map               — recovered source map
source/native-addons/           — packaged native addons
source/src/                     — main recovered source overlay
.cache/workspace/               — generated extracted workspace
dist/                           — built output
assets/branding/                — SeaTurtle text/SVG assets
docs/OPENAI-CODEX.md            — provider behavior and validation
docs/TELEGRAM.md                — Telegram pairing and operation
docs/FEATURES-ROUTER.md         — command/doc routing for fork features
docs/BRANDING.md                — CT branding and compatibility boundaries
```

## Documentation Map

Use these in order:

1. This `README.md`
2. [docs/FEATURES-ROUTER.md](./docs/FEATURES-ROUTER.md)
3. Feature-specific docs:
   - [docs/OPENAI-CODEX.md](./docs/OPENAI-CODEX.md)
   - [docs/TELEGRAM.md](./docs/TELEGRAM.md)
   - [docs/BRANDING.md](./docs/BRANDING.md)

The intended user experience is:

- command first
- short next-step guidance second
- deep docs only when needed
