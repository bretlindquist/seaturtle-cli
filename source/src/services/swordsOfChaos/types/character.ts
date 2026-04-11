import type {
  SwordsOfChaosCharacterSheet,
  SwordsOfChaosCreationMode,
} from './save.js'

export type SwordsCharacterArchetype = {
  id: string
  label: string
  hook: string
  sheet: Omit<SwordsOfChaosCharacterSheet, 'name' | 'creationMode'>
}

export type SwordsCharacterProceduralOption = {
  id: string
  label: string
  hook: string
  sheet: Omit<SwordsOfChaosCharacterSheet, 'name' | 'creationMode' | 'archetype'>
}

export type SwordsCharacterCreationModeOption = {
  mode: SwordsOfChaosCreationMode
  label: string
  description: string
}

export type SwordsCharacterChoiceOption = {
  id: string
  label: string
  description: string
}

export type SwordsCharacterCustomField =
  | 'className'
  | 'species'
  | 'origin'
  | 'strength'
  | 'flaw'
  | 'keepsake'
  | 'drive'
  | 'omen'

export type SwordsCharacterCustomFieldDefinition = {
  field: SwordsCharacterCustomField
  label: string
  prompt: string
  options: SwordsCharacterChoiceOption[]
}
