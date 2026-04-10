import { parseSwordsOfChaosDmSceneResponse } from './dmResponseParser.js'
import {
  buildSwordsOfChaosPromptBundle,
  buildSwordsOfChaosSaveSummary,
} from './dmPromptBuilder.js'
import {
  getSwordsOpeningLabel,
  getSwordsOpeningShellVariant,
  getSwordsSecondBeat,
  getSwordsSecondBeatVariant,
} from './shells.js'
import { getSwordsMagicLine, getSwordsMagicPressure } from './magicPlanner.js'
import {
  getSwordsOpeningActionSet,
  getSwordsSceneStakesLine,
  getSwordsSecondBeatActionSet,
} from './sceneActionPlanner.js'
import {
  applySwordsPresenceToOpeningOptions,
  applySwordsPresenceToSecondBeatOptions,
  getSwordsPresenceLine,
  getSwordsPresencePressure,
} from './presencePlanner.js'
import { getSwordsSeaTurtleFavoredSecondChoice } from './seaturtleChoice.js'
import {
  applySwordsCharacterPressureToSecondBeatOptions,
  getSwordsCharacterDevelopmentHint,
  getSwordsCharacterDevelopmentLine,
  getSwordsCharacterDevelopmentPressure,
  getSwordsCharacterReactionLine,
  getSwordsCharacterRecognitionLine,
  getSwordsCharacterTemptationLine,
} from './characterPlanner.js'
import {
  applySwordsCarryForwardToSecondBeatOptions,
  applySwordsStoryPressureToOpeningOptions,
  applySwordsStoryPressureToSecondBeatOptions,
  getSwordsAftermathLine,
  getSwordsCarryForwardPressure,
  getSwordsContinuationLead,
  getSwordsContinuationPressure,
  getSwordsSceneStateLead,
  getSwordsSceneStatePressure,
  getSwordsStoryChapterLine,
  getSwordsStorySecondBeatLead,
  getSwordsStorySecondBeatPressure,
} from './storyPlanner.js'
import {
  getSwordsEncounterLocus,
  getSwordsRecurringSymbol,
  getSwordsThreadEcho,
  getSwordsThreadPressureText,
  getSwordsWorldMapWeight,
} from './worldMap.js'
import type {
  SwordsOfChaosDmSceneResponse,
  SwordsOfChaosPromptPayload,
} from '../types/dm.js'
import type { SwordsOfChaosRelevantMemory } from '../types/memory.js'
import type { SwordsOfChaosOpeningChoice } from '../types/outcomes.js'
import type { SwordsOpeningOption, SwordsSecondBeatOption } from '../types/shells.js'

function getOpeningChoiceLeadLabel(
  openingChoice: SwordsOfChaosOpeningChoice,
): string {
  return getSwordsOpeningLabel(openingChoice).toLowerCase()
}

function limitSceneAccents(
  locus: ReturnType<typeof getSwordsEncounterLocus>,
  lines: Array<string | undefined>,
): string[] {
  const filtered = lines.filter(
    (line, index, arr): line is string =>
      Boolean(line) && arr.findIndex(other => other === line) === index,
  )

  return filtered.slice(0, 1)
}

function getBiomeRecallLanguage(
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): {
  place: string
  witness: string
  atmosphere: string
  quietApproval: string
} {
  switch (relevantMemory?.encounterShift) {
    case 'old-tree':
      return {
        place: 'the old tree',
        witness: 'the roots',
        atmosphere: 'Even the hanging roots seem to recognize the restraint.',
        quietApproval:
          ' Something in the leaves seems to approve of this quieter line.',
      }
    case 'ocean-ship':
      return {
        place: 'the ship',
        witness: 'the deck',
        atmosphere: 'Even the salt wind seems to recognize the restraint.',
        quietApproval:
          ' Something in the lantern swing seems to approve of this quieter line.',
      }
    case 'post-apocalyptic-ruin':
      return {
        place: 'the ruin',
        witness: 'the siren tower',
        atmosphere:
          'Even the ash-laced static seems to recognize the restraint.',
        quietApproval:
          ' Something in the dead warning tone seems to approve of this quieter line.',
      }
    case 'space-station':
      return {
        place: 'the station',
        witness: 'the corridor',
        atmosphere:
          'Even the strip-lights seem to recognize the restraint.',
        quietApproval:
          ' Something in the station hum seems to approve of this quieter line.',
      }
    case 'mars-outpost':
      return {
        place: 'the outpost',
        witness: 'the beacon',
        atmosphere:
          'Even the dust-laced static seems to recognize the restraint.',
        quietApproval:
          ' Something in the dead beacon pulse seems to approve of this quieter line.',
      }
    case 'fae-realm':
      return {
        place: 'the grove',
        witness: 'the foxfire',
        atmosphere:
          'Even the foxfire seems to recognize the restraint.',
        quietApproval:
          ' Something in the watching glamour seems to approve of this quieter line.',
      }
    case 'dark-dungeon':
      return {
        place: 'the dungeon',
        witness: 'the dark',
        atmosphere:
          'Even the whispering dark seems to recognize the restraint.',
        quietApproval:
          ' Something in the listening dark seems to approve of this quieter line.',
      }
    default:
      return {
        place: 'the alley',
        witness: 'the sign',
        atmosphere: 'Even the rain seems to recognize the restraint.',
        quietApproval:
          ' Something in the rain seems to approve of this quieter line.',
      }
  }
}

