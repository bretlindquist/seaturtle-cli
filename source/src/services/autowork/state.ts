import { dirname } from 'path'
import { safeParseJSON } from '../../utils/json.js'
import { jsonStringify } from '../../utils/slowOperations.js'
import { writeFileSyncAndFlush_DEPRECATED } from '../../utils/file.js'
import { getFsImplementation } from '../../utils/fsOperations.js'
import {
  getCtAutoworkStatePath,
  getCtProjectRoot,
} from '../projectIdentity/paths.js'

export type AutoworkMode =
  | 'discovery'
  | 'verification'
  | 'research'
  | 'plan-hardening'
  | 'execution'
  | 'audit-and-polish'
  | 'idle'

export type AutoworkRunMode = 'safe' | 'dangerous'
export type AutoworkExecutionScope = 'plan' | 'step'

export type AutoworkStartupInspection = {
  branch: string | null
  gitStatusShort: string[]
  latestRelevantCommits: string[]
  hasUncommittedChanges: boolean
  hasExecutablePlanFile: boolean
  hasRecentlyCompletedUnverifiedChunk: boolean
  validationKnownForLastChunk: boolean
  ignoreHygieneOk: boolean
  capturedAt: number
}

export type AutoworkValidationResult = {
  command: string
  ok: boolean
  summary?: string
  checkedAt: number
}

export type AutoworkContinuationDebt = {
  code: string
  message: string
  failedCheck?: string
  chunkId?: string
  capturedAt: number
}

export type AutoworkStopReason = {
  code: string
  message: string
  failedCheck?: string
  chunkId?: string
  capturedAt: number
}

export type AutoworkState = {
  version: 1
  sourcePlanPath: string | null
  sourcePlanRevision: string | null
  currentChunkId: string | null
  completedChunkIds: string[]
  failedChunkIds: string[]
  currentMode: AutoworkMode
  lastStartupInspection: AutoworkStartupInspection | null
  lastValidationResult: AutoworkValidationResult | null
  lastCommitSha: string | null
  rollbackRef: string | null
  runMode: AutoworkRunMode
  executionScope: AutoworkExecutionScope
  continuationDebt: AutoworkContinuationDebt[]
  stopReason: AutoworkStopReason | null
  lastStartedAt: number | null
  lastFinishedAt: number | null
  implementedButUnverified: boolean
  telegramEscalationEnabled: boolean
  lastTelegramNoticeSignature: string | null
  runCount: number
}

