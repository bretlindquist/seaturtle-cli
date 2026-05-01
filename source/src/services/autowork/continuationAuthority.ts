import { isPromptLikeInputMode } from '../../components/PromptInput/inputModes.js'
import type { QueuedCommand } from '../../types/textInputTypes.js'
import { enqueue, getCommandQueue } from '../../utils/messageQueueManager.js'
import { getCtProjectRoot } from '../projectIdentity/paths.js'
import { peekActiveWorkstream } from '../projectIdentity/workflowState.js'
import { inspectAndSelectAutoworkMode } from './runner.js'
import {
  readAutoworkState,
  type AutoworkEntryPoint,
  type AutoworkMode,
} from './state.js'

export type AutoworkContinuationCommand = {
  entryPoint: AutoworkEntryPoint
  value: string
}

const LIFECYCLE_MODES: readonly AutoworkMode[] = [
  'discovery',
  'research',
  'plan-hardening',
  'audit-and-polish',
]

function isLifecycleMode(mode: AutoworkMode): boolean {
  return LIFECYCLE_MODES.includes(mode)
}

function hasQueuedMainThreadPromptLikeCommand(): boolean {
  return getCommandQueue().some(
    command =>
      command.agentId === undefined &&
      isPromptLikeInputMode(command.mode),
  )
}

function hasQueuedAutoworkContinuation(
  continuation: AutoworkContinuationCommand,
): boolean {
  return getCommandQueue().some(
    command =>
      command.agentId === undefined &&
      command.mode === 'prompt' &&
      typeof command.value === 'string' &&
      command.value === continuation.value,
  )
}

function shouldBlockContinuation(root: string): {
  blocked: boolean
  entryPoint: AutoworkEntryPoint
} {
  const state = readAutoworkState(root)
  const workflow = peekActiveWorkstream(root)
  const execution = workflow?.packets.execution ?? null

  if (!execution?.heartbeatEnabled) {
    return { blocked: true, entryPoint: state.entryPoint }
  }

  if (typeof execution.deadlineAt === 'number' && execution.deadlineAt <= Date.now()) {
    return { blocked: true, entryPoint: state.entryPoint }
  }

  if (execution.swarmActive) {
    return { blocked: true, entryPoint: state.entryPoint }
  }

  if (state.stopReason) {
    return { blocked: true, entryPoint: state.entryPoint }
  }

  return { blocked: false, entryPoint: state.entryPoint }
}

export async function resolveAutoworkContinuationCommand(
  root: string = getCtProjectRoot(),
): Promise<AutoworkContinuationCommand | null> {
  const { blocked, entryPoint } = shouldBlockContinuation(root)
  if (blocked) {
    return null
  }

  const state = readAutoworkState(root)

  if (state.implementedButUnverified && state.currentChunkId) {
    return {
      entryPoint,
      value: `/${entryPoint} verify`,
    }
  }

  if (isLifecycleMode(state.currentMode)) {
    return {
      entryPoint,
      value: `/${entryPoint} run`,
    }
  }

  if (state.executionScope !== 'plan') {
    return null
  }

  const planPath = state.sourcePlanPath ?? state.selectedPlanPath ?? null
  const startupContext = await inspectAndSelectAutoworkMode(planPath)
  if (!startupContext.repoRoot) {
    return null
  }

  if (isLifecycleMode(startupContext.mode)) {
    return {
      entryPoint,
      value: `/${entryPoint} run`,
    }
  }

  if (
    startupContext.mode === 'execution' &&
    startupContext.nextPendingChunkId !== null
  ) {
    return {
      entryPoint,
      value: `/${entryPoint} run`,
    }
  }

  return null
}

export async function enqueueAutoworkContinuationIfNeeded(
  root: string = getCtProjectRoot(),
): Promise<boolean> {
  if (hasQueuedMainThreadPromptLikeCommand()) {
    return false
  }

  const continuation = await resolveAutoworkContinuationCommand(root)
  if (!continuation) {
    return false
  }

  if (hasQueuedAutoworkContinuation(continuation)) {
    return false
  }

  const queuedCommand: QueuedCommand = {
    value: continuation.value,
    mode: 'prompt',
    priority: 'later',
    isMeta: true,
  }
  enqueue(queuedCommand)
  return true
}
