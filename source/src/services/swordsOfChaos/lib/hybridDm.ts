import { parseSwordsOfChaosDmSceneResponse } from './dmResponseParser.js'
import {
  buildSwordsOfChaosPromptBundle,
  buildSwordsOfChaosSaveSummary,
} from './dmPromptBuilder.js'
import {
  getSwordsOpeningOptions,
  getSwordsSecondBeat,
  getSwordsSecondBeatVariant,
} from './shells.js'
import type {
  SwordsOfChaosDmSceneResponse,
  SwordsOfChaosPromptPayload,
} from '../types/dm.js'
import type { SwordsOfChaosRelevantMemory } from '../types/memory.js'
import type { SwordsOfChaosOpeningChoice } from '../types/outcomes.js'
import type { SwordsOpeningOption, SwordsSecondBeatOption } from '../types/shells.js'

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

  return options.map(option => {
    switch (option.value) {
      case 'draw-steel':
        return priorOpeners.has('draw-steel')
          ? {
              ...option,
              description:
                'The hard road again. The alley remembers how bright the steel looked last time.',
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
                'The patient road again. Even the rain seems to recognize the restraint.',
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
                'The bluff again. The sign crackles like it remembers your voice.',
            }
          : {
              ...option,
              description:
                'The road of nerve you never tried. The alley seems almost curious about it.',
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

function getSeaTurtleFavoredOption(
  openingChoice: SwordsOfChaosOpeningChoice,
): SwordsSecondBeatOption['value'] {
  switch (openingChoice) {
    case 'draw-steel':
      return 'lower-the-blade'
    case 'bow-slightly':
      return 'meet-the-gaze'
    case 'talk-like-you-belong':
      return 'laugh-like-you-mean-it'
  }
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
    return `For half a second there is another shape in the wet reflection beside yours: shell-green, patient, and gone before the eye can make a claim on it.`
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

  const rewritten = options.map(option => {
    const route = `${openingChoice}:${option.value}`
    const seen = priorRoutes.has(route)
    const seaTurtleFavored =
      relevantMemory.seaturtleGlimpsed &&
      option.value === getSeaTurtleFavoredOption(openingChoice)
    return {
      ...option,
      description: `${seen
        ? `${option.description} The alley has watched you choose this road before.`
        : `${option.description} This is one of the roads the alley kept from you last time.`}${
        seaTurtleFavored
          ? ' Something in the rain seems to approve of this quieter line.'
          : ''
      }`,
    }
  })

  return [...rewritten].sort((left, right) => {
    const leftSeen = priorRoutes.has(`${openingChoice}:${left.value}`)
    const rightSeen = priorRoutes.has(`${openingChoice}:${right.value}`)
    const leftFavored =
      relevantMemory.seaturtleGlimpsed &&
      left.value === getSeaTurtleFavoredOption(openingChoice)
    const rightFavored =
      relevantMemory.seaturtleGlimpsed &&
      right.value === getSeaTurtleFavoredOption(openingChoice)

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
  if (payload.stage === 'opening') {
    const familiar =
      payload.relevantMemory?.familiarPlace === 'trench-coat turtle alley'
    const returningAgain = (payload.relevantMemory?.revisitCount ?? 0) > 1
    return {
      subtitle:
        familiar
          ? returningAgain
            ? payload.relevantMemory?.canonThread
              ? 'The alley has rearranged itself around your absence. Something larger is starting to use it as a doorway.'
              : payload.relevantMemory?.seaturtleGlimpsed
                ? 'The alley has rearranged itself around your absence. A second presence lingers in the rain and refuses to stand still long enough to name.'
                : 'The alley has rearranged itself around your absence. The broken lamp still refuses to forget you.'
            : 'The alley seems to know you now. The broken lamp does too.'
          : 'A short BBS alleyway. A trench-coat turtle. Three different ways to make the night interesting.',
      sceneText:
        familiar
          ? returningAgain
            ? `Neon rain again, but the sign is darker now and the brickwork carries marks you do not remember leaving. Something in the alley has had time to think about you.\n\nThe last road you walked here still hangs in the air. ${payload.relevantMemory?.roadNotTakenHint ?? 'Another answer is waiting to see whether you are capable of it.'}${getReturningWeight(payload.relevantMemory) ? `\n\n${getReturningWeight(payload.relevantMemory)}` : ''}`
            : `Neon rain again. The humming sign is where you left it, but something about the alley feels closer than memory should allow.\n\nYou could swear you have stood here before. ${payload.relevantMemory?.roadNotTakenHint ?? 'The place waits to see what you do differently this time.'}${getReturningWeight(payload.relevantMemory) ? `\n\n${getReturningWeight(payload.relevantMemory)}` : ''}`
          : 'Neon rain. A humming sign. A trench-coat turtle under one broken lamp.\n\nThe first move matters here. Pick the posture that feels most like trouble you can survive.',
      options: applyOpeningCallbackMemory(
        getSwordsOpeningOptions(),
        payload.relevantMemory,
      ),
      hintText: familiar
        ? returningAgain
          ? payload.relevantMemory?.canonThread
            ? 'The alley remembers your last answer, but the thread behind it has started remembering you too.'
            : payload.relevantMemory?.seaturtleGlimpsed
              ? 'The alley remembers your last answer, and something gentler than the alley seems to be watching what you do with the next one.'
            : 'The alley remembers your last answer. It is more interested in the one you withheld.'
          : 'A familiar place rarely offers the same meaning twice.'
        : 'Choose a stance, not just an action.',
    }
  }

  if (!payload.openingChoice) {
    throw new Error('Second-beat scene requires an opening choice')
  }

  const returningAgain = (payload.relevantMemory?.revisitCount ?? 0) > 1
  const secondBeat = returningAgain
    ? getSwordsSecondBeatVariant(payload.openingChoice, 'returning')
    : getSwordsSecondBeat(payload.openingChoice)
  const canonPressure = getCanonThreadPressure(payload.relevantMemory)
  return {
    subtitle:
      payload.relevantMemory?.canonThread && returningAgain
        ? `${secondBeat.subtitle} The air behind it feels occupied.`
        : secondBeat.subtitle,
    sceneText: `${getSecondBeatLead(payload.openingChoice, payload.relevantMemory)}\n\n${secondBeat.intro}${canonPressure ? `\n\n${canonPressure}` : ''}`,
    options: applySecondBeatCallbackMemory(
      payload.openingChoice,
      secondBeat.options,
      payload.relevantMemory,
    ),
    hintText: payload.relevantMemory?.familiarPlace
      ? payload.relevantMemory.seaturtleGlimpsed
        ? 'The second move now carries two kinds of witness: the alley, and something quieter standing just outside it.'
        : 'The second move reveals whether you repeat yourself or take the road the alley saved for later.'
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
