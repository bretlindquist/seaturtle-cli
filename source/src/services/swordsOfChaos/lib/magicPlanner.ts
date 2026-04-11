import type { SwordsOfChaosRelevantMemory } from '../types/memory.js'
import type { SwordsOfChaosMagicState } from '../types/save.js'
import type {
  SwordsOpeningOption,
  SwordsSecondBeatOption,
} from '../types/shells.js'
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

export function getSwordsMagicRuleLine(
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): string | undefined {
  const magic = relevantMemory?.magicState
  if (!magic || magic.activeImpossible === 'none') {
    return undefined
  }

  switch (magic.activeImpossible) {
    case 'crossing':
      return 'Rule change: retreat and arrival no longer feel like opposite directions.'
    case 'witness':
      return 'Rule change: being observed now behaves like contact, not atmosphere.'
    case 'relic-sign':
      return 'Rule change: proof can now arrive before permission, and touching it may count as a vow.'
    case 'omen':
      return 'Rule change: symbols may answer as if they were evidence instead of decoration.'
    case 'none':
    default:
      return undefined
  }
}

export function getSwordsMagicHint(
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): string | undefined {
  const magic = relevantMemory?.magicState
  if (!magic || magic.activeImpossible === 'none') {
    return undefined
  }

  switch (magic.activeImpossible) {
    case 'crossing':
      return 'The crossing is active. Choosing to leave may still count as entering something.'
    case 'witness':
      return 'The witness is active. A hidden thing may treat acknowledgment as a form of touch.'
    case 'relic-sign':
      return 'The relic sign is active. Reaching for proof is no longer a neutral investigation.'
    case 'omen':
      return 'The omen is active. Small symbolic gestures may now have literal consequences.'
    case 'none':
    default:
      return undefined
  }
}

export function applySwordsMagicToOpeningOptions(input: {
  options: SwordsOpeningOption[]
  relevantMemory: SwordsOfChaosRelevantMemory | undefined
}): SwordsOpeningOption[] {
  const magic = input.relevantMemory?.magicState
  if (!magic || magic.activeImpossible === 'none') {
    return input.options
  }

  return input.options.map(option => {
    if (magic.activeImpossible === 'crossing') {
      if (option.value === 'bow-slightly') {
        return {
          ...option,
          label: 'Test Whether Stillness Counts as Crossing',
          description: `${option.description} Crossing pressure is active, so even restraint may move you further in than intended.`,
        }
      }

      if (option.value === 'talk-like-you-belong') {
        return {
          ...option,
          label: 'Name the Door Before It Names You',
          description: `${option.description} The boundary may treat language as entry if you sound certain enough.`,
        }
      }
    }

    if (magic.activeImpossible === 'witness') {
      if (option.value === 'bow-slightly') {
        return {
          ...option,
          label: 'Let the Witness Blink First',
          description: `${option.description} Observation is no longer passive; waiting now pressures the thing watching back.`,
        }
      }

      if (option.value === 'draw-steel') {
        return {
          ...option,
          label: 'Make the Witness Count You as Real',
          description: `${option.description} Force under witness pressure is likely to become evidence, not merely posture.`,
        }
      }
    }

    if (magic.activeImpossible === 'relic-sign') {
      if (option.value === 'draw-steel') {
        return {
          ...option,
          label: 'Reach for the Proof While It Is Still Hot',
          description: `${option.description} Material myth is active, so touching the sign may bind you to its consequence.`,
        }
      }

      if (option.value === 'talk-like-you-belong') {
        return {
          ...option,
          label: 'Speak Like the Relic Already Chose You',
          description: `${option.description} The scene may treat certainty here as a claim of custody.`,
        }
      }
    }

    if (magic.activeImpossible === 'omen') {
      if (option.value === 'talk-like-you-belong') {
        return {
          ...option,
          label: 'Treat the Omen Like an Agreement',
          description: `${option.description} Symbolic language now risks creating literal obligations.`,
        }
      }
    }

    return option
  })
}

export function applySwordsMagicToSecondBeatOptions(input: {
  options: SwordsSecondBeatOption[]
  relevantMemory: SwordsOfChaosRelevantMemory | undefined
}): SwordsSecondBeatOption[] {
  const magic = input.relevantMemory?.magicState
  if (!magic || magic.activeImpossible === 'none') {
    return input.options
  }

  return input.options.map(option => {
    if (
      magic.activeImpossible === 'crossing' &&
      (option.value === 'cut-the-sign-chain' || option.value === 'ask-the-price')
    ) {
      return {
        ...option,
        label: option.label.replace(/^(Make the Door Declare Itself|Cross-Examine|Force|Challenge)\b/, 'Cross While the Rule Is Unstable'),
        description: `${option.description} Crossing pressure means this choice may open a path and close your clean retreat at the same time.`,
      }
    }

    if (
      magic.activeImpossible === 'witness' &&
      (option.value === 'meet-the-gaze' || option.value === 'hold-the-line')
    ) {
      return {
        ...option,
        label: option.label.replace(/^(End the Watching|Make the Watcher Answer|Answer|Drive|Hold)\b/, 'Touch the Witness Without Touching It'),
        description: `${option.description} Under witness pressure, acknowledgment may count as contact and escalate the scene immediately.`,
      }
    }

    if (
      magic.activeImpossible === 'relic-sign' &&
      (option.value === 'cut-the-sign-chain' || option.value === 'meet-the-gaze')
    ) {
      return {
        ...option,
        label: option.label.replace(/^(Take Custody or Refuse It|Test|Confront)\b/, 'Take Proof at a Price'),
        description: `${option.description} Material myth is active; this may grant proof now and debt later.`,
      }
    }

    if (
      magic.activeImpossible === 'omen' &&
      (option.value === 'name-a-false-title' || option.value === 'laugh-like-you-mean-it')
    ) {
      return {
        ...option,
        label: option.label.replace(/^(Contest|Follow|Find the Mouth Behind It)\b/, 'Turn the Omen Literal'),
        description: `${option.description} The symbolic layer is unstable enough that a phrase or gesture may harden into consequence.`,
      }
    }

    return option
  })
}
