import { randomBytes } from 'crypto'
import {
  closeSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'fs'
import { dirname, join } from 'path'
import { logForDebugging } from '../../utils/debug.js'
import { getClaudeConfigHomeDir } from '../../utils/envUtils.js'

export type OpenAiCodexUsageWindow = {
  usedPercent: number
  resetAt: number | null
  windowMinutes: number
}

export type OpenAiCodexSessionTelemetrySnapshot = {
  updatedAt: number | null
  planType: string | null
  activeLimit: string | null
  collaborationMode: 'default' | 'background' | null
  resolvedModelId: string | null
  fiveHour: OpenAiCodexUsageWindow | null
  weekly: OpenAiCodexUsageWindow | null
}

type PersistedOpenAiCodexTelemetry = {
  version: number
  snapshot: OpenAiCodexSessionTelemetrySnapshot
}

const EMPTY_TELEMETRY: OpenAiCodexSessionTelemetrySnapshot = {
  updatedAt: null,
  planType: null,
  activeLimit: null,
  collaborationMode: null,
  resolvedModelId: null,
  fiveHour: null,
  weekly: null,
}

const OPENAI_CODEX_TELEMETRY_CACHE_VERSION = 1
const OPENAI_CODEX_TELEMETRY_MAX_AGE_MS = 30 * 60 * 1000

let currentTelemetry: OpenAiCodexSessionTelemetrySnapshot = EMPTY_TELEMETRY
let hasHydratedTelemetryFromDisk = false

function getOpenAiCodexTelemetryCachePath(): string {
  return join(getClaudeConfigHomeDir(), 'cache', 'openai-codex-telemetry.json')
}

function parseHeaderInt(
  headers: Headers,
  name: string,
): number | null {
  const raw = headers.get(name)
  if (!raw) {
    return null
  }

  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : null
}

function parseHeaderString(
  headers: Headers,
  name: string,
): string | null {
  const raw = headers.get(name)?.trim()
  return raw ? raw : null
}

function buildWindow(params: {
  usedPercent: number | null
  resetAt: number | null
  windowMinutes: number | null
}): OpenAiCodexUsageWindow | null {
  if (
    params.usedPercent === null ||
    params.windowMinutes === null ||
    !Number.isFinite(params.usedPercent) ||
    !Number.isFinite(params.windowMinutes)
  ) {
    return null
  }

  return {
    usedPercent: Math.max(0, Math.min(100, params.usedPercent)),
    resetAt: params.resetAt,
    windowMinutes: params.windowMinutes,
  }
}

function getPersistableTelemetry(
  snapshot: OpenAiCodexSessionTelemetrySnapshot,
): OpenAiCodexSessionTelemetrySnapshot | null {
  return snapshot.updatedAt === null ? null : snapshot
}

function loadPersistedOpenAiCodexTelemetry(): OpenAiCodexSessionTelemetrySnapshot | null {
  const cachePath = getOpenAiCodexTelemetryCachePath()

  try {
    const raw = readFileSync(cachePath, { encoding: 'utf-8' })
    const parsed = JSON.parse(raw) as PersistedOpenAiCodexTelemetry
    const snapshot = parsed?.snapshot

    if (
      parsed?.version !== OPENAI_CODEX_TELEMETRY_CACHE_VERSION ||
      !snapshot ||
      typeof snapshot !== 'object' ||
      typeof snapshot.updatedAt !== 'number'
    ) {
      return null
    }

    if (Date.now() - snapshot.updatedAt > OPENAI_CODEX_TELEMETRY_MAX_AGE_MS) {
      return null
    }

    return snapshot
  } catch {
    return null
  }
}

function persistOpenAiCodexTelemetry(
  snapshot: OpenAiCodexSessionTelemetrySnapshot,
): void {
  const persistable = getPersistableTelemetry(snapshot)
  const cachePath = getOpenAiCodexTelemetryCachePath()

  if (!persistable) {
    try {
      rmSync(cachePath, { force: true })
    } catch {
      // Ignore cache cleanup failures.
    }
    return
  }

  const tempPath = `${cachePath}.${randomBytes(8).toString('hex')}.tmp`

  try {
    mkdirSync(dirname(cachePath), { recursive: true, mode: 0o700 })

    const payload = JSON.stringify(
      {
        version: OPENAI_CODEX_TELEMETRY_CACHE_VERSION,
        snapshot: persistable,
      } satisfies PersistedOpenAiCodexTelemetry,
      null,
      2,
    )
    writeFileSync(tempPath, payload, { encoding: 'utf-8', mode: 0o600 })
    const fd = openSync(tempPath, 'r')
    try {
      fsyncSync(fd)
    } finally {
      closeSync(fd)
    }
    renameSync(tempPath, cachePath)
  } catch (error) {
    logForDebugging(
      `Failed to persist OpenAI/Codex telemetry: ${String(error)}`,
      { level: 'error' },
    )
    try {
      rmSync(tempPath, { force: true })
    } catch {
      // Ignore temp cleanup failures.
    }
  }
}

function hydrateTelemetryFromDiskIfNeeded(): void {
  if (hasHydratedTelemetryFromDisk) {
    return
  }

  hasHydratedTelemetryFromDisk = true

  const persisted = loadPersistedOpenAiCodexTelemetry()
  if (persisted) {
    currentTelemetry = persisted
  }
}

export function getOpenAiCodexSessionTelemetry(): OpenAiCodexSessionTelemetrySnapshot {
  hydrateTelemetryFromDiskIfNeeded()
  return currentTelemetry
}

export function resetOpenAiCodexSessionTelemetry(): void {
  currentTelemetry = EMPTY_TELEMETRY
  hasHydratedTelemetryFromDisk = true
  persistOpenAiCodexTelemetry(EMPTY_TELEMETRY)
}

export function recordOpenAiCodexTelemetryFromHeaders(
  headers: Headers,
): void {
  hydrateTelemetryFromDiskIfNeeded()

  const nextFiveHour = buildWindow({
    usedPercent: parseHeaderInt(headers, 'x-codex-primary-used-percent'),
    resetAt: parseHeaderInt(headers, 'x-codex-primary-reset-at'),
    windowMinutes: parseHeaderInt(headers, 'x-codex-primary-window-minutes'),
  })
  const nextWeekly = buildWindow({
    usedPercent: parseHeaderInt(headers, 'x-codex-secondary-used-percent'),
    resetAt: parseHeaderInt(headers, 'x-codex-secondary-reset-at'),
    windowMinutes: parseHeaderInt(headers, 'x-codex-secondary-window-minutes'),
  })

  currentTelemetry = {
    ...currentTelemetry,
    updatedAt: Date.now(),
    planType:
      parseHeaderString(headers, 'x-codex-plan-type') ??
      currentTelemetry.planType,
    activeLimit:
      parseHeaderString(headers, 'x-codex-active-limit') ??
      currentTelemetry.activeLimit,
    fiveHour: nextFiveHour ?? currentTelemetry.fiveHour,
    weekly: nextWeekly ?? currentTelemetry.weekly,
  }
  persistOpenAiCodexTelemetry(currentTelemetry)
}

export function recordOpenAiCodexTelemetryFromEvent(
  event: unknown,
): void {
  hydrateTelemetryFromDiskIfNeeded()

  if (!event || typeof event !== 'object') {
    return
  }

  const response =
    'response' in event &&
    event.response &&
    typeof event.response === 'object'
      ? event.response
      : null
  if (!response) {
    return
  }

  const background =
    'background' in response && typeof response.background === 'boolean'
      ? response.background
      : null
  const resolvedModelId =
    'model' in response && typeof response.model === 'string'
      ? response.model
      : null

  currentTelemetry = {
    ...currentTelemetry,
    updatedAt: Date.now(),
    collaborationMode:
      background === null
        ? currentTelemetry.collaborationMode
        : background
          ? 'background'
          : 'default',
    resolvedModelId: resolvedModelId ?? currentTelemetry.resolvedModelId,
  }
  persistOpenAiCodexTelemetry(currentTelemetry)
}
