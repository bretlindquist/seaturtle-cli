export type SwordsOfChaosHistoryEventRecord = {
  at: number
  kind:
    | 'save_initialized'
    | 'host_echo_applied'
    | 'game_opened'
    | 'outcome_recorded'
    | 'retreated'
  detail: Record<string, unknown>
}

export type SwordsOfChaosMutationEvent =
  | {
      kind: 'inventory_add'
      item: string
    }
  | {
      kind: 'title_add'
      title: string
    }
  | {
      kind: 'world_flag_add'
      flag: string
    }
  | {
      kind: 'run_history_update'
      gameResult: 'played' | 'win' | 'loss'
      playedAt: number
    }
  | {
      kind: 'thread_candidate_add'
      thread: string
    }
  | {
      kind: 'callback_marker_add'
      marker: string
    }

export type SwordsOfChaosEventBatch = {
  at: number
  events: SwordsOfChaosMutationEvent[]
}
