import { dirname } from 'path'
import { safeParseJSON } from '../../utils/json.js'
import { jsonStringify } from '../../utils/slowOperations.js'
import { writeFileSyncAndFlush_DEPRECATED } from '../../utils/file.js'
import { getFsImplementation } from '../../utils/fsOperations.js'
import { getCtArchivesPath, getCtGameStatePath, getCtProjectRoot } from './paths.js'

export type CtArchives = {
  version: 1
  name: string
  temperament: string[]
  originTraits: string[]
  projectTraits: string[]
  secrets: string[]
  inventory: string[]
  titles: string[]
  oaths: string[]
  userRevealedTruths: string[]
  legendEvents: string[]
  wins: number
  losses: number
  gamesPlayed: number
  rarityUnlocks: string[]
  lastLegendEventAt: number | null
}

export type CtGameState = {
  version: 1
  lastOfferedAt: number | null
  lastPlayedAt: number | null
  discoveries: {
    gameCommandDiscovered: boolean
    wagerPlayed: boolean
    tideDicePlayed: boolean
    swordsOfChaosPlayed: boolean
  }
}

function createDefaultArchives(): CtArchives {
  return {
    version: 1,
    name: 'SeaTurtle CT-01',
    temperament: ['brisk', 'mischievous', 'curious'],
    originTraits: ['stock-kit'],
    projectTraits: [],
    secrets: [],
    inventory: [],
    titles: [],
    oaths: [],
    userRevealedTruths: [],
    legendEvents: [],
    wins: 0,
    losses: 0,
    gamesPlayed: 0,
    rarityUnlocks: [],
    lastLegendEventAt: null,
  }
}

function createDefaultGameState(): CtGameState {
  return {
    version: 1,
    lastOfferedAt: null,
    lastPlayedAt: null,
    discoveries: {
      gameCommandDiscovered: false,
      wagerPlayed: false,
      tideDicePlayed: false,
      swordsOfChaosPlayed: false,
    },
  }
}

function ensureParentDir(path: string): void {
  getFsImplementation().mkdirSync(dirname(path))
}

function writeJsonFile(path: string, value: unknown): void {
  ensureParentDir(path)
  writeFileSyncAndFlush_DEPRECATED(path, jsonStringify(value, null, 2) + '\n', {
    encoding: 'utf-8',
  })
}

function readJsonFile<T>(path: string): T | null {
  const fs = getFsImplementation()
  if (!fs.existsSync(path)) {
    return null
  }

  const raw = fs.readFileSync(path, { encoding: 'utf-8' })
  return safeParseJSON(raw) as T | null
}

