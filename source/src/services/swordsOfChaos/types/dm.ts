import type {
  SwordsOpeningOption,
  SwordsSecondBeatOption,
} from './shells.js'
import type { SwordsOfChaosOpeningChoice } from './outcomes.js'

export type SwordsOfChaosSceneOption = SwordsOpeningOption | SwordsSecondBeatOption

export type SwordsOfChaosSceneStage = 'opening' | 'second-beat'

export type SwordsOfChaosPromptPayload = {
  stage: SwordsOfChaosSceneStage
  openingChoice?: SwordsOfChaosOpeningChoice
  saveSummary: {
    level: number
    titles: number
    inventory: number
  }
}

export type SwordsOfChaosDmSceneResponse = {
  subtitle: string
  sceneText: string
  options: SwordsOfChaosSceneOption[]
  hintText?: string
}
