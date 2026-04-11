import type { SwordsOfChaosRelevantMemory } from '../types/memory.js'
import type {
  SwordsOfChaosOpeningChoice,
  SwordsOfChaosSecondChoice,
} from '../types/outcomes.js'
import type {
  SwordsOpeningOption,
  SwordsSecondBeatOption,
} from '../types/shells.js'
import type { SwordsOfChaosEncounterLocus } from '../types/worldMap.js'

type SwordsSceneFamily =
  | 'intrusion'
  | 'negotiation'
  | 'pursuit'
  | 'omen'
  | 'test'
  | 'revelation'
  | 'debt-collection'
  | 'false-refuge'

type SwordsMoveKind =
  | 'threaten'
  | 'observe'
  | 'invoke'
  | 'deceive'
  | 'bargain'
  | 'endure'
  | 'follow'
  | 'profane'

function getPlaceNoun(locus: SwordsOfChaosEncounterLocus): string {
  switch (locus) {
    case 'old-tree':
      return 'threshold'
    case 'ocean-ship':
      return 'deck'
    case 'post-apocalyptic-ruin':
      return 'district'
    case 'space-station':
      return 'corridor'
    case 'mars-outpost':
      return 'outpost'
    case 'fae-realm':
      return 'grove'
    case 'dark-dungeon':
      return 'vault'
    case 'alley':
    default:
      return 'alley'
  }
}

