import {
  adjudicateSwordsFreeResponse,
} from '../source/src/services/swordsOfChaos/lib/liveDm.ts'
import { getSwordsOfChaosRelevantMemory } from '../source/src/services/swordsOfChaos/lib/relevantMemory.ts'
import { createDefaultSave, repeatRoute } from './soc-scene-probe.mjs'

const samples = [
  {
    label: 'Opening steel',
    input: {
      stage: 'opening',
      text: 'I draw my blade and step toward the lamp.',
      relevantMemory: getSwordsOfChaosRelevantMemory(createDefaultSave()),
    },
  },
  {
    label: 'Opening courtesy',
    input: {
      stage: 'opening',
      text: 'I bow slightly and wait to see who moves first.',
      relevantMemory: getSwordsOfChaosRelevantMemory(createDefaultSave()),
    },
  },
  {
    label: 'Opening bluff',
    input: {
      stage: 'opening',
      text: 'I smile and tell the turtle they already know my name.',
      relevantMemory: getSwordsOfChaosRelevantMemory(createDefaultSave()),
    },
  },
  {
    label: 'Second beat careful',
    input: {
      stage: 'second-beat',
      openingChoice: 'bow-slightly',
      text: 'I keep the bow a second longer and ask what this place wants.',
      relevantMemory: getSwordsOfChaosRelevantMemory(
        repeatRoute(createDefaultSave(), ['bow-slightly', 'keep-bowing'], 1),
      ),
    },
  },
  {
    label: 'Second beat high risk',
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
  },
]

for (const sample of samples) {
  const adjudication = adjudicateSwordsFreeResponse(sample.input)
  console.log(`# ${sample.label}`)
  console.log(`- tactic: ${adjudication.intent.tactic}`)
  console.log(`- tone: ${adjudication.intent.tone}`)
  console.log(`- target: ${adjudication.intent.target}`)
  console.log(`- risk: ${adjudication.intent.risk}`)
  console.log(`- truthfulness: ${adjudication.intent.truthfulness}`)
  console.log(`- confidence: ${adjudication.intent.confidence.toFixed(2)}`)
  console.log(`- openingChoice: ${adjudication.openingChoice ?? 'n/a'}`)
  console.log(`- secondChoice: ${adjudication.secondChoice ?? 'n/a'}`)
  console.log(`- actions: ${adjudication.actions.map(action => action.kind).join(', ')}`)
  console.log(`- subtitle: ${adjudication.subtitle}`)
  console.log(`- beat focus: ${adjudication.beatScript.focus}`)
  console.log(
    adjudication.beatScript.lines.map(line => line.text).join('\n'),
  )
  console.log('\n---\n')
}
