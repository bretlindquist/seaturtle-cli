#!/usr/bin/env bun

import { buildSceneSnapshots } from './soc-scene-probe.mjs'

const bannedPhrases = [
  'The alley seems interested now.',
  'The second move reveals what kind of trouble this really is.',
  'something larger that keeps surfacing elsewhere in other materials',
  'You are not in danger yet. You are in atmosphere.',
  'The place no longer feels like a single place.',
]

const bannedAbstractLeadPhrases = [
  'the first thing is',
  'you are not in danger yet',
  'the place no longer feels',
  'the world decides what to make of you',
]

function countOccurrences(haystack, needle) {
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const matches = haystack.match(new RegExp(escaped, 'gi'))
  return matches ? matches.length : 0
}

function findDuplicateSignals(text) {
  const lower = text.toLowerCase()
  const signals = [
    'shell-green',
    'wrong name',
    'broken lamp',
    'keeps finding',
    'keeps surfacing',
    'the whole world were revising',
  ]
  return signals.filter(signal => countOccurrences(lower, signal) > 1)
}

function countParagraphs(text) {
  return text
    .split(/\n\s*\n/g)
    .map(part => part.trim())
    .filter(Boolean).length
}

function getFirstSentence(text) {
  const trimmed = text.trim()
  if (!trimmed) {
    return ''
  }
  const match = trimmed.match(/^[^.!?]+[.!?]?/)
  return (match ? match[0] : trimmed).trim()
}

function getLowercaseOptions(snapshot) {
  return [
    ...snapshot.opening.options.map(option => option.description),
    ...snapshot.secondBeat.options.map(option => option.description),
  ].join('\n').toLowerCase()
}

function validateSnapshot(snapshot) {
  const failures = []
  const sections = [
    ['opening scene', snapshot.opening.sceneText],
    ['second-beat scene', snapshot.secondBeat.sceneText],
    ['opening hint', snapshot.opening.hintText ?? ''],
    ['second-beat hint', snapshot.secondBeat.hintText ?? ''],
  ]

  for (const [sectionName, text] of sections) {
    for (const phrase of bannedPhrases) {
      if (text.includes(phrase)) {
        failures.push(`${sectionName}: banned phrase "${phrase}"`)
      }
    }
  }

  const openingLead = getFirstSentence(snapshot.opening.sceneText).toLowerCase()
  for (const phrase of bannedAbstractLeadPhrases) {
    if (openingLead.includes(phrase)) {
      failures.push(`opening scene starts too abstractly with "${phrase}"`)
    }
  }

  const combinedSceneText = [
    snapshot.opening.sceneText,
    snapshot.secondBeat.sceneText,
  ].join('\n\n')

  const duplicateSignals = findDuplicateSignals(combinedSceneText)
  for (const signal of duplicateSignals) {
    failures.push(`scene text repeats connective signal "${signal}"`)
  }

  const combinedParagraphCount = countParagraphs(combinedSceneText)
  if (combinedParagraphCount > 5) {
    failures.push(
      `combined scene text is too stacked (${combinedParagraphCount} paragraphs)`,
    )
  }

  if (snapshot.meta.encounterShift !== 'alley') {
    const paragraphCount = countParagraphs(snapshot.secondBeat.sceneText)
    if (paragraphCount > 2) {
      failures.push(
        `second-beat scene is too stacked for callback biome (${paragraphCount} paragraphs)`,
      )
    }
  }

  const allOptionDescriptions = getLowercaseOptions(snapshot)

  if (countOccurrences(allOptionDescriptions, 'reality') > 1) {
    failures.push('option descriptions overuse abstract "reality" language')
  }

  if (
    snapshot.meta.encounterShift !== 'alley' &&
    countOccurrences(allOptionDescriptions, 'step into the alley') > 0
  ) {
    failures.push('non-alley options still refer to stepping into the alley')
  }

  if (
    snapshot.meta.encounterShift !== 'alley' &&
    countOccurrences(allOptionDescriptions, 'let the alley') > 0
  ) {
    failures.push('non-alley options still rely on alley-specific route language')
  }

  if (
    countOccurrences(combinedSceneText.toLowerCase(), 'same ') > 2 &&
    countOccurrences(combinedSceneText.toLowerCase(), 'feels like the same') > 0
  ) {
    failures.push('scene text leans too hard on explicit sameness instead of implied recurrence')
  }

  return failures
}

const snapshots = buildSceneSnapshots()
const report = []
let failureCount = 0

for (const snapshot of snapshots) {
  const failures = validateSnapshot(snapshot)
  if (failures.length === 0) {
    report.push(`PASS ${snapshot.label}`)
    continue
  }

  failureCount += failures.length
  report.push(`FAIL ${snapshot.label}`)
  for (const failure of failures) {
    report.push(`  - ${failure}`)
  }
}

console.log(report.join('\n'))

if (failureCount > 0) {
  console.error(`soc-scene-check found ${failureCount} issue(s)`)
  process.exit(1)
}
