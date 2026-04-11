import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  buildSteerBoundaryPlan,
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

function removeByIdentity(
  queue: QueuedCommand[],
  commandsToRemove: QueuedCommand[],
): QueuedCommand[] {
  return queue.filter(cmd => !commandsToRemove.includes(cmd))
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

  const plan = buildSteerBoundaryPlan({
    stepNumber: 4,
    lastAssistantText:
      'I traced the queue mutation boundary and updated the owner comment.',
    queuedCommands: [
      relevantNow,
      appendToTask,
      deferredAdjacent,
      ignoredSideQuestion,
      taskNotification,
    ],
    toolNames: ['Bash', 'Read'],
  })
  assert.deepEqual(plan.attachNow, [
    relevantNow,
    appendToTask,
    taskNotification,
  ])
  assert.deepEqual(plan.leaveQueued, [
    deferredAdjacent,
    ignoredSideQuestion,
  ])
  assert.deepEqual(plan.consumedCommands, [
    relevantNow,
    appendToTask,
    taskNotification,
  ])
  assert.equal(
    plan.checkpoint?.toolJustCompleted,
    'Bash, Read',
    'boundary plan should reuse the shared checkpoint payload',
  )

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

  const slashCommand = createPromptCommand('/status')
  const mutationRelevant = createPromptCommand(
    'carry this straight into the active task',
    'same_task_steer',
  )
  const mutationDeferred = createPromptCommand(
    'save this adjacent cleanup for later',
    'park_for_later',
  )
  const mutationNotification: QueuedCommand = {
    value: '<task-id>456</task-id><summary>done</summary>',
    mode: 'task-notification',
    priority: 'later',
  }
  const queueSnapshot = [
    mutationRelevant,
    mutationDeferred,
    mutationNotification,
  ]
  const queuePlan = buildSteerBoundaryPlan({
    stepNumber: 6,
    queuedCommands: queueSnapshot,
    toolNames: ['Read'],
  })
  assert.deepEqual(
    removeByIdentity(
      [mutationRelevant, mutationDeferred, mutationNotification, slashCommand],
      queuePlan.consumedCommands,
    ),
    [mutationDeferred, slashCommand],
    'queue mutation should remove only consumed prompt/task commands and preserve deferred or slash-routed entries',
  )

  const repoRoot = join(import.meta.dir, '..')
  const querySource = readFileSync(join(repoRoot, 'source/src/query.ts'), 'utf8')
  const queueManagerSource = readFileSync(
    join(repoRoot, 'source/src/utils/messageQueueManager.ts'),
    'utf8',
  )

  assert.match(
    querySource,
    /if \(isSlashCommand\(cmd\)\) return false/,
    'query loop should keep slash commands out of the model-attachment boundary',
  )
  assert.match(
    querySource,
    /const steerBoundaryPlan = buildSteerBoundaryPlan\(/,
    'query loop should build one shared steer boundary plan at the query boundary',
  )
  assert.match(
    querySource,
    /const steerCheckpoint = steerBoundaryPlan\.checkpoint/,
    'query loop should derive the checkpoint from the shared boundary plan',
  )
  assert.match(
    querySource,
    /content: buildSteerCheckpointTranscriptLine\(/,
    'query loop should build transcript checkpoint lines from the shared helper',
  )
  assert.match(
    querySource,
    /const boundaryCommandsToAttach = steerBoundaryPlan\.attachNow/,
    'query loop should attach boundary commands from the shared boundary plan',
  )
  assert.match(
    querySource,
    /const consumedCommands = steerBoundaryPlan\.consumedCommands/,
    'query loop should consume queue entries from the shared boundary plan',
  )
  assert.match(
    querySource,
    /removeFromQueue\(consumedCommands\)/,
    'query loop should remove only the consumed boundary commands from the shared queue',
  )
  assert.match(
    queueManagerSource,
    /export function remove\(commandsToRemove: QueuedCommand\[\]\): void/,
    'queue manager should keep a dedicated remove-by-identity path for consumed boundary commands',
  )
}

run()
console.log('steer checkpoint self-test passed')
