import {
  getTelegramEnvLabel,
  getTelegramEnvValue,
  hasAnyTelegramEnvOverride,
} from '../source/src/services/telegram/env.js'
import {
  getTelegramTranscriptionConfig,
  getTelegramTranscriptionGateMessage,
} from '../source/src/services/telegram/transcription.js'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function withEnv<T>(
  patch: Record<string, string | undefined>,
  run: () => T,
): T {
  const previous = new Map<string, string | undefined>()

  for (const [key, value] of Object.entries(patch)) {
    previous.set(key, process.env[key])
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  }

  try {
    return run()
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
      }
    }
  }
}

function run(): void {
  withEnv(
    {
      SEATURTLE_TELEGRAM_BOT_TOKEN: 'new-bot-token',
      SEATURTLE_TELEGRAM_ALLOWED_CHAT_IDS: '123,456',
      SEATURTLE_TELEGRAM_POLL_TIMEOUT_SEC: '30',
      CLAUDE_CODE_TELEGRAM_BOT_TOKEN: undefined,
      CLAUDE_CODE_TELEGRAM_ALLOWED_CHAT_IDS: undefined,
      CLAUDE_CODE_TELEGRAM_POLL_TIMEOUT_SEC: undefined,
    },
    () => {
      assert(hasAnyTelegramEnvOverride(), 'expected SeaTurtle env vars to trigger env override mode')
      assert(getTelegramEnvValue('botToken') === 'new-bot-token', 'expected SeaTurtle bot token env var to be read')
      assert(getTelegramEnvValue('allowedChatIds') === '123,456', 'expected SeaTurtle allowlist env var to be read')
      assert(getTelegramEnvValue('pollTimeoutSeconds') === '30', 'expected SeaTurtle poll timeout env var to be read')
      assert(getTelegramEnvLabel('botToken') === 'SEATURTLE_TELEGRAM_BOT_TOKEN', 'expected SeaTurtle label to be preferred')
    },
  )

  withEnv(
    {
      SEATURTLE_TELEGRAM_BOT_TOKEN: undefined,
      SEATURTLE_TELEGRAM_ALLOWED_CHAT_IDS: undefined,
      SEATURTLE_TELEGRAM_POLL_TIMEOUT_SEC: undefined,
      CLAUDE_CODE_TELEGRAM_BOT_TOKEN: 'legacy-bot-token',
      CLAUDE_CODE_TELEGRAM_ALLOWED_CHAT_IDS: '999',
      CLAUDE_CODE_TELEGRAM_POLL_TIMEOUT_SEC: '25',
    },
    () => {
      assert(hasAnyTelegramEnvOverride(), 'expected legacy env vars to still trigger env override mode')
      assert(getTelegramEnvValue('botToken') === 'legacy-bot-token', 'expected legacy bot token env var to be read')
      assert(getTelegramEnvValue('allowedChatIds') === '999', 'expected legacy allowlist env var to be read')
      assert(getTelegramEnvValue('pollTimeoutSeconds') === '25', 'expected legacy poll timeout env var to be read')
      assert(getTelegramEnvLabel('botToken') === 'CLAUDE_CODE_TELEGRAM_BOT_TOKEN', 'expected legacy label fallback to remain available')
    },
  )

  withEnv(
    {
      SEATURTLE_TELEGRAM_TRANSCRIPTION_API_KEY: 'st-whisper-key',
      SEATURTLE_TELEGRAM_TRANSCRIPTION_MODEL: 'gpt-4o-mini-transcribe',
      CLAUDE_CODE_TELEGRAM_TRANSCRIPTION_API_KEY: undefined,
      CLAUDE_CODE_TELEGRAM_TRANSCRIPTION_MODEL: undefined,
      OPENAI_API_KEY: undefined,
    },
    () => {
      const config = getTelegramTranscriptionConfig()
      assert(config?.apiKey === 'st-whisper-key', 'expected SeaTurtle transcription key to be preferred')
      assert(config?.model === 'gpt-4o-mini-transcribe', 'expected SeaTurtle transcription model to be read')
    },
  )

  assert(
    getTelegramTranscriptionGateMessage().includes('SEATURTLE_TELEGRAM_TRANSCRIPTION_API_KEY'),
    'expected transcription gate message to reference SeaTurtle env naming',
  )
}

run()
