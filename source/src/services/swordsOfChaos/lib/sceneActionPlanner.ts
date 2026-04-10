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
      return `Stakes: something is entering ${place} before invitation; if you misread it, it may choose the first real cost for you.`
    case 'negotiation':
      return `Stakes: ${place} is close to naming terms; accept the wrong shape of bargain and the chapter may remember it as consent.`
    case 'pursuit':
      return `Stakes: movement matters now; hesitate too long and the scene may decide what gets hunted, lost, or cornered.`
    case 'omen':
      return `Stakes: the sign is not decorative; touch it carelessly and myth may become evidence before you are ready to carry it.`
    case 'test':
      return `Stakes: the scene is testing a boundary; pass, break, or refuse it, but none of those answers will leave ${place} unchanged.`
    case 'revelation':
      return `Stakes: a hidden truth is close enough to answer; force it too early and it may answer in the wrong name.`
    case 'debt-collection':
      return `Stakes: a prior promise or unpaid cost has entered ${place}; the next move may decide whether it becomes leverage or chain.`
    case 'false-refuge':
      return `Stakes: ${place} is offering shelter too easily; if it is lying, comfort may be the trap instead of the reward.`
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
  draw: string
  courtesy: string
  nerve: string
} {
  const place = titleCase(getPlaceNoun(input.locus))
  const family = getSwordsSceneFamily(input)

  switch (family) {
    case 'intrusion':
      return {
        draw: 'Block the Intrusion',
        courtesy: 'Let It Come Close Without Yielding',
        nerve: 'Call Out the Thing Crossing In',
      }
    case 'negotiation':
      return {
        draw: 'Set Terms with a Visible Threat',
        courtesy: 'Offer Careful Terms',
        nerve: 'Claim You Already Know the Price',
      }
    case 'pursuit':
      return {
        draw: 'Turn and Make Pursuit Costly',
        courtesy: 'Freeze the Trail and Listen',
        nerve: 'Move Like the Path Belongs to You',
      }
    case 'omen':
      return {
        draw: 'Test the Omen with an Edge',
        courtesy: 'Study the Omen Before It Changes',
        nerve: 'Name the Omen First',
      }
    case 'test':
      return {
        draw: 'Challenge the Test Directly',
        courtesy: 'Submit Only to the Rule You Choose',
        nerve: 'Cheat the Test Out Loud',
      }
    case 'revelation':
      return {
        draw: 'Force the Reveal Open',
        courtesy: 'Let the Reveal Finish',
        nerve: 'Answer Before the Truth Does',
      }
    case 'debt-collection':
      return {
        draw: 'Refuse the Debt at Bladepoint',
        courtesy: 'Ask Which Debt Is Real',
        nerve: 'Claim the Debt Is Already Paid',
      }
    case 'false-refuge':
      return {
        draw: 'Check the Refuge for Teeth',
        courtesy: 'Rest Without Trusting It',
        nerve: 'Pretend You Expected Sanctuary',
      }
    default:
      return {
        draw:
          input.locus === 'space-station'
            ? 'Force the Corridor to Answer'
            : input.locus === 'dark-dungeon'
              ? 'Threaten the Listening Dark'
              : input.locus === 'fae-realm'
                ? 'Test the Glamour with an Edge'
                : `Take ${place} as Contested Ground`,
        courtesy:
          input.locus === 'space-station'
            ? 'Hold for Recognition'
            : input.locus === 'fae-realm'
              ? 'Wait with Courtly Precision'
              : input.locus === 'dark-dungeon'
                ? 'Stay Still and Listen Back'
                : `Hold Still and Read ${place}`,
        nerve:
          input.locus === 'space-station'
            ? 'Address the Listening System'
            : input.locus === 'fae-realm'
              ? 'Invoke an Unwelcome Form'
              : input.locus === 'dark-dungeon'
                ? 'Speak First Into the Dark'
                : `Act Like ${place} Already Knows You`,
      }
  }
}

function applySceneFamilyToSecondBeatOption(input: {
  option: SwordsSecondBeatOption
  locus: SwordsOfChaosEncounterLocus
  relevantMemory: SwordsOfChaosRelevantMemory | undefined
}): SwordsSecondBeatOption {
  const family = getSwordsSceneFamily(input)
  const stakesTail = getStakesTail(input)

  switch (family) {
    case 'intrusion':
      return {
        ...input.option,
        label: input.option.label
          .replace(/^Look Back\b/, 'Confront')
          .replace(/^Keep\b/, 'Hold Against'),
        description: `${input.option.description} The intrusion is close enough that ignoring it counts as permission.${stakesTail}`,
      }
    case 'negotiation':
      return {
        ...input.option,
        label: input.option.label
          .replace(/^Ask\b/, 'Set Terms with')
          .replace(/^Relent\b/, 'Concede Ground Without'),
        description: `${input.option.description} This choice may become terms the world can cite later.${stakesTail}`,
      }
    case 'pursuit':
      return {
        ...input.option,
        label: input.option.label
          .replace(/^Keep\b/, 'Drive')
          .replace(/^Commit\b/, 'Chase'),
        description: `${input.option.description} Momentum is part of the danger now; delay is not neutral.${stakesTail}`,
      }
    case 'omen':
      return {
        ...input.option,
        label: input.option.label
          .replace(/^Offer\b/, 'Mark')
          .replace(/^Treat\b/, 'Follow'),
        description: `${input.option.description} The sign may become proof if you give it a route into the chapter.${stakesTail}`,
      }
    case 'test':
      return {
        ...input.option,
        label: input.option.label
          .replace(/^Strike\b/, 'Test')
          .replace(/^Ask\b/, 'Challenge'),
        description: `${input.option.description} The scene is measuring what kind of answer you become under pressure.${stakesTail}`,
      }
    case 'revelation':
      return {
        ...input.option,
        label: input.option.label
          .replace(/^Offer\b/, 'Risk')
          .replace(/^Look Back\b/, 'Make the Hidden Thing Answer'),
        description: `${input.option.description} A truth is close, but it may arrive wearing the wrong shape.${stakesTail}`,
      }
    case 'debt-collection':
      return {
        ...input.option,
        label: input.option.label
          .replace(/^Keep\b/, 'Honor or Break')
          .replace(/^Ask\b/, 'Audit'),
        description: `${input.option.description} Prior cost is in the room now, and the scene is watching who acknowledges it.${stakesTail}`,
      }
    case 'false-refuge':
      return {
        ...input.option,
        label: input.option.label
          .replace(/^Keep\b/, 'Rest Inside')
          .replace(/^Relent\b/, 'Accept Shelter Without'),
        description: `${input.option.description} Safety is being offered early enough to be suspicious.${stakesTail}`,
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
      label: labels.draw,
      value: 'draw-steel',
      description: `Commit pressure openly and make the scene answer with something more honest than atmosphere.${pressureTail}${stakesTail}`,
    },
    {
      label: labels.courtesy,
      value: 'bow-slightly',
      description: `Hold the moment without collapsing it and see what reveals itself when you do not hurry first.${pressureTail}${stakesTail}`,
    },
    {
      label: labels.nerve,
      value: 'talk-like-you-belong',
      description: `Use voice, claim, or familiarity to force the hidden logic here to decide whether to resist you or adopt you.${pressureTail}${stakesTail}`,
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
