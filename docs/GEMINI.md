# Gemini Runtime

SeaTurtle includes an initial Gemini main-loop scaffold. It is separate from the
OpenAI/Codex runtime selection and is enabled explicitly.

## Enable Gemini

Set a Gemini API key and choose the provider:

```sh
export GEMINI_API_KEY=...
export SEATURTLE_MAIN_PROVIDER=gemini
```

The SeaTurtle boolean gate also works:

```sh
export SEATURTLE_USE_GEMINI=1
```

Legacy `CLAUDE_CODE_MAIN_PROVIDER=gemini` and `CLAUDE_CODE_USE_GEMINI=1`
aliases are still accepted for compatibility, but new setup should use the
SeaTurtle-prefixed variables.

The default Gemini model is `gemini-3-flash-preview`. The model picker exposes:

- `gemini-3.1-pro-preview`
- `gemini-3-flash-preview`
- `gemini-3.1-flash-lite-preview`
- `gemini-2.5-pro`
- `gemini-2.5-flash`
- `gemini-2.5-flash-lite`

SeaTurtle also tracks specialized Gemini models in its capability registry for
later native tool routing. They are not exposed as main-loop chat models:

- image generation/editing: `gemini-3.1-flash-image-preview`,
  `gemini-3-pro-image-preview`, `gemini-2.5-flash-image`
- computer use: `gemini-2.5-computer-use-preview-10-2025`
- file-search embeddings: `gemini-embedding-001`

## Current Runtime Surface

The current Gemini slice routes the main conversation loop through Gemini's
native `generateContent` endpoint:

```text
https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
```

It supports:

- Gemini API-key auth through `GEMINI_API_KEY`
- provider selection through `SEATURTLE_MAIN_PROVIDER=gemini`
- model selection through the existing `/model` flow
- local SeaTurtle tools via Gemini native function declarations
- image input through native Gemini `inlineData` parts
- `/status` and `ct auth status --json` capability reporting

`/status` reports documented Gemini model support separately from the routed
SeaTurtle runtime support. A Gemini feature is not considered routed until the
SeaTurtle runner exists and has validation coverage.

Native `streamGenerateContent`, full lossless `Content`/`Part` conversion, and
thought-signature preservation are tracked as follow-up production chunks.

## Explicit Gates

These surfaces are intentionally not claimed as routed yet:

- Gemini OAuth
- Gemini provider-hosted tools such as Google Search, file search, code
  execution, computer use, image generation, and URL context
- document/PDF input
- auto-mode safety classifier
- permission explainer
- CT in Chrome lightning

Those should be added as explicit follow-up chunks rather than silently falling
back to Anthropic or OpenAI/Codex behavior.

## Validation

Use:

```sh
npm run gemini-runtime-check
npm run dev-check
```

For OpenAI/Codex regressions, continue to run:

```sh
npm run openai-codex-check
```
