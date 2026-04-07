import type { SwordsOfChaosSaveFile } from '../types/save.js'

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === 'string' || value === null
}

function isCharacterSheet(
  value: unknown,
): value is SwordsOfChaosSaveFile['character'] {
  if (!value || typeof value !== 'object') {
    return false
  }

  const character = value as SwordsOfChaosSaveFile['character']
  return (
    isNullableString(character.name) &&
    (character.creationMode === 'premade' ||
      character.creationMode === 'procedural' ||
      character.creationMode === 'custom' ||
      character.creationMode === null) &&
    isNullableString(character.archetype) &&
    isNullableString(character.className) &&
    isNullableString(character.species) &&
    isNullableString(character.origin) &&
    isNullableString(character.strength) &&
    isNullableString(character.flaw) &&
    isNullableString(character.keepsake) &&
    isNullableString(character.drive) &&
    isNullableString(character.omen)
  )
}

function isSessionZeroState(
  value: unknown,
): value is SwordsOfChaosSaveFile['sessionZero'] {
  if (!value || typeof value !== 'object') {
    return false
  }

  const sessionZero = value as SwordsOfChaosSaveFile['sessionZero']
  return (
    typeof sessionZero.completed === 'boolean' &&
    isNullableString(sessionZero.originPlace) &&
    isNullableString(sessionZero.firstContact) &&
    (typeof sessionZero.completedAt === 'number' ||
      sessionZero.completedAt === null)
  )
}

function isEncounterMemoryRecord(
  value: unknown,
): value is SwordsOfChaosSaveFile['encounterMemory'] {
  if (!value || typeof value !== 'object') {
    return false
  }

  return Object.values(value).every(entry => {
    if (!entry || typeof entry !== 'object') {
      return false
    }

    const memory = entry as SwordsOfChaosSaveFile['encounterMemory'][string]
    return (
      typeof memory.visits === 'number' &&
      isStringArray(memory.seenOpeners) &&
      isStringArray(memory.seenRoutes) &&
      (typeof memory.lastRoute === 'string' || memory.lastRoute === null)
    )
  })
}

function isThreadMemoryRecord(
  value: unknown,
): value is SwordsOfChaosSaveFile['threadMemory'] {
  if (!value || typeof value !== 'object') {
    return false
  }

  return Object.values(value).every(entry => {
    if (!entry || typeof entry !== 'object') {
      return false
    }

    const memory = entry as SwordsOfChaosSaveFile['threadMemory'][string]
    return (
      typeof memory.sightings === 'number' &&
      typeof memory.canonized === 'boolean' &&
      (typeof memory.lastSeenAt === 'number' || memory.lastSeenAt === null)
    )
  })
}

export function isSwordsOfChaosSaveFile(
  input: unknown,
): input is SwordsOfChaosSaveFile {
  if (!input || typeof input !== 'object') {
    return false
  }

  const value = input as Partial<SwordsOfChaosSaveFile>
  return (
    value.version === 1 &&
    !!value.player &&
    typeof value.player.level === 'number' &&
    typeof value.player.hp === 'number' &&
    typeof value.player.maxHp === 'number' &&
    !!value.player.stats &&
    typeof value.player.stats === 'object' &&
    isCharacterSheet(value.character) &&
    isSessionZeroState(value.sessionZero) &&
    isStringArray(value.inventory) &&
    isStringArray(value.conditions) &&
    !!value.progression &&
    Array.isArray(value.progression.titles) &&
    Array.isArray(value.progression.milestones) &&
    typeof value.progression.xp === 'number' &&
    isStringArray(value.worldFlags) &&
    isStringArray(value.discoveredSeeds) &&
    isStringArray(value.callbackMarkers) &&
    isStringArray(value.unresolvedBranches) &&
    isStringArray(value.threadCandidates) &&
    isThreadMemoryRecord(value.threadMemory) &&
    isEncounterMemoryRecord(value.encounterMemory) &&
    !!value.seaturtle &&
    typeof value.seaturtle.bond === 'number' &&
    typeof value.seaturtle.favor === 'number' &&
    typeof value.seaturtle.appearances === 'number' &&
    (typeof value.seaturtle.lastAppearanceAt === 'number' ||
      value.seaturtle.lastAppearanceAt === null) &&
    !!value.runHistorySummary &&
    typeof value.runHistorySummary.runsStarted === 'number' &&
    typeof value.runHistorySummary.runsFinished === 'number' &&
    (typeof value.runHistorySummary.lastPlayedAt === 'number' ||
      value.runHistorySummary.lastPlayedAt === null)
  )
}

export function validateSwordsOfChaosSave(
  input: unknown,
): SwordsOfChaosSaveFile {
  if (!isSwordsOfChaosSaveFile(input)) {
    throw new Error('Invalid Swords of Chaos save file')
  }

  return input
}