function getPressureTail(
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): string {
  const parts = [
    relevantMemory?.sceneState?.hazard,
    relevantMemory?.continuation?.summary,
    relevantMemory?.characterDevelopment?.pressure,
  ].filter(Boolean)

  return parts.length > 0 ? ` ${parts[0]}` : ''
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function getSwordsSceneFamily(input: {
  locus: SwordsOfChaosEncounterLocus
  relevantMemory: SwordsOfChaosRelevantMemory | undefined
}): SwordsSceneFamily {
  const memory = input.relevantMemory

  if (
    memory?.magicState?.activeImpossible === 'crossing' ||
    memory?.sceneState?.kind === 'threshold-contest' ||
    memory?.continuation?.kind === 'threshold-strain'
  ) {
    return 'test'
  }

  if (
    memory?.magicState?.activeImpossible === 'witness' ||
    memory?.sceneState?.kind === 'watched-approach' ||
    memory?.continuation?.kind === 'watcher-pressure'
  ) {
    return 'intrusion'
  }

  if (
    memory?.magicState?.activeImpossible === 'relic-sign' ||
    memory?.sceneState?.kind === 'relic-nearness' ||
    memory?.characterDevelopment?.focus === 'myth'
  ) {
    return 'omen'
  }

  if (
    memory?.sceneState?.kind === 'name-pressure' ||
    memory?.continuation?.kind === 'wrong-name-echo' ||
    memory?.characterDevelopment?.focus === 'witness'
  ) {
    return 'revelation'
  }

  if (
    memory?.sceneState?.kind === 'oath-test' ||
    memory?.continuation?.kind === 'oath-binding' ||
    memory?.carryForward?.toLowerCase().includes('promise') ||
    memory?.carryForward?.toLowerCase().includes('oath')
  ) {
    return 'debt-collection'
  }

  if (memory?.characterDevelopment?.focus === 'composure') {
    return 'negotiation'
  }

  if (
    memory?.storyTension === 'high' ||
    memory?.characterDevelopment?.focus === 'edge'
  ) {
    return 'pursuit'
  }

  if (memory?.familiarPlace && !memory.currentObjective) {
    return 'false-refuge'
  }

  return 'negotiation'
}

export function getSwordsSceneStakesLine(input: {
  locus: SwordsOfChaosEncounterLocus
  relevantMemory: SwordsOfChaosRelevantMemory | undefined
}): string {
  const place = getPlaceNoun(input.locus)
  const family = getSwordsSceneFamily(input)

  switch (family) {
    case 'intrusion':
      return `Stakes: something is crossing into ${place} unasked; if you misread it, the first real cost will not be yours to time.`
    case 'negotiation':
      return `Stakes: ${place} is close to naming terms; take the wrong bargain and the chapter may remember it as consent.`
    case 'pursuit':
      return `Stakes: movement matters now; hesitate too long and the hunt may decide what gets cornered, lost, or claimed.`
    case 'omen':
      return `Stakes: the sign is not decoration; touch it carelessly and rumor may harden into proof before you are ready to carry it.`
    case 'test':
      return `Stakes: a boundary is under trial; pass, break, or refuse it, but none of those answers leave ${place} unchanged.`
    case 'revelation':
      return `Stakes: a hidden truth is close enough to answer; force it too early and it may answer wearing the wrong name.`
    case 'debt-collection':
      return `Stakes: a prior promise or unpaid cost has entered ${place}; the next move may decide whether it becomes leverage or a collar.`
    case 'false-refuge':
      return `Stakes: ${place} is offering shelter too easily; if it is lying, comfort is the bait rather than the reward.`
  }
}

function getStakesTail(input: {
  locus: SwordsOfChaosEncounterLocus
  relevantMemory: SwordsOfChaosRelevantMemory | undefined
}): string {
  return ` ${getSwordsSceneStakesLine(input)}`
}

function getOpeningLabels(input: {
  locus: SwordsOfChaosEncounterLocus
  relevantMemory: SwordsOfChaosRelevantMemory | undefined
}): {
  draw: { label: string; move: SwordsMoveKind }
  courtesy: { label: string; move: SwordsMoveKind }
  nerve: { label: string; move: SwordsMoveKind }
} {
  const place = titleCase(getPlaceNoun(input.locus))
  const family = getSwordsSceneFamily(input)

  switch (family) {
    case 'intrusion':
      return {
        draw: { label: 'Block the Intrusion', move: 'threaten' },
        courtesy: {
          label: 'Let It Come Close Without Yielding',
          move: 'endure',
        },
        nerve: { label: 'Call Out the Thing Crossing In', move: 'invoke' },
      }
    case 'negotiation':
      return {
        draw: { label: 'Set Terms with a Visible Threat', move: 'threaten' },
        courtesy: { label: 'Offer Careful Terms', move: 'bargain' },
        nerve: { label: 'Claim You Already Know the Price', move: 'deceive' },
      }
    case 'pursuit':
      return {
        draw: { label: 'Turn and Make Pursuit Costly', move: 'threaten' },
        courtesy: { label: 'Freeze the Trail and Listen', move: 'observe' },
        nerve: { label: 'Move Like the Path Belongs to You', move: 'follow' },
      }
    case 'omen':
      return {
        draw: { label: 'Test the Omen with an Edge', move: 'profane' },
        courtesy: {
          label: 'Study the Omen Before It Changes',
          move: 'observe',
        },
        nerve: { label: 'Name the Omen First', move: 'invoke' },
      }
    case 'test':
      return {
        draw: { label: 'Challenge the Test Directly', move: 'threaten' },
        courtesy: {
          label: 'Submit Only to the Rule You Choose',
          move: 'endure',
        },
        nerve: { label: 'Cheat the Test Out Loud', move: 'deceive' },
      }
    case 'revelation':
      return {
        draw: { label: 'Force the Reveal Open', move: 'threaten' },
        courtesy: { label: 'Let the Reveal Finish', move: 'observe' },
        nerve: { label: 'Answer Before the Truth Does', move: 'deceive' },
      }
    case 'debt-collection':
      return {
        draw: { label: 'Refuse the Debt at Bladepoint', move: 'threaten' },
        courtesy: { label: 'Ask Which Debt Is Real', move: 'bargain' },
        nerve: { label: 'Claim the Debt Is Already Paid', move: 'deceive' },
      }
    case 'false-refuge':
      return {
        draw: { label: 'Check the Refuge for Teeth', move: 'observe' },
        courtesy: { label: 'Rest Without Trusting It', move: 'endure' },
        nerve: { label: 'Pretend You Expected Sanctuary', move: 'deceive' },
      }
    default:
      return {
        draw:
          input.locus === 'space-station'
            ? { label: 'Force the Corridor to Answer', move: 'threaten' }
            : input.locus === 'dark-dungeon'
              ? { label: 'Threaten the Listening Dark', move: 'threaten' }
              : input.locus === 'fae-realm'
                ? { label: 'Test the Glamour with an Edge', move: 'profane' }
                : {
                    label: `Take ${place} as Contested Ground`,
                    move: 'threaten',
                  },
        courtesy:
          input.locus === 'space-station'
            ? { label: 'Hold for Recognition', move: 'observe' }
            : input.locus === 'fae-realm'
              ? { label: 'Wait with Courtly Precision', move: 'bargain' }
              : input.locus === 'dark-dungeon'
                ? { label: 'Stay Still and Listen Back', move: 'endure' }
                : {
                    label: `Hold Still and Read ${place}`,
                    move: 'observe',
                  },
        nerve:
          input.locus === 'space-station'
            ? { label: 'Address the Listening System', move: 'invoke' }
            : input.locus === 'fae-realm'
              ? { label: 'Invoke an Unwelcome Form', move: 'invoke' }
              : input.locus === 'dark-dungeon'
                ? { label: 'Speak First Into the Dark', move: 'invoke' }
                : {
                    label: `Act Like ${place} Already Knows You`,
                    move: 'deceive',
                  },
      }
  }
}

function getMovePressure(move: SwordsMoveKind): string {
  switch (move) {
    case 'threaten':
      return 'Threaten: raise the cost of opposing you and risk teaching the scene to answer in kind.'
    case 'observe':
      return 'Observe: gather truth before acting, but give the hidden thing time to choose its own posture.'
    case 'invoke':
      return 'Invoke: call on name, omen, protocol, or myth and risk making the answer more binding.'
    case 'deceive':
      return 'Deceive: put a false shape into the world and see whether it rejects the lie or starts using it.'
    case 'bargain':
      return 'Bargain: ask for terms instead of safety and risk owing more than you meant to offer.'
    case 'endure':
      return 'Endure: hold your line long enough for pressure to reveal itself, knowing endurance may be mistaken for consent.'
    case 'follow':
      return 'Follow: accept momentum and pursue the thread before the scene can make itself safe again.'
    case 'profane':
      return 'Profane: violate the expected rule and risk turning a symbol into a consequence.'
  }
}

function getSecondBeatMove(input: {
  option: SwordsSecondBeatOption
  family: SwordsSceneFamily
}): SwordsMoveKind {
  if (input.family === 'omen') {
    if (input.option.value === 'cut-the-sign-chain') {
      return 'profane'
    }
    if (input.option.value === 'meet-the-gaze') {
      return 'invoke'
    }
  }

  if (input.family === 'pursuit') {
    if (
      input.option.value === 'hold-the-line' ||
      input.option.value === 'double-down'
    ) {
      return 'follow'
    }
  }

  switch (input.option.value) {
    case 'cut-the-sign-chain':
      return input.family === 'test' ? 'profane' : 'threaten'
    case 'hold-the-line':
    case 'keep-bowing':
      return 'endure'
    case 'lower-the-blade':
    case 'ask-the-price':
      return 'bargain'
    case 'meet-the-gaze':
      return 'observe'
    case 'name-a-false-title':
    case 'double-down':
      return 'deceive'
    case 'laugh-like-you-mean-it':
      return 'profane'
  }
}

function applySceneFamilyToSecondBeatOption(input: {
  option: SwordsSecondBeatOption
  locus: SwordsOfChaosEncounterLocus
  relevantMemory: SwordsOfChaosRelevantMemory | undefined
}): SwordsSecondBeatOption {
  const family = getSwordsSceneFamily(input)
  const move = getSecondBeatMove({ option: input.option, family })
  const moveTail = getMovePressure(move)
  const stakesTail = getStakesTail(input)

  switch (family) {
    case 'intrusion':
      return {
        ...input.option,
        label: input.option.label
          .replace(/^Look Back\b/, 'Confront')
          .replace(/^Keep\b/, 'Hold Against'),
        description: `${input.option.description} The intrusion is close enough that ignoring it counts as permission. ${moveTail}${stakesTail}`,
      }
    case 'negotiation':
      return {
        ...input.option,
        label: input.option.label
          .replace(/^Ask\b/, 'Set Terms with')
          .replace(/^Relent\b/, 'Concede Ground Without'),
        description: `${input.option.description} This choice may become terms the world can cite later. ${moveTail}${stakesTail}`,
      }
    case 'pursuit':
      return {
        ...input.option,
        label: input.option.label
          .replace(/^Keep\b/, 'Drive')
          .replace(/^Commit\b/, 'Chase'),
        description: `${input.option.description} Momentum is part of the danger now; delay is not neutral. ${moveTail}${stakesTail}`,
      }
    case 'omen':
      return {
        ...input.option,
        label: input.option.label
          .replace(/^Offer\b/, 'Mark')
          .replace(/^Treat\b/, 'Follow'),
        description: `${input.option.description} The sign may become proof if you give it a route into the chapter. ${moveTail}${stakesTail}`,
      }
    case 'test':
      return {
        ...input.option,
        label: input.option.label
          .replace(/^Strike\b/, 'Test')
          .replace(/^Ask\b/, 'Challenge'),
        description: `${input.option.description} The scene is measuring what kind of answer you become under pressure. ${moveTail}${stakesTail}`,
      }
    case 'revelation':
      return {
        ...input.option,
        label: input.option.label
          .replace(/^Offer\b/, 'Risk')
          .replace(/^Look Back\b/, 'Make the Hidden Thing Answer'),
        description: `${input.option.description} A truth is close, but it may arrive wearing the wrong shape. ${moveTail}${stakesTail}`,
      }
    case 'debt-collection':
      return {
        ...input.option,
        label: input.option.label
          .replace(/^Keep\b/, 'Honor or Break')
          .replace(/^Ask\b/, 'Audit'),
        description: `${input.option.description} Prior cost is in the room now, and the scene is watching who acknowledges it. ${moveTail}${stakesTail}`,
      }
    case 'false-refuge':
      return {
        ...input.option,
        label: input.option.label
          .replace(/^Keep\b/, 'Rest Inside')
          .replace(/^Relent\b/, 'Accept Shelter Without'),
        description: `${input.option.description} Safety is being offered early enough to be suspicious. ${moveTail}${stakesTail}`,
      }
  }
}

export function getSwordsOpeningActionSet(input: {
  locus: SwordsOfChaosEncounterLocus
  relevantMemory: SwordsOfChaosRelevantMemory | undefined
}): SwordsOpeningOption[] {
  const pressureTail = getPressureTail(input.relevantMemory)
  const stakesTail = getStakesTail(input)
  const labels = getOpeningLabels(input)

  return [
    {
      label: labels.draw.label,
      value: 'draw-steel',
      description: `Commit pressure openly and make the scene answer with something more honest than atmosphere. ${getMovePressure(labels.draw.move)}${pressureTail}${stakesTail}`,
    },
    {
      label: labels.courtesy.label,
      value: 'bow-slightly',
      description: `Hold the moment without collapsing it and see what reveals itself when you do not hurry first. ${getMovePressure(labels.courtesy.move)}${pressureTail}${stakesTail}`,
    },
    {
      label: labels.nerve.label,
      value: 'talk-like-you-belong',
      description: `Use voice, claim, or familiarity to force the hidden logic here to decide whether to resist you or adopt you. ${getMovePressure(labels.nerve.move)}${pressureTail}${stakesTail}`,
    },
  ]
}

export function getSwordsSecondBeatActionSet(input: {
  openingChoice: SwordsOfChaosOpeningChoice
  locus: SwordsOfChaosEncounterLocus
  relevantMemory: SwordsOfChaosRelevantMemory | undefined
}): SwordsSecondBeatOption[] {
  const place = getPlaceNoun(input.locus)
  const reveal = input.relevantMemory?.sceneState?.pendingReveal
  const revealTail = reveal ? ` ${reveal}` : ''

  if (input.openingChoice === 'draw-steel') {
    return [
      {
        label:
          input.locus === 'space-station'
            ? 'Break the Seal Before It Breaks the Mood'
          : `Strike at What Holds ${place} Together`,
        value: 'cut-the-sign-chain',
        description: `Escalate from threat into contact and see what structural answer the scene was trying not to give.${revealTail}`,
      },
      {
        label: `Keep the Line You Drew`,
        value: 'hold-the-line',
        description: `Stand in the pressure you created and make the hidden part of the scene move first.${revealTail}`,
      },
      {
        label: 'Relent Without Surrendering Presence',
        value: 'lower-the-blade',
        description: `Take one step back from violence and find out whether the scene mistakes mercy for weakness.${revealTail}`,
      },
    ].map(option =>
      applySceneFamilyToSecondBeatOption({
        option,
        locus: input.locus,
        relevantMemory: input.relevantMemory,
      }),
    )
  }

  if (input.openingChoice === 'bow-slightly') {
    return [
      {
        label: 'Keep Faith with the Stillness',
        value: 'keep-bowing',
        description: `Stay inside the chosen restraint long enough to see whether it becomes leverage or exposure.${revealTail}`,
      },
      {
        label: 'Look Back at What Was Looking',
        value: 'meet-the-gaze',
        description: `Answer the hidden witness directly and force it to stop pretending it is only part of the room.${revealTail}`,
      },
      {
        label: `Ask What ${place.charAt(0).toUpperCase() + place.slice(1)} Wants`,
        value: 'ask-the-price',
        description: `Turn composure into negotiation and see what terms the scene was waiting to name.${revealTail}`,
      },
    ].map(option =>
      applySceneFamilyToSecondBeatOption({
        option,
        locus: input.locus,
        relevantMemory: input.relevantMemory,
      }),
    )
  }

  return [
    {
      label: 'Offer a Name the Scene Has Not Earned',
      value: 'name-a-false-title',
      description: `Push identity into the gap and see whether the world rejects the claim or uses it.${revealTail}`,
    },
    {
      label: 'Treat the Tension Like It Almost Likes You',
      value: 'laugh-like-you-mean-it',
      description: `Use ease against dread and find out whether humor opens the scene or merely insults it.${revealTail}`,
    },
    {
      label: 'Commit Harder to Your Version',
      value: 'double-down',
      description: `Press your chosen fiction, confidence, or intuition until the scene has to declare what it thinks is true.${revealTail}`,
    },
  ].map(option =>
    applySceneFamilyToSecondBeatOption({
      option,
      locus: input.locus,
      relevantMemory: input.relevantMemory,
    }),
  )
}
