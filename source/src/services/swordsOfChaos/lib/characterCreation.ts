import { jsonStringify } from '../../../utils/slowOperations.js'
import {
  SWORDS_CHARACTER_CREATION_MODES,
  SWORDS_CUSTOM_CHARACTER_FIELDS,
  SWORDS_PREMADE_ARCHETYPES,
} from '../data/characterCreation.js'
import type {
  SwordsCharacterArchetype,
  SwordsCharacterChoiceOption,
  SwordsCharacterCreationModeOption,
  SwordsCharacterCustomField,
  SwordsCharacterCustomFieldDefinition,
  SwordsCharacterProceduralOption,
} from '../types/character.js'
import type {
  SwordsOfChaosCharacterSheet,
  SwordsOfChaosCreationMode,
} from '../types/save.js'

function hashString(input: string): number {
  let hash = 0
  for (const char of input) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }
  return hash
}

function getFieldOptionOrThrow(
  field: SwordsCharacterCustomField,
  id: string,
): SwordsCharacterChoiceOption {
  const definition = SWORDS_CUSTOM_CHARACTER_FIELDS.find(
    item => item.field === field,
  )

  const option = definition?.options.find(item => item.id === id)
  if (!option) {
    throw new Error(`Unknown Swords custom choice "${field}:${id}"`)
  }

  return option
}

function buildProceduralHook(input: {
  className: SwordsCharacterChoiceOption
  origin: SwordsCharacterChoiceOption
  strength: SwordsCharacterChoiceOption
  flaw: SwordsCharacterChoiceOption
  keepsake: SwordsCharacterChoiceOption
  drive: SwordsCharacterChoiceOption
}): string {
  const classLead: Record<string, string> = {
    Duelist: 'A hard-eyed fighter',
    Pilgrim: 'A road-worn pilgrim',
    Speaker: 'A dangerous talker',
    Runner: 'A courier who knows when to flee and when not to',
    Witness: 'A watcher who notices what decent people miss',
  }

  const lead = classLead[input.className.label] ?? `A ${input.className.label.toLowerCase()}`

  return `${lead} from ${input.origin.label}, carrying ${input.keepsake.label} and relying on ${input.strength.label} even when ${input.flaw.label}. They are still trying to ${input.drive.label}.`
}

export function getSwordsCharacterCreationModes(): SwordsCharacterCreationModeOption[] {
  return SWORDS_CHARACTER_CREATION_MODES
}

export function getSwordsPremadeArchetypes(): SwordsCharacterArchetype[] {
  return SWORDS_PREMADE_ARCHETYPES
}

export function getSwordsCustomCharacterFields(): SwordsCharacterCustomFieldDefinition[] {
  return SWORDS_CUSTOM_CHARACTER_FIELDS
}

export function buildSwordsProceduralCharacterChoices(
  seed = 'default',
  count = 3,
): SwordsCharacterProceduralOption[] {
  const offset = hashString(seed || 'default')
  const options = SWORDS_CUSTOM_CHARACTER_FIELDS.reduce<
    Record<SwordsCharacterCustomField, SwordsCharacterChoiceOption[]>
  >(
    (acc, definition) => {
      acc[definition.field] = definition.options
      return acc
    },
    {} as Record<SwordsCharacterCustomField, SwordsCharacterChoiceOption[]>,
  )

  return Array.from({ length: count }, (_, index) => {
    const pick = (
      field: SwordsCharacterCustomField,
      stride: number,
    ): SwordsCharacterChoiceOption => {
      const items = options[field]
      return items[(offset + index * stride) % items.length]!
    }

    const className = pick('className', 1)
    const species = pick('species', 2)
    const origin = pick('origin', 3)
    const strength = pick('strength', 4)
    const flaw = pick('flaw', 5)
    const keepsake = pick('keepsake', 6)
    const drive = pick('drive', 7)
    const omen = pick('omen', 8)

    return {
      id: `procedural-${index + 1}`,
      label: `${className.label} of ${origin.label}`,
      hook: buildProceduralHook({
        className,
        origin,
        strength,
        flaw,
        keepsake,
        drive,
      }),
      sheet: {
        className: className.label,
        species: species.label,
        origin: origin.label,
        strength: strength.label,
        flaw: flaw.label,
        keepsake: keepsake.label,
        drive: drive.label,
        omen: omen.label,
      },
    }
  })
}

export function normalizeSwordsCharacterName(input: string): string {
  const normalized = input.replace(/\s+/g, ' ').trim()
  if (normalized.length < 2) {
    throw new Error('Swords character names must be at least 2 characters')
  }
  if (normalized.length > 40) {
    throw new Error('Swords character names must be 40 characters or fewer')
  }
  return normalized
}

export function buildSwordsCharacterSheetFromPremade(
  name: string,
  archetypeId: string,
): SwordsOfChaosCharacterSheet {
  const normalizedName = normalizeSwordsCharacterName(name)
  const archetype = SWORDS_PREMADE_ARCHETYPES.find(item => item.id === archetypeId)
  if (!archetype) {
    throw new Error(`Unknown Swords archetype "${archetypeId}"`)
  }

  return {
    name: normalizedName,
    creationMode: 'premade',
    ...archetype.sheet,
  }
}

export function buildSwordsCharacterSheetFromProcedural(
  name: string,
  option: SwordsCharacterProceduralOption,
): SwordsOfChaosCharacterSheet {
  const normalizedName = normalizeSwordsCharacterName(name)
  return {
    name: normalizedName,
    creationMode: 'procedural',
    archetype: null,
    ...option.sheet,
  }
}

export function buildSwordsCharacterSheetFromCustomChoices(
  name: string,
  choices: Record<SwordsCharacterCustomField, string>,
): SwordsOfChaosCharacterSheet {
  const normalizedName = normalizeSwordsCharacterName(name)

  return {
    name: normalizedName,
    creationMode: 'custom',
    archetype: 'Custom',
    className: getFieldOptionOrThrow('className', choices.className).label,
    species: getFieldOptionOrThrow('species', choices.species).label,
    origin: getFieldOptionOrThrow('origin', choices.origin).label,
    strength: getFieldOptionOrThrow('strength', choices.strength).label,
    flaw: getFieldOptionOrThrow('flaw', choices.flaw).label,
    keepsake: getFieldOptionOrThrow('keepsake', choices.keepsake).label,
    drive: getFieldOptionOrThrow('drive', choices.drive).label,
    omen: getFieldOptionOrThrow('omen', choices.omen).label,
  }
}

export function getSwordsCharacterSheetSeed(
  mode: SwordsOfChaosCreationMode,
  name: string,
): string {
  return `${mode}:${normalizeSwordsCharacterName(name).toLowerCase()}`
}

export function summarizeSwordsCharacterSheet(
  sheet: SwordsOfChaosCharacterSheet,
): string {
  return jsonStringify(
    {
      name: sheet.name,
      mode: sheet.creationMode,
      archetype: sheet.archetype,
      className: sheet.className,
      species: sheet.species,
      origin: sheet.origin,
      strength: sheet.strength,
      flaw: sheet.flaw,
      keepsake: sheet.keepsake,
      drive: sheet.drive,
      omen: sheet.omen,
    },
    null,
    2,
  )
}
