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
    case 'thread_memory_record':
      if (!event.thread.trim() || typeof event.seenAt !== 'number') {
        throw new Error('Invalid thread_memory_record event')
      }
      return
    case 'seaturtle_glimpse_record':
      if (typeof event.seenAt !== 'number') {
        throw new Error('Invalid seaturtle_glimpse_record event')
      }
      return
    case 'seaturtle_favor_record':
      if (typeof event.favorAt !== 'number') {
        throw new Error('Invalid seaturtle_favor_record event')
      }
      return
    case 'callback_marker_add':
      if (!event.marker.trim()) {
        throw new Error('Invalid callback_marker_add event')
      }
      return
    case 'character_development_update':
      if (
        ![
          'edge',
          'composure',
          'nerve',
          'witness',
          'threshold',
          'myth',
        ].includes(event.development.focus) ||
        !event.development.title.trim() ||
        !event.development.lesson.trim() ||
        !event.development.pressure.trim() ||
        typeof event.development.stage !== 'number' ||
        typeof event.development.lastUpdatedAt !== 'number' ||
        !event.milestone.trim() ||
        typeof event.xpDelta !== 'number'
      ) {
        throw new Error('Invalid character_development_update event')
      }
      return
    case 'magic_state_update':
      if (
        typeof event.magic.rarityBudget !== 'number' ||
        typeof event.magic.omensSeen !== 'number' ||
        typeof event.magic.crossingsOpened !== 'number' ||
        !['none', 'omen', 'crossing', 'witness', 'relic-sign'].includes(
          event.magic.activeImpossible,
        ) ||
        (event.magic.lastOmen !== null && !event.magic.lastOmen.trim()) ||
        (event.magic.lastManifestationAt !== null &&
          typeof event.magic.lastManifestationAt !== 'number')
      ) {
        throw new Error('Invalid magic_state_update event')
      }
      return
    case 'encounter_memory_record':
      if (!event.encounter.trim() || !event.opener.trim()) {
        throw new Error('Invalid encounter_memory_record event')
      }
      return
    case 'story_state_update':
      if (
        !event.activeLocus.trim() ||
        !event.activeThread.trim() ||
        typeof event.chapter !== 'number' ||
        !event.chapterTitle.trim() ||
        !['low', 'rising', 'high'].includes(event.tension) ||
        !event.currentObjective.trim() ||
        !event.carryForward.trim() ||
        !event.continuation.summary.trim() ||
        !event.continuation.nextPressure.trim() ||
        !event.sceneState.commitment.trim() ||
        !event.sceneState.hazard.trim() ||
        !event.sceneState.pendingReveal.trim() ||
        ![
          'watcher-pressure',
          'wrong-name-echo',
          'oath-binding',
          'threshold-strain',
          'relic-resonance',
          'unquiet-aftermath',
        ].includes(event.continuation.kind) ||
        !['linger', 'press', 'reveal'].includes(event.continuation.pacing) ||
        ![
          'watched-approach',
          'threshold-contest',
          'name-pressure',
          'relic-nearness',
          'oath-test',
          'unquiet-scene',
        ].includes(event.sceneState.kind) ||
        !['live', 'complicating', 'revealing', 'paying-off'].includes(
          event.sceneState.status,
        ) ||
        typeof event.sceneState.beatsElapsed !== 'number' ||
        !['relic', 'title', 'oath', 'truth', 'refusal'].includes(
          event.lastOutcomeKey,
        ) ||
        typeof event.advancedAt !== 'number'
      ) {
        throw new Error('Invalid story_state_update event')
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
