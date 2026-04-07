import type { SwordsOfChaosOpeningChoice, SwordsOfChaosSecondChoice } from './outcomes.js'
import type { SwordsOfChaosSceneStage } from './dm.js'
import type { SwordsOfChaosRelevantMemory } from './memory.js'
import type { SwordsOfChaosEncounterLocus } from './worldMap.js'

export type SwordsDmActionKind =
  | 'affirm_tactic'
  | 'escalate_danger'
  | 'reveal_clue'
  | 'misdirect'
  | 'offer_bargain'
  | 'call_bluff'
  | 'soft_fail_forward'
  | 'hard_consequence'
  | 'seaturtle_brush'

export type SwordsFreeResponseTactic =
  | 'steel'
  | 'courtesy'
  | 'bluff'
  | 'question'
  | 'observe'
  | 'follow'
  | 'resist'

export type SwordsFreeResponseTone =
  | 'bold'
  | 'careful'
  | 'playful'
  | 'direct'
  | 'uncertain'

export type SwordsFreeResponseTarget =
  | 'place'
  | 'opponent'
  | 'object'
  | 'witness'
  | 'self'
  | 'unknown'

export type SwordsFreeResponseRisk = 'low' | 'medium' | 'high'

export type SwordsFreeResponseTruthfulness = 'truth' | 'bluff' | 'mixed'

export type SwordsFreeResponseIntent = {
  stage: SwordsOfChaosSceneStage
  rawText: string
  tactic: SwordsFreeResponseTactic
  tone: SwordsFreeResponseTone
  target: SwordsFreeResponseTarget
  risk: SwordsFreeResponseRisk
  truthfulness: SwordsFreeResponseTruthfulness
  confidence: number
  mappedOpeningChoice?: SwordsOfChaosOpeningChoice
  mappedSecondChoice?: SwordsOfChaosSecondChoice
}

export type SwordsDmAction = {
  kind: SwordsDmActionKind
  note: string
}

export type SwordsDmAdjudication = {
  stage: SwordsOfChaosSceneStage
  locus: SwordsOfChaosEncounterLocus
  openingChoice?: SwordsOfChaosOpeningChoice
  secondChoice?: SwordsOfChaosSecondChoice
  actions: SwordsDmAction[]
  tension: 'low' | 'live' | 'sharp'
  subtitle: string
  beatScript: SwordsDramaticBeatScript
  intent: SwordsFreeResponseIntent
  relevantMemory?: SwordsOfChaosRelevantMemory
}

export type SwordsDramaticBeatTone = 'plain' | 'accent' | 'sound' | 'quiet'

export type SwordsDramaticBeatLine = {
  text: string
  tone: SwordsDramaticBeatTone
}

export type SwordsDramaticBeatScript = {
  focus: 'hold' | 'tighten' | 'strike'
  lines: SwordsDramaticBeatLine[]
}