function normalizeArchiveValue(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function appendUnique(list: string[], value: string): string[] {
  const normalized = normalizeArchiveValue(value)
  if (!normalized) {
    return list
  }

  const key = normalized.toLowerCase()
  if (list.some(entry => normalizeArchiveValue(entry).toLowerCase() === key)) {
    return list
  }

  return [...list, normalized]
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function sanitizeArchives(input: unknown): CtArchives {
  const defaults = createDefaultArchives()
  if (!input || typeof input !== 'object') {
    return defaults
  }

  const value = input as Partial<CtArchives>
  return {
    version: 1,
    name: typeof value.name === 'string' ? value.name : defaults.name,
    temperament: isStringArray(value.temperament)
      ? value.temperament.map(normalizeArchiveValue).filter(Boolean)
      : defaults.temperament,
    originTraits: isStringArray(value.originTraits)
      ? value.originTraits.map(normalizeArchiveValue).filter(Boolean)
      : defaults.originTraits,
    projectTraits: isStringArray(value.projectTraits)
      ? value.projectTraits.map(normalizeArchiveValue).filter(Boolean)
      : defaults.projectTraits,
    secrets: isStringArray(value.secrets) ? value.secrets : defaults.secrets,
    inventory: isStringArray(value.inventory)
      ? value.inventory
      : defaults.inventory,
    titles: isStringArray(value.titles) ? value.titles : defaults.titles,
    oaths: isStringArray(value.oaths) ? value.oaths : defaults.oaths,
    userRevealedTruths: isStringArray(value.userRevealedTruths)
      ? value.userRevealedTruths
      : defaults.userRevealedTruths,
    legendEvents: isStringArray(value.legendEvents)
      ? value.legendEvents
      : defaults.legendEvents,
    wins: typeof value.wins === 'number' && value.wins >= 0 ? value.wins : 0,
    losses:
      typeof value.losses === 'number' && value.losses >= 0 ? value.losses : 0,
    gamesPlayed:
      typeof value.gamesPlayed === 'number' && value.gamesPlayed >= 0
        ? value.gamesPlayed
        : 0,
    rarityUnlocks: isStringArray(value.rarityUnlocks)
      ? value.rarityUnlocks
      : defaults.rarityUnlocks,
    lastLegendEventAt:
      typeof value.lastLegendEventAt === 'number' ? value.lastLegendEventAt : null,
  }
}

function sanitizeGameState(input: unknown): CtGameState {
  const defaults = createDefaultGameState()
  if (!input || typeof input !== 'object') {
    return defaults
  }

  const value = input as Partial<CtGameState>
  const discoveries =
    value.discoveries && typeof value.discoveries === 'object'
      ? value.discoveries
      : defaults.discoveries

  return {
    version: 1,
    lastOfferedAt:
      typeof value.lastOfferedAt === 'number' ? value.lastOfferedAt : null,
    lastPlayedAt:
      typeof value.lastPlayedAt === 'number' ? value.lastPlayedAt : null,
    discoveries: {
      gameCommandDiscovered:
        typeof discoveries.gameCommandDiscovered === 'boolean'
          ? discoveries.gameCommandDiscovered
          : defaults.discoveries.gameCommandDiscovered,
      wagerPlayed:
        typeof discoveries.wagerPlayed === 'boolean'
          ? discoveries.wagerPlayed
          : defaults.discoveries.wagerPlayed,
      tideDicePlayed:
        typeof discoveries.tideDicePlayed === 'boolean'
          ? discoveries.tideDicePlayed
          : defaults.discoveries.tideDicePlayed,
      swordsOfChaosPlayed:
        typeof discoveries.swordsOfChaosPlayed === 'boolean'
          ? discoveries.swordsOfChaosPlayed
          : defaults.discoveries.swordsOfChaosPlayed,
    },
  }
}

export function ensureCtArchiveFiles(root: string = getCtProjectRoot()): {
  archivesPath: string
  gameStatePath: string
  createdPaths: string[]
} {
  const archivesPath = getCtArchivesPath(root)
  const gameStatePath = getCtGameStatePath(root)
  const createdPaths: string[] = []
  const fs = getFsImplementation()

  if (!fs.existsSync(archivesPath)) {
    writeJsonFile(archivesPath, createDefaultArchives())
    createdPaths.push(archivesPath)
  }

  if (!fs.existsSync(gameStatePath)) {
    writeJsonFile(gameStatePath, createDefaultGameState())
    createdPaths.push(gameStatePath)
  }

  return {
    archivesPath,
    gameStatePath,
    createdPaths,
  }
}

export function readCtArchives(root: string = getCtProjectRoot()): CtArchives {
  ensureCtArchiveFiles(root)
  return sanitizeArchives(readJsonFile<CtArchives>(getCtArchivesPath(root)))
}

export function readCtGameState(root: string = getCtProjectRoot()): CtGameState {
  ensureCtArchiveFiles(root)
  return sanitizeGameState(readJsonFile<CtGameState>(getCtGameStatePath(root)))
}

export function updateCtArchives(
  updater: (current: CtArchives) => CtArchives,
  root: string = getCtProjectRoot(),
): CtArchives {
  const next = sanitizeArchives(updater(readCtArchives(root)))
  writeJsonFile(getCtArchivesPath(root), next)
  return next
}

export function updateCtGameState(
  updater: (current: CtGameState) => CtGameState,
  root: string = getCtProjectRoot(),
): CtGameState {
  const next = sanitizeGameState(updater(readCtGameState(root)))
  writeJsonFile(getCtGameStatePath(root), next)
  return next
}

export function addSecret(secret: string, root?: string): CtArchives {
  return updateCtArchives(
    current => ({
      ...current,
      secrets: appendUnique(current.secrets, secret),
    }),
    root,
  )
}

export function addInventoryItem(item: string, root?: string): CtArchives {
  return updateCtArchives(
    current => ({
      ...current,
      inventory: appendUnique(current.inventory, item),
    }),
    root,
  )
}

export function addTitle(title: string, root?: string): CtArchives {
  return updateCtArchives(
    current => ({
      ...current,
      titles: appendUnique(current.titles, title),
    }),
    root,
  )
}

export function addOath(oath: string, root?: string): CtArchives {
  return updateCtArchives(
    current => ({
      ...current,
      oaths: appendUnique(current.oaths, oath),
    }),
    root,
  )
}

export function addUserTruth(truth: string, root?: string): CtArchives {
  return updateCtArchives(
    current => ({
      ...current,
      userRevealedTruths: appendUnique(current.userRevealedTruths, truth),
    }),
    root,
  )
}

export function addLegendEvent(event: string, root?: string): CtArchives {
  return updateCtArchives(
    current => ({
      ...current,
      legendEvents: appendUnique(current.legendEvents, event),
      lastLegendEventAt: Date.now(),
    }),
    root,
  )
}

export function addRarityUnlock(unlock: string, root?: string): CtArchives {
  return updateCtArchives(
    current => ({
      ...current,
      rarityUnlocks: appendUnique(current.rarityUnlocks, unlock),
    }),
    root,
  )
}

export function addProjectTrait(trait: string, root?: string): CtArchives {
  return updateCtArchives(
    current => ({
      ...current,
      projectTraits: appendUnique(current.projectTraits, trait),
    }),
    root,
  )
}

export function recordCtGameResult(
  outcome: 'played' | 'win' | 'loss',
  root?: string,
): CtArchives {
  return updateCtArchives(
    current => ({
      ...current,
      gamesPlayed: current.gamesPlayed + 1,
      wins: current.wins + (outcome === 'win' ? 1 : 0),
      losses: current.losses + (outcome === 'loss' ? 1 : 0),
    }),
    root,
  )
}
