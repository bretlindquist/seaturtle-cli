import type {
  SwordsOfChaosEventBatch,
  SwordsOfChaosMutationEvent,
} from '../types/events.js'
import type { SwordsOfChaosSaveFile } from '../types/save.js'
import { SWORDS_OF_CHAOS_THREAD_CANONIZATION_THRESHOLD } from '../config/coreRules.js'

function appendUnique(list: string[], value: string): string[] {
  if (list.includes(value)) {
    return list
  }
  return [...list, value]
}

function applyEncounterMemoryRecord(
  save: SwordsOfChaosSaveFile,
  event: Extract<SwordsOfChaosMutationEvent, { kind: 'encounter_memory_record' }>,
): SwordsOfChaosSaveFile {
  const current = save.encounterMemory[event.encounter] ?? {
    visits: 0,
    seenOpeners: [],
    seenRoutes: [],
    lastRoute: null,
  }

  return {
    ...save,
    encounterMemory: {
      ...save.encounterMemory,
      [event.encounter]: {
        visits: current.visits + 1,
        seenOpeners: appendUnique(current.seenOpeners, event.opener),
        seenRoutes: event.route
          ? appendUnique(current.seenRoutes, event.route)
          : current.seenRoutes,
        lastRoute: event.route ?? current.lastRoute,
      },
    },
  }
}

function applyThreadMemoryRecord(
  save: SwordsOfChaosSaveFile,
  event: Extract<SwordsOfChaosMutationEvent, { kind: 'thread_memory_record' }>,
): SwordsOfChaosSaveFile {
  const current = save.threadMemory[event.thread] ?? {
    sightings: 0,
    canonized: false,
    lastSeenAt: null,
  }
  const sightings = current.sightings + 1

  return {
    ...save,
    threadMemory: {
      ...save.threadMemory,
      [event.thread]: {
        sightings,
        canonized:
          current.canonized ||
          sightings >= SWORDS_OF_CHAOS_THREAD_CANONIZATION_THRESHOLD,
        lastSeenAt: event.seenAt,
      },
    },
  }
}

function applySeaTurtleGlimpseRecord(
  save: SwordsOfChaosSaveFile,
  event: Extract<SwordsOfChaosMutationEvent, { kind: 'seaturtle_glimpse_record' }>,
): SwordsOfChaosSaveFile {
  return {
    ...save,
    seaturtle: {
      ...save.seaturtle,
      bond: save.seaturtle.bond + 1,
      appearances: save.seaturtle.appearances + 1,
      lastAppearanceAt: event.seenAt,
    },
  }
}

function applySeaTurtleFavorRecord(
  save: SwordsOfChaosSaveFile,
): SwordsOfChaosSaveFile {
  return {
    ...save,
    seaturtle: {
      ...save.seaturtle,
      favor: save.seaturtle.favor + 1,
    },
  }
}

function applyStoryStateUpdate(
  save: SwordsOfChaosSaveFile,
  event: Extract<SwordsOfChaosMutationEvent, { kind: 'story_state_update' }>,
): SwordsOfChaosSaveFile {
  return {
    ...save,
    story: {
      activeLocus: event.activeLocus as SwordsOfChaosSaveFile['story']['activeLocus'],
      activeThread: event.activeThread,
      chapter: event.chapter,
      chapterTitle: event.chapterTitle,
      tension: event.tension,
      currentObjective: event.currentObjective,
      carryForward: event.carryForward,
      continuation: event.continuation,
      sceneState: event.sceneState,
      lastOutcomeKey: event.lastOutcomeKey,
      lastAdvancedAt: event.advancedAt,
    },
  }
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
    case 'thread_memory_record':
      return applyThreadMemoryRecord(save, event)
    case 'seaturtle_glimpse_record':
      return applySeaTurtleGlimpseRecord(save, event)
    case 'seaturtle_favor_record':
      return applySeaTurtleFavorRecord(save)
    case 'callback_marker_add':
      return {
        ...save,
        callbackMarkers: appendUnique(save.callbackMarkers, event.marker),
      }
    case 'character_development_update':
      return {
        ...save,
        characterDevelopment: event.development,
        progression: {
          ...save.progression,
          milestones: appendUnique(save.progression.milestones, event.milestone),
          xp: save.progression.xp + event.xpDelta,
        },
      }
    case 'magic_state_update':
      return {
        ...save,
        magic: event.magic,
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
    case 'encounter_memory_record':
      return applyEncounterMemoryRecord(save, event)
    case 'story_state_update':
      return applyStoryStateUpdate(save, event)
  }
}

export function applySwordsOfChaosEventBatch(
  save: SwordsOfChaosSaveFile,
  batch: SwordsOfChaosEventBatch,
): SwordsOfChaosSaveFile {
  return batch.events.reduce(applyMutationEvent, save)
}
