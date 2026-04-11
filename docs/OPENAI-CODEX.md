# OpenAI/Codex Provider Port

SeaTurtle adds a native OpenAI/Codex provider path on top of the Andrew
source-build lineage.

It does not replace every Anthropic- or claude.ai-specific feature. The goal is
to preserve the local runtime feature surface where possible while making the
main conversation loop work on OpenAI/Codex auth.

## What SeaTurtle Adds

- provider-aware main-loop runtime selection
- OpenAI/Codex-backed main-loop execution
- explicit OpenAI API-key execution through the standard OpenAI Responses API
- OpenAI/Codex tool use through the existing local tool loop
- replay/resume support on the OpenAI/Codex path
- stream-json support with OpenAI/Codex event translation
- strict OpenAI tool-schema coverage for `TodoWrite`
- provider-aware `status` and `auth status`
- provider-neutral `auto-mode critique`

## What Currently Works

- `ct`
- direct prompts on the OpenAI/Codex path
- local built-in tools such as `Bash`
- strict `TodoWrite` turns
- replay/resume against prior OpenAI/Codex sessions
- `auth status --json` reporting of the active provider path
- `OPENAI_API_KEY` as a first-class OpenAI/Codex auth source
- `/status` rendering of CT-owned context window, collaboration mode, and 5h/weekly usage telemetry
- streamed text and tool-use events without synthetic `unknown_tool` leakage
- `claude auto-mode critique` on the OpenAI/Codex path

## Current Known Gates

These surfaces are intentionally not pretending to work on OpenAI/Codex yet:

- auto-mode safety classifier itself
- permission explainer
- Claude in Chrome lightning inference path
- Anthropic-only `sideQuery` helper flows outside the explicitly supported gates
- OpenAI/Codex GitHub Actions setup remains gated for OAuth-only installs; the
  defensible CI path is API-key-based via an explicit OpenAI API key

When the active main-loop runtime is OpenAI/Codex:

- `auth status --json` exposes these in `openAiCodexKnownGates`
- text `status` includes a provider note explaining the current boundary

## Enabling OpenAI/Codex

Build first:

```bash
node scripts/build-cli.mjs --no-minify
```

Recommended local install:

```bash
./scripts/install-local-cli.sh --build
```

That installer preflights `node`, `npm`, and `bun` for the build.

Run on OpenAI/Codex:

```bash
ct
```

For API-key operation, set:

```bash
export OPENAI_API_KEY="sk-..."
```

Optional standard OpenAI environment variables:

```bash
export OPENAI_BASE_URL="https://api.openai.com/v1"
export OPENAI_ORGANIZATION="org_..."
export OPENAI_PROJECT="proj_..."
```

Quick smoke check:

```bash
ct auth status --json
ct -p "say hello in five words"
```

Useful OpenAI/Codex-specific fields in `auth status --json` now include:

- `openAiCodexAuthSource`
- `openAiCodexNativeAuthReady`
- `openAiCodexApiKeyReady`
- `openAiCodexCliFallbackReady`
- `openAiCodexCollaborationMode`
- `openAiCodexUsageTelemetry`

Session behavior:

- plain `ct` starts a fresh session by default
- use `/continue` for the most recent session in the current directory
- use `/resume` to open the picker or resume a specific prior session

Compatibility note:

- the underlying runtime still uses `dist/cli.js`
- `ct` and `seaturtle` are branded wrappers for the OpenAI/Codex path
- compatibility-sensitive env vars and internal paths are intentionally unchanged

## Auth Model

SeaTurtle is designed so auth does not live in the repo.

- OpenAI/Codex auth now prefers native SeaTurtle provider-owned OAuth profiles
  in secure storage
- `OPENAI_API_KEY` is supported as an explicit OpenAI Responses API auth path
- optional `OPENAI_ORGANIZATION`, `OPENAI_PROJECT`, and `OPENAI_BASE_URL`
  values are used when present
- legacy local Codex CLI auth state remains supported as a fallback
- if SeaTurtle only sees Codex CLI fallback state, it can now adopt that into
  native provider-auth storage instead of permanently staying on fallback
- repo-local secrets, token dumps, and machine-specific auth files should stay
  ignored
- do not commit live credentials

If you need to document setup for other users, use sanitized examples and docs,
not real token files.

## Validation

Canonical checks:

```bash
npm run lint:openai-codex
npm run dev-check
npm run openai-codex-check
```

Notes:

- `npm run lint:openai-codex` is the repo-local lint gate for the OpenAI/Codex
  ported surfaces
- `npm run dev-check` is the main repo build/smoke check
- `npm run openai-codex-check` is the live provider regression harness
- `npm run openai-codex-check` reports named steps with explicit `PASS`,
  `FAIL`, `SKIP`, and timeout outcomes so long provider checks are diagnosable
  instead of looking ambiguously stalled
- if the live OpenAI/Codex account is quota-limited, the OpenAI harness exits
  with an explicit skip instead of reporting a false regression
- `dev-check` proves the local app builds and boots; `openai-codex-check`
  proves the live OpenAI/Codex provider path still works end to end

## Future Expansion Areas

After the current planned port/hardening chunks, the most likely next areas are:

- expand strict OpenAI tool-schema coverage beyond `TodoWrite`
- broaden provider-neutral replacements for Anthropic-only account surfaces
- continue operator-facing polish as SeaTurtle stabilizes
