import React, { useEffect, useMemo, useRef, useState } from 'react'
import { logEvent } from 'src/services/analytics/index.js'
import { PRODUCT_GEMINI_API_KEY_URL } from '../constants/product.js'
import { validateGeminiModel } from '../services/api/gemini.js'
import { validateOpenAiCodexModel } from '../services/api/openaiCodex.js'
import {
  getGeminiAuthReadiness,
  getOpenAiCodexAuthReadiness,
} from '../services/authProfiles/store.js'
import {
  saveGeminiApiKeyProfile,
} from '../services/authProfiles/geminiAuth.js'
import {
  importExternalCodexCliAuthProfile,
  loginWithOpenAiCodexOAuth,
} from '../services/authProfiles/openaiCodexOAuth.js'
import { useMainLoopModel } from '../hooks/useMainLoopModel.js'
import { Box, Link, Text } from '../ink.js'
import { useKeybinding } from '../keybindings/useKeybinding.js'
import { useSetAppState } from '../state/AppState.js'
import { saveGlobalConfig } from '../utils/config.js'
import { logError } from '../utils/log.js'
import { getDefaultMainLoopModel } from '../utils/model/model.js'
import { openBrowser } from '../utils/browser.js'
import { ModelPicker } from './ModelPicker.js'
import { Select } from './CustomSelect/select.js'
import { ConsoleOAuthFlow } from './ConsoleOAuthFlow.js'
import { Spinner } from './Spinner.js'
import TextInput from './TextInput.js'

type Props = {
  onDone(): void
}

type ProviderChoice = 'anthropic' | 'openai-codex' | 'gemini'

type Screen =
  | { state: 'choose' }
  | { state: 'platform' }
  | { state: 'choose-model'; provider: ProviderChoice }
  | { state: 'gemini-options' }
  | { state: 'gemini-api-key' }
  | { state: 'gemini-error'; message: string }
  | { state: 'openai-options' }
  | { state: 'openai-login' }
  | { state: 'openai-error'; message: string }
  | { state: 'anthropic'; loginMethod: 'claudeai' | 'console' }

function persistPreferredMainProvider(
  provider: ProviderChoice,
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
  process.env.SEATURTLE_MAIN_PROVIDER = provider
}

