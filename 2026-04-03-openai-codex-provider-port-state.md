# Native OpenAI OAuth Research State

Date: 2026-04-03

## Objective

Make Andrew's Claude Code source-build support OpenAI/Codex OAuth as a native main-model backend, while preserving Claude Code's local feature surface as much as possible:

- main conversation uses OpenAI via OAuth, not Anthropic-only core paths
- tools, MCP, agents, `/btw`, coordinator-style features keep working
- Codex is integrated as a first-class provider, not only as a sidecar plugin command

## Reference Repos

- Andrew source-build:
  - local: `/Users/bretlindquist/git/claude-clone-latest`
  - upstream: `https://github.com/andrew-kramer-inno/claude-code-source-build`
- OpenClaw:
  - local: `/tmp/openclaw-research`
  - upstream: `https://github.com/openclaw/openclaw`
- Codex Claude plugin:
  - upstream: `https://github.com/openai/codex-plugin-cc`

## Phase Structure

1. Auth/profile spine
2. Provider/runtime seam
3. OpenAI Responses transport
4. Tool/event parity in Andrew's main loop
5. Anthropic-specific feature quarantine

## Working Findings

### Baseline

- Andrew is still Anthropic-first at the core provider layer.
- OpenClaw already implements OpenAI/Codex OAuth as a native provider/runtime concern.
- `codex-plugin-cc` is useful source material for Codex runtime behavior, but not a core provider swap.

### Phase 1: Auth/Profile Spine

Research target:
- what Andrew currently has for OAuth storage, refresh, login, and account identity
- what OpenClaw has for provider-owned OAuth profiles and refresh
- what must be ported or re-created

Findings:

- Andrew has a mature OAuth login flow, but it is Claude/Anthropic-specific end to end.
  - login entrypoint installs OAuth tokens, fetches Claude profile info, and creates an Anthropic API key for Console flows:
    - `/Users/bretlindquist/git/claude-clone-latest/source/src/cli/handlers/auth.ts`
  - authorize/token/API-key endpoints are all Anthropic-owned:
    - `/Users/bretlindquist/git/claude-clone-latest/source/src/services/oauth/client.ts`
    - `/Users/bretlindquist/git/claude-clone-latest/source/src/constants/oauth.ts`
  - runtime auth resolution is centered on:
    - `getClaudeAIOAuthTokens()`
    - `isClaudeAISubscriber()`
    - `getAnthropicApiKeyWithSource()`
    - `/Users/bretlindquist/git/claude-clone-latest/source/src/utils/auth.ts`

- Andrew does not have a provider-neutral auth profile store.
  - It has global config + secure storage for Anthropic identity and API key state.
  - The auth source decision tree is built around Anthropic env vars, Claude OAuth tokens, and Claude-managed API keys.

- OpenClaw has the provider-neutral spine Andrew is missing.
  - provider-owned OAuth login exists for OpenAI/Codex:
    - `/tmp/openclaw-research/src/plugins/provider-openai-codex-oauth.ts`
  - auth credentials are stored as generic provider auth profiles:
    - `/tmp/openclaw-research/src/agents/auth-profiles/types.ts`
  - auth profile refresh is generic, with plugin-owned refresh hooks:
    - `/tmp/openclaw-research/src/agents/auth-profiles/oauth.ts`
  - OpenClaw can also sync external Codex CLI credentials into provider auth profiles:
    - `/tmp/openclaw-research/src/agents/cli-credentials.ts`
    - `/tmp/openclaw-research/src/agents/auth-profiles/external-cli-sync.ts`

Implication:

- For Andrew, adding OpenAI OAuth cleanly is not just "add another login command."
- The real missing layer is a provider-owned auth profile system that can:
  - store OAuth credentials per provider
  - refresh them per provider
  - surface them into model/runtime resolution without being hard-wired to Anthropic account semantics

Recommended research conclusion:

- Use OpenClaw Phase 1 as the donor architecture.
- Do not try to wedge Codex OAuth directly into Andrew's existing Anthropic token storage without an auth-profile abstraction.

### Phase 2: Provider/Runtime Seam

Research target:
- where Andrew hardcodes provider selection and Anthropic client usage
- where OpenClaw exposes provider plugins and runtime hooks
- what minimum seam must exist before a Codex provider can be first-class

Findings:

- Andrew's provider enum is too narrow for native Codex integration.
  - current provider set:
    - `firstParty | bedrock | vertex | foundry`
    - `/Users/bretlindquist/git/claude-clone-latest/source/src/utils/model/providers.ts`

- Andrew's main API client factory is Anthropic-specific.
  - `getAnthropicClient(...)`
  - OAuth refresh happens before Anthropic client creation
  - `/Users/bretlindquist/git/claude-clone-latest/source/src/services/api/client.ts`

- Andrew's main query transport is Anthropic-specific.
  - `anthropic.beta.messages.create(...)`
  - non-streaming fallback also calls Anthropic directly
  - `/Users/bretlindquist/git/claude-clone-latest/source/src/services/api/claude.ts`

- Andrew's plugin system is not a provider runtime.
  - plugins can add commands, agents, skills, hooks, MCP, LSP, settings
  - plugins cannot replace the core inference backend
  - `/Users/bretlindquist/git/claude-clone-latest/source/src/types/plugin.ts`

- OpenClaw already has the seam Andrew lacks.
  - provider plugins own:
    - auth methods
    - config patches
    - default models
    - dynamic model resolution
    - resolved-model normalization
    - runtime auth preparation
    - transport wrapping
    - usage auth
  - `/tmp/openclaw-research/src/plugins/types.ts`
  - `/tmp/openclaw-research/src/plugins/provider-runtime.ts`

Implication:

- Before Andrew can use OpenAI OAuth natively, it needs a core provider/runtime seam.
- The minimum seam is not "add `openai` to `APIProvider`."
- The minimum seam is:
  - model/provider resolution boundary
  - provider-owned auth prep
  - provider-owned transport selection
  - provider-owned stream wrapping / normalization

Recommended research conclusion:

- Port the provider-runtime idea first.
- Do not patch OpenAI/Codex directly into `getAnthropicClient()` or `services/api/claude.ts` as a one-off if long-term maintainability matters.

### Phase 3: OpenAI Responses Transport

Research target:
- how OpenClaw models `openai-codex-responses`
- how Andrew currently serializes messages and calls `anthropic.beta.messages.create`
- what adapter is needed for history, streaming, and retry/fallback

Findings:

- OpenClaw explicitly synthesizes an `openai-codex` provider when Codex OAuth exists.
  - expected provider shape:
    - `baseUrl: https://chatgpt.com/backend-api`
    - `api: openai-codex-responses`
  - `/tmp/openclaw-research/src/agents/models-config.providers.openai-codex.test.ts`

- OpenClaw has a real OpenAI Responses transport layer.
  - request shaping and compatibility policies:
    - `/tmp/openclaw-research/src/agents/pi-embedded-runner/openai-stream-wrappers.ts`
  - gateway-side `/responses` support:
    - `/tmp/openclaw-research/src/gateway/openresponses-http.ts`
    - `/tmp/openclaw-research/src/gateway/openresponses-prompt.ts`

- Andrew's current transport stack is Anthropics Messages API-shaped.
  - user/assistant serialization returns Anthropic `MessageParam` blocks
  - query execution assumes Anthropic messages/create semantics
  - `/Users/bretlindquist/git/claude-clone-latest/source/src/services/api/claude.ts`

