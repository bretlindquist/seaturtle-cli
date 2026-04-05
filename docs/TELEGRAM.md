# Telegram Integration

This fork supports Telegram as an external control and messaging channel.

Current Telegram support:

- inbound text messages
- inbound photos and documents
- inbound voice notes via OpenAI transcription
- outbound text messages
- outbound photos and documents

Not yet supported:

- outbound voice messages
- full in-app pairing flow

## Current Setup Method

Telegram is currently configured with environment variables.

Required:

```bash
export CLAUDE_CODE_TELEGRAM_BOT_TOKEN="123456:telegram-bot-token"
export CLAUDE_CODE_TELEGRAM_ALLOWED_CHAT_IDS="123456789"
```

Optional:

```bash
export CLAUDE_CODE_TELEGRAM_POLL_TIMEOUT_SEC="20"
export CLAUDE_CODE_TELEGRAM_TRANSCRIPTION_API_KEY="sk-..."
# or reuse:
export OPENAI_API_KEY="sk-..."
export CLAUDE_CODE_TELEGRAM_TRANSCRIPTION_MODEL="whisper-1"
```

## What Each Variable Does

- `CLAUDE_CODE_TELEGRAM_BOT_TOKEN`
  - Bot token created with BotFather
- `CLAUDE_CODE_TELEGRAM_ALLOWED_CHAT_IDS`
  - Comma-separated list of Telegram chat IDs that this app will accept
- `CLAUDE_CODE_TELEGRAM_POLL_TIMEOUT_SEC`
  - Long-poll timeout in seconds
- `CLAUDE_CODE_TELEGRAM_TRANSCRIPTION_API_KEY`
  - OpenAI API key for voice-note transcription
- `CLAUDE_CODE_TELEGRAM_TRANSCRIPTION_MODEL`
  - Transcription model, default `whisper-1`

## Create A Bot

1. Open Telegram and message `@BotFather`
2. Run `/newbot`
3. Follow the prompts
4. Copy the bot token
5. Set `CLAUDE_CODE_TELEGRAM_BOT_TOKEN`

## Get The Chat ID

1. Start a chat with your bot
2. Send it at least one message
3. Query Telegram Bot API `getUpdates` for that bot token
4. Read `message.chat.id` from the response
5. Add that ID to `CLAUDE_CODE_TELEGRAM_ALLOWED_CHAT_IDS`

## Run

```bash
CLAUDE_CODE_USE_OPENAI_CODEX=1 node dist/cli.js
```

Then use:

```text
/telegram
/status
```

`/telegram` shows setup guidance and current readiness.

## Voice Notes

Voice-note transcription is optional.

To enable it, set either:

- `CLAUDE_CODE_TELEGRAM_TRANSCRIPTION_API_KEY`
- or `OPENAI_API_KEY`

If transcription is not configured, voice notes are not accepted for
transcription and the app will explain the missing requirement.

## Safety Model

Telegram is intentionally allowlist-based.

- the bot token alone is not enough
- only chat IDs in `CLAUDE_CODE_TELEGRAM_ALLOWED_CHAT_IDS` are accepted

This prevents a bot from being reachable by arbitrary chats once a token is set.

## Current Direction

The next planned Telegram improvement is true in-app pairing:

- enter bot token inside the app
- validate it
- discover chats from recent bot updates
- choose allowlisted chats
- persist Telegram config without requiring shell edits
