# SeaTurtle Changelog

## 1.08 - 2026-04-21

- Shipped the native Gemini production wave across the provider seam, including native `generateContent` / `streamGenerateContent`, tool replay with thought signatures, image generation/editing, Google Search, URL context, hosted code execution, file search, and guarded computer use.
- Added Gemini request guards, status/auth capability truth, and live/offline validation commands so operator-facing Gemini setup is explicit and repeatable.
- Updated the repo docs and short-form SeaTurtle routing docs so Gemini setup and Gemini-specific questions resolve to the right commands and references quickly.

## 1.06 - 2026-04-14

- Fixed duplicate submitted image rows so inline `[Image #N]` references no longer render a second attachment line underneath.
- Tightened the shipped CT command surface and updater-facing branding around the SeaTurtle runtime.
- Continued hardening the OpenAI/Codex runtime and validation path so update checks and regression signals stay consistent.

## 1.05 - 2026-04-14

- Expanded the OpenAI/Codex runtime to support web search, hosted file search, hosted shell, image generation, computer use, and safer MCP capability routing.
- Fixed OpenAI helper request-shape and transport issues, including web-search streaming and multimodal image/PDF input handling.
- Improved CT interaction reliability with stronger transcript/paste validation, queue editing cleanup, and clearer runtime/status surfaces.

## 1.04 - 2026-04-12

- Fixed OpenAI/Codex web-search request-shape errors in the native runtime.
- Improved `ctrl+o` transcript search reliability after closing the search bar.
- Removed noisy startup snapshot errors and tightened replay/update stability.
