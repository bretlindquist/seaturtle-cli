import { getFeatureValue_CACHED_MAY_BE_STALE } from '../services/analytics/growthbook.js'
import { getMainLoopProviderRuntime } from '../services/api/providerRuntime.js'
import { isEnvTruthy } from './envUtils.js'
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
  // Ant: always on
  if (isAntRuntimeEnabled()) {
    return true
  }

  // OpenAI/Codex: expose SeaTurtle's local teammate runtime whenever the
  // active provider runtime is OpenAI and auth is ready. The local swarm/team
  // machinery is provider-owned by CT, not an Anthropic-only entitlement.
  const runtime = getMainLoopProviderRuntime()
  if (runtime.family === 'openai') {
    return runtime.executionEnabled && runtime.supportsAgentTeams
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