Implication:

- Andrew needs a second transport family, not just a different login path.
- The key adapter work is:
  - message history -> OpenAI Responses input items
  - assistant/tool/result replay -> Responses-compatible format
  - stop reason / retry / fallback mapping
  - non-streaming fallback strategy for Responses

Recommended research conclusion:

- Treat this as a new transport adapter under a provider seam, not a patch to Anthropic message serialization.

### Phase 4: Tool/Event Parity

Research target:
- what Andrew's main tool loop expects from the backend
- how OpenClaw feeds tool-capable Responses models through its runtime
- what event translation is needed so tools stay first-class

Findings:

- Andrew already has a strong tool loop, but it is shaped around Anthropic-style assistant/tool_use/tool_result flows.
  - missing tool_result recovery:
    - `/Users/bretlindquist/git/claude-clone-latest/source/src/query.ts`
  - streaming loop accumulates assistant messages, tool use blocks, tool results, streaming fallback, and retries:
    - `/Users/bretlindquist/git/claude-clone-latest/source/src/query.ts`
  - remote/session adapters also assume Anthropic-like tool_result rendering:
    - `/Users/bretlindquist/git/claude-clone-latest/source/src/remote/sdkMessageAdapter.ts`

- OpenClaw already maps OpenAI/Codex tool-capable runtime behavior into a unified tool loop.
  - OpenAI/Codex tool definitions are normalized into function tools:
    - `/tmp/openclaw-research/src/agents/openai-ws-message-conversion.ts`
  - history replay supports:
    - assistant text
    - reasoning blocks
    - function calls
    - function call outputs
  - runtime emits pending tool calls in a unified result/meta path:
    - `/tmp/openclaw-research/src/agents/pi-embedded-runner/run.ts`
  - OpenClaw always routes tools through its own `customTools` path so policy and sandbox behavior stay provider-agnostic:
    - `/tmp/openclaw-research/src/agents/pi-embedded-runner/tool-split.ts`

Implication:

- The main risk is no longer "can Codex use tools?"
- The main risk is translating OpenAI/Codex stream/tool events into Andrew's existing assistant/tool loop without breaking retries, resume, or UI rendering.

Recommended research conclusion:

- Do not rewrite Andrew's tool system.
- Insert an event-translation layer between the new Codex transport and Andrew's existing query/tool loop.

### Phase 5: Anthropic-Specific Feature Quarantine

Research target:
- which Andrew features are coupled to Claude.ai identity/subscriber state
- which are local/runtime features and should remain provider-agnostic
- which need gating, stubbing, or later migration

Findings:

- Some Andrew features are explicitly Claude.ai-subscriber features and should be treated as separate from the main-model migration.
  - bridge / remote control requires Claude OAuth + subscriber entitlement:
    - `/Users/bretlindquist/git/claude-clone-latest/source/src/bridge/bridgeEnabled.ts`
  - team memory sync requires Claude OAuth token and Anthropic beta header:
    - `/Users/bretlindquist/git/claude-clone-latest/source/src/services/teamMemorySync/index.ts`
  - Claude in Chrome is subscriber-gated:
    - `/Users/bretlindquist/git/claude-clone-latest/source/src/commands/chrome/chrome.tsx`
  - remote-env command is subscriber + policy gated:
    - `/Users/bretlindquist/git/claude-clone-latest/source/src/commands/remote-env/index.ts`
  - bootstrap model options are first-party Anthropic-specific:
    - `/Users/bretlindquist/git/claude-clone-latest/source/src/services/api/bootstrap.ts`
  - default model descriptions depend on `isClaudeAISubscriber()`:
    - `/Users/bretlindquist/git/claude-clone-latest/source/src/utils/model/modelOptions.ts`

Implication:

- Not every feature should move in Phase 1.
- There are two classes of functionality:
  - local/runtime features that should remain available after provider swap
  - Claude-account features that should be gated, stubbed, or deferred

Recommended research conclusion:

- Build an explicit capability/gating layer early.
- Keep local features:
  - core prompt loop

## Final Tightening Pass

This pass focuses on four things before planning:

1. donor-set minimization
2. first seam placement in Andrew
3. keep / gate / defer matrix for a first native OpenAI OAuth migration
4. implications of a provider-neutral OAuth layer

### 1. Minimal Donor Set From OpenClaw

The right donor is not "all of OpenClaw provider runtime." The minimal donor set
for a first clean migration is smaller and has a clear order.

Auth/profile donor set:

- provider-owned OAuth login example:
  - `/tmp/openclaw-research/src/plugins/provider-openai-codex-oauth.ts`
- generic auth-profile types:
  - `/tmp/openclaw-research/src/agents/auth-profiles/types.ts`
- generic OAuth refresh / API-key formatting path:
  - `/tmp/openclaw-research/src/agents/auth-profiles/oauth.ts`
    - provider-neutral resolution begins at lines `25-50`
    - provider-owned API-key materialization at lines `84-110`
    - provider-owned refresh at lines `162-231`
- optional Codex CLI sync donor:
  - `/tmp/openclaw-research/src/agents/cli-credentials.ts`
  - `/tmp/openclaw-research/src/agents/auth-profiles/external-cli-sync.ts`

Provider/runtime donor set:

- provider runtime hook surface:
  - `/tmp/openclaw-research/src/plugins/types.ts`
- minimum dispatcher behavior:
  - `/tmp/openclaw-research/src/plugins/provider-runtime.ts`
    - `resolveProviderRuntimePlugin(...)` at lines `175-194`
    - `normalizeResolvedModel...` starts at lines `216-232`
    - additional runtime dispatch should be borrowed selectively, not wholesale

Transport/tool donor set:

- model/provider synthesis reference:
  - `/tmp/openclaw-research/src/agents/models-config.providers.openai-codex.test.ts`
- Responses tool/history conversion:
  - `/tmp/openclaw-research/src/agents/openai-ws-message-conversion.ts`
    - tools -> function tools at lines `276-287`
    - turn planning at lines `290-318`
    - history -> input items at lines `320-466`
    - response -> assistant/tool replay at lines `468-555`
- Responses compatibility wrapper:
  - `/tmp/openclaw-research/src/agents/pi-embedded-runner/openai-stream-wrappers.ts`

Research conclusion:

- The minimal donor set is:
  - auth profile types + OAuth resolver/refresh
  - provider runtime hook interfaces + tiny dispatcher
  - OpenAI/Codex transport conversion layer
- Do not port OpenClaw's whole agent runtime into Andrew.
- Do not start with the Codex plugin as the main donor. It is useful later as a
  UX/runtime reference, but not as the architectural base.

### 2. First Seam Placement In Andrew

The first seam should be introduced at the main query dependency boundary, not
inside the plugin system and not directly inside auth login.

Why:

- Andrew already has a narrow dependency injection point for the query loop:
  - `/Users/bretlindquist/git/claude-clone-latest/source/src/query/deps.ts`
  - `callModel` is wired directly to `queryModelWithStreaming` from
    `services/api/claude.ts` at lines `1-3` and `21-39`
- The main query loop relies on `deps.callModel(...)`, so this is the cleanest
  place to stop hardcoding the transport:
  - `/Users/bretlindquist/git/claude-clone-latest/source/src/query.ts`
