import type { SwordsOfChaosHostEcho } from './echoes.js'
import type { SwordsOfChaosEventBatch } from './events.js'
import type { SwordsOfChaosOutcome, SwordsOfChaosRoute } from './outcomes.js'

export type SwordsOfChaosResolution = {
  route: SwordsOfChaosRoute
  outcome: SwordsOfChaosOutcome
  eventBatch: SwordsOfChaosEventBatch
  hostEchoes: SwordsOfChaosHostEcho[]
  rarityUnlock?: string
  resultText: string
}
