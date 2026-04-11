export type SwordsOfChaosOpeningChoice =
  | 'draw-steel'
  | 'bow-slightly'
  | 'talk-like-you-belong'

export type SwordsOfChaosSecondChoice =
  | 'cut-the-sign-chain'
  | 'hold-the-line'
  | 'lower-the-blade'
  | 'keep-bowing'
  | 'meet-the-gaze'
  | 'ask-the-price'
  | 'name-a-false-title'
  | 'laugh-like-you-mean-it'
  | 'double-down'

export type SwordsOfChaosRoute =
  `${SwordsOfChaosOpeningChoice}:${SwordsOfChaosSecondChoice}`

type SwordsOfChaosOutcomeBase = {
  gameResult: 'played' | 'win' | 'loss'
  legendEvent: string
  ending: string
}

type SwordsOfChaosRelicOutcome = SwordsOfChaosOutcomeBase & {
  key: 'relic'
  inventory: string
  rarityUnlock?: string
}

type SwordsOfChaosTitleOutcome = SwordsOfChaosOutcomeBase & {
  key: 'title'
  title: string
}

type SwordsOfChaosOathOutcome = SwordsOfChaosOutcomeBase & {
  key: 'oath'
  oath: string
}

type SwordsOfChaosTruthOutcome = SwordsOfChaosOutcomeBase & {
  key: 'truth'
  truth: string
}

type SwordsOfChaosRefusalOutcome = SwordsOfChaosOutcomeBase & {
  key: 'refusal'
}

export type SwordsOfChaosOutcome =
  | SwordsOfChaosRelicOutcome
  | SwordsOfChaosTitleOutcome
  | SwordsOfChaosOathOutcome
  | SwordsOfChaosTruthOutcome
  | SwordsOfChaosRefusalOutcome
