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

const EMPTY_TELEMETRY: OpenAiCodexSessionTelemetrySnapshot = {
  updatedAt: null,
  planType: null,
  activeLimit: null,
  collaborationMode: null,
  resolvedModelId: null,
  fiveHour: null,
  weekly: null,
}

let currentTelemetry: OpenAiCodexSessionTelemetrySnapshot = EMPTY_TELEMETRY

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

export function getOpenAiCodexSessionTelemetry(): OpenAiCodexSessionTelemetrySnapshot {
  return currentTelemetry
}

export function resetOpenAiCodexSessionTelemetry(): void {
  currentTelemetry = EMPTY_TELEMETRY
}

export function recordOpenAiCodexTelemetryFromHeaders(
  headers: Headers,
): void {
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
      parseHeaderString(headers, 'x-codex-plan-type') ?? currentTelemetry.planType,
    activeLimit:
      parseHeaderString(headers, 'x-codex-active-limit') ??
      currentTelemetry.activeLimit,
    fiveHour: nextFiveHour ?? currentTelemetry.fiveHour,
    weekly: nextWeekly ?? currentTelemetry.weekly,
  }
}

export function recordOpenAiCodexTelemetryFromEvent(
  event: unknown,
): void {
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
}
