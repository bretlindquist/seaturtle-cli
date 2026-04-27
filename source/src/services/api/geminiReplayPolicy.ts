export type GeminiReplayPolicy = {
  dropTranscriptOnlyUserMessages: boolean
  dropStaleMetaUserMessages: boolean
  applyAssistantFirstBootstrap: boolean
  mergeConsecutiveAssistantTurns: boolean
  repairToolResultOrdering: boolean
  dropOrphanToolResultMessages: boolean
}

export const DEFAULT_GEMINI_REPLAY_POLICY: GeminiReplayPolicy = {
  dropTranscriptOnlyUserMessages: true,
  dropStaleMetaUserMessages: true,
  applyAssistantFirstBootstrap: true,
  mergeConsecutiveAssistantTurns: true,
  repairToolResultOrdering: true,
  dropOrphanToolResultMessages: true,
}
