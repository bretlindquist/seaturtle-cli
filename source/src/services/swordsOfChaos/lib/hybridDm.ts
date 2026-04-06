import { parseSwordsOfChaosDmSceneResponse } from './dmResponseParser.js'
import {
  buildSwordsOfChaosPromptBundle,
  buildSwordsOfChaosSaveSummary,
} from './dmPromptBuilder.js'
import { getSwordsOpeningOptions, getSwordsSecondBeat } from './shells.js'
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
    return {
      ...option,
      description: seen
        ? `${option.description} The alley has watched you choose this road before.`
        : `${option.description} This is one of the roads the alley kept from you last time.`,
    }
  })

  return [...rewritten].sort((left, right) => {
    const leftSeen = priorRoutes.has(`${openingChoice}:${left.value}`)
    const rightSeen = priorRoutes.has(`${openingChoice}:${right.value}`)

    if (leftSeen === rightSeen) {
      return 0
    }

    return leftSeen ? 1 : -1
  })
}

function renderDeterministicScene(
  payload: SwordsOfChaosPromptPayload,
): SwordsOfChaosDmSceneResponse {
  if (payload.stage === 'opening') {
    const familiar =
      payload.relevantMemory?.familiarPlace === 'trench-coat turtle alley'
    return {
      subtitle:
        familiar
          ? 'The alley seems to know you now. The broken lamp does too.'
          : 'A short BBS alleyway. A trench-coat turtle. Three different ways to make the night interesting.',
      sceneText:
        familiar
          ? `Neon rain again. The humming sign is where you left it, but something about the alley feels closer than memory should allow.\n\nYou could swear you have stood here before. ${payload.relevantMemory?.roadNotTakenHint ?? 'The place waits to see what you do differently this time.'}`
          : 'Neon rain. A humming sign. A trench-coat turtle under one broken lamp.\n\nThe first move matters here. Pick the posture that feels most like trouble you can survive.',
      options: applyOpeningCallbackMemory(
        getSwordsOpeningOptions(),
        payload.relevantMemory,
      ),
      hintText: familiar
        ? 'A familiar place rarely offers the same meaning twice.'
        : 'Choose a stance, not just an action.',
    }
  }

  if (!payload.openingChoice) {
    throw new Error('Second-beat scene requires an opening choice')
  }

  const secondBeat = getSwordsSecondBeat(payload.openingChoice)
  return {
    subtitle: secondBeat.subtitle,
    sceneText: `${getSecondBeatLead(payload.openingChoice, payload.relevantMemory)}\n\n${secondBeat.intro}`,
    options: applySecondBeatCallbackMemory(
      payload.openingChoice,
      secondBeat.options,
      payload.relevantMemory,
    ),
    hintText: payload.relevantMemory?.familiarPlace
      ? 'The second move reveals whether you repeat yourself or take the road the alley saved for later.'
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
