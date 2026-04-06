import type { SwordsOfChaosRelevantMemory } from '../types/memory.js'
import type { SwordsOfChaosSaveFile } from '../types/save.js'
import { deriveSwordsOfChaosMemory } from './memoryModel.js'
import { getSwordsEncounterMemoryKey } from './worldMap.js'

function getRoadNotTakenHint(
  routes: string[],
  encounterShift: SwordsOfChaosRelevantMemory['encounterShift'],
): string | undefined {
  const allOpeners = ['draw-steel', 'bow-slightly', 'talk-like-you-belong']
  const usedOpeners = new Set(routes.map(route => route.split(':')[0]))
  const unused = allOpeners.find(opener => !usedOpeners.has(opener))
  const place = encounterShift === 'alley' || !encounterShift ? 'this alley' : 'this place'

  if (!unused) {
    return undefined
  }

  switch (unused) {
    case 'draw-steel':
      return `There is still a harder road through ${place} that you never took.`
    case 'bow-slightly':
      return 'A more patient version of this moment still seems to be waiting somewhere nearby.'
    case 'talk-like-you-belong':
      return `${place.charAt(0).toUpperCase() + place.slice(1)} still remembers a bluff you never tried.`
  }
}

export function getSwordsOfChaosRelevantMemory(
  save: SwordsOfChaosSaveFile,
): SwordsOfChaosRelevantMemory {
  const memory = deriveSwordsOfChaosMemory(save)
  const activeEncounterMemory =
    save.encounterMemory[getSwordsEncounterMemoryKey(memory.encounterShift ?? 'alley')]
  return {
    familiarPlace: memory.familiarPlaces[0],
    encounterShift: memory.encounterShift,
    priorRoutes: memory.priorRoutes,
    roadNotTakenHint: getRoadNotTakenHint(
      memory.priorRoutes,
      memory.encounterShift,
    ),
    revisitCount: activeEncounterMemory?.visits ?? 0,
    lastRoute: activeEncounterMemory?.lastRoute ?? undefined,
    recentTitle: memory.recentTitle,
    recentRelic: memory.recentRelic,
    liveThread: memory.liveThread,
    canonThread: memory.canonThread,
    threadOmen: memory.threadOmen,
    seaturtleGlimpsed: save.seaturtle.appearances > 0,
    seaturtleBond: save.seaturtle.bond,
  }
}