- The current transport implementation is fully Anthropic-shaped:
  - `/Users/bretlindquist/git/claude-clone-latest/source/src/services/api/claude.ts`
    - assistant/user block serialization at lines `588-674`
    - non-streaming entrypoint at lines `709-750`
    - streaming entrypoint at lines `752-780`
    - direct Anthropic fallback request at lines `843-873`
- Provider selection is too small and env-flag-based today:
  - `/Users/bretlindquist/git/claude-clone-latest/source/src/utils/model/providers.ts`
    - `APIProvider = 'firstParty' | 'bedrock' | 'vertex' | 'foundry'` at line `4`

The first seam should therefore be:

- introduce a provider-agnostic runtime transport interface behind
  `query/deps.ts`
- split `services/api/claude.ts` into:
  - Anthropic transport adapter
  - shared transport interface
- move provider resolution out of `getAPIProvider()` as a pure Anthropic env
  switch and into a runtime-resolved provider selection layer

What this seam should *not* try to solve immediately:

- plugin marketplace/provider replacement
- bridge / claude.ai remote control
- every side-callsite that hits Anthropic directly

However, these secondary Anthropic callsites must be tracked immediately
because they will bypass the new seam if ignored:

- side queries:
  - `/Users/bretlindquist/git/claude-clone-latest/source/src/utils/sideQuery.ts`
- token estimation:
  - `/Users/bretlindquist/git/claude-clone-latest/source/src/services/tokenEstimation.ts`
- web search:
  - `/Users/bretlindquist/git/claude-clone-latest/source/src/tools/WebSearchTool/WebSearchTool.ts`
- hook helpers:
  - `/Users/bretlindquist/git/claude-clone-latest/source/src/utils/hooks/execPromptHook.ts`
  - `/Users/bretlindquist/git/claude-clone-latest/source/src/utils/hooks/apiQueryHookHelper.ts`
  - `/Users/bretlindquist/git/claude-clone-latest/source/src/utils/hooks/skillImprovement.ts`
- small-fast helper calls:
  - multiple `queryHaiku(...)` callsites under `source/src/`

Research conclusion:

- The first seam belongs at `query/deps.ts` and the transport layer beneath it.
- A successful v1 must cover:
  - main query loop first
  - then an audit list of bypass callsites
- If the seam starts lower, in auth or plugin code, provider replacement will
  stay partial and fragile.

### 3. Keep / Gate / Defer Matrix

If the goal is "preserve as many Claude Code features as possible", then Phase 1
cannot treat every Anthropic-coupled feature as equal.

Keep in v1:

- main REPL / main query loop
- local tool execution
- MCP and LSP
- slash commands that rely on the local query loop
- `/btw`
- plugins, agents, skills, workflows that depend on the local runtime rather
  than claude.ai account state
- local session state, compaction, retry, history repair, and streaming UI

Gate or stub in v1:

- model/bootstrap discovery that assumes first-party Anthropic:
  - `/Users/bretlindquist/git/claude-clone-latest/source/src/services/api/bootstrap.ts`
- model descriptions and defaults that assume subscriber state:
  - `/Users/bretlindquist/git/claude-clone-latest/source/src/utils/model/modelOptions.ts`
- analytics/account surfaces that report Anthropic-only auth state

Defer or quarantine:

- bridge / remote control via claude.ai:
  - `/Users/bretlindquist/git/claude-clone-latest/source/src/bridge/bridgeEnabled.ts`
- team memory sync:
  - `/Users/bretlindquist/git/claude-clone-latest/source/src/services/teamMemorySync/index.ts`
- Chrome / claude.ai subscriber features:
  - `/Users/bretlindquist/git/claude-clone-latest/source/src/commands/chrome/chrome.tsx`
- remote-env subscriber flow:
  - `/Users/bretlindquist/git/claude-clone-latest/source/src/commands/remote-env/index.ts`

Reason:

- these are not just "different auth." They are claude.ai product features with
  Anthropic-side entitlements and endpoints.
- trying to drag them into the first OpenAI migration will slow down the core
  provider transport work and reduce the chance of preserving the local feature
  surface well

Research conclusion:

- Preserve local/runtime Claude Code features first.
- Gate Anthropic-account features explicitly instead of letting them fail deep
  inside subscriber checks.
- Treat "maximum feature preservation" as:
  - preserve local capabilities in v1
  - preserve Anthropic-account integrations only when Anthropic auth remains
    present

### 4. Neutral OAuth Implications

This final point matters more than it first appears.

A provider-neutral OAuth layer does not solve the entire migration by itself,
but it changes the shape of the work in the right direction.

Without neutral OAuth:

- OpenAI/Codex OAuth becomes a one-off branch inside Anthropic token storage
- auth refresh remains tied to `isClaudeAISubscriber()` and Anthropic account
  identity
- every feature that depends on resolved auth will keep assuming Anthropic
- adding more providers later becomes another custom carve-out

With neutral OAuth:

- provider-owned credentials can live beside Anthropic credentials cleanly
- refresh can be provider-owned rather than globally Anthropic-owned
- runtime model/provider resolution can ask for "resolved auth for provider X"
  instead of "am I a Claude subscriber?"
- local features become easier to preserve because they can depend on provider
  capabilities and runtime auth, not on Anthropic account semantics

What neutral OAuth does *not* solve:

- claude.ai entitlements
- Anthropic-only remote services
- bridge/team-memory/chrome features that explicitly require Claude account
  state

Research conclusion:

- yes, a single dedicated pass on neutral OAuth was worth doing
- provider-neutral OAuth should be treated as a prerequisite architecture layer,
  not as a late cleanup
- but it must be paired with:
  - a provider/runtime seam
  - a transport adapter
  - explicit capability gating

## Final Research Position

The architecture target is now clear:

- Andrew stays the product-surface base because it has the Claude Code feature
  set you want to preserve.
- OpenClaw is the donor for:
  - provider-neutral auth profiles
  - provider runtime hooks
  - OpenAI/Codex model synthesis
  - Responses tool/history conversion
- The first implementation seam should be at Andrew's query transport boundary,
  not at plugin install or login UX.
- The first migration goal should be:
  - native OpenAI/Codex OAuth-backed main query loop
  - local tools/MCP/plugins preserved
  - Anthropic-account features explicitly gated rather than half-migrated
  - tools
  - MCP
  - local commands
  - plugins
  - `/btw`
- Quarantine or defer:
  - bridge / remote control
  - team memory sync
  - Claude in Chrome entitlement behavior
  - other Claude.ai-account features tied to subscriber state

## Next Research Steps

1. Refine Phase 1 into a concrete "minimum donor set" from OpenClaw.
2. Refine Phase 2 into a precise seam proposal for Andrew:
   - provider runtime entrypoint
   - auth-prep hook
   - transport selection hook
3. Refine Phase 3 into a transport adapter inventory:
   - history serialization
   - stream event mapping
   - retry/fallback mapping
4. Refine Phase 4 into tool-event translation requirements.
5. Refine Phase 5 into keep/gate/defer buckets.

## Surgical Implementation Plan

This plan is intentionally staged so that each chunk proves one architectural
assumption before the next chunk starts. The goal is to preserve as much of
Andrew's Claude Code feature surface as possible while replacing the main-model
backend with native OpenAI/Codex OAuth support.

### Rules For Execution

