import * as React from 'react'
import type { CommandResultDisplay } from '../../commands.js'
import { Box, Text } from '../../ink.js'
import { useTerminalSize } from '../../hooks/useTerminalSize.js'
import TextInput from '../TextInput.js'
import { Select } from '../CustomSelect/select.js'
import { Dialog } from '../design-system/Dialog.js'
import {
  clearTelegramAppConfig,
  clearTelegramStoredBotToken,
  getTelegramConfigSnapshot,
  saveTelegramAppConfig,
  saveTelegramStoredBotToken,
  type TelegramConfig,
} from '../../services/telegram/config.js'
import {
  getTelegramTranscriptionConfig,
  getTelegramTranscriptionGateMessage,
} from '../../services/telegram/transcription.js'
import {
  getTelegramMe,
  getTelegramUpdates,
  type TelegramBotIdentity,
  type TelegramUpdate,
} from '../../services/telegram/client.js'

type Props = {
  onExit: (result?: string, options?: { display?: CommandResultDisplay }) => void
}

type TelegramChatCandidate = {
  chatId: string
  title: string
  subtitle: string
}

type Screen =
  | { state: 'overview' }
  | { state: 'pair-input' }
  | { state: 'pair-validating' }
  | {
      state: 'pair-awaiting-message'
      identity: TelegramBotIdentity
      botToken: string
    }
  | {
      state: 'pair-discovering'
      identity: TelegramBotIdentity
      botToken: string
    }
  | {
      state: 'pair-select-chat'
      identity: TelegramBotIdentity
      botToken: string
      candidates: TelegramChatCandidate[]
    }
  | {
      state: 'pair-saving'
      identity: TelegramBotIdentity
      botToken: string
      chat: TelegramChatCandidate
    }
  | { state: 'clear-confirm' }
  | { state: 'error'; message: string }

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

function buildChatCandidates(updates: TelegramUpdate[]): TelegramChatCandidate[] {
  const candidates = new Map<string, TelegramChatCandidate>()

  for (const update of updates) {
    const message = update.message
    if (!message) {
      continue
    }

    const chatId = String(message.chat.id)
    const title =
      message.chat.title ||
      message.chat.username ||
      [message.from?.first_name, message.from?.last_name]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      `Chat ${chatId}`
    const subtitleParts = [
      message.chat.type,
      message.chat.username ? `@${message.chat.username}` : null,
      `id ${chatId}`,
    ].filter(Boolean)

    candidates.set(chatId, {
      chatId,
      title,
      subtitle: subtitleParts.join(' · '),
    })
  }

  return Array.from(candidates.values())
}

