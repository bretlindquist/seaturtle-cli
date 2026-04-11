import { getSwordsRecurringPresence } from './presencePlanner.js'
import type { SwordsOfChaosRelevantMemory } from '../types/memory.js'
import type {
  SwordsOpeningOption,
  SwordsSecondBeatOption,
} from '../types/shells.js'
import type { SwordsOfChaosEncounterLocus } from '../types/worldMap.js'

type SwordsChapterConfrontationKind =
  | 'watcher-reckoning'
  | 'wrong-name-source'
  | 'liar-door'
  | 'relic-custodian'
  | 'debtor-reckoning'
  | 'general-reckoning'

type SwordsChapterConfrontation = {
  kind: SwordsChapterConfrontationKind
  title: string
  line: string
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

export function getSwordsChapterConfrontation(input: {
  relevantMemory: SwordsOfChaosRelevantMemory | undefined
  locus: SwordsOfChaosEncounterLocus
}): SwordsChapterConfrontation | undefined {
  const memory = input.relevantMemory
  if (!memory || memory.storyChapter < 2) {
    return undefined
  }

  const confrontationDue =
    memory.storyTension === 'high' ||
    memory.storyChapter % 3 === 0 ||
    (memory.sceneState?.beatsElapsed ?? 0) >= 2

  if (!confrontationDue) {
    return undefined
  }

  const place = getPlace(input.locus)
  const presence = getSwordsRecurringPresence(memory)

  if (
    presence?.kind === 'watcher' ||
    memory.continuation?.kind === 'watcher-pressure'
  ) {
    return {
      kind: 'watcher-reckoning',
      title: 'The Watcher Who Followed Too Long',
      line: `Chapter reckoning: the watcher is no longer content to remain angle and atmosphere in ${place}. It wants the scene to become mutual.`,
      pressure: 'The next strong move may force the hidden witness to answer as a presence instead of a hint.',
    }
  }

  if (
    presence?.kind === 'wrong-name-voice' ||
    memory.continuation?.kind === 'wrong-name-echo'
  ) {
    return {
      kind: 'wrong-name-source',
      title: 'The Mouth Behind the Wrong Name',
      line: `Chapter reckoning: the wrong name is close to finding its source in ${place}. Someone or something wants the false designation to survive contact.`,
      pressure: 'A direct contradiction may expose the source; repeating the wrong answer may strengthen it.',
    }
  }

  if (
    presence?.kind === 'threshold-herald' ||
    memory.continuation?.kind === 'threshold-strain'
  ) {
    return {
      kind: 'liar-door',
      title: 'The Door That Opens Only to Liars',
      line: `Chapter reckoning: a boundary in ${place} is no longer abstract. It wants a decisive answer about entry, refusal, or breach.`,
      pressure: 'Crossing may require a false answer; refusing may cost the chapter its clearest opening.',
    }
  }

  if (
    memory.continuation?.kind === 'relic-resonance' ||
    memory.sceneState?.kind === 'relic-nearness' ||
    memory.magicState?.activeImpossible === 'relic-sign'
  ) {
    return {
      kind: 'relic-custodian',
      title: 'The Relic That Wants Use',
      line: `Chapter reckoning: the relic pressure in ${place} is no longer content to be discovered. It wants custody, use, or refusal in plain terms.`,
      pressure: 'Touching proof may buy power at the price of being claimed by it later.',
    }
  }

  if (
    presence?.kind === 'debtor' ||
    memory.continuation?.kind === 'oath-binding'
  ) {
    return {
      kind: 'debtor-reckoning',
      title: 'The Debt Come Due',
      line: `Chapter reckoning: ${place} is ready to test whether the last promise was architecture or theater.`,
      pressure: 'Every restrained answer here risks being interpreted as payment, consent, or confession.',
    }
  }

  return {
    kind: 'general-reckoning',
    title: 'The Chapter Wants a Harder Answer',
    line: `Chapter reckoning: the pressure in ${place} has stopped being satisfied with atmosphere. Something in the story wants a decisive answer now.`,
    pressure: 'The next move is more likely to define the chapter than merely survive the scene.',
  }
}

export function getSwordsChapterConfrontationLine(input: {
  relevantMemory: SwordsOfChaosRelevantMemory | undefined
  locus: SwordsOfChaosEncounterLocus
}): string | undefined {
  return getSwordsChapterConfrontation(input)?.line
}

export function getSwordsChapterConfrontationPressure(input: {
  relevantMemory: SwordsOfChaosRelevantMemory | undefined
  locus: SwordsOfChaosEncounterLocus
}): string[] {
  const confrontation = getSwordsChapterConfrontation(input)
  return confrontation ? [`Chapter confrontation: ${confrontation.pressure}`] : []
}

export function getSwordsChapterConfrontationHint(input: {
  relevantMemory: SwordsOfChaosRelevantMemory | undefined
  locus: SwordsOfChaosEncounterLocus
}): string | undefined {
  const confrontation = getSwordsChapterConfrontation(input)
  return confrontation
    ? `${confrontation.title} is near. Treat the next choice like it could close a chapter, not just color a scene.`
    : undefined
}

export function applySwordsConfrontationToOpeningOptions(input: {
  options: SwordsOpeningOption[]
  relevantMemory: SwordsOfChaosRelevantMemory | undefined
  locus: SwordsOfChaosEncounterLocus
}): SwordsOpeningOption[] {
  const confrontation = getSwordsChapterConfrontation({
    relevantMemory: input.relevantMemory,
    locus: input.locus,
  })
  if (!confrontation) {
    return input.options
  }

  return input.options.map(option => {
    if (
      confrontation.kind === 'watcher-reckoning' &&
      option.value === 'bow-slightly'
    ) {
      return {
        ...option,
        label: 'Make the Watcher Commit',
        description: `${option.description} This no longer reads as patience alone; it dares the hidden witness to stop hiding.`,
      }
    }

    if (
      confrontation.kind === 'wrong-name-source' &&
      option.value === 'talk-like-you-belong'
    ) {
      return {
        ...option,
        label: 'Speak Over the Wrong Name',
        description: `${option.description} The chapter is close to the source now, so every spoken claim may either expose it or feed it.`,
      }
    }

    if (
      confrontation.kind === 'liar-door' &&
      option.value === 'draw-steel'
    ) {
      return {
        ...option,
        label: 'Force the Boundary to Answer',
        description: `${option.description} This is no longer only aggression; it is a demand for the door to declare its law.`,
      }
    }

    if (
      confrontation.kind === 'relic-custodian' &&
      option.value === 'draw-steel'
    ) {
      return {
        ...option,
        label: 'Reach for Proof Before Permission',
        description: `${option.description} The relic pressure has matured into a custody question, not just an omen.`,
      }
    }

    if (
      confrontation.kind === 'debtor-reckoning' &&
      option.value === 'bow-slightly'
    ) {
      return {
        ...option,
        label: 'Ask What the Chapter Thinks You Owe',
        description: `${option.description} The scene is ready to count quiet answers as admissible testimony.`,
      }
    }

    return option
  })
}

export function applySwordsConfrontationToSecondBeatOptions(input: {
  options: SwordsSecondBeatOption[]
  relevantMemory: SwordsOfChaosRelevantMemory | undefined
  locus: SwordsOfChaosEncounterLocus
}): SwordsSecondBeatOption[] {
  const confrontation = getSwordsChapterConfrontation({
    relevantMemory: input.relevantMemory,
    locus: input.locus,
  })
  if (!confrontation) {
    return input.options
  }

  return input.options.map(option => {
    if (
      confrontation.kind === 'watcher-reckoning' &&
      (option.value === 'meet-the-gaze' || option.value === 'hold-the-line')
    ) {
      return {
        ...option,
        label: option.label.replace(/^(Make the Watcher Answer|Answer|Drive|Hold|Honor)\b/, 'End the Watching'),
        description: `${option.description} The chapter is finally close enough to force the witness to choose distance or embodiment.`,
      }
    }

    if (
      confrontation.kind === 'wrong-name-source' &&
      (option.value === 'name-a-false-title' || option.value === 'double-down')
    ) {
      return {
        ...option,
        label: option.label.replace(/^(Contest|Risk|Commit|Push)\b/, 'Find the Mouth Behind It'),
        description: `${option.description} This is close to becoming a direct confrontation with the source of the bad designation.`,
      }
    }

    if (
      confrontation.kind === 'liar-door' &&
      (option.value === 'cut-the-sign-chain' || option.value === 'ask-the-price')
    ) {
      return {
        ...option,
        label: option.label.replace(/^(Cross-Examine|Force|Challenge|Settle|Set Terms with)\b/, 'Make the Door Declare Itself'),
        description: `${option.description} The scene is ready to stop hinting and tell you what price it thinks entry should require.`,
      }
    }

    if (
      confrontation.kind === 'relic-custodian' &&
      (option.value === 'cut-the-sign-chain' || option.value === 'meet-the-gaze')
    ) {
      return {
        ...option,
        label: option.label.replace(/^(Test|Confront|Make the Watcher Answer)\b/, 'Take Custody or Refuse It'),
        description: `${option.description} The relic pressure is now asking for a decision that later chapters can punish or honor.`,
      }
    }

    if (
      confrontation.kind === 'debtor-reckoning' &&
      (option.value === 'keep-bowing' || option.value === 'ask-the-price')
    ) {
      return {
        ...option,
        label: option.label.replace(/^(Settle or Worsen|Honor or Break|Audit|Set Terms with)\b/, 'Settle the Account'),
        description: `${option.description} The chapter is prepared to decide whether obligation here is real, invented, or inherited.`,
      }
    }

    return option
  })
}
