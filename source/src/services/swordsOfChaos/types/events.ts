export type SwordsOfChaosHistoryEventRecord = {
  at: number
  kind:
    | 'save_initialized'
    | 'host_echo_applied'
    | 'game_opened'
    | 'character_created'
    | 'session_zero_completed'
    | 'outcome_recorded'
    | 'retreated'
    | 'seaturtle_glimpsed'
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
      kind: 'thread_memory_record'
      thread: string
      seenAt: number
    }
  | {
      kind: 'seaturtle_glimpse_record'
      seenAt: number
    }
  | {
      kind: 'seaturtle_favor_record'
      favorAt: number
    }
  | {
      kind: 'callback_marker_add'
      marker: string
    }
  | {
      kind: 'encounter_memory_record'
      encounter: string
      opener: string
      route?: string
    }

export type SwordsOfChaosEventBatch = {
  at: number
  events: SwordsOfChaosMutationEvent[]
}
