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

Gemini selection never silently executes Anthropic. If Gemini is selected and
auth is missing, SeaTurtle fails with Gemini-specific setup guidance.

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

`SEATURTLE_GEMINI_CACHED_CONTENT` attaches an explicit Gemini cached-content
prefix to native requests. This is useful when you have already created a cache
resource and want SeaTurtle to reuse it in repeated flows.

## Capability Truth

SeaTurtle keeps two Gemini capability views:

- documented Gemini support: what Google documents for the selected model
- routed SeaTurtle support: the Gemini features this build actually wires and
  validates end to end

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