- Keep Andrew as the product-surface base.
- Borrow architecture from OpenClaw, not its whole runtime.
- Do not attempt bridge/team-memory/chrome/remote-env migration in the first
  implementation line.
- Do not start by changing every Anthropic callsite in the repo. Replace the
  main query path first, then route bypass callsites deliberately.
- Every chunk needs a proof gate before the next chunk begins.

### Chunk 1. Introduce A Provider-Neutral Auth Spine

Purpose:

- create a clean place for OpenAI/Codex OAuth credentials to live beside
  Anthropic credentials
- stop future provider work from hardcoding itself into Anthropic auth storage

Primary donor references:

- `/tmp/openclaw-research/src/agents/auth-profiles/types.ts`
- `/tmp/openclaw-research/src/agents/auth-profiles/oauth.ts`
- `/tmp/openclaw-research/src/plugins/provider-openai-codex-oauth.ts`

Primary Andrew targets:

- `/Users/bretlindquist/git/claude-clone-latest/source/src/utils/auth.ts`
- `/Users/bretlindquist/git/claude-clone-latest/source/src/cli/handlers/auth.ts`
- `/Users/bretlindquist/git/claude-clone-latest/source/src/services/oauth/`
- new provider-neutral auth storage module under:
  - `source/src/services/auth-profiles/` or similar

Substeps:

1. define provider-neutral auth profile types:
   - provider id
   - mode: oauth / api_key / token
   - provider-owned credential payload
   - optional profile metadata
2. implement store/load/save helpers for provider auth profiles
3. add provider-neutral refresh dispatch hook surface
4. adapt existing Anthropic OAuth storage to coexist with the new auth-profile
   layer without breaking current Anthropic login
5. add OpenAI/Codex OAuth profile type support, even if login UX still points
   to a stub or external flow in this chunk

Proof gate:

- Anthropic auth still works unchanged
- auth profile store can persist and load multiple provider credentials
- no query-path behavior change yet

Stop condition:

- if Anthropic auth breaks or this chunk starts touching the query transport,
  stop and re-scope

Acceptance criteria:

- a provider-neutral auth store exists
- Anthropic can be represented through it or bridged cleanly to it
- OpenAI/Codex credentials can be represented without Anthropic-specific fields

### Chunk 2. Create The Provider Runtime Seam At The Query Boundary

Purpose:

- replace the hardcoded Anthropic transport entrypoint with a provider-aware
  runtime boundary

Primary donor references:

- `/tmp/openclaw-research/src/plugins/types.ts`
- `/tmp/openclaw-research/src/plugins/provider-runtime.ts`

Primary Andrew targets:

- `/Users/bretlindquist/git/claude-clone-latest/source/src/query/deps.ts`
- `/Users/bretlindquist/git/claude-clone-latest/source/src/query.ts`
- `/Users/bretlindquist/git/claude-clone-latest/source/src/services/api/claude.ts`
- `/Users/bretlindquist/git/claude-clone-latest/source/src/services/api/client.ts`
- `/Users/bretlindquist/git/claude-clone-latest/source/src/utils/model/providers.ts`

Substeps:

1. define a minimal provider runtime interface for the main loop:
   - resolve provider/model
   - prepare runtime auth
   - stream request
   - non-streaming request
   - provider capability flags
2. change `query/deps.ts` so `callModel` no longer points directly at
   `queryModelWithStreaming` but at a provider runtime adapter
3. move current Anthropic implementation behind that interface
4. widen provider identity beyond `firstParty | bedrock | vertex | foundry`
5. make the default runtime still resolve to Anthropic first-party until the
   OpenAI transport exists

Proof gate:

- the existing Anthropic query loop still works through the new seam
- `query.ts` no longer knows which provider transport it is calling

Stop condition:

- if this chunk starts implementing OpenAI serialization or tool translation,
  stop; that belongs to later chunks

Acceptance criteria:

- provider runtime interface exists
- Anthropic transport is the first concrete implementation behind it
- main query path is decoupled from direct Anthropic transport calls

### Chunk 3. Add OpenAI/Codex Provider Resolution And Runtime Auth

Purpose:

- make OpenAI/Codex a real provider choice in Andrew's core, not a plugin-side
  sidecar

Primary donor references:

- `/tmp/openclaw-research/src/plugins/provider-openai-codex-oauth.ts`
- `/tmp/openclaw-research/src/plugins/provider-runtime.ts`
- `/tmp/openclaw-research/src/agents/models-config.providers.openai-codex.test.ts`

Primary Andrew targets:

- provider resolution under `source/src/utils/model/`
- auth/runtime prep under new provider runtime modules
- CLI auth command path in `source/src/cli/handlers/auth.ts`

Substeps:

1. add `openai-codex` as a first-class provider identity
2. add provider-owned auth prep for OpenAI/Codex using the new auth-profile
   layer
3. define initial model resolution rules:
   - safe default OpenAI OAuth model
   - provider-specific model normalization
   - explicit mismatch errors for API-only model ids
4. add initial login plumbing for OpenAI/Codex OAuth
   - if needed, start with a provider-owned login adapter that can evolve later
5. add provider-aware status reporting

Proof gate:

- Andrew can report that OpenAI/Codex is a valid provider
- auth resolution for `openai-codex` succeeds independently of Anthropic auth
- no main query execution yet

Stop condition:

- if this chunk starts modifying tool loops or message conversion, stop

Acceptance criteria:

- provider resolution supports Anthropic and OpenAI/Codex
- runtime auth prep can resolve OpenAI/Codex credentials
- CLI status/auth surfaces reflect the new provider

### Chunk 4. Implement The OpenAI Responses Transport

Purpose:

- make the provider seam actually capable of running the main conversation on
  OpenAI/Codex

Primary donor references:

- `/tmp/openclaw-research/src/agents/openai-ws-message-conversion.ts`
- `/tmp/openclaw-research/src/agents/pi-embedded-runner/openai-stream-wrappers.ts`
- `/tmp/openclaw-research/src/agents/models-config.providers.openai-codex.test.ts`

Primary Andrew targets:

- new OpenAI/Codex transport module under `source/src/services/api/`
- provider runtime transport registry
- query transport entrypoints currently living in `services/api/claude.ts`

Substeps:

1. create a dedicated `openai-codex-responses` transport adapter
2. implement model/base-url normalization for the ChatGPT/Codex backend
3. implement request shaping for:
   - full-context initial turn
   - replay turn
   - tool-result incremental turn
4. implement streaming wrapper adaptation for Andrew's streaming loop
5. implement non-streaming fallback strategy for Responses transport
6. map provider errors into Andrew-native error shapes where possible

Proof gate:

- one plain text prompt succeeds through Andrew's main query path using
  OpenAI/Codex OAuth
- Anthropic path still works through the same provider seam

Stop condition:

- if tools are being faked or bypassed just to get text working, record it as a
  temporary limitation and stop at plain-text proof

Acceptance criteria:

- Andrew main conversation can execute on OpenAI/Codex OAuth
- transport selection is provider-based, not auth-based
- Anthropic remains intact

### Chunk 5. Translate Tool And Replay Events

Purpose:

- preserve Claude Code's existing tool loop instead of rewriting it

Primary donor references:

- `/tmp/openclaw-research/src/agents/openai-ws-message-conversion.ts`
- `/tmp/openclaw-research/src/agents/pi-embedded-runner/run.ts`
- `/tmp/openclaw-research/src/agents/pi-embedded-runner/tool-split.ts`

