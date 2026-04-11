import { classifyMidTurnSteering } from '../source/src/utils/midTurnSteering.ts'

const RECENT_MESSAGES = [
  {
    type: 'user',
    isMeta: false,
    message: {
      content: [
        {
          type: 'text',
          text: 'Fix the oxygen parser in the mining pipeline and validate the gold output.',
        },
      ],
    },
  },
]

const SCENARIOS = [
  {
    label: 'same-task-addition',
    input: 'also include gold',
    expected: 'same_task_steer',
  },
  {
    label: 'same-task-append',
    input: 'also mining support after this',
    expected: 'same_task_steer',
  },
  {
    label: 'park-for-later',
    input: 'work on the adjacent thing too',
    expected: 'park_for_later',
  },
  {
    label: 'side-question',
    input: 'should we talk about balloons too?',
    expected: 'side_question',
  },
  {
    label: 'explicit-work-question',
    input: 'how should we structure the oxygen parser fix?',
    expected: 'same_task_steer',
  },
  {
    label: 'interrupt',
    input: 'actually stop and do this instead',
    expected: 'interrupt_now',
  },
]

console.log('=== Mid-turn Steering Probe ===')
for (const scenario of SCENARIOS) {
  const result = classifyMidTurnSteering({
    currentInput: scenario.input,
    messages: RECENT_MESSAGES,
  })

  console.log(
    JSON.stringify(
      {
        label: scenario.label,
        input: scenario.input,
        expected: scenario.expected,
        result,
      },
      null,
      2,
    ),
  )
}
