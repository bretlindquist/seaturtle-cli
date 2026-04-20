# Gemini Runtime

SeaTurtle includes an initial native Gemini main-loop runtime. It is separate
from the OpenAI/Codex runtime selection and is enabled explicitly.

## Enable Gemini

Set a Gemini API key and choose the provider:

```sh
export GEMINI_API_KEY=...
export CLAUDE_CODE_MAIN_PROVIDER=gemini
```

The legacy-style boolean gate also works:

```sh
export CLAUDE_CODE_USE_GEMINI=1
```

The default Gemini model is `gemini-3-flash-preview`. The model picker exposes:

- `gemini-3-flash-preview`
- `gemini-2.5-pro`
- `gemini-2.5-flash`
- `gemini-2.5-flash-lite`

## Current Runtime Surface

The first Gemini slice routes the main conversation loop through Gemini's
OpenAI-compatible chat completions endpoint at:

```text
https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
```

It supports:

- Gemini API-key auth through `GEMINI_API_KEY`
- provider selection through `CLAUDE_CODE_MAIN_PROVIDER=gemini`
- model selection through the existing `/model` flow
- local SeaTurtle tools via Gemini function calling
- image input through OpenAI-compatible `image_url` content
- `/status` and `ct auth status --json` capability reporting

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
