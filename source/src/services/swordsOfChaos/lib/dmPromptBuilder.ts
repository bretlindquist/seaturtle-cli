import type {
  SwordsOfChaosDmSceneResponse,
  SwordsOfChaosPromptPayload,
} from '../types/dm.js'
import { buildSwordsOfChaosSystemPromptStub } from '../prompts/systemPrompt.js'
import { getSwordsOfChaosDmOutputContract } from '../prompts/outputContracts.js'

export type SwordsOfChaosPromptBundle = {
  systemPrompt: string
  outputContract: string
  payload: SwordsOfChaosPromptPayload
}

export function buildSwordsOfChaosPromptBundle(
  payload: SwordsOfChaosPromptPayload,
): SwordsOfChaosPromptBundle {
  return {
    systemPrompt: buildSwordsOfChaosSystemPromptStub(),
    outputContract: getSwordsOfChaosDmOutputContract(),
    payload,
  }
}

export function buildSwordsOfChaosSaveSummary(input: {
  level: number
  titles: number
  inventory: number
}): SwordsOfChaosPromptPayload['saveSummary'] {
  return input
}