function applyOpeningCallbackMemory(
  options: SwordsOpeningOption[],
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): SwordsOpeningOption[] {
  if (!relevantMemory?.familiarPlace) {
    return options
  }

  const priorOpeners = new Set(
    relevantMemory.priorRoutes.map(route => route.split(':')[0]),
  )
  const recall = getBiomeRecallLanguage(relevantMemory)

  return options.map(option => {
    switch (option.value) {
      case 'draw-steel':
        return priorOpeners.has('draw-steel')
          ? {
              ...option,
              description:
                `The hard road again. ${recall.place} remembers how bright the steel looked last time.`,
            }
          : {
              ...option,
              description:
                'The road you left unopened before. This time the blade feels almost inevitable.',
            }
      case 'bow-slightly':
        return priorOpeners.has('bow-slightly')
          ? {
              ...option,
              description:
                `The patient road again. ${recall.atmosphere}`,
            }
          : {
              ...option,
              description:
                'The road you spared last time. A quieter answer waits to see if you mean it.',
            }
      case 'talk-like-you-belong':
        return priorOpeners.has('talk-like-you-belong')
          ? {
              ...option,
              description:
                `The bluff again. ${recall.witness.charAt(0).toUpperCase() + recall.witness.slice(1)} remembers your voice.`,
            }
          : {
              ...option,
              description:
                `The road of nerve you never tried. ${recall.place.charAt(0).toUpperCase() + recall.place.slice(1)} seems almost curious about it.`,
            }
      default:
        return option
    }
  }).sort((left, right) => {
    const leftSeen = priorOpeners.has(left.value)
    const rightSeen = priorOpeners.has(right.value)

    if (leftSeen === rightSeen) {
      return 0
    }

    return leftSeen ? 1 : -1
  })
}

function getSecondBeatLead(
  openingChoice: SwordsOfChaosOpeningChoice,
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): string {
  if (relevantMemory?.encounterShift === 'space-station') {
    return `${getOpeningChoiceLeadLabel(openingChoice)} got you this far on a station that sounds like it is remembering the wrong century. The air tastes like frost, current, and unfinished instructions.`
  }

  if (relevantMemory?.encounterShift === 'post-apocalyptic-ruin') {
    return `${getOpeningChoiceLeadLabel(openingChoice)} got you this far in a ruin that still thinks warning and prophecy are the same job. Ash, shell-green corrosion, and bad signage make the whole district feel like a shipwreck dragged onto land and left to memorize its own failure.`
  }

  if (relevantMemory?.encounterShift === 'mars-outpost') {
    return `${getOpeningChoiceLeadLabel(openingChoice)} got you this far in a Mars outpost that sounds abandoned until the speakers misname you. Dust keeps finding shell-green seams in the metal as if orbit's old fracture finally fell to ground.`
  }

  if (relevantMemory?.encounterShift === 'dark-dungeon') {
    return `${getOpeningChoiceLeadLabel(openingChoice)} got you this far in a dungeon that sounds too interested in your choices. The dark keeps offering hospitality the way a snare offers comfort.`
  }

  if (relevantMemory?.encounterShift === 'fae-realm') {
    return `${getOpeningChoiceLeadLabel(openingChoice)} got you this far in a grove where courtesy feels armed and beauty behaves like jurisdiction. Even the light seems to be watching for procedural mistakes.`
  }

  if (relevantMemory?.encounterShift === 'ocean-ship') {
    return `${getOpeningChoiceLeadLabel(openingChoice)} got you this far on a ship that should not know your name. The salt air feels like a verdict delivered before the trial.`
  }

  if (relevantMemory?.encounterShift === 'old-tree') {
    return `${getOpeningChoiceLeadLabel(openingChoice)} got you this far beneath the old tree. The place feels like a memory that learned how to grow bark over metal.`
  }

  if (!relevantMemory?.familiarPlace) {
    switch (openingChoice) {
      case 'draw-steel':
        return 'Steel got you this far. The figure under the broken lamp has not moved, which is its own kind of answer.'
      case 'bow-slightly':
        return 'Courtesy got you this far. Nothing in the alley has relaxed, but nothing has thrown you out either.'
      case 'talk-like-you-belong':
        return 'The bluff got you this far. The figure is still listening, which is more dangerous than interruption.'
    }
  }

  const priorOpeners = new Set(
    relevantMemory.priorRoutes.map(route => route.split(':')[0]),
  )

  if (priorOpeners.has(openingChoice)) {
    return `${getOpeningChoiceLeadLabel(openingChoice)} got you this far again. The alley settles into the posture it remembers.`
  }

  return `${getOpeningChoiceLeadLabel(openingChoice)} got you this far by a road you left unopened last time. The alley seems almost pleased that you finally chose differently.`
}