Primary Andrew targets:

- `/Users/bretlindquist/git/claude-clone-latest/source/src/query.ts`
- `/Users/bretlindquist/git/claude-clone-latest/source/src/remote/sdkMessageAdapter.ts`
- new OpenAI/Codex conversion layer under `source/src/services/api/` or
  `source/src/query/`

Substeps:

1. map Andrew tools to OpenAI function tools
2. map assistant text, tool calls, tool results, and reasoning replay into
   Responses input items
3. map Responses output back into Andrew assistant/tool_use/tool_result-shaped
   events for the existing loop
4. preserve retry/recovery behavior, including missing tool-result repair
5. validate resume/replay paths and remote adapter expectations

Proof gate:

- local tools execute through the OpenAI/Codex-backed main loop
- resumed sessions with tool history do not corrupt message shape

Stop condition:

- if tool execution requires rewriting Andrew's tool orchestrator, stop; the
  plan is to adapt events, not replace the tool system

Acceptance criteria:

- tools, MCP-backed calls, and replay history work through the OpenAI/Codex
  provider
- remote/session rendering remains coherent

### Chunk 6. Route Secondary Anthropic Bypass Callsites

Purpose:

- prevent the app from appearing "mostly migrated" while utility paths still
  call Anthropic directly

Primary Andrew targets:

- `/Users/bretlindquist/git/claude-clone-latest/source/src/utils/sideQuery.ts`
- `/Users/bretlindquist/git/claude-clone-latest/source/src/services/tokenEstimation.ts`
- `/Users/bretlindquist/git/claude-clone-latest/source/src/tools/WebSearchTool/WebSearchTool.ts`
- `/Users/bretlindquist/git/claude-clone-latest/source/src/services/toolUseSummary/toolUseSummaryGenerator.ts`
- `queryHaiku(...)` and hook-helper callsites under `source/src/`

Substeps:

1. inventory direct Anthropic callsites after Chunks 1-5 land
2. classify each as:
   - reroute through provider runtime now
   - gate for Anthropic-only operation
   - defer
3. reroute low-risk local callsites first:
   - sideQuery
   - queryHaiku-style helper calls
   - tool use summary helpers
4. gate or defer callsites whose semantics are still Anthropic-specific

Proof gate:

- common local helpers no longer silently force Anthropic when OpenAI/Codex is
  the active provider

Stop condition:

- if a bypass callsite depends on Anthropic-only service contracts, mark it as
  gated/deferred rather than forcing a fake OpenAI path

Acceptance criteria:

- local helper calls align with the selected main provider wherever practical
- remaining Anthropic-only paths are explicit, not hidden

### Chunk 7. Add Capability Gating For Anthropic-Account Features

Purpose:

- preserve maximum feature surface without pretending Claude-account features
  are provider-neutral

Primary Andrew targets:

- `/Users/bretlindquist/git/claude-clone-latest/source/src/bridge/bridgeEnabled.ts`
- `/Users/bretlindquist/git/claude-clone-latest/source/src/services/teamMemorySync/index.ts`
- `/Users/bretlindquist/git/claude-clone-latest/source/src/commands/chrome/chrome.tsx`
- `/Users/bretlindquist/git/claude-clone-latest/source/src/commands/remote-env/index.ts`
- `/Users/bretlindquist/git/claude-clone-latest/source/src/utils/model/modelOptions.ts`
- `/Users/bretlindquist/git/claude-clone-latest/source/src/services/api/bootstrap.ts`

Substeps:

1. add capability/state checks for:
   - provider family
   - OAuth type
   - claude.ai entitlement presence
2. update UI/commands to show clear gating instead of failing deep in auth code
3. keep Anthropic-account features available when Anthropic auth is still
   configured
4. avoid deleting these features; quarantine them behind capability checks

Proof gate:

- OpenAI/Codex users see clear unsupported/gated messaging for Anthropic-only
  features
- Anthropic users do not regress

Stop condition:

- if this chunk starts trying to port bridge/team-memory to OpenAI, stop

Acceptance criteria:

- non-local Anthropic-account features are explicit capability-gated
- the local feature surface remains intact

### Chunk 8. Native OpenAI OAuth UX Hardening

Purpose:

- make OpenAI/Codex OAuth feel first-class inside Andrew, not bolted on

Primary donor references:

- `/tmp/openclaw-research/src/plugins/provider-openai-codex-oauth.ts`
- `/tmp/openclaw-research/src/agents/auth-profiles/oauth.ts`

Primary Andrew targets:

- `/Users/bretlindquist/git/claude-clone-latest/source/src/cli/handlers/auth.ts`
- provider auth-profile modules
- status/doctor/settings surfaces

Substeps:

1. add provider-aware login/logout/status UX
2. add refresh-state/status display for OpenAI/Codex auth
3. add remote/headless hints if the flow needs them
4. add diagnostics for:
   - linked but unsupported model
   - missing provider auth
   - stale OAuth credentials
5. document precedence rules if multiple providers are configured

Proof gate:

- a cold user can log into OpenAI/Codex OAuth from Andrew without knowing
  internals
- status surfaces explain which provider is active and why

Acceptance criteria:

- OpenAI/Codex OAuth is a first-class auth path in the UI/CLI
- auth troubleshooting is understandable from inside the app

### Chunk 9. Regression Matrix And Merge Hardening

Purpose:

- stop parity from depending on manual trial-and-error after the first success

Primary test targets:

- provider auth-profile tests
- provider runtime resolution tests
- OpenAI Responses transport tests
- tool/replay translation tests
- capability gating tests
- smoke tests for Anthropic and OpenAI/Codex main loop operation

Substeps:

1. add unit coverage for auth profile persistence and refresh dispatch
2. add provider runtime tests for provider/model resolution
3. add transport tests for:
   - initial turn
   - replay turn
   - tool-result turn
4. add tool loop tests for:
   - tool use
   - tool result
   - resumed session
5. add capability-gating tests for Anthropic-only features
6. build a manual validation matrix for:
   - Anthropic main loop
   - OpenAI/Codex main loop
   - local tools
   - MCP
   - `/btw`
   - model picker/status/auth UX

Acceptance criteria:

- the new provider path has regression coverage across auth, transport, tools,
  and gating
- Anthropic regressions are detectable early

## Recommended Execution Order

1. Chunk 1: provider-neutral auth spine
2. Chunk 2: provider runtime seam at `query/deps.ts`
3. Chunk 3: OpenAI/Codex provider resolution and runtime auth
4. Chunk 4: OpenAI Responses transport plain-text proof
5. Chunk 5: tool/replay event translation
6. Chunk 6: secondary Anthropic bypass callsites
7. Chunk 7: capability gating for Anthropic-account features
8. Chunk 8: native OpenAI OAuth UX hardening
9. Chunk 9: regression matrix and merge hardening

## First Real Milestone

The first milestone worth calling "success" is not "OpenAI login exists."

It is:

- Andrew runs the main REPL query loop on OpenAI/Codex OAuth
- local tools still work
- MCP still works
- `/btw` still works
- Anthropic-only account features are explicitly gated rather than broken

That milestone should land before any broader polish or feature expansion.

## Execution Status

Completed so far:

