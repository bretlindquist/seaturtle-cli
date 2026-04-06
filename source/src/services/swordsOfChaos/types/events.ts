export type SwordsOfChaosEventRecord = {
  at: number
  kind:
    | 'save_initialized'
    | 'host_echo_applied'
    | 'game_opened'
    | 'outcome_recorded'
  detail: Record<string, unknown>
}
