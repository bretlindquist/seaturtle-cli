import type { Tip } from './types.js'

type OpenAiTipRuntimeSnapshot = {
  execution?: {
    family?: 'anthropic' | 'openai'
  }
  supportsHostedShell?: boolean
  supportsImageGeneration?: boolean
  supportsComputerUse?: boolean
  hostedFileSearchConfigured?: boolean
  supportsHostedFileSearch?: boolean
  supportsRemoteMcp?: boolean
}

export function shouldShowProjectTodoCommandTip(
  params: {
    todoFeatureEnabled?: boolean
  },
  hasProjectTodoFile: boolean,
): boolean {
  return params.todoFeatureEnabled !== false && !hasProjectTodoFile
}

export function shouldShowStatusDashboardTip(params: {
  numStartups: number
}): boolean {
  return params.numStartups > 2
}

export function shouldShowConfigHelpTip(params: {
  numStartups: number
}): boolean {
  return params.numStartups > 2
}

export function shouldShowTranscriptSearchTip(params: {
  numStartups: number
}): boolean {
  return params.numStartups > 3
}

export function shouldShowCopyMenuTip(params: {
  copyCommandBehavior?: string
}): boolean {
  return params.copyCommandBehavior !== 'copyLatestResponse'
}

export function shouldShowExecutionLanesTip(params: {
  numStartups: number
}): boolean {
  return params.numStartups > 3
}

export function shouldShowTelegramSetupTip(
  params: {
    numStartups: number
  },
  hasTelegramBinding: boolean,
): boolean {
  return !hasTelegramBinding && params.numStartups > 4
}

export function shouldShowOpenAiRuntimeDocsTip(
  runtime: OpenAiTipRuntimeSnapshot,
): boolean {
  return runtime.execution?.family === 'openai'
}

export function shouldShowOpenAiHostedShellTip(
  runtime: OpenAiTipRuntimeSnapshot,
): boolean {
  return runtime.execution?.family === 'openai' && !!runtime.supportsHostedShell
}

export function shouldShowOpenAiImageGenerationTip(
  runtime: OpenAiTipRuntimeSnapshot,
): boolean {
  return (
    runtime.execution?.family === 'openai' && !!runtime.supportsImageGeneration
  )
}

export function shouldShowOpenAiComputerUseTip(
  runtime: OpenAiTipRuntimeSnapshot,
): boolean {
  return runtime.execution?.family === 'openai' && !!runtime.supportsComputerUse
}

export function shouldShowOpenAiHostedFileSearchTip(
  runtime: OpenAiTipRuntimeSnapshot,
): boolean {
  return (
    runtime.execution?.family === 'openai' &&
    !!runtime.hostedFileSearchConfigured &&
    !!runtime.supportsHostedFileSearch
  )
}

export function shouldShowOpenAiRemoteMcpTip(
  runtime: OpenAiTipRuntimeSnapshot,
): boolean {
  return runtime.execution?.family === 'openai' && !!runtime.supportsRemoteMcp
}

export function selectTipWithLongestTimeSinceShownUsing(
  availableTips: Tip[],
  getSessionsSinceLastShown: (tipId: string) => number,
): Tip | undefined {
  if (availableTips.length === 0) {
    return undefined
  }

  if (availableTips.length === 1) {
    return availableTips[0]
  }

  return [...availableTips]
    .map(tip => ({
      tip,
      sessions: getSessionsSinceLastShown(tip.id),
    }))
    .sort((left, right) => right.sessions - left.sessions)[0]?.tip
}