function createDefaultAutoworkState(): AutoworkState {
  return {
    version: 1,
    sourcePlanPath: null,
    sourcePlanRevision: null,
    currentChunkId: null,
    completedChunkIds: [],
    failedChunkIds: [],
    currentMode: 'idle',
    lastStartupInspection: null,
    lastValidationResult: null,
    lastCommitSha: null,
    rollbackRef: null,
    runMode: 'safe',
    executionScope: 'plan',
    continuationDebt: [],
    stopReason: null,
    lastStartedAt: null,
    lastFinishedAt: null,
    implementedButUnverified: false,
    telegramEscalationEnabled: true,
    lastTelegramNoticeSignature: null,
    runCount: 0,
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

function uniqueNonEmptyStrings(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return []
  }

  return Array.from(
    new Set(
      values
        .map(value => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean),
    ),
  )
}

function sanitizeStartupInspection(
  input: unknown,
): AutoworkStartupInspection | null {
  if (!input || typeof input !== 'object') {
    return null
  }

  const value = input as Partial<AutoworkStartupInspection>
  return {
    branch: typeof value.branch === 'string' ? value.branch : null,
    gitStatusShort: uniqueNonEmptyStrings(value.gitStatusShort),
    latestRelevantCommits: uniqueNonEmptyStrings(value.latestRelevantCommits),
    hasUncommittedChanges: !!value.hasUncommittedChanges,
    hasExecutablePlanFile: !!value.hasExecutablePlanFile,
    hasRecentlyCompletedUnverifiedChunk:
      !!value.hasRecentlyCompletedUnverifiedChunk,
    validationKnownForLastChunk: !!value.validationKnownForLastChunk,
    ignoreHygieneOk: !!value.ignoreHygieneOk,
    capturedAt:
      typeof value.capturedAt === 'number' ? value.capturedAt : Date.now(),
  }
}

function sanitizeValidationResult(
  input: unknown,
): AutoworkValidationResult | null {
  if (!input || typeof input !== 'object') {
    return null
  }

  const value = input as Partial<AutoworkValidationResult>
  if (typeof value.command !== 'string' || !value.command.trim()) {
    return null
  }

  return {
    command: value.command.trim(),
    ok: !!value.ok,
    summary: typeof value.summary === 'string' ? value.summary : undefined,
    checkedAt:
      typeof value.checkedAt === 'number' ? value.checkedAt : Date.now(),
  }
}

function sanitizeStopReason(input: unknown): AutoworkStopReason | null {
  if (!input || typeof input !== 'object') {
    return null
  }

  const value = input as Partial<AutoworkStopReason>
  if (typeof value.code !== 'string' || typeof value.message !== 'string') {
    return null
  }

  return {
    code: value.code.trim(),
    message: value.message.trim(),
    failedCheck:
      typeof value.failedCheck === 'string' ? value.failedCheck : undefined,
    chunkId: typeof value.chunkId === 'string' ? value.chunkId : undefined,
    capturedAt:
      typeof value.capturedAt === 'number' ? value.capturedAt : Date.now(),
  }
}

function sanitizeContinuationDebt(
  input: unknown,
): AutoworkContinuationDebt[] {
  if (!Array.isArray(input)) {
    return []
  }

  return input
    .map(value => {
      if (!value || typeof value !== 'object') {
        return null
      }

      const debt = value as Partial<AutoworkContinuationDebt>
      if (typeof debt.code !== 'string' || typeof debt.message !== 'string') {
        return null
      }

      return {
        code: debt.code.trim(),
        message: debt.message.trim(),
        failedCheck:
          typeof debt.failedCheck === 'string' ? debt.failedCheck : undefined,
        chunkId: typeof debt.chunkId === 'string' ? debt.chunkId : undefined,
        capturedAt:
          typeof debt.capturedAt === 'number' ? debt.capturedAt : Date.now(),
      }
    })
    .filter((value): value is AutoworkContinuationDebt => value !== null)
}

function sanitizeAutoworkMode(value: unknown): AutoworkMode {
  switch (value) {
    case 'discovery':
    case 'verification':
    case 'research':
    case 'plan-hardening':
    case 'execution':
    case 'audit-and-polish':
    case 'idle':
      return value
    default:
      return 'idle'
  }
}

function sanitizeRunMode(value: unknown): AutoworkRunMode {
  return value === 'dangerous' ? 'dangerous' : 'safe'
}

function sanitizeExecutionScope(value: unknown): AutoworkExecutionScope {
  return value === 'step' ? 'step' : 'plan'
}

function sanitizeAutoworkState(input: unknown): AutoworkState {
  const defaults = createDefaultAutoworkState()
  if (!input || typeof input !== 'object') {
    return defaults
  }

  const value = input as Partial<AutoworkState>
  return {
    version: 1,
    sourcePlanPath:
      typeof value.sourcePlanPath === 'string' ? value.sourcePlanPath : null,
    sourcePlanRevision:
      typeof value.sourcePlanRevision === 'string'
        ? value.sourcePlanRevision
        : null,
    currentChunkId:
      typeof value.currentChunkId === 'string' ? value.currentChunkId : null,
    completedChunkIds: uniqueNonEmptyStrings(value.completedChunkIds),
    failedChunkIds: uniqueNonEmptyStrings(value.failedChunkIds),
    currentMode: sanitizeAutoworkMode(value.currentMode),
    lastStartupInspection: sanitizeStartupInspection(value.lastStartupInspection),
    lastValidationResult: sanitizeValidationResult(value.lastValidationResult),
    lastCommitSha:
      typeof value.lastCommitSha === 'string' ? value.lastCommitSha : null,
    rollbackRef:
      typeof value.rollbackRef === 'string' ? value.rollbackRef : null,
    runMode: sanitizeRunMode(value.runMode),
    executionScope: sanitizeExecutionScope(value.executionScope),
    continuationDebt: sanitizeContinuationDebt(value.continuationDebt),
    stopReason: sanitizeStopReason(value.stopReason),
    lastStartedAt:
      typeof value.lastStartedAt === 'number' ? value.lastStartedAt : null,
    lastFinishedAt:
      typeof value.lastFinishedAt === 'number' ? value.lastFinishedAt : null,
    implementedButUnverified: !!value.implementedButUnverified,
    telegramEscalationEnabled:
      typeof value.telegramEscalationEnabled === 'boolean'
        ? value.telegramEscalationEnabled
        : defaults.telegramEscalationEnabled,
    lastTelegramNoticeSignature:
      typeof value.lastTelegramNoticeSignature === 'string'
        ? value.lastTelegramNoticeSignature
        : null,
    runCount:
      typeof value.runCount === 'number' && value.runCount >= 0
        ? value.runCount
        : defaults.runCount,
  }
}

export function ensureAutoworkStateFile(
  root: string = getCtProjectRoot(),
): { path: string; created: boolean } {
  const path = getCtAutoworkStatePath(root)
  const fs = getFsImplementation()

  if (!fs.existsSync(path)) {
    writeJsonFile(path, createDefaultAutoworkState())
    return { path, created: true }
  }

  return { path, created: false }
}

export function readAutoworkState(
  root: string = getCtProjectRoot(),
): AutoworkState {
  ensureAutoworkStateFile(root)
  return sanitizeAutoworkState(
    readJsonFile<AutoworkState>(getCtAutoworkStatePath(root)),
  )
}

export function writeAutoworkState(
  value: AutoworkState,
  root: string = getCtProjectRoot(),
): AutoworkState {
  const next = sanitizeAutoworkState(value)
  writeJsonFile(getCtAutoworkStatePath(root), next)
  return next
}

export function updateAutoworkState(
  updater: (current: AutoworkState) => AutoworkState,
  root: string = getCtProjectRoot(),
): AutoworkState {
  const next = sanitizeAutoworkState(updater(readAutoworkState(root)))
  writeJsonFile(getCtAutoworkStatePath(root), next)
  return next
}
