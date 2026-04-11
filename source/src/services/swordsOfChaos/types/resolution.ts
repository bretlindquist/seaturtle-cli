import type { SwordsOfChaosHostEcho } from './echoes.js'
import type { SwordsOfChaosEventBatch } from './events.js'
import type { SwordsOfChaosOutcome, SwordsOfChaosRoute } from './outcomes.js'
import type { SwordsOfChaosCharacterDevelopment } from './save.js'
import type {
  SwordsOfChaosSceneState,
  SwordsOfChaosStoryContinuation,
} from './save.js'
import type { SwordsOfChaosEncounterLocus } from './worldMap.js'

export type SwordsOfChaosResolution = {
  route: SwordsOfChaosRoute
  outcome: SwordsOfChaosOutcome
  eventBatch: SwordsOfChaosEventBatch
  hostEchoes: SwordsOfChaosHostEcho[]
  rarityUnlock?: string
  resultText: string
  storyAdvance: {
    activeLocus: SwordsOfChaosEncounterLocus
    activeThread: string
    chapter: number
    chapterTitle: string
    tension: 'low' | 'rising' | 'high'
    currentObjective: string
    carryForward: string
    continuation: SwordsOfChaosStoryContinuation
    sceneState: SwordsOfChaosSceneState
  }
  characterAdvance: SwordsOfChaosCharacterDevelopment
}
