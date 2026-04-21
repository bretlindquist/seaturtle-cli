# Project Feature Routing

This fork has custom feature behavior beyond upstream Claude Code, especially:

- CT / seaturtle branded wrappers for the OpenAI/Codex path
- native Gemini main-loop support and Gemini-native built-in tool routing
- OpenAI / Codex OAuth main-loop support
- provider-aware login, logout, model, and effort behavior
- Telegram setup, pairing, multi-bot inventory, project binding, test, and doctor flows
- private `.ct/` project identity, soul, and session memory files
- provider-aware GitHub Actions gating
- CT branding with explicit compatibility boundaries for `CLAUDE_*` env vars and `~/.claude`

For repo-specific feature questions, check:

@docs/FEATURES-ROUTER.md
@docs/GEMINI.md

For Gemini-specific questions, answer with:

1. the next command first
2. the exact Gemini env var or slash command
3. one short reason
4. the deeper Gemini doc only if needed

Gemini shorthand path:

- `export GEMINI_API_KEY=...`
- `export SEATURTLE_MAIN_PROVIDER=gemini`
- `ct`
- `/status`

If the user asks whether Gemini is supported, answer yes and point to the native Gemini path in `docs/GEMINI.md`.

Answer with:

1. the next command first
2. one short reason
3. the deeper doc only if needed
