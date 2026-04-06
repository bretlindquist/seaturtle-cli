import { parseSwordsOfChaosDmSceneResponse } from './dmResponseParser.js'
import {
  buildSwordsOfChaosPromptBundle,
  buildSwordsOfChaosSaveSummary,
} from './dmPromptBuilder.js'
import {
  getSwordsOpeningOptions,
  getSwordsOpeningShellVariant,
  getSwordsSecondBeat,
  getSwordsSecondBeatVariant,
} from './shells.js'
import { getSwordsSeaTurtleFavoredSecondChoice } from './seaturtleChoice.js'
import {
  getSwordsEncounterLocus,
  getSwordsRecurringSymbol,
  getSwordsThreadEcho,
  getSwordsWorldMapWeight,
} from './worldMap.js'
import type {
  SwordsOfChaosDmSceneResponse,
  SwordsOfChaosPromptPayload,
} from '../types/dm.js'
import type { SwordsOfChaosRelevantMemory } from '../types/memory.js'
import type { SwordsOfChaosOpeningChoice } from '../types/outcomes.js'
import type { SwordsOpeningOption, SwordsSecondBeatOption } from '../types/shells.js'

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
    return `${openingChoice} got you this far on a station that sounds like it is remembering the wrong century. The air tastes like frost, current, and unfinished instructions.`
  }

  if (relevantMemory?.encounterShift === 'post-apocalyptic-ruin') {
    return `${openingChoice} got you this far in a ruin that still thinks warning and prophecy are the same job. Ash, shell-green corrosion, and bad signage make the whole district feel like a shipwreck dragged onto land and left to memorize its own failure.`
  }

  if (relevantMemory?.encounterShift === 'mars-outpost') {
    return `${openingChoice} got you this far in a Mars outpost that sounds abandoned until the speakers misname you. Dust keeps finding shell-green seams in the metal as if orbit's old fracture finally fell to ground.`
  }

  if (relevantMemory?.encounterShift === 'dark-dungeon') {
    return `${openingChoice} got you this far in a dungeon that sounds too interested in your choices. The dark keeps offering hospitality the way a snare offers comfort.`
  }

  if (relevantMemory?.encounterShift === 'fae-realm') {
    return `${openingChoice} got you this far in a grove where courtesy feels armed and beauty behaves like jurisdiction. Even the light seems to be watching for procedural mistakes.`
  }

  if (relevantMemory?.encounterShift === 'ocean-ship') {
    return `${openingChoice} got you this far on a ship that should not know your name. The salt air feels like a verdict delivered before the trial.`
  }

  if (relevantMemory?.encounterShift === 'old-tree') {
    return `${openingChoice} got you this far beneath the old tree. The place feels like a memory that learned how to grow bark over metal.`
  }

  if (!relevantMemory?.familiarPlace) {
    return `${openingChoice} got you this far. The alley seems interested now.`
  }

  const priorOpeners = new Set(
    relevantMemory.priorRoutes.map(route => route.split(':')[0]),
  )

  if (priorOpeners.has(openingChoice)) {
    return `${openingChoice} got you this far again. The alley settles into the posture it remembers.`
  }

  return `${openingChoice} got you this far by a road you left unopened last time. The alley seems almost pleased that you finally chose differently.`
}

function getCanonThreadPressure(
  relevantMemory: SwordsOfChaosRelevantMemory | undefined,
): string | undefined {
  if (!relevantMemory?.canonThread) {
    return undefined
  }

  return `The thread behind this place has stopped acting like coincidence. ${relevantMemory.canonThread} now presses against the scene like a name trying to become a law.`
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
    return `One thread has started hardening into something the world intends to keep: ${relevantMemory.canonThread}.`
  }

  if (relevantMemory?.recentRelic) {
    return `Whatever you carried out of this world last time has not stopped humming: ${relevantMemory.recentRelic}.`
  }

  if (relevantMemory?.recentTitle) {
    return `The name you earned elsewhere has reached this place before you: ${relevantMemory.recentTitle}.`
  }

  if (relevantMemory?.liveThread) {
    return `A thread has started to follow you between places: ${relevantMemory.liveThread}.`
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
          : payload.relevantMemory?.seaturtleGlimpsed
            ? getSwordsOpeningShellVariant('seaturtle')
            : getSwordsOpeningShellVariant('returning')
        : familiar
          ? getSwordsOpeningShellVariant('returning')
          : getSwordsOpeningShellVariant('default')
    return {
      subtitle: openingShell.subtitle,
      sceneText: `${openingShell.sceneText}${
        familiar
          ? `\n\n${payload.relevantMemory?.roadNotTakenHint ?? 'The place waits to see what you do differently this time.'}`
          : ''
      }${getReturningWeight(payload.relevantMemory) ? `\n\n${getReturningWeight(payload.relevantMemory)}` : ''}\n\n${worldWeight}${
        recurringSymbol ? `\n\n${recurringSymbol}` : ''
      }${
        threadEcho ? `\n\n${threadEcho}` : ''
      }`,
      options: applyOpeningCallbackMemory(
        getSwordsOpeningOptions(),
        payload.relevantMemory,
      ),
      hintText:
        familiar && returningAgain && !payload.relevantMemory?.canonThread
          ? payload.relevantMemory?.seaturtleGlimpsed
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
  return {
    subtitle:
      payload.relevantMemory?.canonThread && returningAgain
        ? `${secondBeat.subtitle} The air behind it feels occupied.`
        : secondBeat.subtitle,
    sceneText: `${getSecondBeatLead(payload.openingChoice, payload.relevantMemory)}\n\n${secondBeat.intro}${canonPressure ? `\n\n${canonPressure}` : ''}\n\n${worldWeight}${
      recurringSymbol ? `\n\n${recurringSymbol}` : ''
    }${
      threadEcho ? `\n\n${threadEcho}` : ''
    }`,
    options: applySecondBeatCallbackMemory(
      payload.openingChoice,
      secondBeat.options,
      payload.relevantMemory,
    ),
    hintText: payload.relevantMemory?.familiarPlace
      ? payload.relevantMemory.seaturtleGlimpsed
        ? payload.relevantMemory.seaturtleBond > 1
          ? 'The second move now carries three pressures: the place, the road you left unopened, and a shell-green patience that has started to choose sides.'
          : payload.relevantMemory.seaturtleFavor > 0
            ? 'The second move now carries a quiet bias. Something shell-green has already approved one of your softer answers and may do so again.'
          : 'The second move now carries two kinds of witness: the place itself, and something quieter standing just outside it.'
        : 'The second move reveals whether you repeat yourself or take the road this place saved for later.'
      : 'The second move reveals what kind of trouble this really is.',
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