function getOpeningAtmosphereLine(
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
  locus: ReturnType<typeof getSwordsEncounterLocus>,
): string | undefined {
  if (!relevantMemory) {
    return undefined
  }

  if (locus !== 'alley') {
    return getSwordsWorldMapWeight(locus)
  }

  if (relevantMemory.canonThread) {
    return (
      getSwordsThreadEcho({
        locus,
        thread: relevantMemory.canonThread,
      }) ?? getSwordsWorldMapWeight(locus)
    )
  }

  if (relevantMemory.familiarPlace && relevantMemory.liveThread) {
    return (
      getSwordsThreadEcho({
        locus,
        thread: relevantMemory.liveThread,
      }) ?? relevantMemory.threadOmen
    )
  }

  return undefined
}

function getSecondBeatAtmosphereLine(
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
  locus: ReturnType<typeof getSwordsEncounterLocus>,
): string | undefined {
  if (!relevantMemory) {
    return undefined
  }

  if (relevantMemory.canonThread) {
    return (
      getSwordsThreadEcho({
        locus,
        thread: relevantMemory.canonThread,
      }) ?? getSwordsThreadPressureText(relevantMemory.canonThread)
    )
  }

  if (locus !== 'alley') {
    return getSwordsWorldMapWeight(locus)
  }

  if (relevantMemory.familiarPlace && relevantMemory.liveThread) {
    return (
      getSwordsThreadEcho({
        locus,
        thread: relevantMemory.liveThread,
      }) ?? relevantMemory.threadOmen
    )
  }

  return undefined
}

function getSecondBeatHint(
  openingChoice: SwordsOfChaosOpeningChoice,
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): string {
  if (relevantMemory?.familiarPlace) {
    if (relevantMemory.seaturtleGlimpsed) {
      if (relevantMemory.seaturtleBond > 1) {
        return 'This next choice is being watched by more than the place itself.'
      }

      if (relevantMemory.seaturtleFavor > 0) {
        return 'One quieter line has already earned a little favor. The place has not forgotten.'
      }

      return 'The place remembers you. Something quieter just beyond it may remember you too.'
    }

    return 'Pick the road that changes the scene, not just the wording.'
  }

  switch (openingChoice) {
    case 'draw-steel':
      return 'Now decide whether the blade was a threat, a test, or a mistake.'
    case 'bow-slightly':
      return 'Now decide whether the courtesy was caution, discipline, or nerve.'
    case 'talk-like-you-belong':
      return 'Now find out whether the bluff lands or breaks.'
  }
}

function getCanonThreadPressure(
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): string | undefined {
  if (!relevantMemory?.canonThread) {
    return undefined
  }

  return (
    getSwordsThreadPressureText(relevantMemory.canonThread) ??
    'The thread behind this place has stopped acting like coincidence. It now presses against the scene like a name trying to become a law.'
  )
}

