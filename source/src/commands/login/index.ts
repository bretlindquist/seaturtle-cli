import type { Command } from '../../commands.js'
import { hasAnthropicApiKeyAuth } from '../../utils/auth.js'
import { isEnvTruthy } from '../../utils/envUtils.js'
import { shouldUseOpenAiCodexProvider } from '../../utils/model/providers.js'

export default () =>
  ({
    type: 'local-jsx',
    name: 'login',
    description: shouldUseOpenAiCodexProvider()
      ? 'Sign in with OpenAI Codex OAuth'
      : hasAnthropicApiKeyAuth()
        ? 'Switch provider account'
        : 'Sign in to Anthropic or OpenAI Codex OAuth',
    isEnabled: () => !isEnvTruthy(process.env.DISABLE_LOGIN_COMMAND),
    load: () => import('./login.js'),
  }) satisfies Command
