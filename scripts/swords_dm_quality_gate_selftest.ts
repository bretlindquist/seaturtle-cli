#!/usr/bin/env bun

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildSceneSnapshots } from './soc-scene-probe.mjs'

const repoRoot = join(import.meta.dir, '..')
const gameCommand = readFileSync(
  join(repoRoot, 'source/src/commands/game/game.tsx'),
  'utf8',
)

const concreteTokens = [
  'alley',
  'rain',
  'sign',
  'lamp',
  'trench coat',
  'brick',
  'tree',
  'root',
  'thorn',
  'moss',
  'deck',
  'ship',
  'salt',
  'lantern',
  'station',
  'strip-light',
  'pressure door',
  'grove',
  'foxfire',
  'leaf',
  'dungeon',
  'stone',
  'dust',
  'metal',
  'soil',
  'door',
  'beacon',
]

const hiddenMotiveLeaks = [
  'secretly wants',
  'the hidden motive',
  'the real motive',
  'what this really means',
  'the truth is that',
  'the scene wants you to know',
]

const actionCues = [
  'push',
  'hold',
  'use',
  'press',
  'offer',
  'treat',
  'study',
  'reach',
  'speak',
  'mark',
  'turn',
  'follow',
  'test',
  'commit',
  'let',
  'wait',
  'name',
  'laugh',
  'bow',
  'draw',
]

const consequenceCues = [
  'risk',
  'cost',
  'may',
  'might',
  'could',
  'consequence',
  'carry forward',
  'chapter',
  'proof',
  'owe',
  'bind',
  'claim',
  'terms',
  'pressure',
  'danger',
]

const comfortCues = [
  'careful',
  'quiet',
  'patient',
  'ease',
  'humor',
  'calm',
  'study',
  'hold',
]

const mysteryKillers = [
  'you are not in atmosphere',
  'the place no longer feels like a single place',
  'the second move reveals what kind of trouble this really is',
]

function normalize(value: string): string {
  return value.toLowerCase()
}

function assertIncludesAny(
  text: string,
  cues: string[],
  message: string,
): void {
  const lower = normalize(text)
  assert(
    cues.some(cue => lower.includes(cue)),
    message,
  )
}

function getApproachKinds(texts: string[]): Set<string> {
  const approaches = new Set<string>()

  for (const description of texts.map(normalize)) {
    if (/(threat|draw|edge|harder|aggressive|visible threat|cut off|make the hidden thing answer)/.test(description)) {
      approaches.add('aggressive')
    }
    if (/(careful|quiet|patient|study|hold|bow|observe)/.test(description)) {
      approaches.add('patient')
    }
    if (/(claim|bluff|voice|name|fiction|deceive|speak)/.test(description)) {
      approaches.add('social')
    }
    if (/(laugh|humor|ease|indirect|strange)/.test(description)) {
      approaches.add('indirect')
    }
  }

  return approaches
}

function validateSceneText(label: string, subtitle: string, text: string): void {
  const rendered = `${subtitle}\n\n${text}`
  const lower = normalize(rendered)
  const firstParagraph = rendered.split(/\n\s*\n/g).find(Boolean)?.toLowerCase() ?? ''

  assert(
    concreteTokens.some(token => firstParagraph.includes(token)),
    `${label}: scene should begin with concrete sensory reality before abstraction`,
  )

  if (/\blike\b|\bas if\b|\bseems\b|\bfeels\b/.test(lower)) {
    assert(
      concreteTokens.some(token => lower.includes(token)),
      `${label}: metaphor should stay anchored to concrete scene reality`,
    )
  }

  assert(
    hiddenMotiveLeaks.every(phrase => !lower.includes(phrase)),
    `${label}: scene should not explain hidden motives directly`,
  )

  assert(
    mysteryKillers.every(phrase => !lower.includes(phrase)),
    `${label}: scene should preserve mystery without collapsing into vague meta language`,
  )
}

function validateSnapshot(snapshot: ReturnType<typeof buildSceneSnapshots>[number]): void {
  validateSceneText(
    `${snapshot.label} opening`,
    snapshot.opening.subtitle,
    snapshot.opening.sceneText,
  )
  validateSceneText(
    `${snapshot.label} second beat`,
    snapshot.secondBeat.subtitle,
    snapshot.secondBeat.sceneText,
  )

  const combinedText = [
    snapshot.opening.sceneText,
    snapshot.secondBeat.sceneText,
    snapshot.opening.hintText ?? '',
    snapshot.secondBeat.hintText ?? '',
  ].join('\n')
  const optionDescriptions = [
    ...snapshot.opening.options.map(option => `${option.label}\n${option.description}`),
    ...snapshot.secondBeat.options.map(option => `${option.label}\n${option.description}`),
  ]
  const joinedDescriptions = optionDescriptions.join('\n')
  const lowerDescriptions = normalize(joinedDescriptions)

  assertIncludesAny(
    combinedText,
    ['stakes:', 'pressure', 'danger', 'risk', 'tempt', 'opportunity', 'owe'],
    `${snapshot.label}: scene should include pressure, temptation, danger, or opportunity`,
  )

  for (const option of [...snapshot.opening.options, ...snapshot.secondBeat.options]) {
    assertIncludesAny(
      `${option.label}\n${option.description}`,
      actionCues,
      `${snapshot.label}: choice "${option.label}" should be actionable`,
    )
    assertIncludesAny(
      `${option.label}\n${option.description}\n${combinedText}`,
      consequenceCues,
      `${snapshot.label}: choice "${option.label}" should alter a visible or hidden layer`,
    )
  }

  assert(
    getApproachKinds(optionDescriptions).size >= 3,
    `${snapshot.label}: offered choices should represent materially different approaches`,
  )

  assert(
    comfortCues.some(cue => lowerDescriptions.includes(cue)) &&
      consequenceCues.some(cue => lowerDescriptions.includes(cue)),
    `${snapshot.label}: offered choices should include at least one deceptively comfortable line`,
  )

  assert(
    /(quiet|patient|careful|study|hold|bow|observe)/.test(lowerDescriptions),
    `${snapshot.label}: offered choices should include a quiet, patient, or indirect approach`,
  )

  if (snapshot.meta.revisitCount > 0 || snapshot.meta.familiarPlace) {
    assert(
      /(again|last time|remembers|familiar|returning|spared before|left unopened before)/.test(
        normalize([snapshot.opening.sceneText, joinedDescriptions].join('\n')),
      ),
      `${snapshot.label}: revisit scenes should visibly remember prior turns`,
    )
  }
}

assert.match(
  gameCommand,
  /label:\s*'Make your own move'/,
  'Swords runtime should leave room for the player to surprise the DM',
)

for (const snapshot of buildSceneSnapshots()) {
  validateSnapshot(snapshot)
}

console.log('swords DM quality gate self-test passed')
