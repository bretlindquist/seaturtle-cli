export const GEMINI_BEHAVIOR_MODES = ['off', 'strict'] as const

export type GeminiBehaviorMode = (typeof GEMINI_BEHAVIOR_MODES)[number]

export const DEFAULT_GEMINI_BEHAVIOR_MODE: GeminiBehaviorMode = 'off'

export function normalizeGeminiBehaviorMode(
  value: unknown,
): GeminiBehaviorMode {
  return value === 'strict' ? 'strict' : DEFAULT_GEMINI_BEHAVIOR_MODE
}