function getReturningWeight(
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): string | undefined {
  if (relevantMemory?.seaturtleGlimpsed) {
    return relevantMemory.seaturtleBond > 1
      ? `For half a second there is another shape beside yours: shell-green, patient, and no longer entirely content to remain a reflection. The place behaves as if it felt that too.`
      : `For half a second there is another shape in the wet reflection beside yours: shell-green, patient, and gone before the eye can make a claim on it.`
  }

  if (relevantMemory?.threadOmen) {
    return relevantMemory.threadOmen
  }

  if (relevantMemory?.canonThread) {
    return `One thread has started hardening into something the world intends to keep: ${relevantMemory.canonThreadTitle ?? 'this thread'}.`
  }

  if (relevantMemory?.recentRelic) {
    return `Whatever you carried out of this world last time has not stopped humming: ${relevantMemory.recentRelic}.`
  }

  if (relevantMemory?.recentTitle) {
    return `The name you earned elsewhere has reached this place before you: ${relevantMemory.recentTitle}.`
  }

  if (relevantMemory?.liveThread) {
    return `A thread has started to follow you between places: ${relevantMemory.liveThreadTitle ?? 'something unfinished'}.`
  }

  return undefined
}

function applySecondBeatCallbackMemory(
  openingChoice: SwordsOfChaosOpeningChoice,
  options: SwordsSecondBeatOption[],
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): SwordsSecondBeatOption[] {
  if (!relevantMemory?.familiarPlace) {
    return options
  }

  const priorRoutes = new Set(relevantMemory.priorRoutes)
  const recall = getBiomeRecallLanguage(relevantMemory)

  const rewritten = options.map(option => {
    const route = `${openingChoice}:${option.value}`
    const seen = priorRoutes.has(route)
    const seaTurtleFavored =
      relevantMemory.seaturtleGlimpsed &&
      option.value === getSwordsSeaTurtleFavoredSecondChoice(openingChoice)
    return {
      ...option,
      description: `${seen
        ? `${option.description} ${recall.place.charAt(0).toUpperCase() + recall.place.slice(1)} has watched you choose this road before.`
        : `${option.description} This is one of the roads ${recall.place} kept from you last time.`}${
        seaTurtleFavored
          ? recall.quietApproval
          : ''
      }`,
    }
  })

  return [...rewritten].sort((left, right) => {
    const leftSeen = priorRoutes.has(`${openingChoice}:${left.value}`)
    const rightSeen = priorRoutes.has(`${openingChoice}:${right.value}`)
    const leftFavored =
      relevantMemory.seaturtleGlimpsed &&
      left.value === getSwordsSeaTurtleFavoredSecondChoice(openingChoice)
    const rightFavored =
      relevantMemory.seaturtleGlimpsed &&
      right.value === getSwordsSeaTurtleFavoredSecondChoice(openingChoice)

    if (leftFavored !== rightFavored) {
      return leftFavored ? -1 : 1
    }

    if (leftSeen !== rightSeen) {
      return leftSeen ? 1 : -1
    }

    return 0
  })
}

