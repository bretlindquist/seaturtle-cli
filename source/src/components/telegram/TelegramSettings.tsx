import * as React from 'react'
import { Box, Text } from '../../ink.js'
import { getTelegramConfigSnapshot } from '../../services/telegram/config.js'
import {
  getTelegramTranscriptionConfig,
  getTelegramTranscriptionGateMessage,
} from '../../services/telegram/transcription.js'
import type { CommandResultDisplay } from '../../commands.js'
import { Dialog } from '../design-system/Dialog.js'

type Props = {
  onExit: (result?: string, options?: { display?: CommandResultDisplay }) => void
}

function StatusLine({
  label,
  value,
}: {
  label: string
  value: string
}): React.ReactNode {
  return (
    <Box gap={1}>
      <Text bold>{label}:</Text>
      <Text>{value}</Text>
    </Box>
  )
}

function Bullet({ children }: { children: React.ReactNode }): React.ReactNode {
  return (
    <Box marginLeft={2}>
      <Text dimColor>• </Text>
      <Text>{children}</Text>
    </Box>
  )
}

export function TelegramSettings({ onExit }: Props): React.ReactNode {
  const snapshot = getTelegramConfigSnapshot()
  const transcription = getTelegramTranscriptionConfig()

  let transportStatus = 'Not configured'
  if (snapshot.ready) {
    transportStatus = `Enabled for ${snapshot.allowedChatIdsCount} allowlisted chat${snapshot.allowedChatIdsCount === 1 ? '' : 's'}`
  } else if (snapshot.botTokenConfigured || snapshot.allowedChatIdsCount > 0) {
    transportStatus = 'Configured but incomplete'
  }

  const voiceStatus = transcription
    ? `Enabled (${transcription.model})`
    : 'Disabled'

  const handleExit = () => {
    onExit('Telegram setup dialog dismissed', { display: 'system' })
  }

  return (
    <Dialog
      title="Telegram"
      subtitle="Setup and status"
      onCancel={handleExit}
      hideInputGuide
    >
      <Box flexDirection="column" gap={1}>
        <Text dimColor>
          Telegram support is available in this fork for inbound text, photos,
          documents, and voice-note transcription, plus outbound text, photos,
          and documents.
        </Text>

        <Box flexDirection="column">
          <Text bold>Current status</Text>
          <StatusLine label="Transport" value={transportStatus} />
          <StatusLine
            label="Bot token"
            value={snapshot.botTokenConfigured ? 'Configured' : 'Missing'}
          />
          <StatusLine
            label="Allowlisted chats"
            value={String(snapshot.allowedChatIdsCount)}
          />
          <StatusLine
            label="Long poll"
            value={`${snapshot.pollTimeoutSeconds}s`}
          />
          <StatusLine label="Voice transcription" value={voiceStatus} />
        </Box>

        <Box flexDirection="column">
          <Text bold>Setup today</Text>
          <Bullet>Create a Telegram bot with BotFather.</Bullet>
          <Bullet>
            Set <Text color="claude">CLAUDE_CODE_TELEGRAM_BOT_TOKEN</Text> to
            the bot token.
          </Bullet>
          <Bullet>
            Message the bot once, then find the chat ID from Telegram Bot API
            updates.
          </Bullet>
          <Bullet>
            Set{' '}
            <Text color="claude">CLAUDE_CODE_TELEGRAM_ALLOWED_CHAT_IDS</Text>{' '}
            to a comma-separated list of allowed chat IDs.
          </Bullet>
          <Bullet>
            Optional: set{' '}
            <Text color="claude">
              CLAUDE_CODE_TELEGRAM_TRANSCRIPTION_API_KEY
            </Text>{' '}
            or <Text color="claude">OPENAI_API_KEY</Text> to enable voice-note
            transcription.
          </Bullet>
        </Box>

        <Box flexDirection="column">
          <Text bold>Environment variables</Text>
          <Text color="claude">
            CLAUDE_CODE_TELEGRAM_BOT_TOKEN=...
          </Text>
          <Text color="claude">
            CLAUDE_CODE_TELEGRAM_ALLOWED_CHAT_IDS=123456789
          </Text>
          <Text color="claude">
            CLAUDE_CODE_TELEGRAM_POLL_TIMEOUT_SEC=20
          </Text>
          <Text color="claude">
            CLAUDE_CODE_TELEGRAM_TRANSCRIPTION_API_KEY=...
          </Text>
        </Box>

        <Box flexDirection="column">
          <Text bold>How to get the chat ID</Text>
          <Bullet>Send a message to your bot from the chat you want.</Bullet>
          <Bullet>
            Call Telegram Bot API <Text color="claude">getUpdates</Text> for
            that bot token and read <Text color="claude">message.chat.id</Text>.
          </Bullet>
          <Bullet>
            Add that ID to{' '}
            <Text color="claude">CLAUDE_CODE_TELEGRAM_ALLOWED_CHAT_IDS</Text>.
          </Bullet>
        </Box>

        {!snapshot.botTokenConfigured && snapshot.allowedChatIdsCount > 0 ? (
          <Text color="warning">
            Telegram allowlisted chat IDs are configured, but the bot token is
            missing.
          </Text>
        ) : null}
        {snapshot.botTokenConfigured && snapshot.allowedChatIdsCount === 0 ? (
          <Text color="warning">
            Telegram bot token is configured, but no allowlisted chat IDs are
            set.
          </Text>
        ) : null}
        {!transcription ? (
          <Text dimColor>{getTelegramTranscriptionGateMessage()}</Text>
        ) : null}

        <Text dimColor>
          In-app Telegram pairing is the next planned step. For now, this
          command gives the exact setup contract and current readiness.
        </Text>
      </Box>
    </Dialog>
  )
}
