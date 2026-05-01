import { parseAutoworkBudgetInput } from './runtimeWindow.js'
import type { AutoworkEntryPoint } from './state.js'

export type AutoworkNaturalLanguageDirective = {
  entryPoint: AutoworkEntryPoint
  slashCommand: string
}

const DIRECTIVE_PATTERNS: readonly RegExp[] = [
  /^(autowork|swim)\b([\s\S]*)$/iu,
  /^(?:start|begin|engage|enter|resume|continue)\s+(autowork|swim)\b([\s\S]*)$/iu,
  /^(?:switch|go)\s+(?:me\s+)?(?:into|to)\s+(autowork|swim)\b([\s\S]*)$/iu,
]

const EXACT_ACTIONS = new Set([
  'run',
  'step',
  'status',
  'doctor',
  'safe',
  'dangerous',
  'verify',
])

const DEFAULT_RUN_TAIL =
  /^(?:this|that|it|the\b|on\b|for\b|toward\b|towards\b|against\b|through\b)/iu

function normalizeTail(rawTail: string): string {
  return rawTail.trim().replace(/[.:;,\s]+$/u, '').trim()
}

function buildBudgetCommand(
  entryPoint: AutoworkEntryPoint,
  action: 'run' | 'step',
  budgetTail: string,
): string | null {
  const parsed = parseAutoworkBudgetInput(budgetTail)
  if (!parsed.ok) {
    return null
  }
  return `/${entryPoint} ${action} ${parsed.normalizedInput}`
}

function resolveSlashCommand(
  entryPoint: AutoworkEntryPoint,
  tail: string,
): string | null {
  if (!tail) {
    return `/${entryPoint} run`
  }

  const normalized = normalizeTail(tail)
  if (!normalized) {
    return `/${entryPoint} run`
  }

  const lower = normalized.toLowerCase()
  if (EXACT_ACTIONS.has(lower)) {
    return `/${entryPoint} ${lower}`
  }

  if (lower === 'cloud') {
    return `/${entryPoint} cloud run 8h`
  }

  if (lower.startsWith('cloud ')) {
    return `/${entryPoint} ${normalized}`
  }

  if (lower.startsWith('use ')) {
    return `/${entryPoint} ${normalized}`
  }

  if (lower.startsWith('run ')) {
    return buildBudgetCommand(entryPoint, 'run', normalized.slice(4).trim())
  }

  if (lower.startsWith('step ')) {
    return buildBudgetCommand(entryPoint, 'step', normalized.slice(5).trim())
  }

  const budgetRun = buildBudgetCommand(entryPoint, 'run', normalized)
  if (budgetRun) {
    return budgetRun
  }

  if (DEFAULT_RUN_TAIL.test(normalized)) {
    return `/${entryPoint} run`
  }

  return null
}

export function parseAutoworkNaturalLanguageDirective(
  input: string,
): AutoworkNaturalLanguageDirective | null {
  const trimmed = input.trim()
  if (!trimmed || trimmed.startsWith('/')) {
    return null
  }

  for (const pattern of DIRECTIVE_PATTERNS) {
    const match = pattern.exec(trimmed)
    if (!match) {
      continue
    }

    const entryPoint = match[1]?.toLowerCase()
    if (entryPoint !== 'autowork' && entryPoint !== 'swim') {
      return null
    }

    const slashCommand = resolveSlashCommand(entryPoint, match[2] ?? '')
    if (!slashCommand) {
      return null
    }

    return {
      entryPoint,
      slashCommand,
    }
  }

  return null
}
