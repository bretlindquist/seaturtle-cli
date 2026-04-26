# Gemini Runtime

SeaTurtle ships a native Gemini runtime behind the existing provider seam. It
does not use the OpenAI-compatible Gemini chat endpoint. Main-loop requests go
through Gemini `generateContent` / `streamGenerateContent`, with Gemini-native
`Content`, `Part`, tool declarations, and thought-signature preservation.

## Enable Gemini

Primary setup:

```sh
export GEMINI_API_KEY=...
export SEATURTLE_MAIN_PROVIDER=gemini
```

Current operator truth:

- direct Gemini setup in this build is API-key based
- `/status` and `ct auth status --json` show whether Gemini is active,
  preferred, or merely available
- `/login` supports first-class Gemini API-key setup through CT secure storage,
  while the env/API-key path remains available for explicit operator control
- after Gemini auth completes, SeaTurtle moves the operator onto a Gemini-valid
  main-loop model instead of leaving a stale Anthropic/OpenAI model selected
- Gemini Search and Gemini URL context both use the same Gemini API key in this
  build; SeaTurtle does not require a separate Google Search API key for routed
  Gemini web access

Boolean provider gate:

```sh
export SEATURTLE_USE_GEMINI=1
```

Compatibility aliases are still accepted:

- `CLAUDE_CODE_MAIN_PROVIDER=gemini`
- `CLAUDE_CODE_USE_GEMINI=1`

SeaTurtle env names take precedence over persisted provider config, which in
turn takes precedence over the legacy Claude compatibility env names.

## Supported Models

Main-loop Gemini chat models currently exposed in the picker:

- `gemini-3.1-pro-preview`
- `gemini-3-flash-preview`
- `gemini-3.1-flash-lite-preview`
- `gemini-2.5-pro`
- `gemini-2.5-flash`
- `gemini-2.5-flash-lite`

Specialized routed Gemini models tracked in the capability registry:

- image generation/editing:
  - `gemini-3.1-flash-image-preview`
  - `gemini-3-pro-image-preview`
  - `gemini-2.5-flash-image`
- computer use:
  - `gemini-2.5-computer-use-preview-10-2025`
- embeddings / file-search support:
  - `gemini-embedding-001`

Preview and lifecycle state are carried in the Gemini capability registry and
shown through the normal model picker/status surfaces.

SeaTurtle keeps the Gemini picker curated. Official provider discovery is
tracked separately from the routed picker list so upstream model-list changes do
not automatically claim support in CT before the local runtime is classified
and validated.

## Routed Runtime Surface

Gemini is routed today for:

- native text generation through `generateContent`
- native SSE streaming through `streamGenerateContent`
- native Gemini function calling with thought-signature replay
- local SeaTurtle tools through Gemini function declarations
- image input through native `inlineData`
- Gemini image generation and editing through `ImageGenerationTool`
- Gemini Google Search grounding through `WebSearchTool`
- Gemini URL context through `WebFetchTool`
- Gemini provider-hosted code execution through `HostedShellTool`
- Gemini file search when store config is present
- Gemini computer use through the guarded local desktop executor
- Gemini structured outputs for helper/classifier JSON flows
- Gemini token counting endpoint support
- local request guards for model output limits, estimated context overflow, and
  the 20 MB inline request cap
- `/status` and `ct auth status --json` reporting of documented Gemini support
  separately from routed SeaTurtle support

Current Gemini web routing in SeaTurtle:

- `WebSearch` uses Gemini built-in `googleSearch`
- `WebFetch` uses Gemini built-in `urlContext` only on the validated Gemini 3
  routed path
- when the current Gemini model is not routed for URL context, or when a target
  URL is outside Gemini URL-context support, SeaTurtle falls back to its local
  WebFetch path and notes that routing choice in the tool result

Google documents URL context support across Gemini 2.5 and Gemini 3 model
families. SeaTurtle keeps documented capability truth separate from routed
capability truth, and currently routes URL context only on the validated Gemini
3 path for production reliability. Gemini 2.5 models still retain Gemini web
search, but `WebFetch` uses the local SeaTurtle fetch path instead.

Gemini selection never silently executes Anthropic. If Gemini is selected and
auth is missing, SeaTurtle fails with Gemini-specific setup guidance.

Parallel agents:

- Gemini uses SeaTurtle's local teammate runtime when the active Gemini runtime
  is auth-ready
- teammates inherit the selected Gemini provider, model, effort, settings path,
  and provider auth instead of silently routing back to Anthropic
- teammates also inherit the current operator's Gemini capability boundaries,
  including image models, file-search stores, cached content config, and
  service tiers
