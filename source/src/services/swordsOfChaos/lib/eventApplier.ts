import type {
  SwordsOfChaosEventBatch,
  SwordsOfChaosMutationEvent,
} from '../types/events.js'
import type { SwordsOfChaosSaveFile } from '../types/save.js'

function appendUnique(list: string[], value: string): string[] {
  if (list.includes(value)) {
    return list
  }
  return [...list, value]
}

function applyMutationEvent(
  save: SwordsOfChaosSaveFile,
  event: SwordsOfChaosMutationEvent,
): SwordsOfChaosSaveFile {
  switch (event.kind) {
    case 'inventory_add':
      return {
        ...save,
        inventory: appendUnique(save.inventory, event.item),
      }
    case 'title_add':
      return {
        ...save,
        progression: {
          ...save.progression,
          titles: appendUnique(save.progression.titles, event.title),
        },
      }
    case 'world_flag_add':
      return {
        ...save,
        worldFlags: appendUnique(save.worldFlags, event.flag),
      }
    case 'thread_candidate_add':
      return {
        ...save,
        threadCandidates: appendUnique(save.threadCandidates, event.thread),
      }
    case 'callback_marker_add':
      return {
        ...save,
        callbackMarkers: appendUnique(save.callbackMarkers, event.marker),
      }
    case 'run_history_update':
      return {
        ...save,
        runHistorySummary: {
          runsStarted: save.runHistorySummary.runsStarted + 1,
          runsFinished:
            save.runHistorySummary.runsFinished +
            (event.gameResult === 'loss' ? 1 : 0),
          lastPlayedAt: event.playedAt,
        },
      }
  }
}

export function applySwordsOfChaosEventBatch(
  save: SwordsOfChaosSaveFile,
  batch: SwordsOfChaosEventBatch,
): SwordsOfChaosSaveFile {
  return batch.events.reduce(applyMutationEvent, save)
}
