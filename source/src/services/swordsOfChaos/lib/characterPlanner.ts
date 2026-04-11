import type { SwordsOfChaosRelevantMemory } from '../types/memory.js'
import type {
  SwordsOfChaosOpeningChoice,
  SwordsOfChaosOutcome,
  SwordsOfChaosSecondChoice,
} from '../types/outcomes.js'
import type {
  SwordsOfChaosCharacterDevelopment,
  SwordsOfChaosCharacterSheet,
} from '../types/save.js'
import type { SwordsSecondBeatOption } from '../types/shells.js'
import type { SwordsOpeningOption } from '../types/shells.js'
import type { SwordsOfChaosEncounterLocus } from '../types/worldMap.js'

function getDevelopmentFocus(input: {
  openingChoice: SwordsOfChaosOpeningChoice
  secondChoice: SwordsOfChaosSecondChoice
  outcomeThread: string
}): NonNullable<SwordsOfChaosCharacterDevelopment['focus']> {
  if (
    input.outcomeThread === 'broken-lamp-witnesses' ||
    input.secondChoice === 'meet-the-gaze'
  ) {
    return 'witness'
  }

  if (input.outcomeThread === 'quiet-refusals') {
    return 'threshold'
  }

  if (input.outcomeThread === 'half-shell-relic-trail') {
    return 'myth'
  }

  switch (input.openingChoice) {
    case 'draw-steel':
      return 'edge'
    case 'bow-slightly':
      return 'composure'
    case 'talk-like-you-belong':
    default:
      return 'nerve'
  }
}

function getDevelopmentTitle(
  focus: NonNullable<SwordsOfChaosCharacterDevelopment['focus']>,
): string {
  switch (focus) {
    case 'edge':
      return 'The Drawn Edge'
    case 'composure':
      return 'The Quiet Weight'
    case 'nerve':
      return 'The Claimed Name'
    case 'witness':
      return 'The One Who Looks Back'
    case 'threshold':
      return 'The Threshold-Bearer'
    case 'myth':
      return 'The Shell-Green Path'
  }
}

function getDevelopmentLesson(input: {
  focus: NonNullable<SwordsOfChaosCharacterDevelopment['focus']>
  character: SwordsOfChaosCharacterSheet
}): string {
  switch (input.focus) {
    case 'edge':
      return `You keep learning whether ${input.character.flaw ?? 'your worst habit'} turns force into discipline or merely gives danger a sharper handle.`
    case 'composure':
      return `Your ${input.character.strength ?? 'best quality'} is becoming more than temperament. It is starting to alter what the scene thinks you can endure.`
    case 'nerve':
      return `Your drive to ${input.character.drive ?? 'keep moving'} is teaching your voice to act before proof arrives.`
    case 'witness':
      return `The world keeps watching, and you are learning to answer that pressure without looking away first.`
    case 'threshold':
      return `Closed things keep turning toward you as if ${input.character.keepsake ?? 'what you carry'} already counts as a key.`
    case 'myth':
      return `Your omen, ${input.character.omen ?? 'the strange thing around you'}, is starting to read like evidence instead of atmosphere.`
  }
}

function getDevelopmentPressure(input: {
  focus: NonNullable<SwordsOfChaosCharacterDevelopment['focus']>
  character: SwordsOfChaosCharacterSheet
  outcome: SwordsOfChaosOutcome
}): string {
  switch (input.focus) {
    case 'edge':
      return 'The next chapter should tempt speed and force while making the fallout belong to you more visibly than before.'
    case 'composure':
      return 'The next chapter should reward restraint just enough to ask whether the quiet line is discipline or only fear taking longer to speak.'
    case 'nerve':
      return 'The next chapter should make bold claims useful and then expensive the moment contradiction arrives.'
    case 'witness':
      return 'The next chapter should let you see more than safety allows and make hidden things notice who kept looking.'
    case 'threshold':
      return `The next chapter should let a boundary answer ${input.character.name ?? 'you'} and then ask what that answer costs to keep.`
    case 'myth':
      return `The next chapter should bring the uncanny close enough that ${input.outcome.key === 'relic' ? 'proof' : 'association'} stops being deniable and ordinary explanations stop protecting you.`
  }
}

export function getSwordsCharacterDevelopmentAdvance(input: {
  character: SwordsOfChaosCharacterSheet
  currentDevelopment: SwordsOfChaosCharacterDevelopment
  openingChoice: SwordsOfChaosOpeningChoice
  secondChoice: SwordsOfChaosSecondChoice
  outcomeThread: string
  outcome: SwordsOfChaosOutcome
}) {
  const updatedAt = Date.now()
  const focus = getDevelopmentFocus({
    openingChoice: input.openingChoice,
    secondChoice: input.secondChoice,
    outcomeThread: input.outcomeThread,
  })
  const stage =
    input.currentDevelopment.focus === focus
      ? input.currentDevelopment.stage + 1
      : 1
  const title = getDevelopmentTitle(focus)
  const lesson = getDevelopmentLesson({
    focus,
    character: input.character,
  })
  const pressure = getDevelopmentPressure({
    focus,
    character: input.character,
    outcome: input.outcome,
  })

  return {
    focus,
    title,
    lesson,
    pressure,
    stage,
    lastUpdatedAt: updatedAt,
    milestone: `Character development ${stage}: ${title}`,
    xpDelta: 1,
  }
}

