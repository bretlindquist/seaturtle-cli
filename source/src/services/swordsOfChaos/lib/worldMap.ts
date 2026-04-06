import { SWORDS_OF_CHAOS_WORLD_MAP } from '../data/worldMap.js'
import type { SwordsOfChaosRelevantMemory } from '../types/memory.js'
import type { SwordsOfChaosEncounterLocus } from '../types/worldMap.js'

export function getSwordsEncounterLocus(
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): SwordsOfChaosEncounterLocus {
  return relevantMemory?.encounterShift ?? 'alley'
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
