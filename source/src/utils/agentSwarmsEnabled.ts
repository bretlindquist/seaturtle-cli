import { getFeatureValue_CACHED_MAY_BE_STALE } from '../services/analytics/growthbook.js'
import { isBareMode, isEnvTruthy } from './envUtils.js'
import {
  shouldUseGeminiProvider,
  shouldUseOpenAiCodexProvider,
} from './model/providers.js'
import { isAntRuntimeEnabled } from './runtimeUserType.js'

/**
 * Check if --agent-teams flag is provided via CLI.
 * Checks process.argv directly to avoid import cycles with bootstrap/state.
 * Note: The flag is only shown in help for ant users, but if external users
 * pass it anyway, it will work (subject to the killswitch).
 */
function isAgentTeamsFlagSet(): boolean {
  return process.argv.includes('--agent-teams')
}

/**
 * Centralized runtime check for agent teams/teammate features.
 * This is the single gate that should be checked everywhere teammates
 * are referenced (prompts, code, tools isEnabled, UI, etc.).
 *
 * Ant builds: always enabled.
 * External builds require both:
 * 1. Opt-in via CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS env var OR --agent-teams flag
 * 2. GrowthBook gate 'tengu_amber_flint' enabled (killswitch)
 */
export function isAgentSwarmsEnabled(): boolean {
  // --bare is explicitly hermetic: no teammate runtime and no provider-auth
  // or secure-storage probing during startup capability discovery.
  if (isBareMode()) {
    return false
  }

  // Ant: always on
  if (isAntRuntimeEnabled()) {
    return true
  }

  // Provider runtimes: selecting OpenAI/Codex or Gemini should expose CT's
  // local teammate runtime without touching auth storage on startup. Auth
  // readiness is enforced when the provider runtime actually executes work.
  if (shouldUseOpenAiCodexProvider() || shouldUseGeminiProvider()) {
    return true
  }

  // External: require opt-in via env var or --agent-teams flag
  if (
    !isEnvTruthy(process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS) &&
    !isAgentTeamsFlagSet()
  ) {
    return false
  }

  // Killswitch — always respected for external users
  if (!getFeatureValue_CACHED_MAY_BE_STALE('tengu_amber_flint', true)) {
    return false
  }

  return true
}
