import type { SwordsOfChaosCharacterSheet } from './save.js'

export type SwordsOfChaosSessionZeroPrelude = {
  title: string
  subtitle: string
  sceneText: string
  promptText: string
}

export type SwordsOfChaosSessionZeroScene = {
  title: string
  subtitle: string
  sceneText: string
  hintText?: string
  originPlace: string
  firstContact: string | null
  options: Array<{
    id: string
    label: string
    description: string
  }>
}

export type SwordsOfChaosSeaTurtleCharacterCanon = {
  name: string
  bearing: string
  habit: string
  thresholdRelation: string
  tell: string
}

export type SwordsOfChaosSessionZeroBuildOptions = {
  character: SwordsOfChaosCharacterSheet
  seed?: string
  allowSeaTurtleCrossing?: boolean
}
