# Telegram Integration

SeaTurtle supports Telegram as an external control and messaging channel.

Current Telegram support:

- inbound text messages
- inbound photos and documents
- inbound voice notes via OpenAI transcription
- outbound text messages
- outbound photos and documents

Not yet supported:

- outbound voice messages

## Current Setup Method

Telegram can now be paired from inside the app with `/telegram`, or configured
with environment variables.

Current product contract:

- Telegram bot profiles are saved globally on the machine
- Telegram bot bindings and allowlisted chats are project-local
- one running app session/process uses one active Telegram bot
- different projects can bind different saved bots
- simultaneous multi-project bots should use separate app instances

## In-App Pairing

1. Create a Telegram bot with BotFather.
2. Start `ct` and run `/telegram`.
3. Choose `Pair Telegram bot in-app`.
4. Paste the bot token.
5. Send the bot a message from the Telegram chat you want to pair.
6. Choose the discovered chat.
7. The bot is saved as a reusable profile and bound to the current project.

The bot token is stored in secure storage. Bot profile metadata is stored in
global app config. Allowlisted chat IDs and the active binding are stored in
project config.

After pairing, `/telegram` can also:

- bind a different saved bot to the current project
- add or remove allowlisted chats for the current project
- choose the default chat for operator actions
- send a Telegram test message
- run Telegram doctor diagnostics

When `/autowork` or `/swim` is active, Telegram can also receive:

- a short stop notice for critical checkpoint failures
- a dangerous-mode debt notice when the run continues with recorded checkpoint debt

This uses the current project's bound Telegram bot and chat routing.

For a concise in-app summary, run:

```text
/telegram help
```

Environment variables still work and override in-app pairing when present.
SeaTurtle-prefixed variables are the primary contract now; legacy
`CLAUDE_CODE_TELEGRAM_*` aliases are still accepted for compatibility.

## Environment Variable Setup

Required:

```bash
export SEATURTLE_TELEGRAM_BOT_TOKEN="123456:telegram-bot-token"
export SEATURTLE_TELEGRAM_ALLOWED_CHAT_IDS="123456789"
```

Optional:

```bash
export SEATURTLE_TELEGRAM_POLL_TIMEOUT_SEC="20"
export SEATURTLE_TELEGRAM_TRANSCRIPTION_API_KEY="sk-..."
# or reuse:
export OPENAI_API_KEY="sk-..."
export SEATURTLE_TELEGRAM_TRANSCRIPTION_MODEL="whisper-1"
```

## What Each Variable Does

- `SEATURTLE_TELEGRAM_BOT_TOKEN`
  - Bot token created with BotFather
- `SEATURTLE_TELEGRAM_ALLOWED_CHAT_IDS`
  - Comma-separated list of Telegram chat IDs that this app will accept
- `SEATURTLE_TELEGRAM_POLL_TIMEOUT_SEC`
  - Long-poll timeout in seconds
- `SEATURTLE_TELEGRAM_TRANSCRIPTION_API_KEY`
  - OpenAI API key for voice-note transcription
- `SEATURTLE_TELEGRAM_TRANSCRIPTION_MODEL`
  - Transcription model, default `whisper-1`

## Create A Bot

1. Open Telegram and message `@BotFather`
2. Run `/newbot`
3. Follow the prompts
4. Copy the bot token
5. Set `SEATURTLE_TELEGRAM_BOT_TOKEN`

## Get The Chat ID

1. Start a chat with your bot
2. Send it at least one message
3. Query Telegram Bot API `getUpdates` for that bot token
4. Read `message.chat.id` from the response
5. Add that ID to `SEATURTLE_TELEGRAM_ALLOWED_CHAT_IDS`

## Run

```bash
ct
```

Then use:

```text
/telegram
/status
```

`/telegram` shows setup guidance, pairing, and current readiness.

## Voice Notes

Voice-note transcription is optional.

To enable it, set either:

- `SEATURTLE_TELEGRAM_TRANSCRIPTION_API_KEY`
- or `OPENAI_API_KEY`

If transcription is not configured, voice notes are not accepted for
transcription and the app will explain the missing requirement.

## Safety Model

Telegram is intentionally allowlist-based.

- the bot token alone is not enough
- only chat IDs in the active project binding or
  `SEATURTLE_TELEGRAM_ALLOWED_CHAT_IDS` env override are accepted

This prevents a bot from being reachable by arbitrary chats once a token is set.

Autowork Telegram notices follow the same project-local binding model:

- they use the current project's bound Telegram bot
- they target the default project chat first
- then the last inbound project chat
- then the first allowlisted chat as a fallback
- if Telegram is not configured for the project, no notice is sent
- stop notices and dangerous-mode debt notices both use the same routing path

## Multi-Bot And Project Binding

SeaTurtle now supports multiple saved Telegram bot profiles.

- pair a bot once, save it as a reusable profile
- bind that profile to the current project
- manage allowlisted chats per project
- keep project memory and Telegram routing aligned by cwd / git root

Environment variables still override in-app bot profiles and project bindings
when present.

## Current Direction

Current Telegram supports multi-bot inventory, per-project binding, and
project-local multi-chat management. Likely follow-up work includes richer
activity views, export/import helpers, and outbound voice.
