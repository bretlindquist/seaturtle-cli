import type { SwordsOfChaosRelevantMemory } from '../types/memory.js'
import type {
  SwordsOfChaosOutcome,
  SwordsOfChaosOpeningChoice,
  SwordsOfChaosSecondChoice,
} from '../types/outcomes.js'
import type {
  SwordsOfChaosSceneState,
  SwordsOfChaosStoryContinuation,
} from '../types/save.js'
import type { SwordsSecondBeatOption } from '../types/shells.js'
import type { SwordsOpeningOption } from '../types/shells.js'
import type { SwordsOfChaosEncounterLocus } from '../types/worldMap.js'

function getSwordsLocusName(
  locus: SwordsOfChaosEncounterLocus,
): string {
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

function getObjectiveHint(
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): string | undefined {
  if (!relevantMemory?.currentObjective) {
    return undefined
  }

  return `Current objective: ${relevantMemory.currentObjective}`
}

function getTensionHint(
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): string | undefined {
  switch (relevantMemory?.storyTension) {
    case 'high':
      return 'The pressure is already high enough that the scene may punish hesitation as quickly as aggression.'
    case 'rising':
      return 'The pressure is building; whatever you choose here is likely to carry forward.'
    default:
      return undefined
  }
}

function scoreOptionAgainstObjective(
  option: SwordsSecondBeatOption,
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): number {
  const objective = relevantMemory?.currentObjective?.toLowerCase()
  if (!objective) {
    return 0
  }

  const text = `${option.label} ${option.description}`.toLowerCase()
  let score = 0

  const keywordGroups: string[][] = [
    ['door', 'threshold', 'hatch', 'latch', 'open', 'sealed', 'shut'],
    ['watch', 'witness', 'see', 'gaze', 'observe', 'recognize'],
    ['name', 'truth', 'wrong', 'signal', 'warning', 'broadcast', 'speaker'],
    ['promise', 'oath', 'keep', 'refuse', 'refusal'],
    ['relic', 'metal', 'blade', 'shell-green'],
  ]

  for (const group of keywordGroups) {
    const objectiveMatches = group.some(keyword => objective.includes(keyword))
    if (!objectiveMatches) {
      continue
    }

    if (group.some(keyword => text.includes(keyword))) {
      score += 2
    }
  }

  return score
}

function scoreOpeningOptionAgainstObjective(
  option: SwordsOpeningOption,
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): number {
  const objective = relevantMemory?.currentObjective?.toLowerCase()
  if (!objective) {
    return 0
  }

  const text = `${option.label} ${option.description}`.toLowerCase()
  let score = 0

  if (
    objective.includes('watch') ||
    objective.includes('witness') ||
    objective.includes('recognize')
  ) {
    if (
      text.includes('wait') ||
      text.includes('observe') ||
      text.includes('listen') ||
      text.includes('recognition')
    ) {
      score += 2
    }
  }

  if (
    objective.includes('relic') ||
    objective.includes('metal') ||
    objective.includes('threshold') ||
    objective.includes('sealed')
  ) {
    if (
      text.includes('edge') ||
      text.includes('steel') ||
      text.includes('probe') ||
      text.includes('threaten')
    ) {
      score += 2
    }
  }

  if (
    objective.includes('name') ||
    objective.includes('system') ||
    objective.includes('truth') ||
    objective.includes('signal')
  ) {
    if (
      text.includes('address') ||
      text.includes('speak') ||
      text.includes('invoke') ||
      text.includes('act like')
    ) {
      score += 2
    }
  }

  return score
}

function getChoicePressureRewrite(
  openingChoice: SwordsOfChaosOpeningChoice,
  option: SwordsSecondBeatOption,
  locus: SwordsOfChaosEncounterLocus,
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): SwordsSecondBeatOption {
  const objectiveHint = getObjectiveHint(relevantMemory)
  const tensionHint = getTensionHint(relevantMemory)

  if (!objectiveHint && !tensionHint) {
    return option
  }

  let label = option.label
  if (relevantMemory?.storyTension === 'high') {
    if (openingChoice === 'draw-steel') {
      label = label.replace(/^Cut\b/, 'Force')
      label = label.replace(/^Hold\b/, 'Hold Fast')
    } else if (openingChoice === 'bow-slightly') {
      label = label.replace(/^Keep\b/, 'Keep Steady')
      label = label.replace(/^Ask\b/, 'Press')
    } else if (openingChoice === 'talk-like-you-belong') {
      label = label.replace(/^Name\b/, 'Commit to')
      label = label.replace(/^Double\b/, 'Push')
    }
  } else if (relevantMemory?.storyTension === 'rising') {
    if (option.value === 'hold-the-line' || option.value === 'keep-bowing') {
      label = `Hold Through ${label}`
    }
  }

  const added = [objectiveHint, tensionHint].filter(Boolean).join(' ')
  return {
    ...option,
    label,
    description: added ? `${option.description} ${added}` : option.description,
  }
}

export function getSwordsStoryChapterLine(
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): string | undefined {
  if (!relevantMemory || relevantMemory.storyChapter <= 0) {
    return undefined
  }

  if (relevantMemory.chapterTitle) {
    return `Chapter ${relevantMemory.storyChapter}, ${relevantMemory.chapterTitle}`
  }

  if (relevantMemory.currentObjective) {
    return `Chapter ${relevantMemory.storyChapter}: ${relevantMemory.currentObjective}`
  }

  return `Chapter ${relevantMemory.storyChapter} is already moving under the visible scene.`
}

export function getSwordsAftermathLine(
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
  locus: SwordsOfChaosEncounterLocus,
): string | undefined {
  if (relevantMemory?.carryForward) {
    return relevantMemory.carryForward
  }

  if (!relevantMemory?.lastOutcomeKey || relevantMemory.storyChapter <= 0) {
    return undefined
  }

  const place = getSwordsLocusName(locus)

  switch (relevantMemory.lastOutcomeKey) {
    case 'relic':
      return `What you carried out of the last chapter has changed the way ${place} looks back at you.`
    case 'title':
      return `The name you earned in the last chapter has reached ${place} ahead of your footsteps.`
    case 'oath':
      return `The oath from the last chapter still hangs over ${place}, asking whether you meant it.`
    case 'truth':
      return `The truth you pulled from the last chapter has made ${place} harder to mistake for coincidence.`
    case 'refusal':
      return `The refusal from the last chapter still has teeth. ${place} has not forgiven the unfinished question.`
    default:
      return undefined
  }
}

export function getSwordsCarryForwardPressure(
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
  locus: SwordsOfChaosEncounterLocus,
): string[] {
  if (!relevantMemory?.carryForward) {
    return []
  }

  const place = getSwordsLocusName(locus)
  const pressure: string[] = []
  const carry = relevantMemory.carryForward.toLowerCase()

  if (
    carry.includes('watch') ||
    carry.includes('witness') ||
    carry.includes('seen')
  ) {
    pressure.push(`Whatever changed last chapter is still watching from somewhere inside ${place}.`)
  }

  if (
    carry.includes('name') ||
    carry.includes('designation') ||
    carry.includes('signal') ||
    carry.includes('broadcast')
  ) {
    pressure.push(`The wrong name is no longer background noise in ${place}; it behaves like an active claim.`)
  }

  if (
    carry.includes('oath') ||
    carry.includes('promise') ||
    carry.includes('binding')
  ) {
    pressure.push(`The air in ${place} now carries your last promise like a condition instead of a memory.`)
  }

  if (
    carry.includes('threshold') ||
    carry.includes('door') ||
    carry.includes('sealed') ||
    carry.includes('hatch')
  ) {
    pressure.push(`Something in ${place} is acting less like scenery and more like a threshold that already chose a side.`)
  }

  if (
    carry.includes('relic') ||
    carry.includes('shell-green') ||
    carry.includes('metal')
  ) {
    pressure.push(`Shell-green consequence still clings to ${place}; the scene feels contaminated by what you carried forward.`)
  }

  if (relevantMemory.storyTension === 'high') {
    pressure.push(`Chapter pressure is high enough that ${place} is no longer disguising consequence as atmosphere.`)
  }

  return pressure.slice(0, 2)
}

export function getSwordsChapterTitle(input: {
  outcomeThread: string
  encounterLocus: SwordsOfChaosEncounterLocus
  outcome: SwordsOfChaosOutcome
}): string {
  switch (input.outcomeThread) {
    case 'half-shell-relic-trail':
      return input.encounterLocus === 'ocean-ship'
        ? 'Below-Deck Relic'
        : 'The Relic Trail'
    case 'broken-lamp-witnesses':
      return 'The Watching Light'
    case 'alley-oath-keepers':
      return 'Architecture of Oaths'
    case 'sign-truth-fractures':
      return input.encounterLocus === 'space-station'
        ? 'Wrong Designation'
        : 'Fractured Names'
    case 'quiet-refusals':
      return 'The Refused Threshold'
    default:
      return 'The Pressure Underneath'
  }
}

export function getSwordsCarryForward(input: {
  route: string
  outcomeThread: string
  encounterLocus: SwordsOfChaosEncounterLocus
  outcome: SwordsOfChaosOutcome
}): string {
  switch (input.route) {
    case 'draw-steel:cut-the-sign-chain':
      return input.encounterLocus === 'space-station'
        ? 'The corridor now feels like a place that has already been cut open once and remembers the insult.'
        : 'Something structural in the place has been cut loose; the world will not hang together quite the same way next time.'
    case 'draw-steel:hold-the-line':
      return 'The place now recognizes your refusal to yield, and that recognition is becoming its own kind of invitation.'
    case 'draw-steel:lower-the-blade':
      return 'The denied violence still lingers in the air, asking what kind of force you intend to become instead.'
    case 'bow-slightly:keep-bowing':
      return 'Your restraint altered the rhythm of the scene; quieter doors are starting to act like they might answer you.'
    case 'bow-slightly:meet-the-gaze':
      return 'Something that prefers to watch from cover now knows you are willing to look back.'
    case 'bow-slightly:ask-the-price':
      return 'The bargain is now explicit; future scenes will behave as if terms are already under discussion.'
    case 'talk-like-you-belong:name-a-false-title':
      return 'The lie failed cleanly enough to leave a scar; the world will be less easy to bluff and more interested in why you tried.'
    case 'talk-like-you-belong:laugh-like-you-mean-it':
      return 'Your nerve shifted the mood of the chapter; improbable openings are more likely to arrive smiling before they arrive hostile.'
    case 'talk-like-you-belong:double-down':
      return 'You pushed the scene until it almost adopted your version of events; future chapters will have to decide whether that was confidence or prophecy.'
    default:
      return input.outcomeThread === 'quiet-refusals'
        ? 'An unopened answer is now following you between scenes.'
        : 'The chapter changed the place enough that it will not greet you as a stranger again.'
  }
}

export function getSwordsNextContinuation(input: {
  outcomeThread: string
  currentObjective: string
  carryForward: string
}): SwordsOfChaosStoryContinuation {
  if (
    input.outcomeThread === 'broken-lamp-witnesses' ||
    input.carryForward.toLowerCase().includes('watch')
  ) {
    return {
      kind: 'watcher-pressure',
      summary: 'The unseen witness is no longer just observing from the edge of the story. It has started positioning itself for the next scene.',
      nextPressure: 'The next scene should feel watched early, before anything openly reveals itself.',
      pacing: 'linger',
    }
  }

  if (
    input.outcomeThread === 'sign-truth-fractures' ||
    input.carryForward.toLowerCase().includes('name')
  ) {
    return {
      kind: 'wrong-name-echo',
      summary: 'The wrong name has moved from omen into active contamination. Places and systems are starting to rehearse it.',
      nextPressure: 'The next scene should let the false designation intrude before the player fully understands where it is coming from.',
      pacing: 'reveal',
    }
  }

  if (
    input.outcomeThread === 'alley-oath-keepers' ||
    input.carryForward.toLowerCase().includes('promise') ||
    input.carryForward.toLowerCase().includes('oath')
  ) {
    return {
      kind: 'oath-binding',
      summary: 'A promise from the last chapter is still binding the shape of the story. Restraint and commitment now mean more than posture.',
      nextPressure: 'The next scene should treat chosen restraint as a binding act, not neutral delay.',
      pacing: 'linger',
    }
  }

  if (
    input.outcomeThread === 'quiet-refusals' ||
    input.carryForward.toLowerCase().includes('threshold') ||
    input.carryForward.toLowerCase().includes('door') ||
    input.carryForward.toLowerCase().includes('sealed')
  ) {
    return {
      kind: 'threshold-strain',
      summary: 'An unopened threshold is still under load. The story has not decided whether it wants opening, breach, or refusal.',
      nextPressure: 'The next scene should make boundaries feel occupied and unstable before it asks for another commitment.',
      pacing: 'press',
    }
  }

  if (
    input.outcomeThread === 'half-shell-relic-trail' ||
    input.carryForward.toLowerCase().includes('relic') ||
    input.carryForward.toLowerCase().includes('shell-green')
  ) {
    return {
      kind: 'relic-resonance',
      summary: 'Material consequence is now in play. The world is carrying shell-green proof from chapter to chapter.',
      nextPressure: 'The next scene should put some visible sign of relic consequence near the player before it explains it.',
      pacing: 'reveal',
    }
  }

  return {
    kind: 'unquiet-aftermath',
    summary: `Chapter aftermath is still unfolding around one pressure: ${input.currentObjective}`,
    nextPressure: 'The next scene should acknowledge unfinished consequence before it settles into a fresh local problem.',
    pacing: 'linger',
  }
}

export function getSwordsContinuationLead(
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): string | undefined {
  if (!relevantMemory?.continuation) {
    return undefined
  }

  return `Still unfolding: ${relevantMemory.continuation.summary}`
}

export function getSwordsContinuationPressure(
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): string[] {
  if (!relevantMemory?.continuation) {
    return []
  }

  return [relevantMemory.continuation.nextPressure]
}

export function getSwordsNextSceneState(input: {
  openingChoice: SwordsOfChaosOpeningChoice
  secondChoice: SwordsOfChaosSecondChoice
  outcomeThread: string
  continuation: SwordsOfChaosStoryContinuation
  currentObjective: string
}): SwordsOfChaosSceneState {
  const lastProgressedAt = Date.now()

  if (
    input.continuation.kind === 'watcher-pressure' ||
    input.secondChoice === 'meet-the-gaze'
  ) {
    return {
      kind: 'watched-approach',
      status: 'complicating',
      commitment: 'You have already moved into a scene that knows it is being observed from the far side.',
      hazard: 'The watcher may answer before it fully reveals what it is.',
      pendingReveal: 'The hidden witness is close to choosing whether to stay symbolic or become present.',
      beatsElapsed: 1,
      lastProgressedAt,
    }
  }

  if (
    input.continuation.kind === 'threshold-strain' ||
    input.secondChoice === 'cut-the-sign-chain'
  ) {
    return {
      kind: 'threshold-contest',
      status: 'live',
      commitment: 'You have entered an argument with a boundary that now treats you as part of the question.',
      hazard: 'The threshold may answer with access, violence, or a bargain you did not intend to make.',
      pendingReveal: 'Whatever holds the boundary together is preparing to show its hand.',
      beatsElapsed: 1,
      lastProgressedAt,
    }
  }

  if (
    input.continuation.kind === 'wrong-name-echo' ||
    input.secondChoice === 'name-a-false-title'
  ) {
    return {
      kind: 'name-pressure',
      status: 'revealing',
      commitment: 'You are now inside a scene where names can alter the shape of what answers.',
      hazard: 'A wrong designation may get accepted long enough to become dangerous.',
      pendingReveal: 'The next scene should show who or what has been rehearsing the false name.',
      beatsElapsed: 1,
      lastProgressedAt,
    }
  }

  if (
    input.continuation.kind === 'relic-resonance' ||
    input.outcomeThread === 'half-shell-relic-trail'
  ) {
    return {
      kind: 'relic-nearness',
      status: 'revealing',
      commitment: 'Material myth is now near enough to touch the scene.',
      hazard: 'Proof can arrive before context, leaving the player to survive the meaning later.',
      pendingReveal: 'A shell-green sign or object is about to cross from implication into evidence.',
      beatsElapsed: 1,
      lastProgressedAt,
    }
  }

  if (
    input.continuation.kind === 'oath-binding' ||
    input.secondChoice === 'keep-bowing'
  ) {
    return {
      kind: 'oath-test',
      status: 'complicating',
      commitment: 'Your restraint now behaves like a vow the world intends to check.',
      hazard: 'The scene may punish false composure more sharply than open aggression.',
      pendingReveal: 'Something in the world is preparing to test whether your chosen line was real.',
      beatsElapsed: 1,
      lastProgressedAt,
    }
  }

  return {
    kind: 'unquiet-scene',
    status: 'live',
    commitment: `The current story pressure is still unfolding around one objective: ${input.currentObjective}`,
    hazard: 'The local scene is no longer fully local.',
    pendingReveal: 'The next beat should disclose what part of the scene is actually carrying the larger thread.',
    beatsElapsed: 1,
    lastProgressedAt,
  }
}

export function getSwordsSceneStateLead(
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): string | undefined {
  if (!relevantMemory?.sceneState) {
    return undefined
  }

  return `Still unfolding in the immediate scene: ${relevantMemory.sceneState.commitment}`
}

export function getSwordsSceneStatePressure(
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): string[] {
  if (!relevantMemory?.sceneState) {
    return []
  }

  return [
    `Live hazard: ${relevantMemory.sceneState.hazard}`,
    `Pending reveal: ${relevantMemory.sceneState.pendingReveal}`,
  ]
}

export function getSwordsStorySecondBeatPressure(
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): string[] {
  const lines: string[] = []

  if (relevantMemory?.currentObjective) {
    lines.push(`Current pressure: ${relevantMemory.currentObjective}`)
  }

  const tensionHint = getTensionHint(relevantMemory)
  if (tensionHint) {
    lines.push(tensionHint)
  }

  return lines
}

export function getSwordsStorySecondBeatLead(
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): string | undefined {
  if (!relevantMemory || relevantMemory.storyChapter <= 0) {
    return undefined
  }

  if (relevantMemory.currentObjective) {
    return `The scene is no longer isolated. Chapter ${relevantMemory.storyChapter} is already aiming at something: ${relevantMemory.currentObjective}`
  }

  return undefined
}

export function applySwordsCarryForwardToSecondBeatOptions(input: {
  options: SwordsSecondBeatOption[]
  locus: SwordsOfChaosEncounterLocus
  relevantMemory: SwordsOfChaosRelevantMemory | undefined
}): SwordsSecondBeatOption[] {
  const carry = input.relevantMemory?.carryForward?.toLowerCase()
  if (!carry) {
    return input.options
  }

  const place = getSwordsLocusName(input.locus)

  return input.options.map(option => {
    let label = option.label
    let description = option.description

    if (
      (carry.includes('watch') || carry.includes('witness')) &&
      (option.value === 'meet-the-gaze' || option.value === 'hold-the-line')
    ) {
      label = label.replace(/^(Meet|Hold)\b/, 'Answer')
      description = `${description} Something in ${place} is already watching for whether you acknowledge it.`
    } else if (
      (carry.includes('name') || carry.includes('designation') || carry.includes('signal')) &&
      (option.value === 'ask-the-price' || option.value === 'name-a-false-title')
    ) {
      label = label.replace(/^(Ask|Name)\b/, 'Challenge')
      description = `${description} The wrong name from last chapter is still in the room, waiting to be contradicted or fed.`
    } else if (
      (carry.includes('oath') || carry.includes('promise') || carry.includes('binding')) &&
      (option.value === 'keep-bowing' || option.value === 'hold-the-line')
    ) {
      label = label.replace(/^(Keep|Hold)\b/, 'Keep Faith with')
      description = `${description} The promise you dragged forward has made restraint feel binding instead of passive.`
    } else if (
      (carry.includes('threshold') || carry.includes('door') || carry.includes('sealed')) &&
      (option.value === 'cut-the-sign-chain' || option.value === 'double-down')
    ) {
      label = label.replace(/^(Cut|Double)\b/, 'Force')
      description = `${description} The threshold pressure from last chapter is still here, asking whether you mean to open or break it.`
    } else if (
      (carry.includes('relic') || carry.includes('shell-green') || carry.includes('metal')) &&
      (option.value === 'cut-the-sign-chain' || option.value === 'meet-the-gaze')
    ) {
      label = label.replace(/^(Cut|Meet)\b/, 'Test')
      description = `${description} The relic thread has left shell-green consequence in ${place}, and this road puts your hand near it.`
    }

    return {
      ...option,
      label,
      description,
    }
  })
}

export function applySwordsStoryPressureToSecondBeatOptions(input: {
  openingChoice: SwordsOfChaosOpeningChoice
  options: SwordsSecondBeatOption[]
  locus: SwordsOfChaosEncounterLocus
  relevantMemory: SwordsOfChaosRelevantMemory | undefined
}): SwordsSecondBeatOption[] {
  const rewritten = input.options.map(option =>
    getChoicePressureRewrite(
      input.openingChoice,
      option,
      input.locus,
      input.relevantMemory,
    ),
  )

  if (!input.relevantMemory?.currentObjective) {
    return rewritten
  }

  return [...rewritten].sort((left, right) => {
    return (
      scoreOptionAgainstObjective(right, input.relevantMemory) -
      scoreOptionAgainstObjective(left, input.relevantMemory)
    )
  })
}

export function applySwordsStoryPressureToOpeningOptions(input: {
  options: SwordsOpeningOption[]
  relevantMemory: SwordsOfChaosRelevantMemory | undefined
}): SwordsOpeningOption[] {
  const rewritten = input.options.map(option => {
    if (input.relevantMemory?.storyTension !== 'high') {
      return option
    }

    if (option.value === 'draw-steel') {
      return {
        ...option,
        label: option.label.replace(/^(Show|Take|Set|Walk|Threaten|Let|Probe)\b/, 'Commit to'),
      }
    }

    if (option.value === 'bow-slightly') {
      return {
        ...option,
        label: option.label.replace(/^(Wait|Hold|Observe|Read|Approach)\b/, 'Hold Through'),
      }
    }

    return {
      ...option,
      label: option.label.replace(/^(Act|Speak|Address|Invoke|Talk|Name)\b/, 'Press'),
    }
  })

  if (!input.relevantMemory?.currentObjective) {
    return rewritten
  }

  return [...rewritten].sort((left, right) => {
    return (
      scoreOpeningOptionAgainstObjective(right, input.relevantMemory) -
      scoreOpeningOptionAgainstObjective(left, input.relevantMemory)
    )
  })
}

export function getSwordsNextStoryObjective(input: {
  outcomeThread: string
  encounterLocus: SwordsOfChaosEncounterLocus
  outcome: SwordsOfChaosOutcome
  previousObjective?: string
}): string {
  switch (input.outcomeThread) {
    case 'half-shell-relic-trail':
      return input.encounterLocus === 'ocean-ship'
        ? 'Take the relic trail below deck and find out what the ship has been carrying for longer than memory.'
        : 'Follow the relic trail until shell-green metal stops behaving like a coincidence.'
    case 'broken-lamp-witnesses':
      return 'Find the watcher that keeps changing windows without leaving the story.'
    case 'alley-oath-keepers':
      return 'Test which promise in this world is still binding enough to change what happens next.'
    case 'sign-truth-fractures':
      return input.encounterLocus === 'space-station'
        ? 'Trace the broken designation through the station and find out who taught the system the wrong name.'
        : 'Track the wrong name until you find the mouth, machine, or myth that keeps repeating it.'
    case 'quiet-refusals':
      return 'Push toward the sealed threshold this chapter most wants you to leave unopened.'
    default:
      return (
        input.previousObjective ??
        'Follow the pressure until the scene stops pretending it is only local.'
      )
  }
}

export function getSwordsNextStoryTension(input: {
  route: string
  outcome: SwordsOfChaosOutcome
}): 'low' | 'rising' | 'high' {
  if (input.outcome.gameResult === 'loss') {
    return 'high'
  }

  if (
    input.route.endsWith('cut-the-sign-chain') ||
    input.route.endsWith('double-down') ||
    input.route.endsWith('name-a-false-title')
  ) {
    return 'high'
  }

  return 'rising'
}

export function buildSwordsStoryResultText(input: {
  baseEnding: string
  chapter: number
  chapterTitle: string
  encounterLocus: SwordsOfChaosEncounterLocus
  outcomeThread: string
  outcome: SwordsOfChaosOutcome
  nextObjective: string
  nextTension: 'low' | 'rising' | 'high'
  carryForward: string
  characterTitle?: string
  characterStage?: number
  characterLesson?: string
  variationLines?: string[]
}): string {
  const locusName = getSwordsLocusName(input.encounterLocus)

  const threadLine =
    input.outcomeThread === 'half-shell-relic-trail'
      ? 'The relic trail has hardened into the chapter’s center of gravity.'
      : input.outcomeThread === 'broken-lamp-witnesses'
        ? 'The witness thread has deepened; something keeps watching from the edge of events.'
        : input.outcomeThread === 'alley-oath-keepers'
          ? 'The oath thread has tightened; promises now feel like architecture instead of dialogue.'
          : input.outcomeThread === 'sign-truth-fractures'
            ? 'The truth-fracture thread has advanced; the wrong name is no longer acting accidental.'
            : 'The refusal thread has advanced; closed things are beginning to feel intentional.'

  const tensionLine =
    input.nextTension === 'high'
      ? `Chapter ${input.chapter} ends with pressure still climbing in ${locusName}.`
      : `Chapter ${input.chapter} closes, but ${locusName} is still carrying the weight of what you chose.`

  const worldChangeLine = input.variationLines?.[0]
    ? `${input.carryForward} ${input.variationLines[0]}`
    : input.carryForward
  const characterChangeLine = input.characterTitle
    ? input.characterLesson
      ? `${input.characterTitle}${input.characterStage ? ` (${input.characterStage})` : ''}. ${input.characterLesson}`
      : `${input.characterTitle}${input.characterStage ? ` (${input.characterStage})` : ''}.`
    : undefined
  const nextPressureLine = [threadLine, tensionLine, `Objective: ${input.nextObjective}`].join(' ')
  const residueLines = (input.variationLines ?? []).slice(1)

  return [
    input.baseEnding,
    `Chapter ${input.chapter}: ${input.chapterTitle}`,
    `What changed in the world: ${worldChangeLine}`,
    ...(characterChangeLine
      ? [`What changed in you: ${characterChangeLine}`]
      : []),
    `What comes next: ${nextPressureLine}`,
    ...residueLines,
  ].join('\n\n')
}

export function getSwordsOutcomeVariationLines(input: {
  encounterLocus: SwordsOfChaosEncounterLocus
  relevantMemory: SwordsOfChaosRelevantMemory | undefined
}): string[] {
  const lines: string[] = []
  const place = getSwordsLocusName(input.encounterLocus)
  const continuation = input.relevantMemory?.continuation
  const sceneState = input.relevantMemory?.sceneState
  const character = input.relevantMemory?.characterDevelopment

  if (continuation?.kind === 'watcher-pressure') {
    lines.push(`The watcher pressure does not end with the immediate result. ${place} still feels observed from an angle you have not earned yet.`)
  } else if (continuation?.kind === 'wrong-name-echo') {
    lines.push(`The wrong name is still working in ${place}. The chapter closes, but designation and reality have not fully agreed.`)
  } else if (continuation?.kind === 'threshold-strain') {
    lines.push(`The chapter closes without settling the threshold strain. ${place} still behaves like a boundary that remembers the argument.`)
  } else if (continuation?.kind === 'relic-resonance') {
    lines.push(`Material myth lingers in ${place}. What touched the scene is not finished being evidence.`)
  } else if (continuation?.kind === 'oath-binding') {
    lines.push(`The result now lives under oath pressure. ${place} will remember whether you meant the line you chose.`)
  }

  if (sceneState?.kind === 'watched-approach') {
    lines.push('The committed approach remains live. The hidden witness has not yet decided whether to stay unseen.')
  } else if (sceneState?.kind === 'threshold-contest') {
    lines.push('The scene resolves locally, but the threshold contest is not morally settled yet.')
  } else if (sceneState?.kind === 'name-pressure') {
    lines.push('Names remain unstable around the payoff. What was claimed may still change what answers later.')
  } else if (sceneState?.kind === 'relic-nearness') {
    lines.push('The payoff leaves matter behind. This chapter ended near proof, not merely near rumor.')
  } else if (sceneState?.kind === 'oath-test') {
    lines.push('The chapter ends, but the vow-shaped pressure remains active.')
  }

  if (character?.focus === 'edge') {
    lines.push('The world is beginning to score your choices by what you do with force, not only by whether you win.')
  } else if (character?.focus === 'composure') {
    lines.push('Restraint is no longer reading as passivity. The world is starting to test it like a form of power and to charge interest when it delays action.')
  } else if (character?.focus === 'nerve') {
    lines.push('Your confidence is gaining consequences. Future scenes will be less willing to treat boldness as harmless style or free access.')
  } else if (character?.focus === 'witness') {
    lines.push('Being willing to look back is changing what stays hidden around you, and what hidden things now remember about you.')
  } else if (character?.focus === 'threshold') {
    lines.push('Boundaries are beginning to remember you as a recurring problem, which means crossing and belonging are both becoming less simple.')
  } else if (character?.focus === 'myth') {
    lines.push('The uncanny around you is hardening from implication into history, while ordinary explanation loses more ground with each chapter.')
  }

  if (input.relevantMemory?.magicState?.activeImpossible === 'crossing') {
    lines.push('A magical crossing has opened in the wake of this chapter. Later scenes may not respect ordinary distance or direction.')
  } else if (input.relevantMemory?.magicState?.activeImpossible === 'witness') {
    lines.push('Impossible witness pressure remains after the payoff. Hidden observers are becoming less deniable.')
  } else if (input.relevantMemory?.magicState?.activeImpossible === 'relic-sign') {
    lines.push('The chapter ends near visible evidence of the uncanny. Myth is no longer staying politely symbolic.')
  }

  return lines.slice(0, 3)
}