export function getSwordsCharacterDevelopmentLine(
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): string | undefined {
  if (!relevantMemory?.characterDevelopment?.title) {
    return undefined
  }

  return `What the journey is shaping: ${relevantMemory.characterDevelopment.title} (${relevantMemory.characterDevelopment.stage})`
}

export function getSwordsCharacterDevelopmentPressure(
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): string[] {
  const pressure = relevantMemory?.characterDevelopment?.pressure
  const cost = getSwordsCharacterCostLine(relevantMemory)
  return [pressure, cost].filter(Boolean)
}

export function getSwordsCharacterDevelopmentHint(
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): string | undefined {
  if (!relevantMemory?.characterDevelopment?.lesson) {
    return undefined
  }

  return relevantMemory.characterDevelopment.lesson
}

export function getSwordsCharacterReactionLine(
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
  locus: SwordsOfChaosEncounterLocus,
): string | undefined {
  const focus = relevantMemory?.characterDevelopment?.focus
  if (!focus) {
    return undefined
  }

  const place =
    locus === 'alley'
      ? 'the alley'
      : locus === 'old-tree'
        ? 'the tree'
        : locus === 'ocean-ship'
          ? 'the ship'
          : locus === 'space-station'
            ? 'the station'
            : locus === 'mars-outpost'
              ? 'the outpost'
              : locus === 'fae-realm'
                ? 'the grove'
                : locus === 'dark-dungeon'
                  ? 'the dungeon'
                  : 'the ruin'

  switch (focus) {
    case 'edge':
      return `${place.charAt(0).toUpperCase() + place.slice(1)} has started treating your presence like something that may become violence on purpose.`
    case 'composure':
      return `${place.charAt(0).toUpperCase() + place.slice(1)} no longer reads your stillness as emptiness. It behaves as if restraint itself might alter the rules.`
    case 'nerve':
      return `${place.charAt(0).toUpperCase() + place.slice(1)} now listens for the moment your confidence overreaches reality.`
    case 'witness':
      return `Things in ${place} are growing less comfortable with being looked at directly.`
    case 'threshold':
      return `Boundaries in ${place} are starting to answer you like a recurring problem instead of an accidental visitor.`
    case 'myth':
      return `${place.charAt(0).toUpperCase() + place.slice(1)} has begun to behave as though the uncanny around you is evidence, not rumor.`
  }
}

export function getSwordsCharacterTemptationLine(
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): string | undefined {
  const focus = relevantMemory?.characterDevelopment?.focus
  if (!focus) {
    return undefined
  }

  switch (focus) {
    case 'edge':
      return 'The scene is almost daring you to solve this one with force so it can learn what kind of force you really are.'
    case 'composure':
      return 'The scene wants to know whether your patience is real or merely slower panic.'
    case 'nerve':
      return 'The scene is offering you just enough uncertainty to tempt another bold claim.'
    case 'witness':
      return 'Something hidden here would prefer to remain unobserved. That is exactly why it is becoming tempting to press it.'
    case 'threshold':
      return 'Every boundary in sight is beginning to feel personal.'
    case 'myth':
      return 'The uncanny is close enough now that stepping nearer would answer questions and invite worse ones.'
  }
}

export function getSwordsCharacterCostLine(
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): string | undefined {
  const focus = relevantMemory?.characterDevelopment?.focus
  if (!focus) {
    return undefined
  }

  switch (focus) {
    case 'edge':
      return 'Cost: force will solve some scenes faster, but the world is increasingly keeping the collateral in your name.'
    case 'composure':
      return 'Cost: the quieter road buys clarity, but it can also leave the initiative with whatever wanted your patience.'
    case 'nerve':
      return 'Cost: every bold claim buys access on credit, and contradiction is starting to collect.'
    case 'witness':
      return 'Cost: seeing further now also means being seen by things that preferred to remain implied.'
    case 'threshold':
      return 'Cost: every answered boundary changes what still counts as outside.'
    case 'myth':
      return 'Cost: proof is drawing nearer, and stable explanation is beginning to retreat.'
  }
}

export function getSwordsCharacterRecognitionLine(
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): string | undefined {
  if (!relevantMemory?.characterDevelopment?.title) {
    return undefined
  }

  return `The world is starting to recognize a pattern in you: ${relevantMemory.characterDevelopment.title}.`
}

