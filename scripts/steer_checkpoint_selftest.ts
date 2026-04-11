import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  buildSteerCheckpoint,
  buildSteerCheckpointTranscriptLine,
  classifyBoundaryQueuedCommand,
  partitionQueuedCommandsForBoundary,
} from '../source/src/utils/steerCheckpoint.ts'
import type { QueuedCommand } from '../source/src/types/textInputTypes.js'

function createPromptCommand(
  value: string,
  midTurnIntent?: QueuedCommand['midTurnIntent'],
): QueuedCommand {
  return {
    value,
    mode: 'prompt',
    priority: 'next',
    ...(midTurnIntent ? { midTurnIntent } : {}),
  }
}

function run(): void {
  const relevantNow = createPromptCommand(
    'also tighten the validation on that path',
    'same_task_steer',
  )
  const appendToTask = createPromptCommand(
    'also add the docs pass after this',
    'same_task_steer',
  )
  const deferredAdjacent = createPromptCommand(
    'park that adjacent cleanup for later',
    'park_for_later',
  )
  const ignoredSideQuestion = createPromptCommand(
    'should we talk about the auth model instead?',
    'side_question',
  )
  const taskNotification: QueuedCommand = {
    value: '<task-id>123</task-id><summary>done</summary>',
    mode: 'task-notification',
    priority: 'later',
  }

  assert.deepEqual(classifyBoundaryQueuedCommand(relevantNow), {
    classification: 'relevant_now',
    reason: 'same_task_steer_from_mid_turn_classifier',
  })
  assert.deepEqual(classifyBoundaryQueuedCommand(appendToTask), {
    classification: 'append_to_task',
    reason: 'same_task_steer_with_deferred_timing_language',
  })
  assert.deepEqual(classifyBoundaryQueuedCommand(deferredAdjacent), {
    classification: 'defer_adjacent',
    reason: 'park_for_later_from_mid_turn_classifier',
  })
  assert.deepEqual(classifyBoundaryQueuedCommand(ignoredSideQuestion), {
    classification: 'ignore',
    reason: 'side_question_lane_should_not_hijack_active_task',
  })
  assert.equal(
    classifyBoundaryQueuedCommand(taskNotification),
    null,
    'task notifications should bypass prompt-only semantic classification',
  )

  const partition = partitionQueuedCommandsForBoundary([
    relevantNow,
    appendToTask,
    deferredAdjacent,
    ignoredSideQuestion,
    taskNotification,
  ])
  assert.deepEqual(partition.attachNow, [
    relevantNow,
    appendToTask,
    taskNotification,
  ])
  assert.deepEqual(partition.leaveQueued, [
    deferredAdjacent,
    ignoredSideQuestion,
  ])

  const checkpoint = buildSteerCheckpoint({
    stepNumber: 4,
    lastAssistantText: 'I traced the queue mutation boundary and updated the owner comment.',
    queuedCommands: [
      relevantNow,
      appendToTask,
      deferredAdjacent,
      ignoredSideQuestion,
      taskNotification,
    ],
    toolNames: ['Bash', 'Read'],
  })
  assert.ok(checkpoint, 'expected a checkpoint when prompt-like queued steers exist')
  assert.equal(checkpoint?.stepNumber, 4)
  assert.equal(
    checkpoint?.toolJustCompleted,
    'Bash, Read',
    'tool names should be preserved in the boundary record',
  )
  assert.deepEqual(checkpoint?.appliedChangesToActiveTask, [
    'also tighten the validation on that path',
  ])
  assert.deepEqual(checkpoint?.deferredItems, [
    'also add the docs pass after this',
    'park that adjacent cleanup for later',
  ])
  assert.equal(
    checkpoint?.steerClassifications[3]?.classification,
    'ignore',
    'side-question-like queued prompts should stay visible in the checkpoint but not hijack the task',
  )
  assert.match(
    checkpoint?.boundaryTimestamp ?? '',
    /^\d{4}-\d{2}-\d{2}T/,
    'checkpoint should stamp an ISO boundary time',
  )

  const transcriptLine = buildSteerCheckpointTranscriptLine({
    stepNumber: checkpoint!.stepNumber,
    toolJustCompleted: checkpoint!.toolJustCompleted,
    steerClassifications: checkpoint!.steerClassifications,
  })
  assert.equal(
    transcriptLine,
    'Steer checkpoint: step 4 · after Bash, Read · 1 now · 1 append · 1 deferred · 1 ignored',
  )

  assert.equal(
    buildSteerCheckpoint({
      stepNumber: 5,
      queuedCommands: [taskNotification],
      toolNames: ['Read'],
    }),
    null,
    'task notifications alone should not fabricate a steer checkpoint',
  )

  const repoRoot = join(import.meta.dir, '..')
  const querySource = readFileSync(join(repoRoot, 'source/src/query.ts'), 'utf8')

  assert.match(
    querySource,
    /const steerCheckpoint = buildSteerCheckpoint\(/,
    'query loop should build steer checkpoints from the shared helper',
  )
  assert.match(
    querySource,
    /content: buildSteerCheckpointTranscriptLine\(/,
    'query loop should build transcript checkpoint lines from the shared helper',
  )
  assert.match(
    querySource,
    /partitionQueuedCommandsForBoundary\(queuedCommandsSnapshot\)/,
    'query loop should partition queued commands through the shared boundary helper',
  )
}

run()
console.log('steer checkpoint self-test passed')