- Chunk 1 foundation landed:
  - provider-neutral secure-storage types:
    - `source/src/utils/secureStorage/types.ts`
  - provider auth-profile store/helpers:
    - `source/src/services/authProfiles/store.ts`
  - Anthropic OAuth token persistence now mirrors into a provider-neutral
    Anthropic profile:
    - `source/src/utils/auth.ts`

- Chunk 2 initial seam landed:
  - main query dependency boundary now routes through a provider runtime adapter:
    - `source/src/query/deps.ts`
    - `source/src/services/api/providerRuntime.ts`
  - runtime identity is no longer a single hardcoded `"anthropic"` value; it
    now reflects the existing Anthropic deployment modes:
    - `anthropic-first-party`
    - `anthropic-bedrock`
    - `anthropic-vertex`
    - `anthropic-foundry`

- Chunk 3 narrow provider/auth surfacing landed:
  - provider-auth readiness helpers now exist for generic providers and the
    initial OpenAI/Codex source:
    - `source/src/services/authProfiles/store.ts`
  - provider runtime snapshots can now represent OpenAI/Codex readiness without
    switching live execution:
    - `source/src/services/api/providerRuntime.ts`
  - CLI status/auth surfaces now report:
    - current main-loop runtime
    - OpenAI/Codex OAuth readiness
    - preferred runtime intent when OpenAI/Codex is selected but transport work
      is still pending
    - `source/src/utils/status.tsx`
    - `source/src/cli/handlers/auth.ts`

- Chunk 4 transport foundation started:
  - dedicated OpenAI/Codex transport module exists:
    - `source/src/services/api/openaiCodex.ts`
  - provider runtime now has an explicit `openai-codex-responses` execution
    branch instead of implicit Anthropic-only assumptions:
    - `source/src/services/api/providerRuntime.ts`
  - main-loop plain-text execution now works end-to-end on OpenAI/Codex when
    explicitly selected:
    - external Codex CLI auth is read from `~/.codex/auth.json`
    - a minimal ChatGPT/Codex `/responses` request is sent and collected
    - assistant text is converted back into Andrew-native `AssistantMessage`
    - `source/src/services/authProfiles/store.ts`
    - `source/src/services/api/openaiCodex.ts`
    - `source/src/services/api/providerRuntime.ts`
  - OpenAI/Codex tool transport is now live for the main loop:
    - Andrew tools are converted into OpenAI function tools
    - assistant `tool_use` and user `tool_result` history are translated into
      Responses `function_call` / `function_call_output` items
    - Responses `function_call` items are converted back into Andrew-native
      `tool_use` blocks
    - strict OpenAI function-tool mode is intentionally disabled for now on
      this provider path because Andrew tool schemas still need a fuller
      optional-field normalization layer
    - `source/src/services/api/openaiCodex.ts`
  - selecting OpenAI/Codex now also defaults the main-loop model to `gpt-5.4`
    instead of a Claude model:
    - `source/src/utils/model/providers.ts`
    - `source/src/utils/model/model.ts`

- Chunk 5 initial proof is complete:
  - a real Bash tool turn now succeeds through the OpenAI/Codex-backed main loop
  - a resumed second turn on the same session can replay that tool history
    correctly via `--resume`
  - remote/session rendering hardening is still pending, but the local replay
    proof gate is now satisfied

- Chunk 6 low-risk reroutes have started:
  - provider-runtime routing now covers several helper paths that previously
    called Anthropic helpers directly:
    - `source/src/services/awaySummary.ts`
    - `source/src/utils/hooks/apiQueryHookHelper.ts`
    - `source/src/utils/hooks/execPromptHook.ts`
    - `source/src/utils/hooks/skillImprovement.ts`
    - `source/src/components/agents/generateAgent.ts`
    - `source/src/services/compact/compact.ts`
  - obvious Anthropic-only helper/tool paths are starting to be explicitly
    gated when OpenAI/Codex is the active main runtime:
    - `source/src/tools/WebSearchTool/WebSearchTool.ts` now disables the
      Anthropic-backed web-search tool on the OpenAI path
    - `source/src/services/tokenEstimation.ts` now avoids Anthropic token-count
      API calls on the OpenAI path and falls back to existing non-API behavior
  - a provider-backed small/fast helper query now exists:
    - `source/src/services/api/providerHelpers.ts`
  - the first remaining `queryHaiku(...)` local-helper bucket has been rerouted
    through that provider-backed helper:
    - `source/src/services/toolUseSummary/toolUseSummaryGenerator.ts`
    - `source/src/commands/rename/generateSessionName.ts`
    - `source/src/utils/mcp/dateTimeParser.ts`
    - `source/src/utils/sessionTitle.ts`
    - `source/src/utils/shell/prefix.ts`
  - the next local-helper bucket is also rerouted through the same provider
    helper:
    - `source/src/tools/WebFetchTool/utils.ts`
    - `source/src/components/Feedback.tsx`
    - `source/src/utils/teleport.tsx` (title/branch generation helper)
  - after review, `source/src/utils/sideQuery.ts` is now clearly classified as
    a separate provider-neutral transport seam, not a low-risk helper reroute:
    - it underpins auto-mode critique, permission explaining, session search,
      model validation, Chrome-side MCP, and memory relevance
    - it currently depends on Anthropic response/metadata/body semantics
    - do not fold it into the helper-reroute bucket
  - additional medium-risk cleanup landed without touching `sideQuery.ts`
    directly:
    - `source/src/utils/model/validateModel.ts` now respects the active main
      runtime:
      - on Anthropic it keeps the existing live-validation path
      - on OpenAI/Codex it validates against the OpenAI provider's current
        supported-model rule instead of probing Anthropic
    - `source/src/utils/model/modelCapabilities.ts` now explicitly stands down
      when the active main runtime is OpenAI/Codex instead of refreshing
      Anthropic-only model capability data in the background
    - `source/src/cli/handlers/autoMode.ts` now explicitly gates the
      `auto-mode critique` command on OpenAI/Codex instead of failing through
      the Anthropic-only `sideQuery` transport
    - `source/src/utils/agenticSessionSearch.ts` is now rerouted through the
      provider-backed small/fast helper instead of `sideQuery.ts`
    - `source/src/memdir/findRelevantMemories.ts` is now rerouted through the
      provider-backed small/fast helper as a JSON-only text response, rather
      than relying on Anthropic-only structured-output side queries

- Build environment hardening landed:
  - the generated workspace installer in `scripts/build-cli.mjs` now pins the
    drift-prone Azure auth chain and `supports-hyperlinks` to a compatible band
    so overlay reinstalls remain reproducible
  - canonical validation is green again after a full workspace reset

- Targeted OpenAI/Codex regression coverage now exists in repo form:
  - `scripts/openai-codex-regression.sh`
  - `npm run openai-codex-check`
  - scope:
    - plain-text OpenAI/Codex prompt
    - real Bash tool turn
    - resumed replay on the same session
  - streamed text-turn proof via `--output-format stream-json --verbose
    --include-partial-messages`
  - streamed tool-turn proof via `--output-format stream-json --verbose
    --include-partial-messages`
  - still passing after the low-risk helper reroutes and OpenAI streaming shim

