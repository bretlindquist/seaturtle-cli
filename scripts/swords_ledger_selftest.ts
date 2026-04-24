#!/usr/bin/env bun

import assert from 'node:assert/strict'
import {
  applyRoute,
  buildSceneSnapshot,
  createDefaultSave,
  repeatRoute,
} from './soc-scene-probe.mjs'
import { getSwordsOfChaosRelevantMemory } from '../source/src/services/swordsOfChaos/lib/relevantMemory.ts'
import { deriveSwordsOfChaosMemory } from '../source/src/services/swordsOfChaos/lib/memoryModel.ts'

const freshSave = createDefaultSave()
const firstPassSave = applyRoute(
  createDefaultSave(),
  'talk-like-you-belong',
  'laugh-like-you-mean-it',
)
const canonizedSave = repeatRoute(
  createDefaultSave(),
  ['talk-like-you-belong', 'laugh-like-you-mean-it'],
  3,
)
const shiftedSave = repeatRoute(
  createDefaultSave(),
  ['talk-like-you-belong', 'laugh-like-you-mean-it'],
  4,
)

const freshMemory = getSwordsOfChaosRelevantMemory(freshSave)
const firstPassMemory = getSwordsOfChaosRelevantMemory(firstPassSave)
const canonizedMemory = deriveSwordsOfChaosMemory(canonizedSave)
const shiftedMemory = getSwordsOfChaosRelevantMemory(shiftedSave)

assert.equal(
  freshMemory.revisitCount,
  0,
  'fresh Swords saves should start with no encounter revisit count',
)
assert.equal(
  firstPassMemory.revisitCount,
  1,
  'one completed route should increment encounter revisit count',
)
assert.equal(
  firstPassMemory.storyChapter,
  1,
  'one completed route should advance the story chapter',
)
assert.equal(
  canonizedMemory.canonThread,
  'half-shell-relic-trail',
  'repeating the same relic route should canonize its thread after the threshold',
)
assert.equal(
  canonizedSave.story.chapter,
  3,
  'story chapter should continue advancing across repeated outcomes',
)
assert.equal(
  shiftedMemory.encounterShift,
  'ocean-ship',
  'relic-thread continuity should eventually move the active encounter locus',
)
assert.equal(
  shiftedSave.encounterMemory['trench-coat-turtle-alley']?.visits,
  4,
  'encounter memory should persist alley visit counts across runs',
)

const freshScene = buildSceneSnapshot(
  'fresh',
  freshSave,
  'talk-like-you-belong',
)
const returningScene = buildSceneSnapshot(
  'returning',
  firstPassSave,
  'talk-like-you-belong',
)

assert.notEqual(
  freshScene.opening.options[2]?.description,
  returningScene.opening.options[2]?.description,
  'rendered opening options should react to prior route memory on revisit',
)

console.log('swords ledger self-test passed')
