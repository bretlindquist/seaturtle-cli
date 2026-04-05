# Features Router

This file is the repo-level router for the custom features added in this fork.

Use it when the user asks natural-language questions like:

- how do I set up Telegram?
- how do I use OpenAI OAuth here?
- how do I switch models?
- why is GitHub Actions gated?
- how do I test Telegram?

Prefer the command first, then the deeper doc if needed.

## OpenAI / Codex / OAuth

Keywords:

- openai
- codex
- ct
- seaturtle
- oauth
- chatgpt login
- login
- logout
- provider
- model
- effort
- status

Next steps:

- Use `/login` to choose Anthropic or OpenAI Codex OAuth
- Use `/logout` to clear Anthropic and/or OpenAI Codex auth
- Use `/model` to switch supported OpenAI/Codex models
- Use `/effort` to adjust reasoning level
- Use `/status` or `auth status --json` to inspect active provider/runtime
- Use `ct` to launch this fork directly on the OpenAI/Codex path

Deep doc:

- [`docs/OPENAI-CODEX.md`](./OPENAI-CODEX.md)

Important truth:

- OpenAI/Codex local runtime works in this fork
- some Anthropic-only features are still gated
- GitHub Actions setup for OpenAI/Codex remains limited under OAuth-only installs

## Telegram

Keywords:

- telegram
- bot
- pair
- pairing
- chat id
- allowlist
- doctor
- test
- project binding
- multi bot
- multi chat

Next steps:

- Use `/telegram` for setup, pairing, binding, test, and doctor
- Use `/telegram help` for a concise Telegram setup and troubleshooting summary
- Use `/status` to confirm Telegram readiness and see when `/telegram` is the next step

Deep doc:

- [`docs/TELEGRAM.md`](./TELEGRAM.md)

Important truth:

- Telegram bot profiles are saved globally
- Telegram bot binding and allowlisted chats are project-local
- one running app session/process uses one active Telegram bot
- separate projects can use different saved Telegram bots

## GitHub Actions / install-github-app

Keywords:

- github
- github actions
- ci
- install github app
- workflow
- secret

Next steps:

- Use `/install-github-app` to start provider-aware workflow setup
- If OpenAI/Codex is gated, the command should explain the current limit and next action

Important truth:

- Anthropic GitHub Actions setup is supported
- OpenAI/Codex GitHub Actions remains gated for OAuth-only installs

## Queue / queued prompts

Keywords:

- queue
- queued prompt
- tab to queue
- prompt queue

Next steps:

- In the prompt input, use `Tab` to queue a message
- use the queue UI to edit, remove, or clear queued prompts

## Theme

Keywords:

- theme
- neonbbs

Next step:

- Use `/theme` and choose `neonbbs`

## Skills / Plugins / MCP / Hooks

Keywords:

- skills
- plugins
- marketplace
- mcp
- hooks

Next steps:

- Use `/skills` for project and user skills
- Use `/mcp` for MCP server visibility and setup status
- Use `/hooks` to inspect hook configuration
- Use plugin browse/install flows from the plugin UI

Important truth:

- a fresh install may legitimately show no skills yet
- `/hooks` is primarily a configuration viewer
- `/mcp` should be the first place to inspect MCP readiness from the app

## How To Answer

When the user asks how to do something:

1. Give the next command first.
2. Give one sentence explaining why that command is the right next step.
3. Only then point to the deeper doc if needed.

Examples:

- “Run `/telegram`. It handles pairing, binding, test, and diagnostics for the current project.”
- “Run `ct`. It launches this fork on the OpenAI/Codex path without the raw env-prefixed node command.”
- “Run `/model`. It shows the supported OpenAI/Codex models for this fork.”
- “Run `/install-github-app`. If the OpenAI path is gated, the command will explain the current CI limitation.”
