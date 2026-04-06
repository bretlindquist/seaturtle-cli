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
import type { SwordsOfChaosOpeningChoice } from '../types/outcomes.js'

function renderDeterministicScene(
  payload: SwordsOfChaosPromptPayload,
): SwordsOfChaosDmSceneResponse {
  if (payload.stage === 'opening') {
    return {
      subtitle:
        'A short BBS alleyway. A trench-coat turtle. Three different ways to make the night interesting.',
      sceneText:
        'Neon rain. A humming sign. A trench-coat turtle under one broken lamp.\n\nThe first move matters here. Pick the posture that feels most like trouble you can survive.',
      options: getSwordsOpeningOptions(),
      hintText: 'Choose a stance, not just an action.',
    }
  }

  if (!payload.openingChoice) {
    throw new Error('Second-beat scene requires an opening choice')
  }

  const secondBeat = getSwordsSecondBeat(payload.openingChoice)
  return {
    subtitle: secondBeat.subtitle,
    sceneText: `${payload.openingChoice} got you this far. The alley seems interested now.\n\n${secondBeat.intro}`,
    options: secondBeat.options,
    hintText: 'The second move reveals what kind of trouble this really is.',
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
  }

  const bundle = buildSwordsOfChaosPromptBundle(payload)
  void bundle
  return parseSwordsOfChaosDmSceneResponse(renderDeterministicScene(payload))
}
