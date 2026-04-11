import {
  adjudicateSwordsFreeResponse,
} from '../source/src/services/swordsOfChaos/lib/liveDm.ts'
import { getSwordsOfChaosRelevantMemory } from '../source/src/services/swordsOfChaos/lib/relevantMemory.ts'
import { createDefaultSave, repeatRoute } from './soc-scene-probe.mjs'

const checks = [
  {
    label: 'Opening steel maps to draw-steel with strike pacing',
    input: {
      stage: 'opening',
      text: 'I draw my blade and step toward the lamp.',
      relevantMemory: getSwordsOfChaosRelevantMemory(createDefaultSave()),
    },
    expect(adjudication) {
      return [
        adjudication.openingChoice === 'draw-steel' ||
          `expected draw-steel, got ${adjudication.openingChoice ?? 'none'}`,
        adjudication.intent.tactic === 'steel' ||
          `expected steel tactic, got ${adjudication.intent.tactic}`,
        adjudication.beatScript.focus === 'strike' ||
          `expected strike focus, got ${adjudication.beatScript.focus}`,
        adjudication.actions.some(action => action.kind === 'escalate_danger') ||
          'expected escalate_danger action',
      ]
    },
  },
  {
    label: 'Opening courtesy maps to bow-slightly with hold pacing',
    input: {
      stage: 'opening',
      text: 'I bow slightly and wait to see who moves first.',
      relevantMemory: getSwordsOfChaosRelevantMemory(createDefaultSave()),
    },
    expect(adjudication) {
      return [
        adjudication.openingChoice === 'bow-slightly' ||
          `expected bow-slightly, got ${adjudication.openingChoice ?? 'none'}`,
        adjudication.beatScript.focus === 'hold' ||
          `expected hold focus, got ${adjudication.beatScript.focus}`,
        adjudication.actions.some(action => action.kind === 'affirm_tactic') ||
          'expected affirm_tactic action',
      ]
    },
  },
  {
    label: 'Opening bluff stays bluff-shaped and misdirects',
    input: {
      stage: 'opening',
      text: 'I smile and tell the turtle they already know my name.',
      relevantMemory: getSwordsOfChaosRelevantMemory(createDefaultSave()),
    },
    expect(adjudication) {
      return [
        adjudication.openingChoice === 'talk-like-you-belong' ||
          `expected talk-like-you-belong, got ${adjudication.openingChoice ?? 'none'}`,
        adjudication.intent.truthfulness === 'bluff' ||
          `expected bluff truthfulness, got ${adjudication.intent.truthfulness}`,
        adjudication.actions.some(action => action.kind === 'misdirect') ||
          'expected misdirect action',
        adjudication.beatScript.focus === 'tighten' ||
          `expected tighten focus, got ${adjudication.beatScript.focus}`,
      ]
    },
  },
  {
    label: 'Careful second beat keeps courtesy pressure alive',
    input: {
      stage: 'second-beat',
      openingChoice: 'bow-slightly',
      text: 'I keep the bow a second longer and ask what this place wants.',
      relevantMemory: getSwordsOfChaosRelevantMemory(
        repeatRoute(createDefaultSave(), ['bow-slightly', 'keep-bowing'], 1),
      ),
    },
    expect(adjudication) {
      return [
        adjudication.secondChoice === 'keep-bowing' ||
          `expected keep-bowing, got ${adjudication.secondChoice ?? 'none'}`,
        adjudication.intent.tactic === 'courtesy' ||
          `expected courtesy tactic, got ${adjudication.intent.tactic}`,
        adjudication.actions.some(action => action.kind === 'soft_fail_forward') ||
          'expected soft_fail_forward action',
      ]
    },
  },
  {
    label: 'High-risk bluff escalates cleanly in second beat',
    input: {
      stage: 'second-beat',
      openingChoice: 'talk-like-you-belong',
      text: 'I name myself captain and dare the ship to say otherwise.',
      relevantMemory: getSwordsOfChaosRelevantMemory(
        repeatRoute(
          createDefaultSave(),
          ['talk-like-you-belong', 'laugh-like-you-mean-it'],
          4,
        ),
      ),
    },
    expect(adjudication) {
      return [
        adjudication.secondChoice === 'name-a-false-title' ||
          `expected name-a-false-title, got ${adjudication.secondChoice ?? 'none'}`,
        adjudication.intent.risk === 'high' ||
          `expected high risk, got ${adjudication.intent.risk}`,
        adjudication.actions.some(action => action.kind === 'hard_consequence') ||
          'expected hard_consequence action',
        adjudication.beatScript.focus === 'strike' ||
          `expected strike focus, got ${adjudication.beatScript.focus}`,
      ]
    },
  },
]

const report = []
let failureCount = 0

for (const check of checks) {
  const adjudication = adjudicateSwordsFreeResponse(check.input)
  const results = check.expect(adjudication)
  const failures = results.filter(result => result !== true)
  if (failures.length === 0) {
    report.push(`PASS ${check.label}`)
    continue
  }

  failureCount += failures.length
  report.push(`FAIL ${check.label}`)
  for (const failure of failures) {
    report.push(`  - ${failure}`)
  }
}

console.log(report.join('\n'))

if (failureCount > 0) {
  console.error(`soc-free-response-check found ${failureCount} issue(s)`)
  process.exit(1)
}
