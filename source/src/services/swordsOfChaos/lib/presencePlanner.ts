import type { SwordsOfChaosRelevantMemory } from '../types/memory.js'
import type {
  SwordsOpeningOption,
  SwordsSecondBeatOption,
} from '../types/shells.js'
import type { SwordsOfChaosEncounterLocus } from '../types/worldMap.js'

type SwordsRecurringPresenceKind =
  | 'watcher'
  | 'debtor'
  | 'false-guide'
  | 'threshold-herald'
  | 'wrong-name-voice'

type SwordsRecurringPresence = {
  kind: SwordsRecurringPresenceKind
  title: string
  motive: string
  pressure: string
}

function getPlace(locus: SwordsOfChaosEncounterLocus): string {
  switch (locus) {
    case 'old-tree':
      return 'the old tree'
    case 'ocean-ship':
      return 'the ship'
    case 'post-apocalyptic-ruin':
      return 'the ruin'
    case 'space-station':
      return 'the station'
    case 'mars-outpost':
      return 'the outpost'
    case 'fae-realm':
      return 'the grove'
    case 'dark-dungeon':
      return 'the dungeon'
    case 'alley':
    default:
      return 'the alley'
  }
}

export function getSwordsRecurringPresence(
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): SwordsRecurringPresence | undefined {
  if (!relevantMemory) {
    return undefined
  }

  if (
    relevantMemory.continuation?.kind === 'wrong-name-echo' ||
    relevantMemory.sceneState?.kind === 'name-pressure' ||
    relevantMemory.currentObjective?.toLowerCase().includes('wrong name')
  ) {
    return {
      kind: 'wrong-name-voice',
      title: 'The Wrong-Name Voice',
      motive: 'It wants the false designation repeated until it sounds older than your own answer.',
      pressure: 'It turns identity into terrain; every claim now risks becoming a handle.',
    }
  }

  if (
    relevantMemory.continuation?.kind === 'threshold-strain' ||
    relevantMemory.sceneState?.kind === 'threshold-contest' ||
    relevantMemory.characterDevelopment?.focus === 'threshold'
  ) {
    return {
      kind: 'threshold-herald',
      title: 'The Threshold Herald',
      motive: 'It wants every boundary treated as a test with witnesses.',
      pressure: 'It makes entry, retreat, and refusal feel like vows instead of movement.',
    }
  }

  if (
    relevantMemory.continuation?.kind === 'oath-binding' ||
    relevantMemory.sceneState?.kind === 'oath-test' ||
    relevantMemory.carryForward?.toLowerCase().includes('debt') ||
    relevantMemory.carryForward?.toLowerCase().includes('promise') ||
    relevantMemory.carryForward?.toLowerCase().includes('oath')
  ) {
    return {
      kind: 'debtor',
      title: 'The Debtor',
      motive: 'It wants to prove that every promise becomes property if carried long enough.',
      pressure: 'It makes bargains sound practical right up until they become chains.',
    }
  }

  if (
    relevantMemory.continuation?.kind === 'watcher-pressure' ||
    relevantMemory.sceneState?.kind === 'watched-approach' ||
    relevantMemory.magicState?.activeImpossible === 'witness' ||
    relevantMemory.characterDevelopment?.focus === 'witness'
  ) {
    return {
      kind: 'watcher',
      title: 'The Watcher',
      motive: 'It wants to decide whether looking back makes you dangerous or easier to find.',
      pressure: 'It turns observation into relationship; hidden things are no longer only hidden.',
    }
  }

  if (
    relevantMemory.familiarPlace &&
    (relevantMemory.storyTension === 'low' ||
      relevantMemory.characterDevelopment?.focus === 'nerve')
  ) {
    return {
      kind: 'false-guide',
      title: 'The False Guide',
      motive: 'It wants to make the safest-looking road feel like your own idea.',
      pressure: 'It makes comfort suspicious and confidence useful for the wrong reasons.',
    }
  }

  return undefined
}

export function getSwordsPresenceLine(input: {
  relevantMemory: SwordsOfChaosRelevantMemory | undefined
  locus: SwordsOfChaosEncounterLocus
}): string | undefined {
  const presence = getSwordsRecurringPresence(input.relevantMemory)
  if (!presence) {
    return undefined
  }

  return `${presence.title} is becoming recognizable in ${getPlace(input.locus)}. ${presence.motive}`
}

export function getSwordsPresencePressure(
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): string[] {
  const presence = getSwordsRecurringPresence(relevantMemory)
  if (!presence) {
    return []
  }

  return [`Recurring presence: ${presence.pressure}`]
}

