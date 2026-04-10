import type { SwordsOfChaosDerivedMemory } from '../types/memory.js'
import type { SwordsOfChaosSaveFile } from '../types/save.js'
import {
  getSwordsEncounterMemoryKey,
  getSwordsEncounterLocusFromMemoryKey,
  getSwordsEncounterPlaceName,
  getSwordsRecurringSymbol,
  getSwordsThreadTitle,
  isSwordsEncounterMemoryKey,
  type SwordsOfChaosEncounterLocus,
} from './worldMap.js'

function hashString(input: string): number {
  let hash = 0
  for (const char of input) {
    hash = (hash * 33 + char.charCodeAt(0)) >>> 0
  }
  return hash
}

function getProceduralOpeningEncounterShift(
  save: SwordsOfChaosSaveFile,
): SwordsOfChaosEncounterLocus {
  const seed = [
    save.character.name ?? 'nameless',
    save.character.creationMode ?? 'unknown-mode',
    save.character.className ?? 'wanderer',
    save.character.origin ?? 'unknown-origin',
    save.character.omen ?? 'no-omen',
    save.sessionZero.originPlace ?? 'no-origin-place',
    save.sessionZero.firstContact ?? 'no-first-contact',
  ].join(':')
  const roll = hashString(seed) % 10

  switch (roll) {
    case 0:
    case 1:
    case 2:
    case 3:
      return 'alley'
    case 4:
      return 'old-tree'
    case 5:
      return 'ocean-ship'
    case 6:
      return 'space-station'
    case 7:
      return 'fae-realm'
    case 8:
      return 'dark-dungeon'
    default:
      return save.sessionZero.firstContact === 'measured-wink'
        ? 'mars-outpost'
        : 'post-apocalyptic-ruin'
  }
}

function getPersistedEncounterShift(
  save: SwordsOfChaosSaveFile,
): SwordsOfChaosEncounterLocus | null {
  const ranked = Object.entries(save.encounterMemory)
    .map(([key, memory]) => ({
      locus: getSwordsEncounterLocusFromMemoryKey(key),
      visits: memory.visits,
    }))
    .filter(
      (
        entry,
      ): entry is { locus: SwordsOfChaosEncounterLocus; visits: number } =>
        entry.locus !== null && entry.visits > 0,
    )
    .sort((left, right) => {
      if (right.visits !== left.visits) {
        return right.visits - left.visits
      }

      if (left.locus === 'alley' && right.locus !== 'alley') {
        return 1
      }

      if (right.locus === 'alley' && left.locus !== 'alley') {
        return -1
      }

      return 0
    })

  return ranked[0]?.locus ?? null
}

export function getSwordsThreadOmen(
  thread: string | undefined,
): string | undefined {
  switch (thread) {
    case 'half-shell-relic-trail':
      return 'A shell-green gleam keeps appearing where metal ought to be dull.'
    case 'broken-lamp-witnesses':
      return 'A watching light keeps finding the edge of the scene, even when there should be none.'
    case 'alley-oath-keepers':
      return 'Promises seem to settle into places like roots rather than words.'
    case 'sign-truth-fractures':
      return 'Wrong names and cracked messages keep surfacing as if reality is revising itself badly.'
    case 'quiet-refusals':
      return 'Refused outcomes leave a pressure behind, as if closed doors are still listening.'
    default:
      return undefined
  }
}

