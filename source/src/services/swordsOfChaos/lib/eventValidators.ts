import type {
  SwordsOfChaosEventBatch,
  SwordsOfChaosMutationEvent,
} from '../types/events.js'

function validateMutationEvent(event: SwordsOfChaosMutationEvent): void {
  switch (event.kind) {
    case 'inventory_add':
      if (!event.item.trim()) {
        throw new Error('Invalid inventory_add event')
      }
      return
    case 'title_add':
      if (!event.title.trim()) {
        throw new Error('Invalid title_add event')
      }
      return
    case 'world_flag_add':
      if (!event.flag.trim()) {
        throw new Error('Invalid world_flag_add event')
      }
      return
    case 'run_history_update':
      if (!['played', 'win', 'loss'].includes(event.gameResult)) {
        throw new Error('Invalid run_history_update result')
      }
      return
    case 'thread_candidate_add':
      if (!event.thread.trim()) {
        throw new Error('Invalid thread_candidate_add event')
      }
      return
    case 'callback_marker_add':
      if (!event.marker.trim()) {
        throw new Error('Invalid callback_marker_add event')
      }
      return
    case 'encounter_memory_record':
      if (!event.encounter.trim() || !event.opener.trim()) {
        throw new Error('Invalid encounter_memory_record event')
      }
      return
  }
}

export function validateSwordsOfChaosEventBatch(
  batch: SwordsOfChaosEventBatch,
): SwordsOfChaosEventBatch {
  if (!Array.isArray(batch.events) || batch.events.length === 0) {
    throw new Error('Swords of Chaos event batch must contain at least one event')
  }

  for (const event of batch.events) {
    validateMutationEvent(event)
  }

  return batch
}
