import React, { useEffect, useMemo, useRef, useState } from 'react'
import { logEvent } from 'src/services/analytics/index.js'
import { getOpenAiCodexAuthReadiness } from '../services/authProfiles/store.js'
import {
  importExternalCodexCliAuthProfile,
  loginWithOpenAiCodexOAuth,
} from '../services/authProfiles/openaiCodexOAuth.js'
import { Box, Link, Text } from '../ink.js'
import { useKeybinding } from '../keybindings/useKeybinding.js'
import { saveGlobalConfig } from '../utils/config.js'
import { logError } from '../utils/log.js'
import { openBrowser } from '../utils/browser.js'
import { Select } from './CustomSelect/select.js'
import { ConsoleOAuthFlow } from './ConsoleOAuthFlow.js'
import { Spinner } from './Spinner.js'
import TextInput from './TextInput.js'

type Props = {
  onDone(): void
}

type Screen =
  | { state: 'choose' }
  | { state: 'platform' }
  | { state: 'openai-options' }
  | { state: 'openai-login' }
  | { state: 'openai-error'; message: string }
  | { state: 'anthropic'; loginMethod: 'claudeai' | 'console' }

function persistPreferredMainProvider(
  provider: 'anthropic' | 'openai-codex',
): void {
  saveGlobalConfig(current => {
    if (current.preferredMainProvider === provider) {
      return current
    }
    return {
      ...current,
      preferredMainProvider: provider,
    }
  })
  process.env.CLAUDE_CODE_MAIN_PROVIDER = provider
}