export function deriveSwordsOfChaosMemory(
  save: SwordsOfChaosSaveFile,
): SwordsOfChaosDerivedMemory {
  const alleyMemory = save.encounterMemory['trench-coat-turtle-alley']
  const recentTitle = save.progression.titles.at(-1)
  const recentRelic = save.inventory.at(-1)
  const canonThread = Object.entries(save.threadMemory)
    .filter(([, thread]) => thread.canonized)
    .sort((left, right) => {
      const seenDelta = (right[1].lastSeenAt ?? 0) - (left[1].lastSeenAt ?? 0)
      if (seenDelta !== 0) {
        return seenDelta
      }

      return right[1].sightings - left[1].sightings
    })[0]?.[0]
  const oceanShipMemory = save.encounterMemory['black-deck-ocean-ship']
  const stationMemory = save.encounterMemory['failing-ring-space-station']
  const persistedEncounterShift = getPersistedEncounterShift(save)
  const hasVisitedAnyEncounter = Object.values(save.encounterMemory).some(
    encounter => encounter.visits > 0,
  )
  const encounterShift: SwordsOfChaosEncounterLocus =
    save.story.activeLocus ??
    (canonThread === 'half-shell-relic-trail' &&
    (oceanShipMemory?.visits ?? 0) >= 2
      ? 'post-apocalyptic-ruin'
      : canonThread === 'sign-truth-fractures' &&
          (stationMemory?.visits ?? 0) >= 2
      ? 'mars-outpost'
      : alleyMemory &&
          alleyMemory.visits >= 4 &&
          canonThread === 'alley-oath-keepers'
      ? 'old-tree'
      : alleyMemory &&
          alleyMemory.visits >= 4 &&
          canonThread === 'half-shell-relic-trail'
        ? 'ocean-ship'
        : alleyMemory &&
            alleyMemory.visits >= 4 &&
            canonThread === 'broken-lamp-witnesses'
          ? 'fae-realm'
        : alleyMemory &&
            alleyMemory.visits >= 4 &&
            canonThread === 'quiet-refusals'
          ? 'dark-dungeon'
        : alleyMemory &&
            alleyMemory.visits >= 4 &&
            canonThread === 'sign-truth-fractures'
          ? 'space-station'
        : persistedEncounterShift
          ? persistedEncounterShift
        : !hasVisitedAnyEncounter && save.sessionZero.completed
          ? getProceduralOpeningEncounterShift(save)
        : 'alley')
  const activeEncounterMemory =
    save.encounterMemory[getSwordsEncounterMemoryKey(encounterShift)]
  const priorRoutes =
    activeEncounterMemory?.seenRoutes ??
    alleyMemory?.seenRoutes ??
    save.callbackMarkers.filter(marker => marker.includes(':'))
  const liveThread = [...save.threadCandidates]
    .reverse()
    .find(
      thread =>
        !isSwordsEncounterMemoryKey(thread) && thread !== canonThread,
    )

  return {
    version: 1,
    callbackCandidates: [
      ...new Set([
        ...save.callbackMarkers,
        ...Object.keys(save.encounterMemory),
      ]),
    ],
    priorRoutes,
    familiarPlaces:
      activeEncounterMemory && activeEncounterMemory.visits > 0
        ? [getSwordsEncounterPlaceName(encounterShift)]
        : [],
    encounterShift,
    recentTitle,
    recentRelic,
    liveThread,
    canonThread,
    activeThread: save.story.activeThread ?? canonThread ?? liveThread,
    liveThreadTitle: getSwordsThreadTitle(liveThread),
    canonThreadTitle: getSwordsThreadTitle(canonThread),
    storyChapter: save.story.chapter,
    chapterTitle: save.story.chapterTitle ?? undefined,
    storyTension: save.story.tension,
    currentObjective: save.story.currentObjective ?? undefined,
    carryForward: save.story.carryForward ?? undefined,
    continuation: save.story.continuation ?? undefined,
    sceneState: save.story.sceneState ?? undefined,
    characterDevelopment:
      save.characterDevelopment.focus &&
      save.characterDevelopment.title &&
      save.characterDevelopment.lesson &&
      save.characterDevelopment.pressure
        ? save.characterDevelopment
        : undefined,
    lastOutcomeKey: save.story.lastOutcomeKey ?? undefined,
    threadOmen: getSwordsThreadOmen(
      save.story.activeThread ?? canonThread ?? liveThread,
    ),
    recurringSymbol: getSwordsRecurringSymbol(encounterShift),
    magicState: {
      rarityBudget: save.magic.rarityBudget,
      omensSeen: save.magic.omensSeen,
      crossingsOpened: save.magic.crossingsOpened,
      activeImpossible: save.magic.activeImpossible,
      lastOmen: save.magic.lastOmen ?? undefined,
    },
  }
}
