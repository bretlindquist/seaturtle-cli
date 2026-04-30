import type { QueuedCommand } from '../types/textInputTypes.js'
import { isPromptLikeInputMode } from '../components/PromptInput/inputModes.js'
import {
  dequeue,
  dequeueAllMatching,
  hasCommandsInQueue,
  isSlashCommand,
  peek,
} from './messageQueueManager.js'

type ProcessQueueParams = {
  executeInput: (commands: QueuedCommand[]) => Promise<void>
}

type ProcessQueueResult = {
  processed: boolean
}

type QueueFilter = (cmd: QueuedCommand) => boolean

function matchesExecutionBatch(
  cmd: QueuedCommand,
  options: {
    filter?: QueueFilter
    targetMode: QueuedCommand['mode']
    targetPriority: QueuedCommand['priority']
    targetMidTurnIntent: QueuedCommand['midTurnIntent']
  },
): boolean {
  return (
    (!options.filter || options.filter(cmd)) &&
    !isSlashCommand(cmd) &&
    cmd.mode === options.targetMode &&
    cmd.priority === options.targetPriority &&
    cmd.midTurnIntent === options.targetMidTurnIntent
  )
}

/**
 * Single source of truth for between-turn queue execution selection.
 *
 * Prompt-like steering, slash commands, and bash commands always advance one
 * command at a time. Remaining non-prompt system items can still batch when
 * they share the same execution shape.
 */
export function dequeueNextExecutionBatch(
  filter?: QueueFilter,
): QueuedCommand[] {
  const next = peek(filter)
  if (!next) {
    return []
  }

  if (
    isSlashCommand(next) ||
    next.mode === 'bash' ||
    isPromptLikeInputMode(next.mode)
  ) {
    const cmd = dequeue(filter)
    return cmd ? [cmd] : []
  }

  const targetMode = next.mode
  const targetPriority = next.priority
  const targetMidTurnIntent = next.midTurnIntent
  const shouldProcessIndividually = targetMidTurnIntent === 'park_for_later'

  if (shouldProcessIndividually) {
    const cmd = dequeue(cmd =>
      matchesExecutionBatch(cmd, {
        filter,
        targetMode,
        targetPriority,
        targetMidTurnIntent,
      }),
    )
    return cmd ? [cmd] : []
  }

  return dequeueAllMatching(cmd =>
    matchesExecutionBatch(cmd, {
      filter,
      targetMode,
      targetPriority,
      targetMidTurnIntent,
    }),
  )
}

/**
 * Processes commands from the queue.
 *
 * Slash commands (starting with '/') and bash-mode commands are processed
 * one at a time so each goes through the executeInput path individually.
 * Bash commands need individual processing to preserve per-command error
 * isolation, exit codes, and progress UI. Other non-slash commands are
 * batched: all items **with the same mode** as the highest-priority item
 * are drained at once and passed as a single array to executeInput — each
 * becomes its own user message with its own UUID. Different modes
 * (e.g. prompt vs task-notification) are never mixed because they are
 * treated differently downstream.
 *
 * The caller is responsible for ensuring no query is currently running
 * and for calling this function again after each command completes
 * until the queue is empty.
 *
 * @returns result with processed status
 */
export function processQueueIfReady({
  executeInput,
}: ProcessQueueParams): ProcessQueueResult {
  // This processor runs on the REPL main thread between turns. Skip anything
  // addressed to a subagent — an unfiltered peek() returning a subagent
  // notification would set targetMode, dequeueAllMatching would find nothing
  // matching that mode with agentId===undefined, and we'd return processed:
  // false with the queue unchanged → the React effect never re-fires and any
  // queued user prompt stalls permanently.
  const isMainThread = (cmd: QueuedCommand) => cmd.agentId === undefined

  const commands = dequeueNextExecutionBatch(isMainThread)
  if (commands.length === 0) {
    return { processed: false }
  }

  void executeInput(commands)
  return { processed: true }
}

/**
 * Checks if the queue has pending commands.
 * Use this to determine if queue processing should be triggered.
 */
export function hasQueuedCommands(): boolean {
  return hasCommandsInQueue()
}
