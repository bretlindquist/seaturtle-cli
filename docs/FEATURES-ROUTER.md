# Features Router

This file is the repo-level router for the custom features added in this fork.

Use it when the user asks natural-language questions like:

- how do I set up Telegram?
- how do I use OpenAI OAuth here?
- how does CT identity work in this project?
- how do I make CT remind me about something after replies?
- how do I switch models?
- how do I use autowork?
- what is swim mode?
- why is GitHub Actions gated?
- how do I test Telegram?
- why does CT still use CLAUDE env vars?
- should I run ct or node dist/cli.js?

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

## Branding / CT / seaturtle / compatibility

Keywords:

- ct
- seaturtle
- branding
- compatibility
- CLAUDE_CODE_USE_OPENAI_CODEX
- CLAUDE_CODE_TELEGRAM
- ~/.claude
- node dist/cli.js

Next steps:

- Use `ct` for the standard branded entrypoint
- Use `seaturtle` if you want the alias wrapper
- Use `node dist/cli.js` only when you intentionally want the underlying runtime entrypoint

Deep doc:

- [`docs/BRANDING.md`](./BRANDING.md)

Important truth:

- this fork brands the wrapper and user-facing UX as CT
- compatibility-sensitive env vars, paths, and internal identifiers remain unchanged on purpose
- this repo is based on a source-build base, not a clean-room rewrite

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

## Autowork / Swim

Keywords:

- autowork
- swim
- tracked plan
- one chunk at a time
- orchestration
- doctor
- safe mode
- telegram stop notice

Next steps:

- Use `/autowork` for the operator-forward entrypoint
- Use `/swim` for the more whimsical alias with the same guarantees
- Use `/autowork run` or `/swim run` to launch exactly one chunk
- Use `/autowork status` or `/swim status` to see the selected mode and next chunk
- Use `/autowork doctor` or `/swim doctor` to inspect the full readiness breakdown

Important truth:

- `/autowork` requires one tracked root-level dated `*-state.md` plan file
- safe mode is one chunk at a time only
- safe mode verifies validation and commit hygiene before it advances
- failures stop and persist a stop reason
- if Telegram is bound for the project, critical stops can send a short Telegram notice
- dangerous mode is intentionally not shipped in this wave

## CT identity / soul / local project memory

Keywords:

- ct identity
- soul
- seaturtle
- local memory
- private memory
- .ct
- CLAUDE.local.md
- what are we working on today

Next steps:

- On a new project, follow the short startup picker if CT offers to tune the private SeaTurtle defaults
- Run `/ct` if you want the simplest way to retune CT, edit `.ct` files, or manage defaults
- Edit `.ct/identity.md` to tune CT's role and interaction style for this project
- Edit `.ct/soul.md` to tune warmth, curiosity, and tone
- Edit `.ct/session.md` for what matters right now
- Leave `CLAUDE.md` for team-shared repo guidance

Important truth:

- `.ct/` is the private CT layer for this project
- `CLAUDE.local.md` is the compatibility bridge into the existing memory loader
- defaults are created automatically on first load
- CT uses playful SeaTurtle starter defaults until you replace them
- project-local `.ct` files are meant to be private and easy to replace

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

## Reminder / remindme

Keywords:

- remindme
- reminder
- rm
- rmc
- don't forget

Next steps:

- Use `/rm <what to remember>` to set a short reminder for this project
- Use `/remindme` to review or clear the current reminder
- Use `/rmc` to clear it directly

Important truth:

- the reminder is project-local and private
- CT shows it after replies in this project
- `/remindme` is the visible menu entry; `/rm` and `/rmc` are the fast shortcuts

## Theme

Keywords:

- theme
- neonbbs
- lolcat
- rainbow
- animated rainbow

Next step:

- Use `/theme` and choose `neonbbs`
- Use `/lolcat` to turn the whole shell rainbow, including the animated variants

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
- “Run `/rm <what to remember>`. CT will show that reminder after replies in this project.”
- “Run `/install-github-app`. If the OpenAI path is gated, the command will explain the current CI limitation.”