export function StartupAuthFlow({ onDone }: Props): React.ReactNode {
  const [screen, setScreen] = useState<Screen>({ state: 'choose' })
  const openAiManualPromptResolverRef = useRef<((value: string) => void) | null>(
    null,
  )
  const [openAiAuthUrl, setOpenAiAuthUrl] = useState<string | null>(null)
  const [openAiAuthMessage, setOpenAiAuthMessage] = useState(
    'Starting native OpenAI/Codex sign-in…',
  )
  const [openAiManualPrompt, setOpenAiManualPrompt] = useState<string | null>(
    null,
  )
  const [openAiManualCode, setOpenAiManualCode] = useState('')
  const openAiReadiness = useMemo(() => getOpenAiCodexAuthReadiness(), [screen])

  useKeybinding(
    'confirm:no',
    () => {
      setScreen({ state: 'choose' })
    },
    {
      context: 'Confirmation',
      isActive:
        screen.state === 'platform' ||
        screen.state === 'openai-options' ||
        screen.state === 'openai-error',
    },
  )

  useEffect(() => {
    if (screen.state !== 'openai-login') {
      return
    }

    let cancelled = false
    setOpenAiAuthUrl(null)
    setOpenAiManualPrompt(null)
    setOpenAiManualCode('')
    setOpenAiAuthMessage('Starting native OpenAI/Codex sign-in…')

    void (async () => {
      try {
        logEvent('tengu_openai_codex_login_start', {})
        await loginWithOpenAiCodexOAuth({
          onAuth: info => {
            setOpenAiAuthUrl(info.url)
            setOpenAiAuthMessage(
              info.instructions ??
                'A browser should open. Complete sign-in to finish linking OpenAI/Codex.',
            )
            void openBrowser(info.url).then(opened => {
              if (!opened && !cancelled) {
                setOpenAiAuthMessage(
                  "CT couldn't open the browser automatically. Visit the URL below to continue.",
                )
              }
            })
          },
          onProgress: message => {
            if (!cancelled) {
              setOpenAiAuthMessage(message)
            }
          },
          onPrompt: async prompt =>
            await new Promise<string>(resolve => {
              if (cancelled) {
                resolve('')
                return
              }

              openAiManualPromptResolverRef.current = resolve
              setOpenAiManualPrompt(prompt.message)
            }),
        })

        const readiness = getOpenAiCodexAuthReadiness()
        if (!readiness.hasDefaultProfile) {
          const detectedSource = readiness.readyViaExternal
            ? 'CT still only detected ~/.codex/auth.json fallback auth after login.'
            : 'CT did not detect a saved native provider auth profile after login.'
          throw new Error(
            `Native OpenAI/Codex login completed, but CT did not persist the native auth profile successfully. ${detectedSource}`,
          )
        }

        if (cancelled) {
          return
        }

        persistPreferredMainProvider('openai-codex')
        logEvent('tengu_openai_codex_login_success', {
          source: 'provider-auth-profile',
        })
        onDone()
      } catch (error) {
        logError(error)
        if (cancelled) {
          return
        }
        const message = (error as Error).message
        setScreen({
          state: 'openai-error',
          message,
        })
      }
    })()

    return () => {
      cancelled = true
      openAiManualPromptResolverRef.current?.('')
      openAiManualPromptResolverRef.current = null
    }
  }, [onDone, screen])

  function submitOpenAiManualCode(): void {
    const value = openAiManualCode.trim()
    if (!value) {
      return
    }

    setOpenAiManualPrompt(null)
    setOpenAiManualCode('')
    openAiManualPromptResolverRef.current?.(value)
    openAiManualPromptResolverRef.current = null
  }

  if (screen.state === 'anthropic') {
    return (
      <ConsoleOAuthFlow
        onDone={onDone}
        forceLoginMethod={screen.loginMethod}
      />
    )
  }

  if (screen.state === 'platform') {
    return (
      <Box flexDirection="column" gap={1} marginTop={1} paddingLeft={1}>
        <Text bold>Using 3rd-party platforms</Text>
        <Box flexDirection="column" gap={1}>
          <Text>
            CT supports Amazon Bedrock, Microsoft Foundry, and Vertex AI. Set
            the required environment variables, then restart CT.
          </Text>
          <Text>
            If you are part of an enterprise organization, contact your
            administrator for setup instructions.
          </Text>
          <Box flexDirection="column" marginTop={1}>
            <Text bold>Documentation:</Text>
            <Text>
              · Amazon Bedrock:{' '}
              <Link url="https://code.claude.com/docs/en/amazon-bedrock">
                https://code.claude.com/docs/en/amazon-bedrock
              </Link>
            </Text>
            <Text>
              · Microsoft Foundry:{' '}
              <Link url="https://code.claude.com/docs/en/microsoft-foundry">
                https://code.claude.com/docs/en/microsoft-foundry
              </Link>
            </Text>
            <Text>
              · Vertex AI:{' '}
              <Link url="https://code.claude.com/docs/en/google-vertex-ai">
                https://code.claude.com/docs/en/google-vertex-ai
              </Link>
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>
              Press <Text bold>Enter</Text> to go back to login options.
            </Text>
          </Box>
        </Box>
      </Box>
    )
  }

  if (screen.state === 'openai-options') {
    const hasCtStoredAuth = openAiReadiness.hasAnyProfile
    const hasCodexCliAuth = openAiReadiness.externalSources.includes('codex-cli')

    return (
      <Box flexDirection="column" gap={1} marginTop={1} paddingLeft={1}>
        <Text bold>OpenAI Codex OAuth</Text>
        <Text>Select how to continue:</Text>
        <Box>
          <Select
            options={[
              {
                label: (
                  <Text>
                    Use existing OpenAI/Codex auth · <Text dimColor>Detected in CT secure storage</Text>
                    {'\n'}
                  </Text>
                ),
                value: 'existing-profile',
                disabled: !hasCtStoredAuth,
              },
              {
                label: (
                  <Text>
                    Use existing Codex OAuth · <Text dimColor>Detected in ~/.codex/auth.json</Text>
                    {'\n'}
                  </Text>
                ),
                value: 'existing-codex-cli',
                disabled: !hasCodexCliAuth,
              },
              {
                label: (
                  <Text>
                    Sign in with ChatGPT now ·{' '}
                    <Text dimColor>Native SeaTurtle OAuth</Text>
                    {'\n'}
                  </Text>
                ),
                value: 'login',
              },
            ]}
            onChange={value => {
              if (value === 'existing-profile') {
                void (async () => {
                  try {
                    logEvent('tengu_openai_codex_existing_selected', {})
                    persistPreferredMainProvider('openai-codex')
                    onDone()
                  } catch (error) {
                    logError(error)
                    setScreen({
                      state: 'openai-error',
                      message: (error as Error).message,
                    })
                  }
                })()
                return
              }

              if (value === 'existing-codex-cli') {
                void (async () => {
                  try {
                    logEvent('tengu_openai_codex_cli_auth_selected', {})
                    const importResult = importExternalCodexCliAuthProfile()
                    if (!importResult.success) {
                      throw new Error(
                        importResult.warning ??
                          'CT found existing Codex CLI auth, but could not import it into native provider auth storage.',
                      )
                    }

                    persistPreferredMainProvider('openai-codex')
                    onDone()
                  } catch (error) {
                    logError(error)
                    setScreen({
                      state: 'openai-error',
                      message: (error as Error).message,
                    })
                  }
                })()
                return
              }

              logEvent('tengu_openai_codex_login_selected', {})
              setScreen({ state: 'openai-login' })
            }}
          />
        </Box>
        <Text dimColor>
          Press <Text bold>Enter</Text> to go back to login options.
        </Text>
      </Box>
    )
  }

  if (screen.state === 'openai-login') {
    return (
      <Box flexDirection="column" gap={1} marginTop={1} paddingLeft={1}>
        <Box>
          <Spinner />
          <Text>{openAiAuthMessage}</Text>
        </Box>
        {openAiAuthUrl ? (
          <Text dimColor>Visit: {openAiAuthUrl}</Text>
        ) : null}
        {openAiManualPrompt ? (
          <Box flexDirection="column" gap={1}>
            <Text>{openAiManualPrompt}</Text>
            <TextInput
              value={openAiManualCode}
              onChange={setOpenAiManualCode}
              onSubmit={submitOpenAiManualCode}
              placeholder="Paste the authorization code or full redirect URL"
            />
          </Box>
        ) : null}
        <Text dimColor>
          A browser should open. If the callback cannot complete here, paste
          the authorization code or full redirect URL when prompted.
        </Text>
      </Box>
    )
  }

  if (screen.state === 'openai-error') {
    return (
      <Box flexDirection="column" gap={1} marginTop={1} paddingLeft={1}>
        <Text color="error">OpenAI login error: {screen.message}</Text>
        <Text dimColor>
          Press <Text bold>Enter</Text> to go back to login options.
        </Text>
      </Box>
    )
  }

  return (
    <Box flexDirection="column" gap={1} marginTop={1} paddingLeft={1}>
      <Text bold>
        Sign in with your provider to use CT.
      </Text>
      <Text>
        CT supports Anthropic subscription access, billed API access,
        3rd-party Anthropic platforms, and OpenAI Codex OAuth.
      </Text>
      <Text>Select provider:</Text>
      <Box>
        <Select
          options={[
            {
              label: (
                <Text>
                  Subscription account ·{' '}
                  <Text dimColor>Pro, Max, Team, or Enterprise</Text>
                  {'\n'}
                </Text>
              ),
              value: 'claudeai',
            },
            {
              label: (
                <Text>
                  Anthropic Console account ·{' '}
                  <Text dimColor>API usage billing</Text>
                  {'\n'}
                </Text>
              ),
              value: 'console',
            },
            {
              label: (
                <Text>
                  3rd-party platform ·{' '}
                  <Text dimColor>
                    Amazon Bedrock, Microsoft Foundry, or Vertex AI
                  </Text>
                  {'\n'}
                </Text>
              ),
              value: 'platform',
            },
            {
              label: (
                <Text>
                  OpenAI Codex OAuth ·{' '}
                  <Text dimColor>
                    Native CT OAuth with Codex CLI fallback
                  </Text>
                  {'\n'}
                </Text>
              ),
              value: 'openai',
            },
          ]}
          onChange={value => {
            if (value === 'platform') {
              logEvent('tengu_oauth_platform_selected', {})
              setScreen({ state: 'platform' })
              return
            }

            if (value === 'openai') {
              logEvent('tengu_oauth_openai_selected', {})
              setScreen({ state: 'openai-options' })
              return
            }

            persistPreferredMainProvider('anthropic')
            setScreen({
              state: 'anthropic',
              loginMethod: value === 'claudeai' ? 'claudeai' : 'console',
            })
          }}
        />
      </Box>
    </Box>
  )
}
