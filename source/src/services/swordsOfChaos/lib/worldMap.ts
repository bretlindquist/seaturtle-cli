import { SWORDS_OF_CHAOS_WORLD_MAP } from '../data/worldMap.js'
import type { SwordsOfChaosRelevantMemory } from '../types/memory.js'
import type { SwordsOfChaosEncounterLocus } from '../types/worldMap.js'

export function getSwordsEncounterLocus(
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): SwordsOfChaosEncounterLocus {
  return relevantMemory?.encounterShift ?? 'alley'
}

export function getSwordsEncounterMemoryKey(
  locus: SwordsOfChaosEncounterLocus,
): string {
  switch (locus) {
    case 'old-tree':
      return 'old-tree-bramble-latch'
    case 'ocean-ship':
      return 'black-deck-ocean-ship'
    case 'space-station':
      return 'failing-ring-space-station'
    case 'fae-realm':
      return 'foxfire-fae-grove'
    case 'dark-dungeon':
      return 'seductive-dark-dungeon'
    default:
      return 'trench-coat-turtle-alley'
  }
}

export function isSwordsEncounterMemoryKey(thread: string): boolean {
  return (
    thread === 'trench-coat-turtle-alley' ||
    thread === 'old-tree-bramble-latch' ||
    thread === 'black-deck-ocean-ship' ||
    thread === 'failing-ring-space-station' ||
    thread === 'foxfire-fae-grove' ||
    thread === 'seductive-dark-dungeon'
  )
}

export function getSwordsEncounterPlaceName(
  locus: SwordsOfChaosEncounterLocus,
): string {
  switch (locus) {
    case 'old-tree':
      return 'the old tree'
    case 'ocean-ship':
      return 'the ship'
    case 'space-station':
      return 'the station'
    case 'fae-realm':
      return 'the grove'
    case 'dark-dungeon':
      return 'the dungeon'
    default:
      return 'the alley'
  }
}

export function getSwordsWorldMapWeight(
  locus: SwordsOfChaosEncounterLocus,
): string {
  return SWORDS_OF_CHAOS_WORLD_MAP[locus].connectiveWeight
}

export function getSwordsThreadEcho(input: {
  locus: SwordsOfChaosEncounterLocus
  thread: string | undefined
}): string | undefined {
  if (!input.thread) {
    return undefined
  }

  return SWORDS_OF_CHAOS_WORLD_MAP[input.locus].threadEchoes[input.thread]
}
