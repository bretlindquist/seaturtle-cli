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
- truthful documented-vs-routed OpenAI capability reporting

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
- local `ToolSearch` and `Skill` support through the normal SeaTurtle
  function-tool loop
- local computer-use support through the Chicago MCP runtime when that local
  runtime is enabled
- OpenAI web search routed through the Responses `web_search` tool
- OpenAI image input via Responses `input_image`
- OpenAI PDF/file input via Responses `input_file`
- OpenAI hosted file search via Responses `file_search` when vector stores are configured
- OpenAI hosted shell via the hosted `shell` tool through SeaTurtle's
  `HostedShell` tool
- OpenAI computer use via the hosted `computer` tool through SeaTurtle's
  `ComputerUse` tool, reusing the local Chicago permission/lock/screenshot runtime
- OpenAI image generation via the hosted `image_generation` tool through
  SeaTurtle's `ImageGeneration` tool
- SeaTurtle local MCP tools exposed on the OpenAI/Codex path
- OpenAI provider-hosted remote MCP for a restricted safe subset of MCP servers

## OpenAI Runtime Truth

SeaTurtle now distinguishes three different questions:

- what OpenAI documents for the active model
- what SeaTurtle has configured locally
- what SeaTurtle actually routes today

That distinction is visible in both `/status` and `ct auth status --json`.

Examples:

- hosted file search is only marked routed when vector stores are configured
- provider-hosted remote MCP is only marked routed when an eligible MCP server exists
- local `ToolSearch` and `Skill` support are reported separately from provider-hosted OpenAI tools
- local computer-use support is reported separately from OpenAI's provider-hosted `computer` tool
- local MCP tools are reported separately from provider-hosted remote MCP
- documented model capabilities are reported separately from runtime-routed support
- `auth status --json` now exposes `openAiCodexRoutedModelCapabilities` for the provider-hosted OpenAI tool paths SeaTurtle actually wires today

## OpenAI Computer Use Enablement

Computer use is not a generic prompt-level toggle inside CT. It is available only when all of these are true:

- the build includes the Chicago computer-use runtime
- CT is running on macOS
- the session is interactive
- the local account tier is `Pro` or `Max`
- the Chicago gate is enabled for this runtime
- OpenAI/Codex auth is active for the main loop

Use `/status` to inspect this directly. SeaTurtle now shows an `OpenAI computer use` row with the missing prerequisite when it is unavailable.

Important current truth:

- there is not yet a simple public `/config` switch that external users can flip to force computer use on
- if `/status` says `Chicago gate off`, the current build/runtime did not expose the local computer-use runtime for this session
- when every local prerequisite is satisfied, CT can route the OpenAI hosted `computer` tool through the existing permission/lock/screenshot stack

## Current Known Gates

These surfaces are intentionally not pretending to work on OpenAI/Codex yet:

- auto-mode safety classifier itself
- permission explainer
- Claude in Chrome lightning inference path
- Anthropic-only `sideQuery` helper flows outside the explicitly supported gates
- OpenAI/Codex GitHub Actions setup remains gated for OAuth-only installs; the
  defensible CI path is API-key-based via an explicit OpenAI API key
- provider-hosted remote MCP is intentionally limited to plain `http` / `sse`
  MCP servers with no custom headers, no `headersHelper`, and no OAuth-managed config

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

Current model-picker truth:

- ChatGPT/Codex OAuth sessions expose `gpt-5.5` in `/model`
- `gpt-5.5` remains hidden from `OPENAI_API_KEY` contexts in this build because
  OpenAI documents it as a Codex/ChatGPT rollout model rather than an API-key
  model
- the default OpenAI main-loop model still stays on `gpt-5.4` until SeaTurtle
  grows account-level Codex model discovery

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

Optional hosted file-search configuration:

```bash
export SEATURTLE_OPENAI_VECTOR_STORE_IDS="vs_123,vs_456"
```

SeaTurtle also accepts the legacy compatibility alias
`CLAUDE_CODE_OPENAI_VECTOR_STORE_IDS`, but the SeaTurtle-prefixed variable is
the primary contract going forward.

Optional provider-hosted remote MCP configuration:

- use existing CT MCP configuration
- only a production-safe subset is bridged into the OpenAI provider path:
  - transport `http` or `sse`
  - no custom `headers`
  - no `headersHelper`
  - no `oauth` block
- ineligible MCP servers still work through SeaTurtle's local MCP runtime when connected there

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
- `openAiCodexCapabilityConfig`
- `openAiCodexCapabilities`
- `openAiCodexModelCapabilities`
- `openAiCodexRoutedModelCapabilities`

Session behavior:

- plain `ct` starts a fresh session by default
- use `/continue` for the most recent session in the current directory
- use `/resume` to open the picker or resume a specific prior session

Parallel agents:

- OpenAI/Codex OAuth and `OPENAI_API_KEY` auth both use SeaTurtle's local
  teammate runtime when the active OpenAI runtime is auth-ready
- teammates inherit the selected OpenAI provider, model, effort, settings path,
  and provider auth instead of silently routing back to Anthropic
- OAuth/profile auth is shared through `CLAUDE_CONFIG_DIR`; env-only auth is
  forwarded through `OPENAI_API_KEY`
- if OpenAI auth is unavailable in the teammate context, the teammate should
  fail with OpenAI setup guidance rather than use another provider

Remote-host cloud offload:

- OpenAI/Codex does not use `ct --remote`; that path is still the Anthropic
  claude.ai CCR flow
- OpenAI/Codex cloud/offloaded execution uses `ct ssh <host> [dir]`
- SeaTurtle deploys a matching remote runtime, starts CT on the target host,
  and injects the active OpenAI provider/auth selection there
- API-key auth is exported directly; OAuth/Codex auth is materialized as a
  scoped remote `CODEX_HOME/auth.json` for that session
- if the remote-host session cannot establish OpenAI auth, it should fail with
  OpenAI-specific guidance rather than route back to Anthropic

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
- route more OpenAI-native tools directly where they add real value in CT
- continue operator-facing polish as SeaTurtle stabilizes
