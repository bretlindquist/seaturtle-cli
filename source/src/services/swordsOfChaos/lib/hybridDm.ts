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
      options: getSwordsOpeningOptions(),
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