- Chunk 8A streaming parity is now partially landed:
  - `source/src/services/api/openaiCodex.ts` no longer buffers the OpenAI path
    into one final collected assistant response during streaming mode
  - the OpenAI/Codex path now emits Andrew-compatible synthetic stream events
    for:
    - `message_start`
    - `content_block_start`
    - `content_block_delta` with `text_delta`
    - `content_block_delta` with `input_json_delta`
    - `content_block_stop`
    - `message_delta`
    - `message_stop`
  - text turns now stream live through Andrew's existing stream consumers
  - tool turns now surface `tool_use` start plus JSON input deltas through the
    same stream path
  - final assistant blocks are still emitted and recorded so transcript/replay
    behavior stays stable
  - this is intentionally a narrow compatibility shim:
    - it does not attempt full Anthropic stream fidelity
    - it does not yet stream tool-argument deltas incrementally if the backend
      only finalizes them at `response.output_item.done`
    - it is sufficient for Andrew's current QueryEngine, REPL, and CCR-facing
      stream consumers

Verification completed:

- canonical repo check passes:
  - `npm run dev-check`
- generated build passes:
  - `node scripts/build-cli.mjs --no-minify`
- built CLI smoke check passes:
  - `node dist/cli.js --help`
- auth/status provider surfacing works in the built CLI:
  - `node dist/cli.js auth status --json`
  - `node dist/cli.js auth status --text`
- explicit OpenAI/Codex provider selection executes through the main loop:
  - `CLAUDE_CODE_USE_OPENAI_CODEX=1 ANTHROPIC_MODEL=gpt-5.4 node dist/cli.js -p "say hello in five words"`
- OpenAI/Codex selection also works without a model override:
  - `CLAUDE_CODE_USE_OPENAI_CODEX=1 node dist/cli.js -p "say hello in five words"`
- OpenAI/Codex tool execution works through the rebuilt bundle:
  - `CLAUDE_CODE_USE_OPENAI_CODEX=1 node dist/cli.js -p "Use the Bash tool to run 'pwd' and reply with only the resulting path."`
- OpenAI/Codex replay works across a resumed session:
  - first turn:
    - `CLAUDE_CODE_USE_OPENAI_CODEX=1 node dist/cli.js --session-id <uuid> -p "Use the Bash tool to run 'pwd' and reply with only the resulting path."`
  - second turn:
    - `CLAUDE_CODE_USE_OPENAI_CODEX=1 node dist/cli.js --resume <uuid> -p "What path did the Bash tool return last turn? Reply with only the path."`
- OpenAI/Codex stream-json partial-message output now works in the built CLI:
  - text turn:
    - `CLAUDE_CODE_USE_OPENAI_CODEX=1 node dist/cli.js -p "say hello in five words" --output-format stream-json --verbose --include-partial-messages`
  - tool turn:
    - `CLAUDE_CODE_USE_OPENAI_CODEX=1 node dist/cli.js -p "Use the Bash tool to run 'pwd' and reply with only the resulting path." --output-format stream-json --verbose --include-partial-messages`
- validation/build checks are still green after the streaming and model-surface
  hardening:
  - `npm run dev-check`
  - `npm run openai-codex-check`

Current state:

- the provider-neutral auth spine exists
- the main query seam exists
- OpenAI/Codex is now a surfaced provider candidate in core status/auth logic
- OpenAI/Codex auth can be detected independently of Anthropic auth via:
  - provider auth profiles
  - external Codex CLI auth state
- OpenAI/Codex main-loop execution is now enabled when explicitly selected for:
  - plain text
  - local tool turns
  - resumed replay of tool history
- current primary risk has moved from auth/transport into parity/routing:
  - some secondary helper paths still bypass the provider runtime
  - Anthropic-account product features still need explicit gating
  - streaming delta parity on the OpenAI path is now present but still thinner
    than Anthropic in breadth and metadata fidelity
  - strict OpenAI function-tool schemas are still intentionally permissive on
    this provider path and need their own hardening pass
- next implementation target is Chunk 6:
  - continue medium-risk review and gating around `sideQuery`-dependent helper
    surfaces, rather than blindly rerouting Anthropic-shaped utilities
  - after the latest pass, the strongest remaining `sideQuery`-dependent bucket
    is now:
    - `source/src/utils/permissions/permissionExplainer.ts`
    - `source/src/utils/permissions/yoloClassifier.ts`
    - `source/src/utils/claudeInChrome/mcpServer.ts`
    - any remaining model/account helpers that are truly Anthropic-service
      bound rather than plain local helper calls

Remaining direct Anthropic callsite inventory for Chunk 6 / Chunk 7:

- reroute now:
  - completed:
    - `source/src/services/toolUseSummary/toolUseSummaryGenerator.ts`
    - `source/src/commands/rename/generateSessionName.ts`
    - `source/src/utils/mcp/dateTimeParser.ts`
    - `source/src/utils/sessionTitle.ts`
    - `source/src/utils/shell/prefix.ts`
  - helper used:
    - `source/src/services/api/providerHelpers.ts`

- gate or defer after explicit review:
  - `source/src/utils/sideQuery.ts`
    - direct `getAnthropicClient(...)` plus Anthropic metadata/body-shape logic;
      classify as Anthropic-service-bound for now; do not reroute blindly
  - `source/src/tools/WebFetchTool/utils.ts`
    - rerouted through `providerHelpers.ts`; remaining policy/capability review
      still belongs with web-fetch/web-search gating work
  - `source/src/components/Feedback.tsx`
    - rerouted through `providerHelpers.ts`; feedback submission remains
      Anthropic-service-adjacent but title generation no longer forces Anthropic
  - `source/src/utils/teleport.tsx`
    - title/branch helper rerouted through `providerHelpers.ts`; broader
      teleport product surfaces remain Anthropic-adjacent and need separate
      gating review
  - `source/src/utils/model/modelCapabilities.ts`
    - uses `getAnthropicClient(...)`; likely should stay Anthropic-specific or
      become provider-capability driven rather than silently rerouted

- Anthropic-account / Anthropic-service surfaces to gate explicitly:
  - `source/src/services/claudeAiLimits.ts`
    - Claude-account limit inspection
  - `source/src/hooks/useApiKeyVerification.ts`
    - Anthropic API key verification UX
  - `source/src/services/api/claude.ts`
    - `verifyApiKey(...)`, `getAPIMetadata(...)`, `getCacheControl(...)`
      remain Anthropic transport helpers
  - `source/src/utils/permissions/yoloClassifier.ts`
    - Anthropic cache-control and classifier assumptions
  - first gating landed:
    - `source/src/hooks/useApiKeyVerification.ts` now no-ops to `valid` on the
      OpenAI runtime instead of surfacing Anthropic API-key verification
    - `source/src/services/claudeAiLimits.ts` now skips quota preflight checks
      on the OpenAI runtime

Detailed next-plan addendum:

### Chunk 6A. Finish Low-Risk Local Helper Reroutes

Purpose:

- remove the remaining low-risk local helper paths that still silently force
  Anthropic even when OpenAI/Codex is the selected main runtime

Primary targets:

- `source/src/services/toolUseSummary/toolUseSummaryGenerator.ts`
- `source/src/commands/rename/generateSessionName.ts`
- `source/src/utils/mcp/dateTimeParser.ts`
- `source/src/utils/sessionTitle.ts`
- `source/src/utils/shell/prefix.ts`

Substeps:

1. replace `queryHaiku(...)` imports/usages with provider-runtime-backed
   equivalents or thin wrappers that respect the active main provider
2. keep model selection behavior conservative:
   - retain small/fast model intent
   - do not widen prompts/tools unless needed
