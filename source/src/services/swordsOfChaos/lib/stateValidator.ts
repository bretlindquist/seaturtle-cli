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

function isCharacterDevelopment(
  value: unknown,
): value is SwordsOfChaosSaveFile['characterDevelopment'] {
  if (!value || typeof value !== 'object') {
    return false
  }

  const development = value as SwordsOfChaosSaveFile['characterDevelopment']
  return (
    (development.focus === 'edge' ||
      development.focus === 'composure' ||
      development.focus === 'nerve' ||
      development.focus === 'witness' ||
      development.focus === 'threshold' ||
      development.focus === 'myth' ||
      development.focus === null) &&
    isNullableString(development.title) &&
    isNullableString(development.lesson) &&
    isNullableString(development.pressure) &&
    typeof development.stage === 'number' &&
    (typeof development.lastUpdatedAt === 'number' ||
      development.lastUpdatedAt === null)
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

function isStoryContinuation(
  value: unknown,
): value is NonNullable<SwordsOfChaosSaveFile['story']['continuation']> {
  if (!value || typeof value !== 'object') {
    return false
  }

  const continuation =
    value as NonNullable<SwordsOfChaosSaveFile['story']['continuation']>

  return (
    (continuation.kind === 'watcher-pressure' ||
      continuation.kind === 'wrong-name-echo' ||
      continuation.kind === 'oath-binding' ||
      continuation.kind === 'threshold-strain' ||
      continuation.kind === 'relic-resonance' ||
      continuation.kind === 'unquiet-aftermath') &&
    typeof continuation.summary === 'string' &&
    typeof continuation.nextPressure === 'string' &&
    (continuation.pacing === 'linger' ||
      continuation.pacing === 'press' ||
      continuation.pacing === 'reveal')
  )
}

function isStorySceneState(
  value: unknown,
): value is NonNullable<SwordsOfChaosSaveFile['story']['sceneState']> {
  if (!value || typeof value !== 'object') {
    return false
  }

  const sceneState =
    value as NonNullable<SwordsOfChaosSaveFile['story']['sceneState']>

  return (
    (sceneState.kind === 'watched-approach' ||
      sceneState.kind === 'threshold-contest' ||
      sceneState.kind === 'name-pressure' ||
      sceneState.kind === 'relic-nearness' ||
      sceneState.kind === 'oath-test' ||
      sceneState.kind === 'unquiet-scene') &&
    (sceneState.status === 'live' ||
      sceneState.status === 'complicating' ||
      sceneState.status === 'revealing' ||
      sceneState.status === 'paying-off') &&
    typeof sceneState.commitment === 'string' &&
    typeof sceneState.hazard === 'string' &&
    typeof sceneState.pendingReveal === 'string' &&
    typeof sceneState.beatsElapsed === 'number' &&
    (typeof sceneState.lastProgressedAt === 'number' ||
      sceneState.lastProgressedAt === null)
  )
}

function isStoryState(
  value: unknown,
): value is SwordsOfChaosSaveFile['story'] {
  if (!value || typeof value !== 'object') {
    return false
  }

  const story = value as SwordsOfChaosSaveFile['story']
  return (
    (story.activeLocus === 'alley' ||
      story.activeLocus === 'old-tree' ||
      story.activeLocus === 'ocean-ship' ||
      story.activeLocus === 'post-apocalyptic-ruin' ||
      story.activeLocus === 'space-station' ||
      story.activeLocus === 'mars-outpost' ||
      story.activeLocus === 'fae-realm' ||
      story.activeLocus === 'dark-dungeon' ||
      story.activeLocus === null) &&
    isNullableString(story.activeThread) &&
    typeof story.chapter === 'number' &&
    isNullableString(story.chapterTitle) &&
    (story.tension === 'low' ||
      story.tension === 'rising' ||
      story.tension === 'high') &&
    isNullableString(story.currentObjective) &&
    isNullableString(story.carryForward) &&
    (story.continuation === null || isStoryContinuation(story.continuation)) &&
    (story.sceneState === null || isStorySceneState(story.sceneState)) &&
    (story.lastOutcomeKey === 'relic' ||
      story.lastOutcomeKey === 'title' ||
      story.lastOutcomeKey === 'oath' ||
      story.lastOutcomeKey === 'truth' ||
      story.lastOutcomeKey === 'refusal' ||
      story.lastOutcomeKey === null) &&
    (typeof story.lastAdvancedAt === 'number' ||
      story.lastAdvancedAt === null)
  )
}

function isMagicState(
  value: unknown,
): value is SwordsOfChaosSaveFile['magic'] {
  if (!value || typeof value !== 'object') {
    return false
  }

  const magic = value as SwordsOfChaosSaveFile['magic']
  return (
    typeof magic.rarityBudget === 'number' &&
    typeof magic.omensSeen === 'number' &&
    typeof magic.crossingsOpened === 'number' &&
    (magic.activeImpossible === 'none' ||
      magic.activeImpossible === 'omen' ||
      magic.activeImpossible === 'crossing' ||
      magic.activeImpossible === 'witness' ||
      magic.activeImpossible === 'relic-sign') &&
    isNullableString(magic.lastOmen) &&
    (typeof magic.lastManifestationAt === 'number' ||
      magic.lastManifestationAt === null)
  )
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
    isCharacterDevelopment(value.characterDevelopment) &&
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
    isStoryState(value.story) &&
    isMagicState(value.magic) &&
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