export function applySwordsPresenceToOpeningOptions(input: {
  options: SwordsOpeningOption[]
  relevantMemory: SwordsOfChaosRelevantMemory | undefined
}): SwordsOpeningOption[] {
  const presence = getSwordsRecurringPresence(input.relevantMemory)
  if (!presence) {
    return input.options
  }

  return input.options.map(option => {
    if (presence.kind === 'watcher') {
      if (option.value === 'draw-steel') {
        return {
          ...option,
          label: 'Make the Watcher Flinch',
          description: `${option.description} ${presence.title} will remember whether force makes you easier or harder to watch.`,
        }
      }

      if (option.value === 'bow-slightly') {
        return {
          ...option,
          label: 'Let the Watcher Show Its Angle',
          description: `${option.description} This move treats observation as a door, not just a threat.`,
        }
      }
    }

    if (presence.kind === 'wrong-name-voice') {
      if (option.value === 'draw-steel') {
        return {
          ...option,
          label: 'Cut Off the Wrong Name',
          description: `${option.description} Violence here would be aimed at the claim, not only the thing making it.`,
        }
      }

      if (option.value === 'talk-like-you-belong') {
        return {
          ...option,
          label: 'Answer with a Better Lie',
          description: `${option.description} ${presence.title} is listening for any name confident enough to compete.`,
        }
      }
    }

    if (presence.kind === 'threshold-herald') {
      if (option.value === 'bow-slightly') {
        return {
          ...option,
          label: 'Hear the Rule Before Crossing',
          description: `${option.description} The Herald may mistake patience for permission, but it may also reveal the law of the door.`,
        }
      }

      if (option.value === 'talk-like-you-belong') {
        return {
          ...option,
          label: 'Name a Loophole',
          description: `${option.description} Boundaries dislike confidence most when it arrives with grammar.`,
        }
      }
    }

    if (presence.kind === 'debtor') {
      if (option.value === 'draw-steel') {
        return {
          ...option,
          label: 'Refuse the Collector',
          description: `${option.description} ${presence.title} will learn whether you treat obligation as law or leverage.`,
        }
      }

      if (option.value === 'bow-slightly') {
        return {
          ...option,
          label: 'Audit the Debt',
          description: `${option.description} This keeps the cost visible before anyone can call it fate.`,
        }
      }
    }

    if (presence.kind === 'false-guide') {
      if (option.value === 'bow-slightly') {
        return {
          ...option,
          label: 'Follow at a Safe Distance',
          description: `${option.description} The guide may be lying, but distance can make a lie useful before it becomes fatal.`,
        }
      }

      if (option.value === 'talk-like-you-belong') {
        return {
          ...option,
          label: 'Pretend to Trust the Guide',
          description: `${option.description} False confidence may make the guide reveal which part of the road it needs you to believe.`,
        }
      }
    }

    return option
  })
}

export function applySwordsPresenceToSecondBeatOptions(input: {
  options: SwordsSecondBeatOption[]
  relevantMemory: SwordsOfChaosRelevantMemory | undefined
}): SwordsSecondBeatOption[] {
  const presence = getSwordsRecurringPresence(input.relevantMemory)
  if (!presence) {
    return input.options
  }

  return input.options.map(option => {
    if (
      presence.kind === 'watcher' &&
      (option.value === 'meet-the-gaze' || option.value === 'hold-the-line')
    ) {
      return {
        ...option,
        label: option.label.replace(/^(Meet|Answer|Hold)\b/, 'Make the Watcher Answer'),
        description: `${option.description} ${presence.title} is close enough now that being seen and being answered are becoming the same problem.`,
      }
    }

    if (
      presence.kind === 'wrong-name-voice' &&
      (option.value === 'name-a-false-title' || option.value === 'double-down')
    ) {
      return {
        ...option,
        label: option.label.replace(/^(Offer|Risk|Commit|Push)\b/, 'Contest'),
        description: `${option.description} ${presence.title} may accept the wrong answer if it arrives with enough conviction.`,
      }
    }

    if (
      presence.kind === 'threshold-herald' &&
      (option.value === 'cut-the-sign-chain' || option.value === 'ask-the-price')
    ) {
      return {
        ...option,
        label: option.label.replace(/^(Test|Challenge|Set Terms with)\b/, 'Cross-Examine'),
        description: `${option.description} The Herald is listening for whether you understand the boundary or only want past it.`,
      }
    }

    if (
      presence.kind === 'debtor' &&
      (option.value === 'keep-bowing' || option.value === 'ask-the-price')
    ) {
      return {
        ...option,
        label: option.label.replace(/^(Honor or Break|Audit|Set Terms with)\b/, 'Settle or Worsen'),
        description: `${option.description} ${presence.title} makes every polite answer sound like it might be admissible later.`,
      }
    }

    if (
      presence.kind === 'false-guide' &&
      (option.value === 'laugh-like-you-mean-it' ||
        option.value === 'double-down')
    ) {
      return {
        ...option,
        label: option.label.replace(/^(Follow|Chase|Commit)\b/, 'Let the Guide Think'),
        description: `${option.description} The guide is more useful while it believes you are following for the reason it offered.`,
      }
    }

    return option
  })
}
