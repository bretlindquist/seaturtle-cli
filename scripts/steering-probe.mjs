import {
  buildSteerCheckpoint,
  classifyBoundaryQueuedCommand,
  partitionQueuedCommandsForBoundary,
} from '../source/src/utils/steerCheckpoint.ts'

const SCENARIOS = [
  {
    label: 'same-task-now',
    command: {
      value: 'but also make sure it includes gold',
      mode: 'prompt',
      midTurnIntent: 'same_task_steer',
    },
  },
  {
    label: 'same-task-append',
    command: {
      value: "also add mining support after this",
      mode: 'prompt',
      midTurnIntent: 'same_task_steer',
    },
  },
  {
    label: 'defer-adjacent',
    command: {
      value: 'work on the adjacent thing too',
      mode: 'prompt',
      midTurnIntent: 'park_for_later',
    },
  },
  {
    label: 'ignore-side-question',
    command: {
      value: 'should we talk about mining and does this fix that problem?',
      mode: 'prompt',
      midTurnIntent: 'side_question',
    },
  },
  {
    label: 'task-notification-passthrough',
    command: {
      value: '<task-id>123</task-id><summary>done</summary>',
      mode: 'task-notification',
    },
  },
]

const commands = SCENARIOS.map(scenario => scenario.command)

console.log('=== Steering Probe: per-command classification ===')
for (const scenario of SCENARIOS) {
  const result = classifyBoundaryQueuedCommand(scenario.command)
  console.log(
    JSON.stringify(
      {
        label: scenario.label,
        prompt: scenario.command.value,
        midTurnIntent: scenario.command.midTurnIntent ?? null,
        result,
      },
      null,
      2,
    ),
  )
}

console.log('\n=== Steering Probe: boundary partition ===')
console.log(
  JSON.stringify(
    partitionQueuedCommandsForBoundary(commands),
    null,
    2,
  ),
)

console.log('\n=== Steering Probe: sample checkpoint ===')
console.log(
  JSON.stringify(
    buildSteerCheckpoint({
      stepNumber: 3,
      lastAssistantText: 'I traced the current bug to the route resolver.',
      queuedCommands: commands,
      toolNames: ['Bash'],
    }),
    null,
    2,
  ),
)