export function applySwordsCharacterPressureToOpeningOptions(input: {
  options: SwordsOpeningOption[]
  relevantMemory: SwordsOfChaosRelevantMemory | undefined
}): SwordsOpeningOption[] {
  const focus = input.relevantMemory?.characterDevelopment?.focus
  if (!focus) {
    return input.options
  }

  function score(option: SwordsOpeningOption): number {
    switch (focus) {
      case 'edge':
        return option.value === 'draw-steel' ? 2 : 0
      case 'composure':
        return option.value === 'bow-slightly' ? 2 : 0
      case 'nerve':
        return option.value === 'talk-like-you-belong' ? 2 : 0
      case 'witness':
        return option.value === 'bow-slightly' ? 2 : 0
      case 'threshold':
        return option.value === 'draw-steel' || option.value === 'bow-slightly'
          ? 1
          : 0
      case 'myth':
        return option.value === 'talk-like-you-belong' ? 2 : 0
      default:
        return 0
    }
  }

  const rewritten = input.options.map(option => {
    if (focus === 'edge' && option.value === 'draw-steel') {
      return {
        ...option,
        description: `${option.description} It is the fast road, and the aftermath is increasingly yours to carry.`,
      }
    }

    if (focus === 'composure' && option.value === 'bow-slightly') {
      return {
        ...option,
        description: `${option.description} It may buy clarity, but only if the scene is not using your patience against you.`,
      }
    }

    if (focus === 'nerve' && option.value === 'talk-like-you-belong') {
      return {
        ...option,
        description: `${option.description} It opens doors on credit, and contradiction is already nearby.`,
      }
    }

    if (focus === 'witness' && option.value === 'bow-slightly') {
      return {
        ...option,
        description: `${option.description} The slower line lets you see more, which also gives the hidden more time to notice you.`,
      }
    }

    if (focus === 'threshold' && option.value === 'bow-slightly') {
      return {
        ...option,
        description: `${option.description} If the boundary answers, you may not get to remain outside it afterward.`,
      }
    }

    if (focus === 'myth' && option.value === 'talk-like-you-belong') {
      return {
        ...option,
        description: `${option.description} This is the road most likely to turn omen into proof before you can explain it away.`,
      }
    }

    return option
  })

  return [...rewritten].sort((left, right) => score(right) - score(left))
}

export function applySwordsCharacterPressureToSecondBeatOptions(input: {
  options: SwordsSecondBeatOption[]
  relevantMemory: SwordsOfChaosRelevantMemory | undefined
}): SwordsSecondBeatOption[] {
  const focus = input.relevantMemory?.characterDevelopment?.focus
  if (!focus) {
    return input.options
  }

  function score(option: SwordsSecondBeatOption): number {
    switch (focus) {
      case 'edge':
        return option.value === 'cut-the-sign-chain' || option.value === 'hold-the-line'
          ? 2
          : 0
      case 'composure':
        return option.value === 'keep-bowing' || option.value === 'hold-the-line'
          ? 2
          : 0
      case 'nerve':
        return option.value === 'double-down' || option.value === 'name-a-false-title'
          ? 2
          : 0
      case 'witness':
        return option.value === 'meet-the-gaze' || option.value === 'ask-the-price'
          ? 2
          : 0
      case 'threshold':
        return option.value === 'cut-the-sign-chain' || option.value === 'ask-the-price'
          ? 2
          : 0
      case 'myth':
        return option.value === 'meet-the-gaze' || option.value === 'double-down'
          ? 2
          : 0
      default:
        return 0
    }
  }

  const rewritten = input.options.map(option => {
    if (focus === 'edge' && option.value === 'cut-the-sign-chain') {
      return {
        ...option,
        description: `${option.description} The world has started watching what you do with force, and it plans to leave the fallout in your name.`,
      }
    }

    if (focus === 'composure' && option.value === 'keep-bowing') {
      return {
        ...option,
        description: `${option.description} This road now reads like a test of whether your calm is real or merely a way of surrendering initiative more gracefully.`,
      }
    }

    if (focus === 'nerve' && option.value === 'double-down') {
      return {
        ...option,
        description: `${option.description} The place seems almost eager to discover whether your nerve can survive contradiction and still pay its own debt.`,
      }
    }

    if (focus === 'witness' && option.value === 'meet-the-gaze') {
      return {
        ...option,
        description: `${option.description} The hidden part of the scene is no longer certain it can stare without being stared at in return, which means it is closer to noticing you as well.`,
      }
    }

    if (focus === 'threshold' && option.value === 'ask-the-price') {
      return {
        ...option,
        description: `${option.description} Boundaries have started acting as if they owe you an answer or a warning, and either one may move you across something irreversible.`,
      }
    }

    if (focus === 'myth' && option.value === 'meet-the-gaze') {
      return {
        ...option,
        description: `${option.description} The uncanny around you is close to becoming visible proof, which means ordinary explanation is about to lose ground.`,
      }
    }

    return option
  })

  return [...rewritten].sort((left, right) => score(right) - score(left))
}
