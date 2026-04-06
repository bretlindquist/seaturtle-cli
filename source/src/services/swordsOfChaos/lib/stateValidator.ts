import type { SwordsOfChaosSaveFile } from '../types/save.js'

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
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