export function TelegramSettings({ onExit }: Props): React.ReactNode {
  const terminalSize = useTerminalSize()
  const [screen, setScreen] = React.useState<Screen>({ state: 'overview' })
  const [draftBotToken, setDraftBotToken] = React.useState('')
  const [cursorOffset, setCursorOffset] = React.useState(0)
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

  const envOverrideMessage =
    snapshot.source === 'env'
      ? 'Environment variables are overriding the in-app Telegram configuration right now.'
      : null

  React.useEffect(() => {
    if (screen.state === 'pair-validating') {
      let cancelled = false

      void (async () => {
        try {
          const identity = await getTelegramMe({
            botToken: draftBotToken.trim(),
          })
          if (cancelled) {
            return
          }
          setScreen({
            state: 'pair-awaiting-message',
            identity,
            botToken: draftBotToken.trim(),
          })
        } catch (error) {
          if (cancelled) {
            return
          }
          setScreen({
            state: 'error',
            message: `Telegram bot validation failed: ${(error as Error).message}`,
          })
        }
      })()

      return () => {
        cancelled = true
      }
    }

    if (screen.state === 'pair-discovering') {
      let cancelled = false

      void (async () => {
        try {
          const temporaryConfig: TelegramConfig = {
            botToken: screen.botToken,
            allowedChatIds: new Set(),
            pollTimeoutSeconds: 5,
          }
          const updates = await getTelegramUpdates(temporaryConfig, undefined)
          const candidates = buildChatCandidates(updates)

          if (cancelled) {
            return
          }

          if (!candidates.length) {
            setScreen({
              state: 'error',
              message:
                'No Telegram chats were detected yet. Send a message to the bot from the chat you want to pair, then try again.',
            })
            return
          }

          setScreen({
            state: 'pair-select-chat',
            identity: screen.identity,
            botToken: screen.botToken,
            candidates,
          })
        } catch (error) {
          if (cancelled) {
            return
          }
          setScreen({
            state: 'error',
            message: `Telegram chat discovery failed: ${(error as Error).message}`,
          })
        }
      })()

      return () => {
        cancelled = true
      }
    }

    if (screen.state === 'pair-saving') {
      try {
        const savedSecret = saveTelegramStoredBotToken(screen.botToken)
        if (!savedSecret.success) {
          throw new Error(savedSecret.warning || 'failed to store bot token')
        }

        saveTelegramAppConfig({
          allowedChatIds: [screen.chat.chatId],
          lastPairedChatId: screen.chat.chatId,
          botUsername: screen.identity.username,
          botDisplayName: screen.identity.displayName,
        })

        onExit(
          `Telegram paired for ${screen.chat.title} (${screen.chat.chatId})`,
          { display: 'system' },
        )
      } catch (error) {
        setScreen({
          state: 'error',
          message: `Telegram pairing could not be saved: ${(error as Error).message}`,
        })
      }
    }
  }, [draftBotToken, onExit, screen])

  const handleExit = () => {
    onExit('Telegram setup dialog dismissed', { display: 'system' })
  }

  if (screen.state === 'pair-input') {
    return (
      <Dialog
        title="Telegram"
        subtitle="Pair bot"
        onCancel={() => setScreen({ state: 'overview' })}
        isCancelActive={false}
        inputGuide={() => (
          <Text>
            Paste your bot token, then press <Text bold>Enter</Text>.
          </Text>
        )}
      >
        <Box flexDirection="column" gap={1}>
          <Text dimColor>
            Create a Telegram bot with BotFather, then paste the bot token here.
            It will be stored in secure storage when pairing succeeds.
          </Text>
          <TextInput
            value={draftBotToken}
            onChange={setDraftBotToken}
            onSubmit={() => {
              if (!draftBotToken.trim()) {
                setScreen({
                  state: 'error',
                  message: 'Telegram bot token is required to continue.',
                })
                return
              }
              setScreen({ state: 'pair-validating' })
            }}
            focus
            mask="*"
            placeholder="123456789:AA..."
            columns={terminalSize.columns}
            cursorOffset={cursorOffset}
            onChangeCursorOffset={setCursorOffset}
            showCursor
          />
          {envOverrideMessage ? <Text color="warning">{envOverrideMessage}</Text> : null}
        </Box>
      </Dialog>
    )
  }

  if (screen.state === 'pair-validating') {
    return (
      <Dialog
        title="Telegram"
        subtitle="Pair bot"
        onCancel={() => setScreen({ state: 'overview' })}
        hideInputGuide
      >
        <Text>Validating your Telegram bot token…</Text>
      </Dialog>
    )
  }

  if (screen.state === 'pair-awaiting-message') {
    return (
      <Dialog
        title="Telegram"
        subtitle="Pair bot"
        onCancel={() => setScreen({ state: 'overview' })}
      >
        <Box flexDirection="column" gap={1}>
          <Text>
            Connected to bot <Text bold>{screen.identity.displayName}</Text>
            {screen.identity.username ? ` (@${screen.identity.username})` : ''}.
          </Text>
          <Text dimColor>
            Send that bot a message from the Telegram chat you want to pair,
            then check for chats.
          </Text>
          <Select
            options={[
              {
                label: <Text>Check for Telegram chats</Text>,
                value: 'discover',
              },
              {
                label: <Text>Back to Telegram overview</Text>,
                value: 'back',
              },
            ]}
            onChange={value => {
              if (value === 'discover') {
                setScreen({
                  state: 'pair-discovering',
                  identity: screen.identity,
                  botToken: screen.botToken,
                })
                return
              }
              setScreen({ state: 'overview' })
            }}
          />
          {envOverrideMessage ? <Text color="warning">{envOverrideMessage}</Text> : null}
        </Box>
      </Dialog>
    )
  }

  if (screen.state === 'pair-discovering') {
    return (
      <Dialog
        title="Telegram"
        subtitle="Pair bot"
        onCancel={() => setScreen({ state: 'overview' })}
        hideInputGuide
      >
        <Text>Looking for Telegram chats that have messaged your bot…</Text>
      </Dialog>
    )
  }

  if (screen.state === 'pair-select-chat') {
    return (
      <Dialog
        title="Telegram"
        subtitle="Choose chat"
        onCancel={() => setScreen({ state: 'overview' })}
      >
        <Box flexDirection="column" gap={1}>
          <Text dimColor>
            Select the Telegram chat that should be allowlisted for this app.
          </Text>
          <Select
            options={screen.candidates.map(candidate => ({
              label: (
                <Text>
                  {candidate.title} · <Text dimColor>{candidate.subtitle}</Text>
                </Text>
              ),
              value: candidate.chatId,
            }))}
            onChange={chatId => {
              const candidate = screen.candidates.find(
                item => item.chatId === chatId,
              )
              if (!candidate) {
                return
              }
              setScreen({
                state: 'pair-saving',
                identity: screen.identity,
                botToken: screen.botToken,
                chat: candidate,
              })
            }}
          />
        </Box>
      </Dialog>
    )
  }

  if (screen.state === 'pair-saving') {
    return (
      <Dialog
        title="Telegram"
        subtitle="Pair bot"
        onCancel={handleExit}
        hideInputGuide
      >
        <Text>Saving Telegram pairing…</Text>
      </Dialog>
    )
  }

  if (screen.state === 'clear-confirm') {
    return (
      <Dialog
        title="Telegram"
        subtitle="Clear pairing"
        onCancel={() => setScreen({ state: 'overview' })}
      >
        <Box flexDirection="column" gap={1}>
          <Text>
            Remove the stored Telegram bot token and paired chat configuration
            from this app?
          </Text>
          <Select
            options={[
              {
                label: <Text>Yes, clear in-app Telegram pairing</Text>,
                value: 'clear',
              },
              { label: <Text>Cancel</Text>, value: 'cancel' },
            ]}
            onChange={value => {
              if (value === 'clear') {
                clearTelegramAppConfig()
                clearTelegramStoredBotToken()
                onExit('Telegram pairing cleared', { display: 'system' })
                return
              }
              setScreen({ state: 'overview' })
            }}
          />
        </Box>
      </Dialog>
    )
  }

  if (screen.state === 'error') {
    return (
      <Dialog
        title="Telegram"
        subtitle="Setup and status"
        onCancel={() => setScreen({ state: 'overview' })}
      >
        <Box flexDirection="column" gap={1}>
          <Text color="error">{screen.message}</Text>
          <Select
            options={[
              { label: <Text>Back to Telegram overview</Text>, value: 'back' },
              { label: <Text>Done</Text>, value: 'done' },
            ]}
            onChange={value => {
              if (value === 'back') {
                setScreen({ state: 'overview' })
                return
              }
              handleExit()
            }}
          />
        </Box>
      </Dialog>
    )
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
            label="Config source"
            value={
              snapshot.source === 'env'
                ? 'Environment variables'
                : snapshot.source === 'app'
                  ? 'In-app pairing'
                  : 'Not configured'
            }
          />
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
          {snapshot.botUsername ? (
            <StatusLine label="Bot" value={`@${snapshot.botUsername}`} />
          ) : null}
          {snapshot.lastPairedChatId ? (
            <StatusLine label="Last paired chat" value={snapshot.lastPairedChatId} />
          ) : null}
        </Box>

        <Box flexDirection="column">
          <Text bold>Actions</Text>
          <Select
            options={[
              {
                label: <Text>Pair Telegram bot in-app</Text>,
                value: 'pair',
              },
              {
                label: <Text>Clear in-app Telegram pairing</Text>,
                value: 'clear',
                disabled: snapshot.source !== 'app',
              },
              {
                label: <Text>Done</Text>,
                value: 'done',
              },
            ]}
            onChange={value => {
              if (value === 'pair') {
                setDraftBotToken('')
                setCursorOffset(0)
                setScreen({ state: 'pair-input' })
                return
              }

              if (value === 'clear') {
                setScreen({ state: 'clear-confirm' })
                return
              }

              handleExit()
            }}
          />
        </Box>

        <Box flexDirection="column">
          <Text bold>Manual setup</Text>
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
        {envOverrideMessage ? <Text color="warning">{envOverrideMessage}</Text> : null}
      </Box>
    </Dialog>
  )
}
