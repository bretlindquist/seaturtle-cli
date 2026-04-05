import React, { useEffect, useMemo, useState } from 'react'
import { execa } from 'execa'
import { logEvent } from 'src/services/analytics/index.js'
import { getOpenAiCodexAuthReadiness } from '../services/authProfiles/store.js'
import { Box, Link, Text } from '../ink.js'
import { useKeybinding } from '../keybindings/useKeybinding.js'
import { saveGlobalConfig } from '../utils/config.js'
import { logError } from '../utils/log.js'
import { Select } from './CustomSelect/select.js'
import { ConsoleOAuthFlow } from './ConsoleOAuthFlow.js'
import { Spinner } from './Spinner.js'

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
  const openAiReadiness = useMemo(() => getOpenAiCodexAuthReadiness(), [screen])

  useKeybinding(
    'confirm:yes',
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

    void (async () => {
      try {
        logEvent('tengu_openai_codex_login_start', {})
        await execa('codex', ['login'], {
          stdio: 'inherit',
        })

        const readiness = getOpenAiCodexAuthReadiness()
        if (!readiness.ready) {
          throw new Error(
            'Codex login completed, but no usable OpenAI/Codex auth was detected in ~/.codex/auth.json.',
          )
        }

        if (cancelled) {
          return
        }

        persistPreferredMainProvider('openai-codex')
        logEvent('tengu_openai_codex_login_success', {
          source: readiness.externalSources.includes('codex-cli')
            ? 'codex-cli'
            : 'provider-auth-profile',
        })
        onDone()
      } catch (error) {
        logError(error)
        if (cancelled) {
          return
        }
        const message = (error as Error).message
        const missingCodex =
          message.includes('command not found') ||
          message.includes('ENOENT') ||
          message.includes('spawn codex')
        setScreen({
          state: 'openai-error',
          message: missingCodex
            ? '`codex` is not installed or not on PATH. Install the OpenAI Codex CLI first, then retry.'
            : message,
        })
      }
    })()

    return () => {
      cancelled = true
    }
  }, [onDone, screen])

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
            Claude Code supports Amazon Bedrock, Microsoft Foundry, and Vertex
            AI. Set the required environment variables, then restart Claude
            Code.
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
                    Use existing Codex auth ·{' '}
                    <Text dimColor>
                      {openAiReadiness.ready
                        ? 'Detected in ~/.codex/auth.json'
                        : 'Not currently detected'}
                    </Text>
                    {'\n'}
                  </Text>
                ),
                value: 'existing',
                disabled: !openAiReadiness.ready,
              },
              {
                label: (
                  <Text>
                    Sign in with Codex now ·{' '}
                    <Text dimColor>Runs `codex login`</Text>
                    {'\n'}
                  </Text>
                ),
                value: 'login',
              },
            ]}
            onChange={value => {
              if (value === 'existing') {
                logEvent('tengu_openai_codex_existing_selected', {})
                persistPreferredMainProvider('openai-codex')
                onDone()
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
          <Text>Starting OpenAI login through Codex…</Text>
        </Box>
        <Text dimColor>
          A browser may open. If you are on a headless machine, cancel and run
          `codex login --device-auth`, then come back and choose “Use existing
          Codex auth”.
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
        CT can be used with your Claude subscription, billed API access,
        3rd-party Anthropic platforms, or OpenAI Codex OAuth.
      </Text>
      <Text>Select login method:</Text>
      <Box>
        <Select
          options={[
            {
              label: (
                <Text>
                  Claude account with subscription ·{' '}
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
                    Use existing auth or run codex login
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
