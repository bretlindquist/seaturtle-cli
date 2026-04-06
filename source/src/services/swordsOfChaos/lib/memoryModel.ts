import type { SwordsOfChaosDerivedMemory } from '../types/memory.js'
import type { SwordsOfChaosSaveFile } from '../types/save.js'
import {
  getSwordsEncounterMemoryKey,
  getSwordsEncounterPlaceName,
  getSwordsRecurringSymbol,
  getSwordsThreadTitle,
  isSwordsEncounterMemoryKey,
  type SwordsOfChaosEncounterLocus,
} from './worldMap.js'

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
  const encounterShift: SwordsOfChaosEncounterLocus =
    canonThread === 'half-shell-relic-trail' &&
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
        : 'alley'
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
    liveThreadTitle: getSwordsThreadTitle(liveThread),
    canonThreadTitle: getSwordsThreadTitle(canonThread),
    threadOmen: getSwordsThreadOmen(canonThread ?? liveThread),
    recurringSymbol: getSwordsRecurringSymbol(encounterShift),
  }
}