3. verify each helper still behaves sanely in Anthropic mode
4. verify each helper no longer forces Anthropic in OpenAI/Codex mode

Proof gate:

- common lightweight local helper flows now align with the selected provider

Stop condition:

- if a helper depends on Anthropic-only response shape or metadata semantics,
  move it into Chunk 6B/7 instead of forcing a fake reroute

Acceptance criteria:

- the above files no longer import `queryHaiku(...)` from Anthropic-only code
  paths for normal local operation

### Chunk 6B. Review Medium-Risk Local Helper Paths

Purpose:

- classify the remaining mixed local helpers before touching them

Primary targets:

- `source/src/utils/sideQuery.ts`
- `source/src/tools/WebFetchTool/utils.ts`
- `source/src/components/Feedback.tsx`
- `source/src/utils/teleport.tsx`
- `source/src/utils/model/modelCapabilities.ts`

Substeps:

1. read each file and identify whether it is:
   - a local assistant helper that can be rerouted
   - an Anthropic-service/product helper that should be gated
   - a hybrid that needs a smaller provider-neutral seam first
2. document the decision inline in this state file before implementation
3. reroute only the truly local helpers
4. gate the Anthropic-service-bound helpers with explicit UX messaging

Proof gate:

- no hidden Anthropic dependency remains in the “local helper” bucket

Stop condition:

- if a callsite exists to talk to Claude-account or Claude-service backends,
  stop rerouting and convert it to explicit gating work

Acceptance criteria:

- each medium-risk file is moved into one of:
  - rerouted
  - gated
  - deferred with reason

### Chunk 7A. Gate Anthropic-Account Features Explicitly

Purpose:

- preserve honesty in the product surface by disabling Claude-account features
  when the active main provider is OpenAI/Codex

Primary targets:

- `source/src/services/claudeAiLimits.ts`
- `source/src/hooks/useApiKeyVerification.ts`
- `source/src/utils/permissions/yoloClassifier.ts`
- Anthropic-only helpers in `source/src/services/api/claude.ts`

Substeps:

1. add provider-runtime/capability checks at entry points
2. return explicit unsupported/gated UX instead of silent failures
3. keep Anthropic behavior unchanged when Anthropic is active
4. avoid deep refactors here; prefer precise guardrails

Proof gate:

- OpenAI/Codex users no longer see Anthropic-account features pretending to be
  available

Stop condition:

- if a surface can be made provider-neutral cheaply, move it back to reroute
  work rather than hard-gating it

Acceptance criteria:

- Anthropic-account/service surfaces are explicit and predictable under both
  providers

### Chunk 7B. Gate Anthropic Web/Server Tools

Purpose:

- extend the same gating logic to tool surfaces backed by Anthropic-specific
  server tools or policies

Primary targets:

- `source/src/tools/WebFetchTool/utils.ts`
- `source/src/tools/WebSearchTool/WebSearchTool.ts`
- any related server-tool policy helpers discovered during review

Substeps:

1. confirm whether `WebFetch` is provider-neutral enough to reroute or whether
   it is still Anthropic-backed in practice
2. keep `WebSearch` disabled on OpenAI/Codex until a true provider-neutral or
   OpenAI-native equivalent exists
3. align UI/help text with the actual capability state

Proof gate:

- OpenAI/Codex sessions do not expose Anthropic-backed web tooling as if it
  were native

Acceptance criteria:

- web/server tool capability is explicit and coherent across providers

### Chunk 8A. Add True Streaming Delta Parity

Purpose:

- close the largest remaining runtime parity gap between Anthropic streaming and
  the current collected-message OpenAI/Codex path

Primary targets:

- `source/src/services/api/openaiCodex.ts`
- any adjacent message/event helpers needed by the query loop

Substeps:

1. split SSE parsing into:
   - text delta handling
   - output-item completion handling
   - failure/incomplete handling
2. emit Andrew-compatible streaming text events as
   `response.output_text.delta` arrives
3. preserve final assistant message assembly for transcript/session storage
4. emit completed `tool_use` blocks as soon as the corresponding
   `function_call` item is complete
5. ensure no duplicate text appears from:
   - deltas
   - final output-item text
   - final assembled message

Proof gate:

- OpenAI/Codex REPL output streams progressively instead of only on completion

Stop condition:

- if Andrew’s stream consumer requires Anthropic-specific event semantics that
  cannot be matched incrementally, add a compatibility shim instead of widening
  the provider code ad hoc

Acceptance criteria:

- plain-text turns stream live
- tool-turns still work
- resumed sessions remain coherent after streamed turns

### Chunk 8B. Add Streaming Regression Coverage

Purpose:

- keep streaming work from regressing as more provider routing lands

Primary targets:

- `scripts/openai-codex-regression.sh`
- optionally a second focused script if the streaming assertions need to stay
  separate

Substeps:

1. add a streaming-mode proof command using the built CLI output format that is
   stable enough to assert on
2. verify:
   - non-empty streamed text
   - no duplicated final response text
   - tool turn still completes under streaming path if applicable
3. keep the check lightweight enough to run regularly

Acceptance criteria:

- repo has a repeatable proof for streamed OpenAI/Codex execution, not just
  collected-message execution

### Chunk 9A. Extract OpenAI Tool Schema Normalization

Purpose:

- stop keeping OpenAI tool-schema logic as an inline transport hack

Primary targets:

- `source/src/services/api/openaiCodex.ts`
- new helper under `source/src/services/api/` or `source/src/utils/`

Substeps:

1. move schema normalization into a dedicated helper module
2. preserve current permissive behavior as the baseline path
3. document the exact OpenAI strict-schema constraints we need to satisfy:
   - top-level object schema
   - consistent `required`
   - recursive object handling
   - union flattening or normalization where needed

Proof gate:

- transport code becomes simpler and schema handling is independently testable

Acceptance criteria:

- OpenAI schema normalization has one canonical implementation site

### Chunk 9B. Reintroduce Strict Tool Schemas Incrementally

Purpose:

- recover structured-output strictness without breaking Andrew’s existing tool
  fleet

Primary targets:

- normalized schema helper from Chunk 9A
- `source/src/services/api/openaiCodex.ts`

Substeps:

1. add a narrow strict-safe allowlist:
   - start with simple local tools such as `Bash`, `Read`, `Write`
2. normalize optional fields in a way OpenAI accepts without lying about the
   schema shape
3. enable `strict: true` only for allowlisted tools that pass live validation
4. keep permissive fallback for all others
5. expand the allowlist one tool at a time as each schema proves stable

Proof gate:

- at least one useful local tool runs successfully in true strict mode on the
  OpenAI path

Stop condition:

- if a tool’s schema requires invasive rewriting, keep it permissive for now
  and move on rather than blocking the whole provider path

Acceptance criteria:

- strict mode is no longer globally disabled forever; it is selectively enabled
  where proven safe

### Chunk 9C. Add Schema Regression Coverage

Purpose:

- keep future tool/schema changes from silently breaking OpenAI strict mode

Primary targets:

- normalized schema helper
- `scripts/openai-codex-regression.sh` or adjacent regression scripts

Substeps:

1. add assertions or scripted checks for:
   - permissive fallback path
   - at least one strict-enabled tool
   - resumed tool-history path after a strict-enabled tool call
2. keep the regression small enough to stay runnable on local builds

Acceptance criteria:

- schema-mode regressions are detectable without re-discovering them manually
