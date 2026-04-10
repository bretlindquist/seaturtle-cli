import type { SwordsOfChaosRelevantMemory } from '../types/memory.js'
import type { SwordsOfChaosMagicState } from '../types/save.js'
import type { SwordsOfChaosEncounterLocus } from '../types/worldMap.js'

function getPlace(locus: SwordsOfChaosEncounterLocus): string {
  return locus === 'alley'
    ? 'the alley'
    : locus === 'old-tree'
      ? 'the old tree'
      : locus === 'ocean-ship'
        ? 'the ship'
        : locus === 'space-station'
          ? 'the station'
          : locus === 'mars-outpost'
            ? 'the Mars outpost'
            : locus === 'fae-realm'
              ? 'the grove'
              : locus === 'dark-dungeon'
                ? 'the dungeon'
                : 'the ruin'
}

export function getSwordsNextMagicState(input: {
  currentMagic: SwordsOfChaosMagicState
  relevantMemory: SwordsOfChaosRelevantMemory | undefined
  encounterLocus: SwordsOfChaosEncounterLocus
}): SwordsOfChaosMagicState {
  const rarityBudget = input.currentMagic.rarityBudget + 1
  const lastManifestationAt = Date.now()

  if (
    input.relevantMemory?.characterDevelopment?.focus === 'myth' ||
    input.relevantMemory?.continuation?.kind === 'relic-resonance'
  ) {
    return {
      rarityBudget,
      omensSeen: input.currentMagic.omensSeen + 1,
      crossingsOpened: input.currentMagic.crossingsOpened,
      activeImpossible: 'relic-sign',
      lastOmen: 'A shell-green sign has crossed from implication into evidence.',
      lastManifestationAt,
    }
  }

  if (
    input.relevantMemory?.continuation?.kind === 'watcher-pressure' ||
    input.relevantMemory?.characterDevelopment?.focus === 'witness'
  ) {
    return {
      rarityBudget,
      omensSeen: input.currentMagic.omensSeen + 1,
      crossingsOpened: input.currentMagic.crossingsOpened,
      activeImpossible: 'witness',
      lastOmen: 'Something impossible has chosen observation over distance.',
      lastManifestationAt,
    }
  }

  if (
    input.relevantMemory?.sceneState?.kind === 'threshold-contest' ||
    input.relevantMemory?.characterDevelopment?.focus === 'threshold'
  ) {
    return {
      rarityBudget,
      omensSeen: input.currentMagic.omensSeen,
      crossingsOpened: input.currentMagic.crossingsOpened + 1,
      activeImpossible: 'crossing',
      lastOmen: 'A boundary has started acting like it might open in the wrong direction.',
      lastManifestationAt,
    }
  }

  return {
    rarityBudget,
    omensSeen: input.currentMagic.omensSeen + 1,
    crossingsOpened: input.currentMagic.crossingsOpened,
    activeImpossible: 'omen',
    lastOmen: `A small impossibility now clings to ${getPlace(input.encounterLocus)}.`,
    lastManifestationAt,
  }
}

export function getSwordsMagicLine(
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
  locus: SwordsOfChaosEncounterLocus,
): string | undefined {
  const magic = relevantMemory?.magicState
  if (!magic || magic.activeImpossible === 'none') {
    return undefined
  }

  const place = getPlace(locus)
  switch (magic.activeImpossible) {
    case 'relic-sign':
      return `A shell-green impossibility now reads as evidence in ${place}, not rumor.`
    case 'witness':
      return `Something impossible is no longer hiding behind atmosphere in ${place}. It has chosen to watch more directly.`
    case 'crossing':
      return `A crossing pressure has opened in ${place}. Boundaries no longer feel one-directional.`
    case 'omen':
      return magic.lastOmen ?? `A quiet omen has taken root in ${place}.`
    case 'none':
    default:
      return undefined
  }
}

export function getSwordsMagicPressure(
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): string[] {
  const magic = relevantMemory?.magicState
  if (!magic || magic.activeImpossible === 'none') {
    return []
  }

  if (magic.activeImpossible === 'crossing') {
    return ['The scene now has magical crossing pressure; the world may stop respecting ordinary thresholds.']
  }

  if (magic.activeImpossible === 'witness') {
    return ['The scene now carries impossible witness pressure; hidden things may behave like observers instead of objects.']
  }

  if (magic.activeImpossible === 'relic-sign') {
    return ['The scene now carries material myth pressure; proof may arrive before explanation.']
  }

  return ['The uncanny is active in the scene now, even if it is not yet the loudest thing in the room.']
}