function renderDeterministicScene(
  payload: SwordsOfChaosPromptPayload,
): SwordsOfChaosDmSceneResponse {
  const locus = getSwordsEncounterLocus(payload.relevantMemory)
  const worldWeight = getSwordsWorldMapWeight(locus)
  const recurringSymbol =
    payload.relevantMemory?.recurringSymbol ?? getSwordsRecurringSymbol(locus)
  const threadEcho = getSwordsThreadEcho({
    locus,
    thread:
      payload.relevantMemory?.canonThread ?? payload.relevantMemory?.liveThread,
  })

  if (payload.stage === 'opening') {
    const familiar = Boolean(payload.relevantMemory?.familiarPlace)
    const returningAgain = (payload.relevantMemory?.revisitCount ?? 0) > 1
    const openingShell =
      payload.relevantMemory?.encounterShift === 'dark-dungeon'
        ? getSwordsOpeningShellVariant('dark-dungeon')
        : payload.relevantMemory?.encounterShift === 'post-apocalyptic-ruin'
        ? getSwordsOpeningShellVariant('post-apocalyptic-ruin')
        : payload.relevantMemory?.encounterShift === 'mars-outpost'
        ? getSwordsOpeningShellVariant('mars-outpost')
        : payload.relevantMemory?.encounterShift === 'fae-realm'
        ? getSwordsOpeningShellVariant('fae-realm')
        : payload.relevantMemory?.encounterShift === 'space-station'
        ? getSwordsOpeningShellVariant('space-station')
        : payload.relevantMemory?.encounterShift === 'ocean-ship'
        ? getSwordsOpeningShellVariant('ocean-ship')
        : payload.relevantMemory?.encounterShift === 'old-tree'
        ? getSwordsOpeningShellVariant('old-tree')
        : familiar && returningAgain
        ? payload.relevantMemory?.canonThread
          ? getSwordsOpeningShellVariant('threadmarked')
          : payload.relevantMemory?.seaturtleOpeningPending
            ? getSwordsOpeningShellVariant('seaturtle')
            : getSwordsOpeningShellVariant('returning')
        : familiar
          ? getSwordsOpeningShellVariant('returning')
          : getSwordsOpeningShellVariant('default')
    const atmosphereLine = getOpeningAtmosphereLine(payload.relevantMemory, locus)
    const openingTail = limitSceneAccents(locus, [
      getSwordsStoryChapterLine(payload.relevantMemory),
      getSwordsCharacterDevelopmentLine(payload.relevantMemory),
      getSwordsCharacterRecognitionLine(payload.relevantMemory),
      getSwordsCharacterReactionLine(payload.relevantMemory, locus),
      getSwordsMagicLine(payload.relevantMemory, locus),
      getSwordsAftermathLine(payload.relevantMemory, locus),
      getSwordsContinuationLead(payload.relevantMemory),
      getSwordsSceneStateLead(payload.relevantMemory),
      familiar
        ? payload.relevantMemory?.roadNotTakenHint ??
          'The place waits to see what you do differently this time.'
        : undefined,
      getReturningWeight(payload.relevantMemory),
      atmosphereLine,
      threadEcho ?? (locus !== 'alley' ? recurringSymbol : undefined),
    ])
    return {
      subtitle: openingShell.subtitle,
      sceneText: [
        openingShell.sceneText,
        getSwordsSceneStakesLine({
          locus,
          relevantMemory: payload.relevantMemory,
        }),
        ...(getSwordsPresenceLine({
          locus,
          relevantMemory: payload.relevantMemory,
        })
          ? [
              getSwordsPresenceLine({
                locus,
                relevantMemory: payload.relevantMemory,
              }) as string,
            ]
          : []),
        ...openingTail,
      ].join('\n\n'),
      options: applySwordsPresenceToOpeningOptions({
        options: applyOpeningCallbackMemory(
          applySwordsStoryPressureToOpeningOptions({
            options: getSwordsOpeningActionSet({
              locus,
              relevantMemory: payload.relevantMemory,
            }),
            relevantMemory: payload.relevantMemory,
          }),
          payload.relevantMemory,
        ),
        relevantMemory: payload.relevantMemory,
      }),
      hintText:
        familiar && returningAgain && !payload.relevantMemory?.canonThread
          ? payload.relevantMemory?.seaturtleOpeningPending
            ? openingShell.hintText
            : 'The alley remembers your last answer. It is more interested in the one you withheld.'
          : openingShell.hintText,
    }
  }

  if (!payload.openingChoice) {
    throw new Error('Second-beat scene requires an opening choice')
  }

  const returningAgain = (payload.relevantMemory?.revisitCount ?? 0) > 1
  const secondBeat =
    payload.relevantMemory?.encounterShift === 'dark-dungeon'
      ? getSwordsSecondBeatVariant(payload.openingChoice, 'dark-dungeon')
      : payload.relevantMemory?.encounterShift === 'post-apocalyptic-ruin'
      ? getSwordsSecondBeatVariant(payload.openingChoice, 'post-apocalyptic-ruin')
      : payload.relevantMemory?.encounterShift === 'fae-realm'
      ? getSwordsSecondBeatVariant(payload.openingChoice, 'fae-realm')
      : payload.relevantMemory?.encounterShift === 'mars-outpost'
      ? getSwordsSecondBeatVariant(payload.openingChoice, 'mars-outpost')
      : payload.relevantMemory?.encounterShift === 'space-station'
      ? getSwordsSecondBeatVariant(payload.openingChoice, 'space-station')
      : payload.relevantMemory?.encounterShift === 'ocean-ship'
      ? getSwordsSecondBeatVariant(payload.openingChoice, 'ocean-ship')
      : payload.relevantMemory?.encounterShift === 'old-tree'
      ? getSwordsSecondBeatVariant(payload.openingChoice, 'old-tree')
      : payload.relevantMemory?.canonThread && returningAgain
      ? getSwordsSecondBeatVariant(payload.openingChoice, 'threadmarked')
      : returningAgain
        ? getSwordsSecondBeatVariant(payload.openingChoice, 'returning')
        : getSwordsSecondBeat(payload.openingChoice)
  const canonPressure = getCanonThreadPressure(payload.relevantMemory)
  const secondBeatTail =
    locus === 'alley'
      ? [
          ...(canonPressure ? [canonPressure] : []),
          ...getSwordsMagicPressure(payload.relevantMemory),
          ...getSwordsPresencePressure(payload.relevantMemory),
          ...getSwordsCharacterDevelopmentPressure(payload.relevantMemory),
          ...getSwordsContinuationPressure(payload.relevantMemory),
          ...getSwordsSceneStatePressure(payload.relevantMemory),
          ...getSwordsCarryForwardPressure(payload.relevantMemory, locus),
          ...getSwordsStorySecondBeatPressure(payload.relevantMemory),
        ]
      : [
          ...getSwordsMagicPressure(payload.relevantMemory),
          ...getSwordsPresencePressure(payload.relevantMemory),
          ...getSwordsCharacterDevelopmentPressure(payload.relevantMemory),
          ...getSwordsContinuationPressure(payload.relevantMemory),
          ...getSwordsSceneStatePressure(payload.relevantMemory),
          ...getSwordsCarryForwardPressure(payload.relevantMemory, locus),
          ...getSwordsStorySecondBeatPressure(payload.relevantMemory),
        ]
  return {
    subtitle:
      payload.relevantMemory?.canonThread && returningAgain
        ? `${secondBeat.subtitle} The air behind it feels occupied.`
        : secondBeat.subtitle,
    sceneText: [
      ...(getSwordsStorySecondBeatLead(payload.relevantMemory)
        ? [getSwordsStorySecondBeatLead(payload.relevantMemory) as string]
        : []),
      getSwordsSceneStakesLine({
        locus,
        relevantMemory: payload.relevantMemory,
      }),
      ...(getSwordsPresenceLine({
        locus,
        relevantMemory: payload.relevantMemory,
      })
        ? [
            getSwordsPresenceLine({
              locus,
              relevantMemory: payload.relevantMemory,
            }) as string,
          ]
        : []),
      ...(getSwordsContinuationLead(payload.relevantMemory)
        ? [getSwordsContinuationLead(payload.relevantMemory) as string]
        : []),
      ...(getSwordsSceneStateLead(payload.relevantMemory)
        ? [getSwordsSceneStateLead(payload.relevantMemory) as string]
        : []),
      ...(getSwordsCharacterReactionLine(payload.relevantMemory, locus)
        ? [getSwordsCharacterReactionLine(payload.relevantMemory, locus) as string]
        : []),
      getSecondBeatLead(payload.openingChoice, payload.relevantMemory),
      secondBeat.intro,
      ...secondBeatTail,
    ].join('\n\n'),
    options: applySecondBeatCallbackMemory(
      payload.openingChoice,
      applySwordsPresenceToSecondBeatOptions({
        options: applySwordsCarryForwardToSecondBeatOptions({
          options: applySwordsCharacterPressureToSecondBeatOptions({
            options: applySwordsStoryPressureToSecondBeatOptions({
              openingChoice: payload.openingChoice,
              options: getSwordsSecondBeatActionSet({
                openingChoice: payload.openingChoice,
                locus,
                relevantMemory: payload.relevantMemory,
              }),
              locus,
              relevantMemory: payload.relevantMemory,
            }),
            relevantMemory: payload.relevantMemory,
          }),
          locus,
          relevantMemory: payload.relevantMemory,
        }),
        relevantMemory: payload.relevantMemory,
      }),
      payload.relevantMemory,
    ),
    hintText:
      getSwordsCharacterTemptationLine(payload.relevantMemory) ??
      getSwordsCharacterDevelopmentHint(payload.relevantMemory) ??
      getSecondBeatHint(payload.openingChoice, payload.relevantMemory),
  }
}

export function renderSwordsOfChaosHybridScene(input: {
  stage: 'opening' | 'second-beat'
  openingChoice?: SwordsOfChaosOpeningChoice
  saveSummary?: {
    level: number
    titles: number
    inventory: number
  }
  relevantMemory?: SwordsOfChaosRelevantMemory
}): SwordsOfChaosDmSceneResponse {
  const payload: SwordsOfChaosPromptPayload = {
    stage: input.stage,
    openingChoice: input.openingChoice,
    saveSummary: buildSwordsOfChaosSaveSummary(
      input.saveSummary ?? {
        level: 1,
        titles: 0,
        inventory: 0,
      },
    ),
    relevantMemory: input.relevantMemory,
  }

  const bundle = buildSwordsOfChaosPromptBundle(payload)
  void bundle
  return parseSwordsOfChaosDmSceneResponse(renderDeterministicScene(payload))
}