function isModelCompatibleWithProvider(
  provider: ProviderChoice,
  model: string,
): boolean {
  if (provider === 'gemini') {
    return validateGeminiModel(model) === null
  }

  if (provider === 'openai-codex') {
    return validateOpenAiCodexModel(model) === null
  }

  const lower = model.toLowerCase()
  return !lower.startsWith('gpt-') && !lower.startsWith('gemini-')
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
  const [geminiApiKey, setGeminiApiKey] = useState('')
  const [geminiCursorOffset, setGeminiCursorOffset] = useState(0)
  const currentMainLoopModel = useMainLoopModel()
  const setAppState = useSetAppState()
  const openAiReadiness = useMemo(() => getOpenAiCodexAuthReadiness(), [screen])
  const geminiReadiness = useMemo(() => getGeminiAuthReadiness(), [screen])
  const hasGeminiEnvKey = !!process.env.GEMINI_API_KEY?.trim()

  useKeybinding(
    'confirm:no',
    () => {
      setScreen({ state: 'choose' })
    },
    {
      context: 'Confirmation',
      isActive:
        screen.state === 'platform' ||
        screen.state === 'choose-model' ||
        screen.state === 'gemini-options' ||
        screen.state === 'gemini-api-key' ||
        screen.state === 'gemini-error' ||
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
        setScreen({ state: 'choose-model', provider: 'openai-codex' })
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

  function submitGeminiApiKey(): void {
    const saveResult = saveGeminiApiKeyProfile({
      apiKey: geminiApiKey,
    })

    if (!saveResult.success) {
      setScreen({
        state: 'gemini-error',
        message:
          saveResult.warning ??
          'CT could not save the Gemini API key in secure storage.',
      })
      return
    }

    setGeminiApiKey('')
    setGeminiCursorOffset(0)
    persistPreferredMainProvider('gemini')
    logEvent('tengu_gemini_api_key_saved', {
      source: 'provider-api-key-profile',
    })
    setScreen({ state: 'choose-model', provider: 'gemini' })
  }

  function advanceToModelSelection(provider: ProviderChoice): void {
    persistPreferredMainProvider(provider)
    setScreen({ state: 'choose-model', provider })
  }

  function handleModelSelected(
    provider: ProviderChoice,
    model: string | null,
  ): void {
    const resolvedModel =
      model ??
      (currentMainLoopModel &&
      isModelCompatibleWithProvider(provider, currentMainLoopModel)
        ? currentMainLoopModel
        : getDefaultMainLoopModel())

    setAppState(prev => ({
      ...prev,
      mainLoopModel: resolvedModel,
      mainLoopModelForSession: null,
    }))
    onDone()
  }

  if (screen.state === 'anthropic') {
    return (
      <ConsoleOAuthFlow
        onDone={() => setScreen({ state: 'choose-model', provider: 'anthropic' })}
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

  if (screen.state === 'choose-model') {
    const initialModel =
      currentMainLoopModel &&
      isModelCompatibleWithProvider(screen.provider, currentMainLoopModel)
        ? currentMainLoopModel
        : getDefaultMainLoopModel()

    return (
      <Box flexDirection="column" gap={1} marginTop={1} paddingLeft={1}>
        <Text bold>Choose model</Text>
        <Text dimColor>
          Pick the model CT should use with{' '}
          {screen.provider === 'anthropic'
            ? 'Anthropic'
            : screen.provider === 'gemini'
              ? 'Gemini'
              : 'OpenAI/Codex'}
          . This avoids carrying an incompatible model over from another
          provider.
        </Text>
        <ModelPicker
          initial={initialModel}
          onSelect={model => handleModelSelected(screen.provider, model)}
          onCancel={() => setScreen({ state: 'choose' })}
          isStandaloneCommand={true}
        />
      </Box>
    )
  }

  if (screen.state === 'gemini-options') {
    const hasCtStoredAuth = geminiReadiness.hasAnyProfile

    return (
      <Box flexDirection="column" gap={1} marginTop={1} paddingLeft={1}>
        <Text bold>Gemini API key</Text>
        <Text dimColor>
          New to Gemini keys? Open Google AI Studio:{' '}
          <Link url={PRODUCT_GEMINI_API_KEY_URL}>
            {PRODUCT_GEMINI_API_KEY_URL}
          </Link>
        </Text>
        <Text dimColor>1. Sign in to Google AI Studio.</Text>
        <Text dimColor>2. Create or copy a Gemini API key.</Text>
        <Text dimColor>3. Come back here and save it in CT.</Text>
        <Text>Select how to continue:</Text>
        <Box>
          <Select
            options={[
              {
                label: (
                  <Text>
                    Use existing Gemini auth ·{' '}
                    <Text dimColor>Detected in CT secure storage</Text>
                    {'\n'}
                  </Text>
                ),
                value: 'existing-profile',
                disabled: !hasCtStoredAuth,
              },
              {
                label: (
                  <Text>
                    Use existing Gemini env key ·{' '}
                    <Text dimColor>Detected in GEMINI_API_KEY</Text>
                    {'\n'}
                  </Text>
                ),
                value: 'existing-env',
                disabled: !hasGeminiEnvKey,
              },
              {
                label: (
                  <Text>
                    Enter Gemini API key now ·{' '}
                    <Text dimColor>Save in CT secure storage</Text>
                    {'\n'}
                  </Text>
                ),
                value: 'enter-api-key',
              },
            ]}
            onChange={value => {
              if (value === 'existing-profile') {
                logEvent('tengu_gemini_existing_profile_selected', {})
                advanceToModelSelection('gemini')
                return
              }

              if (value === 'existing-env') {
                logEvent('tengu_gemini_env_auth_selected', {})
                advanceToModelSelection('gemini')
                return
              }

              logEvent('tengu_gemini_api_key_entry_selected', {})
              setGeminiApiKey('')
              setGeminiCursorOffset(0)
              setScreen({ state: 'gemini-api-key' })
            }}
          />
        </Box>
        <Text dimColor>
          Press <Text bold>Enter</Text> to go back to login options.
        </Text>
      </Box>
    )
  }

  if (screen.state === 'gemini-api-key') {
    return (
      <Box flexDirection="column" gap={1} marginTop={1} paddingLeft={1}>
        <Text bold>Enter Gemini API key</Text>
        <Text dimColor>
          CT will save this key in secure storage and set Gemini as the
          preferred main provider.
        </Text>
        <Text dimColor>
          Need a key? Open Google AI Studio:{' '}
          <Link url={PRODUCT_GEMINI_API_KEY_URL}>
            {PRODUCT_GEMINI_API_KEY_URL}
          </Link>
        </Text>
        <Text dimColor>1. Sign in to Google AI Studio.</Text>
        <Text dimColor>2. Create or copy a Gemini API key.</Text>
        <Text dimColor>3. Paste it here and press Enter.</Text>
        <TextInput
          value={geminiApiKey}
          onChange={value => {
            setGeminiApiKey(value)
            setGeminiCursorOffset(value.length)
          }}
          onSubmit={submitGeminiApiKey}
          placeholder="Paste Gemini API key"
          mask="*"
          cursorOffset={geminiCursorOffset}
          onChangeCursorOffset={setGeminiCursorOffset}
        />
        <Text dimColor>
          Press <Text bold>Enter</Text> to save, or <Text bold>Esc</Text> to go
          back.
        </Text>
      </Box>
    )
  }

  if (screen.state === 'gemini-error') {
    return (
      <Box flexDirection="column" gap={1} marginTop={1} paddingLeft={1}>
        <Text color="error">Gemini setup error: {screen.message}</Text>
        <Text dimColor>
          Press <Text bold>Enter</Text> to go back to login options.
        </Text>
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
                    advanceToModelSelection('openai-codex')
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

                    advanceToModelSelection('openai-codex')
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
        CT supports Anthropic subscription access, Anthropic Console API usage
        billing, 3rd-party Anthropic platforms, Gemini API-key setup, and
        OpenAI Codex OAuth.
      </Text>
      <Text>Select provider:</Text>
      <Box>
        <Select
          options={[
            {
              label: (
                <Text>
                  Anthropic subscription account ·{' '}
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
                  Gemini API key ·{' '}
                  <Text dimColor>
                    Direct Gemini runtime with CT-managed secure storage
                  </Text>
                  {'\n'}
                </Text>
              ),
              value: 'gemini',
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

            if (value === 'gemini') {
              logEvent('tengu_gemini_selected', {})
              setScreen({ state: 'gemini-options' })
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