- profile-backed auth is shared through `CLAUDE_CONFIG_DIR`; env-only auth is
  forwarded through `GEMINI_API_KEY` or `GOOGLE_API_KEY`
- if Gemini auth is unavailable in the teammate context, the teammate should
  fail with Gemini setup guidance rather than use another provider

Remote-host cloud offload:

- Gemini does not use `ct --remote`; that path is still the Anthropic
  claude.ai CCR flow
- Gemini cloud/offloaded execution uses `ct ssh <host> [dir]`
- SeaTurtle deploys a matching remote runtime, starts CT on the target host,
  and injects the active Gemini provider/auth selection there
- Gemini API-key auth is exported from CT secure storage or `GEMINI_API_KEY`
  into the remote session for that host-managed run
- if the remote-host session cannot establish Gemini auth, it should fail with
  Gemini-specific guidance rather than route back to Anthropic

## Config Surface

Core:

```sh
export GEMINI_API_KEY=...
export SEATURTLE_MAIN_PROVIDER=gemini
```

Optional Gemini runtime config:

```sh
export SEATURTLE_GEMINI_IMAGE_MODEL=gemini-2.5-flash-image
export SEATURTLE_GEMINI_FILE_SEARCH_STORE_NAMES=store-a,store-b
export SEATURTLE_GEMINI_FILE_SEARCH_DEFAULT_STORE=store-a
export SEATURTLE_GEMINI_CACHED_CONTENT=cachedContents/...
export SEATURTLE_GEMINI_SERVICE_TIER=priority
```

Gemini-only operator controls:

- `/gemini` opens the Gemini guardrails picker
- `/gemini strict` enables the Gemini-only strict behavior mode
- `/gemini off` disables it again
- `/config` also exposes this as `Gemini guardrails`

Strict mode currently appends an extra Gemini-only coding and UX instruction
block on every Gemini turn and blocks broad destructive Bash mutations such as
directory-wide git restore/reset/clean commands or broad in-place source
rewrites. It does not affect OpenAI/Codex or Anthropic turns.

Gemini image generation also accepts Google-style nickname aliases:

- `nano banana` -> `gemini-2.5-flash-image`
- `nano banana 2` -> `gemini-3.1-flash-image-preview`
- `nano banana pro` -> `gemini-3-pro-image-preview`

Example:

```sh
export SEATURTLE_GEMINI_IMAGE_MODEL="nano banana 2"
```

`SEATURTLE_GEMINI_CACHED_CONTENT` attaches an explicit Gemini cached-content
prefix to native requests. This is useful when you have already created a cache
resource and want SeaTurtle to reuse it in repeated flows.

## Capability Truth

SeaTurtle keeps two Gemini capability views:

- documented Gemini support: what Google documents for the selected model
- routed SeaTurtle support: the Gemini features this build actually wires and
  validates end to end

SeaTurtle also keeps two Gemini model views:

- curated shipped registry: what CT intentionally exposes and recommends
- official discovery readiness: whether this install can query Google's model
  listing API for advisory freshness

`/status` and `ct auth status --json` show these separately. A Gemini feature
is not considered routed until the SeaTurtle runner exists and has validation
coverage.

## Operational Limits

Current Gemini guardrails in this build:

- model context and max-output limits come from the Gemini capability registry
- inline requests are rejected locally above 20 MB
- oversized text-first requests are rejected locally using an estimated token
  budget check
- `countTokens` is available for native Gemini tooling and validation
- explicit cached content is supported when you provide a cached-content name

Google’s docs also note that:

- explicit cached content defaults to a 1 hour TTL unless set otherwise
- cached-content minimum token counts vary by model
- uploaded Files API assets are stored for 48 hours
- URL context is limited to public `http`/`https` URLs, up to 20 URLs per
  request, and does not handle login-gated or paywalled pages

## Unsupported Or Explicitly Gated

These are still gated or constrained:

- Gemini provider OAuth / Vertex-style Gemini auth is not wired yet
- full document/PDF upload lifecycle is not yet exposed as a first-class
  operator flow
- Gemini URL context has tool-combination limits with function calling
- provider-hosted remote MCP is not routed on Gemini
- auto-mode safety classifier
- permission explainer
- CT in Chrome lightning

## Validation

Offline / fixture checks:

```sh
npm run gemini-runtime-check
npm run dev-check
npm run openai-codex-check
```

Optional live checks. These skip cleanly when `GEMINI_API_KEY` is absent:

```sh
npm run gemini-live-text-check
npm run gemini-live-tool-check
npm run gemini-live-image-check
npm run gemini-live-search-check
```

CT secure-storage note:

- `/login` Gemini API-key setup stores the key in CT secure storage, so the
  Gemini runtime can be auth-ready even when `GEMINI_API_KEY` is not exported in
  the current shell
