import * as React from 'react'
import type { CommandResultDisplay } from '../../commands.js'
import { Box, Text } from '../../ink.js'
import { useTerminalSize } from '../../hooks/useTerminalSize.js'
import TextInput from '../TextInput.js'
import { Select } from '../CustomSelect/select.js'
import { Dialog } from '../design-system/Dialog.js'
import {
  clearCurrentProjectTelegramBinding,
  getTelegramConfig,
  getTelegramConfigSnapshot,
  getCurrentProjectTelegramBindingSnapshot,
  getTelegramBotProfileToken,
  listTelegramBotProfiles,
  listTelegramProjectBindingsForProfile,
  removeTelegramBotProfile,
  saveCurrentProjectTelegramBinding,
  saveTelegramBotProfile,
  type TelegramConfig,
} from '../../services/telegram/config.js'
import {
  getSettings_DEPRECATED,
  updateSettingsForSource,
} from '../../utils/settings/settings.js'
import {
  permissionModeFromString,
  permissionModeTitle,
  type PermissionMode,
} from '../../utils/permissions/PermissionMode.js'
import {
  getTelegramTranscriptionConfig,
  getTelegramTranscriptionGateMessage,
} from '../../services/telegram/transcription.js'
import {
  getTelegramMe,
  sendTelegramMessage,
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
  | { state: 'bind-select-profile' }
  | {
      state: 'bind-awaiting-message'
      profileId: string
      label: string
      botToken: string
    }
  | {
      state: 'bind-discovering'
      profileId: string
      label: string
      botToken: string
    }
  | {
      state: 'bind-select-chat'
      profileId: string
      label: string
      botToken: string
      candidates: TelegramChatCandidate[]
    }
  | {
      state: 'bind-saving'
      profileId: string
      label: string
      chat: TelegramChatCandidate
    }
  | {
      state: 'add-chat-awaiting-message'
      profileId: string
      label: string
      botToken: string
    }
  | {
      state: 'add-chat-discovering'
      profileId: string
      label: string
      botToken: string
    }
  | {
      state: 'add-chat-select-chat'
      profileId: string
      label: string
      botToken: string
      candidates: TelegramChatCandidate[]
    }
  | { state: 'remove-chat-select' }
  | { state: 'default-chat-select' }
  | { state: 'delete-profile-select' }
  | { state: 'doctor' }
  | { state: 'permissions-help' }
  | { state: 'test-sending' }
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

function getTelegramPermissionHelp(mode: PermissionMode): string {
  switch (mode) {
    case 'bypassPermissions':
      return 'Full access. Telegram-driven CT can use tools and web/research paths without approval prompts.'
    case 'acceptEdits':
      return 'Auto-accept file edits, but CT may still stop for other risky actions.'
    case 'dontAsk':
      return "Never prompt, but deny anything not already allowed. This is quieter, not broader."
    case 'plan':
      return 'Planning only. Good for discussion, not for autonomous Telegram execution.'
    case 'auto':
      return 'CT can choose an automatic mode when supported, but it is not the clearest broad-access default for Telegram.'
    case 'default':
    default:
      return 'Ask before higher-risk actions. Good for terminal use, but Telegram can feel blocked when approvals are needed.'
  }
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

function buildTelegramDoctorItems(params: {
  snapshot: ReturnType<typeof getTelegramConfigSnapshot>
  currentBinding: ReturnType<typeof getCurrentProjectTelegramBindingSnapshot>
  transcriptionEnabled: boolean
  defaultPermissionMode: PermissionMode
}): string[] {
  const items: string[] = []

  if (params.snapshot.source === 'env') {
    items.push(
      'Environment variables currently override the project Telegram binding.',
    )
  }

  if (params.snapshot.brokenReason) {
    items.push(params.snapshot.brokenReason)
  }

  if (!params.currentBinding) {
    items.push('This project is not currently bound to a Telegram bot profile.')
  }

  if (
    params.currentBinding &&
    params.currentBinding.allowedChatIds.length === 0
  ) {
    items.push('This project has no allowlisted Telegram chats yet.')
  }

  if (!params.transcriptionEnabled) {
    items.push(getTelegramTranscriptionGateMessage())
  }

  if (params.defaultPermissionMode === 'dontAsk') {
    items.push(
      "Telegram is using Don't Ask right now, which denies unapproved actions instead of granting broader access.",
    )
  }

  if (items.length === 0) {
    items.push('Telegram looks healthy for the current project.')
  }

  return items
}

export function TelegramSettings({ onExit }: Props): React.ReactNode {
  const terminalSize = useTerminalSize()
  const [screen, setScreen] = React.useState<Screen>({ state: 'overview' })
  const [draftBotToken, setDraftBotToken] = React.useState('')
  const [cursorOffset, setCursorOffset] = React.useState(0)
  const snapshot = getTelegramConfigSnapshot()
  const currentBinding = getCurrentProjectTelegramBindingSnapshot()
  const profiles = listTelegramBotProfiles()
  const transcription = getTelegramTranscriptionConfig()
  const activeTelegramConfig = getTelegramConfig()
  const defaultPermissionMode = permissionModeFromString(
    getSettings_DEPRECATED().permissions?.defaultMode ?? 'default',
  )

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
  const currentBindingLabel = snapshot.botDisplayName
    ? snapshot.botUsername
      ? `${snapshot.botDisplayName} (@${snapshot.botUsername})`
      : snapshot.botDisplayName
    : snapshot.profileId || 'None'
  const currentAllowedChatIds = currentBinding?.allowedChatIds ?? []
  const doctorItems = buildTelegramDoctorItems({
    snapshot,
    currentBinding,
    transcriptionEnabled: Boolean(transcription),
    defaultPermissionMode,
  })

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

    if (
      screen.state === 'pair-discovering' ||
      screen.state === 'bind-discovering' ||
      screen.state === 'add-chat-discovering'
    ) {
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

          if (screen.state === 'pair-discovering') {
            setScreen({
              state: 'pair-select-chat',
              identity: screen.identity,
              botToken: screen.botToken,
              candidates,
            })
            return
          }

          if (screen.state === 'bind-discovering') {
            setScreen({
              state: 'bind-select-chat',
              profileId: screen.profileId,
              label: screen.label,
              botToken: screen.botToken,
              candidates,
            })
            return
          }

          setScreen({
            state: 'add-chat-select-chat',
            profileId: screen.profileId,
            label: screen.label,
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
        const profileId = `telegram-bot-${screen.identity.id}`
        const savedSecret = saveTelegramBotProfile({
          profileId,
          botToken: screen.botToken,
          botUsername: screen.identity.username,
          botDisplayName: screen.identity.displayName,
        })
        if (!savedSecret.success) {
          throw new Error(savedSecret.warning || 'failed to store bot token')
        }

        saveCurrentProjectTelegramBinding({
          profileId,
          allowedChatIds: [screen.chat.chatId],
          defaultChatId: screen.chat.chatId,
          lastInboundChatId: screen.chat.chatId,
        })

        onExit(
          `Telegram bot ${screen.identity.displayName} paired for this project via ${screen.chat.title} (${screen.chat.chatId})`,
          { display: 'system' },
        )
      } catch (error) {
        setScreen({
          state: 'error',
          message: `Telegram pairing could not be saved: ${(error as Error).message}`,
        })
      }
    }

    if (screen.state === 'bind-saving') {
      try {
        saveCurrentProjectTelegramBinding({
          profileId: screen.profileId,
          allowedChatIds: [screen.chat.chatId],
          defaultChatId: screen.chat.chatId,
          lastInboundChatId: screen.chat.chatId,
        })

        onExit(
          `Telegram bot ${screen.label} is now bound to this project via ${screen.chat.title} (${screen.chat.chatId})`,
          { display: 'system' },
        )
      } catch (error) {
        setScreen({
          state: 'error',
          message: `Telegram project binding could not be saved: ${(error as Error).message}`,
        })
      }
    }

    if (screen.state === 'test-sending') {
      let cancelled = false

      void (async () => {
        try {
          const config = getTelegramConfig()
          if (!config) {
            throw new Error(
              'Telegram is not ready for the current project. Fix the binding first.',
            )
          }
          const targetChatId =
            config.defaultChatId || Array.from(config.allowedChatIds)[0]
          if (!targetChatId) {
            throw new Error(
              'No default Telegram chat is available for this project yet.',
            )
          }

          await sendTelegramMessage(
            config,
            targetChatId,
            'Telegram test from CT: outbound delivery is working for this project.',
          )

          if (cancelled) {
            return
          }

          onExit(`Telegram test message sent to ${targetChatId}`, {
            display: 'system',
          })
        } catch (error) {
          if (cancelled) {
            return
          }
          setScreen({
            state: 'error',
            message: `Telegram test failed: ${(error as Error).message}`,
          })
        }
      })()

      return () => {
        cancelled = true
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

  if (screen.state === 'bind-select-profile') {
    return (
      <Dialog
        title="Telegram"
        subtitle="Bind bot to project"
        onCancel={() => setScreen({ state: 'overview' })}
      >
        <Box flexDirection="column" gap={1}>
          <Text dimColor>
            Choose which saved Telegram bot should be active for the current
            project.
          </Text>
          <Select
            options={profiles.map(profile => ({
              label: (
                <Text>
                  {profile.botDisplayName || profile.botUsername || profile.profileId}
                  <Text dimColor>
                    {' '}
                    · {profile.botUsername ? `@${profile.botUsername}` : profile.profileId}
                  </Text>
                </Text>
              ),
              value: profile.profileId,
            }))}
            onChange={profileId => {
              const profile = profiles.find(item => item.profileId === profileId)
              if (!profile) {
                return
              }

              const botToken = getTelegramBotProfileToken(profileId)
              if (!botToken) {
                setScreen({
                  state: 'error',
                  message:
                    'The selected Telegram bot is missing its stored token. Re-pair the bot to repair this profile.',
                })
                return
              }

              const label =
                profile.botDisplayName ||
                profile.botUsername ||
                profile.profileId

              setScreen({
                state: 'bind-awaiting-message',
                profileId,
                label,
                botToken,
              })
            }}
          />
        </Box>
      </Dialog>
    )
  }

  if (screen.state === 'bind-awaiting-message') {
    return (
      <Dialog
        title="Telegram"
        subtitle="Bind bot to project"
        onCancel={() => setScreen({ state: 'overview' })}
      >
        <Box flexDirection="column" gap={1}>
          <Text>
            Selected bot <Text bold>{screen.label}</Text> for this project.
          </Text>
          <Text dimColor>
            Send that bot a message from the Telegram chat you want this
            project to trust, then check for chats.
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
                  state: 'bind-discovering',
                  profileId: screen.profileId,
                  label: screen.label,
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

  if (screen.state === 'bind-discovering') {
    return (
      <Dialog
        title="Telegram"
        subtitle="Bind bot to project"
        onCancel={() => setScreen({ state: 'overview' })}
        hideInputGuide
      >
        <Text>Looking for Telegram chats that have messaged your selected bot…</Text>
      </Dialog>
    )
  }

  if (screen.state === 'bind-select-chat') {
    return (
      <Dialog
        title="Telegram"
        subtitle="Choose chat"
        onCancel={() => setScreen({ state: 'overview' })}
      >
        <Box flexDirection="column" gap={1}>
          <Text dimColor>
            Select the Telegram chat that should be allowlisted for the current
            project.
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
                state: 'bind-saving',
                profileId: screen.profileId,
                label: screen.label,
                chat: candidate,
              })
            }}
          />
        </Box>
      </Dialog>
    )
  }

  if (screen.state === 'bind-saving') {
    return (
      <Dialog
        title="Telegram"
        subtitle="Bind bot to project"
        onCancel={handleExit}
        hideInputGuide
      >
        <Text>Saving Telegram project binding…</Text>
      </Dialog>
    )
  }

  if (screen.state === 'add-chat-awaiting-message') {
    return (
      <Dialog
        title="Telegram"
        subtitle="Allowlist another chat"
        onCancel={() => setScreen({ state: 'overview' })}
      >
        <Box flexDirection="column" gap={1}>
          <Text>
            Selected bot <Text bold>{screen.label}</Text> for this project.
          </Text>
          <Text dimColor>
            Send that bot a message from the Telegram chat you want to add,
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
                  state: 'add-chat-discovering',
                  profileId: screen.profileId,
                  label: screen.label,
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

  if (screen.state === 'add-chat-discovering') {
    return (
      <Dialog
        title="Telegram"
        subtitle="Allowlist another chat"
        onCancel={() => setScreen({ state: 'overview' })}
        hideInputGuide
      >
        <Text>Looking for Telegram chats that have messaged your selected bot…</Text>
      </Dialog>
    )
  }

  if (screen.state === 'add-chat-select-chat') {
    return (
      <Dialog
        title="Telegram"
        subtitle="Choose chat"
        onCancel={() => setScreen({ state: 'overview' })}
      >
        <Box flexDirection="column" gap={1}>
          <Text dimColor>
            Select the Telegram chat that should be added to this project.
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
              if (!candidate || !currentBinding) {
                return
              }

              saveCurrentProjectTelegramBinding({
                profileId: currentBinding.profileId,
                allowedChatIds: [...currentAllowedChatIds, candidate.chatId],
                defaultChatId: currentBinding.defaultChatId || candidate.chatId,
                lastInboundChatId: currentBinding.lastInboundChatId,
                pollTimeoutSeconds: currentBinding.pollTimeoutSeconds,
              })
              onExit(
                `Telegram chat ${candidate.title} (${candidate.chatId}) added to this project`,
                { display: 'system' },
              )
            }}
          />
        </Box>
      </Dialog>
    )
  }

  if (screen.state === 'remove-chat-select') {
    return (
      <Dialog
        title="Telegram"
        subtitle="Remove allowlisted chat"
        onCancel={() => setScreen({ state: 'overview' })}
      >
        <Box flexDirection="column" gap={1}>
          <Text dimColor>
            Select the Telegram chat that should no longer be allowlisted for
            this project.
          </Text>
          <Select
            options={currentAllowedChatIds.map(chatId => ({
              label: (
                <Text>
                  {chatId}
                  {currentBinding?.defaultChatId === chatId ? (
                    <Text dimColor> · default</Text>
                  ) : null}
                </Text>
              ),
              value: chatId,
            }))}
            onChange={chatId => {
              if (!currentBinding) {
                return
              }
              const nextChatIds = currentAllowedChatIds.filter(
                value => value !== chatId,
              )
              saveCurrentProjectTelegramBinding({
                profileId: currentBinding.profileId,
                allowedChatIds: nextChatIds,
                defaultChatId:
                  currentBinding.defaultChatId === chatId
                    ? nextChatIds[0]
                    : currentBinding.defaultChatId,
                lastInboundChatId:
                  currentBinding.lastInboundChatId === chatId
                    ? undefined
                    : currentBinding.lastInboundChatId,
                pollTimeoutSeconds: currentBinding.pollTimeoutSeconds,
              })
              onExit(`Telegram chat ${chatId} removed from this project`, {
                display: 'system',
              })
            }}
          />
        </Box>
      </Dialog>
    )
  }

  if (screen.state === 'default-chat-select') {
    return (
      <Dialog
        title="Telegram"
        subtitle="Set default chat"
        onCancel={() => setScreen({ state: 'overview' })}
      >
        <Box flexDirection="column" gap={1}>
          <Text dimColor>
            Choose which allowlisted chat should be used for Telegram operator
            actions in this project.
          </Text>
          <Select
            options={currentAllowedChatIds.map(chatId => ({
              label: (
                <Text>
                  {chatId}
                  {currentBinding?.defaultChatId === chatId ? (
                    <Text dimColor> · current default</Text>
                  ) : null}
                </Text>
              ),
              value: chatId,
            }))}
            onChange={chatId => {
              if (!currentBinding) {
                return
              }
              saveCurrentProjectTelegramBinding({
                profileId: currentBinding.profileId,
                allowedChatIds: currentAllowedChatIds,
                defaultChatId: chatId,
                lastInboundChatId: currentBinding.lastInboundChatId,
                pollTimeoutSeconds: currentBinding.pollTimeoutSeconds,
              })
              onExit(`Telegram default chat set to ${chatId}`, {
                display: 'system',
              })
            }}
          />
        </Box>
      </Dialog>
    )
  }

  if (screen.state === 'delete-profile-select') {
    return (
      <Dialog
        title="Telegram"
        subtitle="Delete saved bot profile"
        onCancel={() => setScreen({ state: 'overview' })}
      >
        <Box flexDirection="column" gap={1}>
          <Text dimColor>
            Choose which saved Telegram bot profile should be removed.
          </Text>
          <Select
            options={profiles.map(profile => ({
              label: (
                <Text>
                  {profile.botDisplayName || profile.botUsername || profile.profileId}
                  <Text dimColor>
                    {' '}
                    · {profile.botUsername ? `@${profile.botUsername}` : profile.profileId}
                  </Text>
                </Text>
              ),
              value: profile.profileId,
            }))}
            onChange={profileId => {
              const usages = listTelegramProjectBindingsForProfile(profileId)
              if (usages.length > 0) {
                setScreen({
                  state: 'error',
                  message: `This Telegram bot is still bound to ${usages.length} project${usages.length === 1 ? '' : 's'} and cannot be deleted yet.`,
                })
                return
              }

              const result = removeTelegramBotProfile(profileId)
              if (!result.success) {
                setScreen({
                  state: 'error',
                  message:
                    result.warning ||
                    'The selected Telegram bot profile could not be removed.',
                })
                return
              }

              onExit(`Telegram bot profile ${profileId} removed`, {
                display: 'system',
              })
            }}
          />
        </Box>
      </Dialog>
    )
  }

  if (screen.state === 'doctor') {
    return (
      <Dialog
        title="Telegram"
        subtitle="Doctor"
        onCancel={() => setScreen({ state: 'overview' })}
      >
        <Box flexDirection="column" gap={1}>
          {doctorItems.map((item, index) => (
            <Bullet key={`${index}-${item}`}>{item}</Bullet>
          ))}
          <Select
            options={[
              { label: <Text>Back to Telegram overview</Text>, value: 'back' },
            ]}
            onChange={() => {
              setScreen({ state: 'overview' })
            }}
          />
        </Box>
      </Dialog>
    )
  }

  if (screen.state === 'permissions-help') {
    const options: Array<{
      label: React.ReactNode
      value: PermissionMode | 'back'
    }> = [
      {
        label: (
          <Text>
            Ask before risky actions <Text dimColor>(default)</Text>
          </Text>
        ),
        value: 'default',
      },
      {
        label: (
          <Text>
            Accept edits automatically <Text dimColor>(faster file work)</Text>
          </Text>
        ),
        value: 'acceptEdits',
      },
      {
        label: (
          <Text>
            Full access <Text dimColor>(never ask)</Text>
          </Text>
        ),
        value: 'bypassPermissions',
      },
      {
        label: <Text>Back to Telegram overview</Text>,
        value: 'back',
      },
    ]

    return (
      <Dialog
        title="Telegram"
        subtitle="Permissions and research"
        onCancel={() => setScreen({ state: 'overview' })}
      >
        <Box flexDirection="column" gap={1}>
          <Text>
            Telegram uses the same permission runtime as CT in the terminal.
          </Text>
          <Text>
            Current default mode:{' '}
            <Text bold>{permissionModeTitle(defaultPermissionMode)}</Text>
          </Text>
          <Text dimColor>{getTelegramPermissionHelp(defaultPermissionMode)}</Text>
          <Text>
            If you want CT over Telegram to research, use tools, and avoid
            approval stalls, choose <Text bold>Full access</Text>.
          </Text>
          <Text dimColor>
            Don&apos;t Ask is not full access. It denies unapproved actions
            without prompting.
          </Text>
          <Text dimColor>
            For research-heavy Telegram work, ask directly for research or use
            <Text bold> /mode research</Text> in the conversation.
          </Text>
          <Select
            options={options}
            onChange={value => {
              if (value === 'back') {
                setScreen({ state: 'overview' })
                return
              }

              updateSettingsForSource('userSettings', {
                permissions: {
                  defaultMode: value,
                },
              })
              setScreen({ state: 'overview' })
            }}
          />
        </Box>
      </Dialog>
    )
  }

  if (screen.state === 'test-sending') {
    return (
      <Dialog
        title="Telegram"
        subtitle="Send test"
        onCancel={handleExit}
        hideInputGuide
      >
        <Text>Sending a Telegram test message…</Text>
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
            Remove the current Telegram bot binding from this project?
          </Text>
          <Select
            options={[
              {
                label: <Text>Yes, clear the current project binding</Text>,
                value: 'clear',
              },
              { label: <Text>Cancel</Text>, value: 'cancel' },
            ]}
            onChange={value => {
              if (value === 'clear') {
                clearCurrentProjectTelegramBinding()
                onExit('Telegram project binding cleared', {
                  display: 'system',
                })
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
                : snapshot.source === 'project'
                  ? 'Project binding'
                  : 'Not configured'
            }
          />
          <StatusLine
            label="Bot token"
            value={snapshot.botTokenConfigured ? 'Configured' : 'Missing'}
          />
          <StatusLine label="Current project bot" value={currentBindingLabel} />
          <StatusLine
            label="Allowlisted chats"
            value={String(snapshot.allowedChatIdsCount)}
          />
          <StatusLine
            label="Long poll"
            value={`${snapshot.pollTimeoutSeconds}s`}
          />
          <StatusLine
            label="Permission mode"
            value={permissionModeTitle(defaultPermissionMode)}
          />
          <StatusLine label="Voice transcription" value={voiceStatus} />
          {snapshot.botUsername ? (
            <StatusLine label="Bot" value={`@${snapshot.botUsername}`} />
          ) : null}
          {snapshot.projectPath ? (
            <StatusLine label="Project path" value={snapshot.projectPath} />
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
              ...(profiles.length > 0
                ? [
                    {
                      label: <Text>Bind saved Telegram bot to this project</Text>,
                      value: 'bind',
                    },
                    {
                      label: <Text>Delete saved Telegram bot profile</Text>,
                      value: 'delete-profile',
                    },
                  ]
                : []),
              ...(currentBinding
                ? [
                    {
                      label: <Text>Allowlist another chat for this project</Text>,
                      value: 'add-chat',
                    },
                    {
                      label: <Text>Set default chat for this project</Text>,
                      value: 'set-default',
                      disabled: currentAllowedChatIds.length < 2,
                    },
                    {
                      label: <Text>Remove an allowlisted chat from this project</Text>,
                      value: 'remove-chat',
                      disabled: currentAllowedChatIds.length === 0,
                    },
                    {
                      label: <Text>Send Telegram test message</Text>,
                      value: 'test',
                      disabled: !activeTelegramConfig,
                    },
                    {
                      label: <Text>Clear current project Telegram binding</Text>,
                      value: 'clear',
                    },
                  ]
                : []),
              {
                label: <Text>Telegram permissions and research help</Text>,
                value: 'permissions-help',
              },
              {
                label: <Text>Run Telegram doctor</Text>,
                value: 'doctor',
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

              if (value === 'bind') {
                setScreen({ state: 'bind-select-profile' })
                return
              }

              if (value === 'delete-profile') {
                setScreen({ state: 'delete-profile-select' })
                return
              }

              if (value === 'add-chat' && currentBinding) {
                const botToken = getTelegramBotProfileToken(currentBinding.profileId)
                if (!botToken) {
                  setScreen({
                    state: 'error',
                    message:
                      'The active Telegram bot profile is missing its stored token. Re-pair the bot to repair this profile.',
                  })
                  return
                }

                setScreen({
                  state: 'add-chat-awaiting-message',
                  profileId: currentBinding.profileId,
                  label: currentBindingLabel,
                  botToken,
                })
                return
              }

              if (value === 'set-default') {
                setScreen({ state: 'default-chat-select' })
                return
              }

              if (value === 'remove-chat') {
                setScreen({ state: 'remove-chat-select' })
                return
              }

              if (value === 'test') {
                setScreen({ state: 'test-sending' })
                return
              }

              if (value === 'doctor') {
                setScreen({ state: 'doctor' })
                return
              }

              if (value === 'permissions-help') {
                setScreen({ state: 'permissions-help' })
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
          <Text bold>Saved bot profiles</Text>
          {profiles.length > 0 ? (
            profiles.map(profile => (
              <Bullet key={profile.profileId}>
                {(profile.botDisplayName || profile.botUsername || profile.profileId) +
                  (profile.botUsername ? ` (@${profile.botUsername})` : '') +
                  (currentBinding?.profileId === profile.profileId
                    ? ' · bound to this project'
                    : '')}
              </Bullet>
            ))
          ) : (
            <Bullet>No saved Telegram bots yet. Pair one to create the first profile.</Bullet>
          )}
        </Box>

        <Box flexDirection="column">
          <Text bold>Current project chats</Text>
          {currentAllowedChatIds.length > 0 ? (
            currentAllowedChatIds.map(chatId => (
              <Bullet key={chatId}>
                {chatId}
                {currentBinding?.defaultChatId === chatId ? ' · default' : ''}
              </Bullet>
            ))
          ) : (
            <Bullet>No Telegram chats are allowlisted for this project yet.</Bullet>
          )}
        </Box>

        <Box flexDirection="column">
          <Text bold>Manual setup</Text>
          <Bullet>Create a Telegram bot with BotFather.</Bullet>
          <Bullet>
            Set <Text color="claude">CLAUDE_CODE_TELEGRAM_BOT_TOKEN</Text> to
            the bot token.
          </Bullet>
          <Bullet>
            Pairing in-app saves the bot as a reusable profile, then binds it
            to the current project.
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
