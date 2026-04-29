import type { WorkExecutionPacket } from '../projectIdentity/workflowState.js'

export const DEFAULT_AUTOWORK_HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000
export const DEFAULT_AUTOWORK_CHECKPOINT_POLICY = 'verify-every-chunk'
const MIN_AUTOWORK_BUDGET_MS = 60 * 1000

function formatDurationMostSignificant(ms: number): string {
  if (ms >= 24 * 60 * 60 * 1000) {
    return `${Math.floor(ms / (24 * 60 * 60 * 1000))}d`
  }
  if (ms >= 60 * 60 * 1000) {
    return `${Math.floor(ms / (60 * 60 * 1000))}h`
  }
  if (ms >= 60 * 1000) {
    return `${Math.floor(ms / (60 * 1000))}m`
  }
  return `${Math.max(1, Math.floor(ms / 1000))}s`
}

export type ParsedAutoworkBudget =
  | {
      ok: true
      timeBudgetMs: number
      normalizedInput: string
    }
  | {
      ok: false
      message: string
    }

export type AutoworkRuntimeWindow = {
  timeBudgetMs: number | null
  deadlineAt: number | null
  heartbeatEnabled: boolean
  heartbeatIntervalMs: number
  checkpointPolicy: string
  expired: boolean
  remainingMs: number | null
  source: 'new-budget' | 'continued' | 'open-ended'
}

function parseAutoworkBudgetUnit(unit: string): number | null {
  switch (unit.toLowerCase()) {
    case 'm':
    case 'min':
    case 'mins':
    case 'minute':
    case 'minutes':
      return 60 * 1000
    case 'h':
    case 'hr':
    case 'hrs':
    case 'hour':
    case 'hours':
      return 60 * 60 * 1000
    case 'd':
    case 'day':
    case 'days':
      return 24 * 60 * 60 * 1000
    default:
      return null
  }
}

export function parseAutoworkBudgetInput(input: string): ParsedAutoworkBudget {
  const normalized = input.trim().replace(/^for\s+/iu, '')
  if (!normalized) {
    return {
      ok: false,
      message: 'Missing autowork time budget. Try `8h`, `90m`, or `for 8 hours`.',
    }
  }

  const match =
    /^(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)$/iu.exec(
      normalized,
    )
  if (!match) {
    return {
      ok: false,
      message:
        'Could not parse the autowork time budget. Use values like `30m`, `2h`, or `for 8 hours`.',
    }
  }

  const amount = Number(match[1])
  const unitMs = parseAutoworkBudgetUnit(match[2] ?? '')
  if (!Number.isFinite(amount) || amount <= 0 || unitMs === null) {
    return {
      ok: false,
      message:
        'Autowork time budgets must be positive values like `30m`, `2h`, or `1 day`.',
    }
  }

  const timeBudgetMs = Math.round(amount * unitMs)
  if (timeBudgetMs < MIN_AUTOWORK_BUDGET_MS) {
    return {
      ok: false,
      message: 'Autowork time budgets must be at least 1 minute.',
    }
  }

  return {
    ok: true,
    timeBudgetMs,
    normalizedInput: normalized,
  }
}

export function resolveAutoworkRuntimeWindow(
  current:
    | Pick<
        WorkExecutionPacket,
        | 'timeBudgetMs'
        | 'deadlineAt'
        | 'heartbeatEnabled'
        | 'heartbeatIntervalMs'
        | 'checkpointPolicy'
      >
    | null,
  options: {
    requestedTimeBudgetMs?: number | null
    now?: number
  } = {},
): AutoworkRuntimeWindow {
  const now = options.now ?? Date.now()
  const heartbeatIntervalMs =
    current?.heartbeatIntervalMs ?? DEFAULT_AUTOWORK_HEARTBEAT_INTERVAL_MS
  const checkpointPolicy =
    current?.checkpointPolicy ?? DEFAULT_AUTOWORK_CHECKPOINT_POLICY

  if (typeof options.requestedTimeBudgetMs === 'number') {
    return {
      timeBudgetMs: options.requestedTimeBudgetMs,
      deadlineAt: now + options.requestedTimeBudgetMs,
      heartbeatEnabled: true,
      heartbeatIntervalMs,
      checkpointPolicy,
      expired: false,
      remainingMs: options.requestedTimeBudgetMs,
      source: 'new-budget',
    }
  }

  if (current?.heartbeatEnabled) {
    const deadlineAt =
      typeof current.deadlineAt === 'number' ? current.deadlineAt : null
    const remainingMs = deadlineAt === null ? null : Math.max(0, deadlineAt - now)
    const expired = deadlineAt !== null && deadlineAt <= now
    return {
      timeBudgetMs: current.timeBudgetMs ?? null,
      deadlineAt,
      heartbeatEnabled: true,
      heartbeatIntervalMs,
      checkpointPolicy,
      expired,
      remainingMs,
      source: 'continued',
    }
  }

  return {
    timeBudgetMs: null,
    deadlineAt: null,
    heartbeatEnabled: true,
    heartbeatIntervalMs,
    checkpointPolicy,
    expired: false,
    remainingMs: null,
    source: 'open-ended',
  }
}

export function formatAutoworkRuntimeWindowLabel(
  current:
    | Pick<
        WorkExecutionPacket,
        'timeBudgetMs' | 'deadlineAt' | 'heartbeatEnabled'
      >
    | null,
  now: number = Date.now(),
): string {
  if (!current?.heartbeatEnabled) {
    return 'off'
  }

  if (current.deadlineAt === null || current.timeBudgetMs === null) {
    return 'open-ended'
  }

  const remainingMs = current.deadlineAt - now
  if (remainingMs <= 0) {
    return `expired ${formatDurationMostSignificant(Math.abs(remainingMs))} ago`
  }

  return `${formatDurationMostSignificant(remainingMs)} remaining of ${formatDurationMostSignificant(current.timeBudgetMs)}`
}
