# Features Router

This file is the repo-level router for the custom SeaTurtle features in this
repo.

Use it when the user asks natural-language questions like:

- how do I set up Telegram?
- how should CT approach design or frontend work?
- how do I use OpenAI OAuth or an OpenAI API key here?
- how do I turn on computer use?
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

Architecture reference:

- [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md)

## Provider Auth / OpenAI / Gemini

Keywords:

- openai
- codex
- gemini
- ct
- seaturtle
- oauth
- api key
- OPENAI_API_KEY
- GEMINI_API_KEY
- chatgpt login
- login
- logout
- provider
- model
- effort
- status
- computer use
- hosted computer
- chicago

Next steps:

- Use `/login` for CT's interactive provider setup flow
- Set `OPENAI_API_KEY` when you need the explicit OpenAI Responses API path
- Use `/login` to set up Gemini in CT for interactive work
- Set `GEMINI_API_KEY` when you need explicit Gemini env-driven control or automation
- Use `/logout` to clear CT-managed provider auth
- Use `/model` to switch supported OpenAI/Codex models
- Use `/model` to switch supported Gemini models when Gemini is active
- Use `/effort` to adjust reasoning level
- Use `/status` or `auth status --json` to inspect active provider/runtime
- Use `/status` to inspect the `OpenAI computer use` row when you need the concrete enablement path
- Use `ct` to launch SeaTurtle directly on the OpenAI/Codex path

Deep doc:

- [`docs/OPENAI-CODEX.md`](./OPENAI-CODEX.md)
- [`docs/GEMINI.md`](./GEMINI.md)

Important truth:

- OpenAI/Codex local runtime works in SeaTurtle
- Gemini native runtime works in SeaTurtle
- native SeaTurtle-owned OpenAI/Codex OAuth is now the preferred auth path
- `OPENAI_API_KEY` is supported as an explicit operator/automation auth path
- Gemini currently uses API-key setup rather than a SeaTurtle-owned OAuth flow
- legacy `codex-cli` auth is still supported as a compatibility fallback
- some Anthropic-only features are still gated
- GitHub Actions setup for OpenAI/Codex remains limited under OAuth-only installs
- OpenAI computer use also depends on local runtime prerequisites; `/status` now shows the missing prerequisite directly instead of implying there is a hidden prompt toggle

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

- SeaTurtle brands the wrapper and user-facing UX as CT
- compatibility-sensitive env vars, paths, and internal identifiers remain unchanged on purpose
- this repo still carries a source-build compatibility boundary rather than a full internal rename

## Design / Frontend / UI quality

Keywords:

- design
- ui
- ux
- frontend
- layout
- transcript
- responsive
- theming
- visual polish

Next steps:

- Ask CT directly for the UI improvement or redesign intent
- When the task is UI-facing, CT should treat design quality as part of usability rather than decorative icing
- Expect CT to look for high-leverage improvements in hierarchy, flow, legibility, responsiveness, and key states

Important truth:

- SeaTurtle is intended to go beyond the minimum acceptable frontend fix when a modest extra pass would create real user delight
- that extra effort should stay grounded in the existing design language unless the user is explicitly asking for a redesign

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
- plan to completion
- orchestration
- doctor
- safe mode
- telegram stop notice

Next steps:

- Use `/autowork` for the operator-forward entrypoint
- Use `/swim` for the more whimsical alias with the same guarantees
- Use `/autowork safe` or `/swim safe` to restore the recommended checkpoint policy
- Use `/autowork dangerous` or `/swim dangerous` only when you deliberately want the dangerous-mode policy
- Use `/autowork run` or `/swim run` to carry the approved tracked plan to completion
- Use `/autowork step` or `/swim step` when you want only one guarded chunk
- Use `/autowork status` or `/swim status` to see the selected mode and next chunk
- Use `/autowork doctor` or `/swim doctor` to inspect the full readiness breakdown
- Use `/autowork verify` or `/swim verify` when you need to manually enforce the current checkpoint

Important truth:

- `/autowork` requires one tracked root-level dated `*-state.md` plan file
- safe mode carries the approved plan to completion
- progression still happens one guarded chunk at a time
- safe mode verifies validation and commit hygiene before it advances
- failures stop and persist a stop reason
- if Telegram is bound for the project, critical stops can send a short Telegram notice
- dangerous mode is shipped, but heavily discouraged
- dangerous mode still keeps hard refusals for git/plan/secret-hygiene failures
- dangerous mode can continue with recorded checkpoint debt for selected validation and git-check failures
- Telegram can also send a dangerous-mode debt notice after a degraded continuation

## CT identity / soul / relationship stack

Keywords:

- ct identity
- soul
- role
- user
- bootstrap
- seaturtle
- local memory
- private memory
- .ct
- SEATURTLE.local.md
- what are we working on today

Next steps:

- On a new project, follow the short startup picker if CT offers to tune the private SeaTurtle defaults
- Run `/ct` if you want the simplest way to retune CT, edit `.ct` files, or manage defaults
- Open `docs/SEATURTLE-VOICE.md` if you want the quickest repo path to the hidden SeaTurtle voice guidance
- Edit `.ct/soul.md` to tune the deeper SeaTurtle worldview, warmth, and values layer
- Edit `.ct/identity.md` to tune CT's native character and interaction style for this project
- Edit `.ct/role.md` to tune how exploratory, operational, or exacting CT should be here
- Edit `.ct/user.md` to keep lightweight private notes about how to collaborate well with the user
- Edit `.ct/bootstrap.md` to shape the first-run or retune conversation ritual
- Edit `.ct/session.md` for what matters right now
- Leave `SEATURTLE.md` for team-shared repo guidance
- `AGENTS.md` is also read as a compatibility project-instructions file

Important truth:

- `.ct/` is the private CT layer for this project
- the hidden CT stack is layered: soul → identity → role → user → attunement → session
- `SEATURTLE.local.md` is the project-local private instruction layer
- defaults are created automatically on first load
- CT uses playful SeaTurtle starter defaults until you replace them
- project-local `.ct` files are meant to be private and easy to replace
- CT now treats context in domains instead of one big running blob:
  - git-backed project work is protected most strongly
  - project exploration stays broader but still project-bound
  - companion chat should not quietly become project-working state
- `/btw` stays sidecar and ephemeral
- `/btw` is for quick side questions, not active-task steering and not parked follow-up work
- `/game` keeps its outcomes inside the hidden shell instead of cluttering the main project transcript

## Mermaid / architecture / journey maps

Keywords:

- mermaid
- architecture map
- flow map
- user journey
- journey map
- diagram
- update architecture doc
- c4
- system context
- container diagram
- component diagram
- dynamic diagram

Next steps:

- Use `/mermaid` for the menu-driven Mermaid command
- Use `/mermaid project` to write a high-level project map
- Use `/mermaid focus <path-or-feature>` to map one area
- Use `/mermaid flow <path-or-feature>` to trace a command or runtime path
- Use `/mermaid journey <feature>` to write a user journey map
- Use `/mermaid c4` to open the C4 menu
- Use `/mermaid c4 context` for a system-context view
- Use `/mermaid c4 container` for a container view
- Use `/mermaid c4 component <target>` for a focused component view
- Use `/mermaid c4 dynamic <target>` for a dynamic interaction view
- Use `/mermaid update <existing-doc>` to refresh an existing Mermaid doc
- Use `/mermaid explain` to list Mermaid docs already present in the repo

Important truth:

- `/mermaid` writes durable markdown docs, not just chat output
- the feature prefers repo evidence over invention
- different diagram intents use different Mermaid shapes
- Mermaid C4 support is available and useful, but still experimental upstream
- the point is architecture thinking and clarity, not decorative diagram spam
- existing Swords of Chaos Mermaid docs:
  - `docs/SWORDS-OF-CHAOS-ARCHITECTURE.md`
  - `docs/SWORDS-OF-CHAOS-JOURNEY.md`

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
- caveman
- rainbow
- animated rainbow

Next step:

- Use `/theme` and choose `neonbbs`
- Use `/lolcat` to turn the whole shell rainbow, including the animated variants
- Use `/caveman off|lite|full|ultra` to switch native response compression modes
- Use `/haiku` to recite a SeaTurtle haiku or enable rare startup haiku

## Skills / Plugins / MCP / Hooks

Keywords:

- skills
- plugins
- marketplace
- agency
- agents
- mcp
- hooks

Next steps:

- Use `/agency install marketing` to install optional Agency specialist agents into your user agent directory
- Use `/agency install marketing --project` to install them into this project’s `.claude/agents`
- Use `/agency browse marketing` to inspect upstream Agency divisions and agents before installing
- Use `/agency run agency-marketing-social-media-strategist <task>` to launch an installed Agency specialist through the normal clean subagent runtime
- Use `/agency status` to inspect the installed Agency pack and tracked upstream commit
- Use `/agents` to inspect or use installed custom agents
- Use `/skills` for project and user skills
- Use `/mcp` for MCP server visibility and setup status
- Use `/hooks` to inspect hook configuration
- Use plugin browse/install flows from the plugin UI

Important truth:

- a fresh install may legitimately show no skills yet
- `/agency` manages an optional third-party markdown agent pack and installs it as native SeaTurtle agents
- project-scoped Agency state stays private in the user config home while the installed agent markdown lives in the project
- installed Agency agents run through the normal agent/subagent runtime after installation
- see [AGENCY.md](./AGENCY.md) for the full `/agency` lifecycle, scope, cache, and runtime model
- `/hooks` is primarily a configuration viewer
- `/mcp` should be the first place to inspect MCP readiness from the app

## How To Answer

When the user asks how to do something:

1. Give the next command first.
2. Give one sentence explaining why that command is the right next step.
3. Only then point to the deeper doc if needed.

Examples:

- “Run `/telegram`. It handles pairing, binding, test, and diagnostics for the current project.”
- “Run `ct`. It launches SeaTurtle on the OpenAI/Codex path without the raw env-prefixed node command.”
- “Run `/model`. It shows the supported OpenAI/Codex models for SeaTurtle.”
- “Run `/rm <what to remember>`. CT will show that reminder after replies in this project.”
- “Run `/install-github-app`. If the OpenAI path is gated, the command will explain the current CI limitation.”
