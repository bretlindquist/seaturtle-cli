import type {
  SwordsOfChaosOpeningChoice,
  SwordsOfChaosSecondChoice,
} from './outcomes.js'

export type SwordsSecondBeatOption = {
  label: string
  value: SwordsOfChaosSecondChoice
  description: string
}

export type SwordsOpeningOption = {
  label: string
  value: SwordsOfChaosOpeningChoice
  description: string
}

export type SwordsSecondBeat = {
  subtitle: string
  intro: string
  options: SwordsSecondBeatOption[]
}
