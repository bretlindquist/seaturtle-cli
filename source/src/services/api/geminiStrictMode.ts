import type { GlobalConfig } from '../../utils/config.js'
import { getGlobalConfig } from '../../utils/config.js'
import {
  DEFAULT_GEMINI_BEHAVIOR_MODE,
  normalizeGeminiBehaviorMode,
  type GeminiBehaviorMode,
} from '../../utils/geminiBehaviorMode.js'
import {
  getPreferredMainRuntimeProvider,
  type MainRuntimeProvider,
} from '../../utils/model/providers.js'

export const GEMINI_STRICT_SYSTEM_PROMPT = `Gemini strict mode is active.

Treat quality as a hard requirement, not a nice-to-have. When work touches UI or UX, do not ship the first crude pass. Make the interface intentional, coherent, and responsive, with real attention to spacing, hierarchy, states, and accessibility.

Prefer narrow, verifiable edits. Do not broaden scope, rewrite unrelated code, or declare victory on placeholder implementations.

Do not attempt broad in-place source rewrites, directory-wide git restores, destructive cleanup commands, or other “fix everything at once” shell mutations.

Do not bypass validation, weaken tests, remove warnings, or hide uncertainty to appear complete. If the requirements are ambiguous enough to create likely rework, say so and resolve the ambiguity instead of inventing product direction.

When the user gives a fresh explicit request, treat that newest real user turn as the active objective. Do not keep pursuing an older hidden repair or scaffolding objective unless the newest user turn explicitly asks you to continue it.

Assume a strict reviewer will inspect every meaningful code change immediately after you finish.`

export function getGeminiBehaviorModeFromConfig(
  config: Pick<GlobalConfig, 'geminiBehaviorMode'> | null | undefined,
): GeminiBehaviorMode {
  return normalizeGeminiBehaviorMode(config?.geminiBehaviorMode)
}

export function getConfiguredGeminiBehaviorMode(): GeminiBehaviorMode {
  try {
    return getGeminiBehaviorModeFromConfig(getGlobalConfig())
  } catch {
    return DEFAULT_GEMINI_BEHAVIOR_MODE
  }
}

export function shouldApplyGeminiStrictMode({
  provider = getPreferredMainRuntimeProvider(),
  mode = getConfiguredGeminiBehaviorMode(),
}: {
  provider?: MainRuntimeProvider | null
  mode?: GeminiBehaviorMode
} = {}): boolean {
  return provider === 'gemini' && mode === 'strict'
}

export function buildGeminiStrictAppendSystemPrompt(
  appendSystemPrompt: string | undefined,
  {
    provider = getPreferredMainRuntimeProvider(),
    mode = getConfiguredGeminiBehaviorMode(),
  }: {
    provider?: MainRuntimeProvider | null
    mode?: GeminiBehaviorMode
  } = {},
): string | undefined {
  if (!shouldApplyGeminiStrictMode({ provider, mode })) {
    return appendSystemPrompt
  }

  if (appendSystemPrompt?.includes(GEMINI_STRICT_SYSTEM_PROMPT)) {
    return appendSystemPrompt
  }

  return appendSystemPrompt
    ? `${appendSystemPrompt}\n\n${GEMINI_STRICT_SYSTEM_PROMPT}`
    : GEMINI_STRICT_SYSTEM_PROMPT
}
