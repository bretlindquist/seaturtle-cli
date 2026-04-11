import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import type { QueuedCommand } from '../types/textInputTypes.js'
import { isPromptLikeInputMode } from '../components/PromptInput/inputModes.js'

const APPEND_TO_TASK_PATTERNS = [
  /\b(after this|later in this|once that's done|once thats done)\b/i,
  /\b(before you finish|before wrapping up|before you wrap up)\b/i,
  /\b(when you get there|when you get to that)\b/i,
] as const

export type SteerCheckpointClassification =
  | 'relevant_now'
  | 'append_to_task'
  | 'defer_adjacent'
  | 'ignore'

function getPromptText(value: string | Array<ContentBlockParam>): string {
  if (typeof value === 'string') {
    return value.trim()
  }

  return value
    .flatMap(block => (block.type === 'text' ? [block.text] : []))
    .join('\n')
    .trim()
}

function classifyBoundarySteer(input: {
  prompt: string
  midTurnIntent?: QueuedCommand['midTurnIntent']
}):
  | {
      classification: SteerCheckpointClassification
      reason: string
    } {
  const prompt = input.prompt
  const midTurnIntent = input.midTurnIntent

  if (midTurnIntent === 'same_task_steer') {
    if (APPEND_TO_TASK_PATTERNS.some(pattern => pattern.test(prompt))) {
      return {
        classification: 'append_to_task',
        reason: 'same_task_steer_with_deferred_timing_language',
      }
    }

    return {
      classification: 'relevant_now',
      reason: 'same_task_steer_from_mid_turn_classifier',
    }
  }

  if (midTurnIntent === 'park_for_later') {
    return {
      classification: 'defer_adjacent',
      reason: 'park_for_later_from_mid_turn_classifier',
    }
  }

  if (midTurnIntent === 'side_question') {
    return {
      classification: 'ignore',
      reason: 'side_question_lane_should_not_hijack_active_task',
    }
  }

  return {
    classification: 'defer_adjacent',
    reason: 'default_defer_for_unclassified_boundary_prompt',
  }
}

export function classifyBoundaryQueuedCommand(
  cmd: QueuedCommand,
):
  | {
      classification: SteerCheckpointClassification
      reason: string
    }
  | null {
  if (!isPromptLikeInputMode(cmd.mode)) {
    return null
  }

  return classifyBoundarySteer({
    prompt: getPromptText(cmd.value),
    midTurnIntent: cmd.midTurnIntent,
  })
}

function getStepDescription(input: {
  lastAssistantText?: string
  toolNames: string[]
}): string {
  const trimmedAssistant = input.lastAssistantText?.replace(/\s+/g, ' ').trim()
  if (trimmedAssistant) {
    return trimmedAssistant.slice(0, 160)
  }

  if (input.toolNames.length > 0) {
    return `Completed ${input.toolNames.join(', ')}`
  }

  return 'Post-tool boundary'
}

export function buildSteerCheckpointTranscriptLine(input: {
  stepNumber: number
  toolJustCompleted: string
  steerClassifications: Array<{
    classification: SteerCheckpointClassification
  }>
}): string {
  const relevantNowCount = input.steerClassifications.filter(
    item => item.classification === 'relevant_now',
  ).length
  const appendCount = input.steerClassifications.filter(
    item => item.classification === 'append_to_task',
  ).length
  const deferCount = input.steerClassifications.filter(
    item => item.classification === 'defer_adjacent',
  ).length
  const ignoreCount = input.steerClassifications.filter(
    item => item.classification === 'ignore',
  ).length

  const parts = [
    `Steer checkpoint: step ${input.stepNumber}`,
    `after ${input.toolJustCompleted}`,
  ]

  if (relevantNowCount > 0) parts.push(`${relevantNowCount} now`)
  if (appendCount > 0) parts.push(`${appendCount} append`)
  if (deferCount > 0) parts.push(`${deferCount} deferred`)
  if (ignoreCount > 0) parts.push(`${ignoreCount} ignored`)

  return parts.join(' · ')
}

export function buildSteerCheckpoint(input: {
  stepNumber: number
  lastAssistantText?: string
  queuedCommands: QueuedCommand[]
  toolNames: string[]
}):
  | {
      type: 'steer_checkpoint'
      stepNumber: number
      stepDescription: string
      toolJustCompleted: string
      queuedSteersReceived: {
        prompt: string
        sourceUuid?: QueuedCommand['uuid']
        midTurnIntent?: QueuedCommand['midTurnIntent']
      }[]
      steerClassifications: {
        prompt: string
        classification: SteerCheckpointClassification
        reason?: string
      }[]
      appliedChangesToActiveTask: string[]
      deferredItems: string[]
      nextStep: string
      boundaryTimestamp: string
    }
  | null {
  const queuedSteers = input.queuedCommands
    .filter(cmd => isPromptLikeInputMode(cmd.mode))
    .map(cmd => ({
      prompt: getPromptText(cmd.value),
      sourceUuid: cmd.uuid,
      midTurnIntent: cmd.midTurnIntent,
    }))
    .filter(item => item.prompt.length > 0)

  if (queuedSteers.length === 0) {
    return null
  }

  const steerClassifications = queuedSteers.map(item => ({
    prompt: item.prompt,
    ...classifyBoundarySteer({
      prompt: item.prompt,
      midTurnIntent: item.midTurnIntent,
    }),
  }))

  const appliedChangesToActiveTask = steerClassifications
    .filter(item => item.classification === 'relevant_now')
    .map(item => item.prompt)

  const deferredItems = steerClassifications
    .filter(
      item =>
        item.classification === 'append_to_task' ||
        item.classification === 'defer_adjacent',
    )
    .map(item => item.prompt)

  return {
    type: 'steer_checkpoint',
    stepNumber: input.stepNumber,
    stepDescription: getStepDescription({
      lastAssistantText: input.lastAssistantText,
      toolNames: input.toolNames,
    }),
    toolJustCompleted:
      input.toolNames.length > 0 ? input.toolNames.join(', ') : 'unknown',
    queuedSteersReceived: queuedSteers,
    steerClassifications,
    appliedChangesToActiveTask,
    deferredItems,
    nextStep:
      appliedChangesToActiveTask.length > 0
        ? 'Continue active task with relevant-now steering applied'
        : deferredItems.length > 0
          ? 'Continue active task and preserve deferred steering for later handling'
          : 'Continue active task',
    boundaryTimestamp: new Date().toISOString(),
  }
}

export function partitionQueuedCommandsForBoundary(
  queuedCommands: QueuedCommand[],
): {
  attachNow: QueuedCommand[]
  leaveQueued: QueuedCommand[]
} {
  const attachNow: QueuedCommand[] = []
  const leaveQueued: QueuedCommand[] = []

  for (const cmd of queuedCommands) {
    if (!isPromptLikeInputMode(cmd.mode)) {
      attachNow.push(cmd)
      continue
    }

    const result = classifyBoundaryQueuedCommand(cmd)
    if (
      result?.classification === 'relevant_now' ||
      result?.classification === 'append_to_task'
    ) {
      attachNow.push(cmd)
      continue
    }

    leaveQueued.push(cmd)
  }

  return { attachNow, leaveQueued }
}
