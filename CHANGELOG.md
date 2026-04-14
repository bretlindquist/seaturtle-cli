# SeaTurtle Changelog

## 1.05 - 2026-04-14

- Expanded the OpenAI/Codex runtime to support web search, hosted file search, hosted shell, image generation, computer use, and safer MCP capability routing.
- Fixed OpenAI helper request-shape and transport issues, including web-search streaming and multimodal image/PDF input handling.
- Improved CT interaction reliability with stronger transcript/paste validation, queue editing cleanup, and clearer runtime/status surfaces.

## 1.04 - 2026-04-12

- Fixed OpenAI/Codex web-search request-shape errors in the native runtime.
- Improved `ctrl+o` transcript search reliability after closing the search bar.
- Removed noisy startup snapshot errors and tightened replay/update stability.
