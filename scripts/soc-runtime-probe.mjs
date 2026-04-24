#!/usr/bin/env bun

import { deriveSwordsOfChaosMemory } from '../source/src/services/swordsOfChaos/lib/memoryModel.ts'
import { getSwordsOfChaosRelevantMemory } from '../source/src/services/swordsOfChaos/lib/relevantMemory.ts'
import { processSwordsOfChaosEventBatch } from '../source/src/services/swordsOfChaos/lib/eventProcessor.ts'
import { resolveSwordsOfChaosRoute } from '../source/src/services/swordsOfChaos/lib/resolution.ts'

function createDefaultSave() {
  return {
    version: 1,
    player: {
      level: 1,
      hp: 10,
      maxHp: 10,
      stats: {
        grit: 1,
        wit: 1,
        grace: 1,
        nerve: 1,
      },
    },
    character: {
      name: null,
      creationMode: null,
      archetype: null,
      className: null,
      species: null,
      origin: null,
      strength: null,
      flaw: null,
      keepsake: null,
      drive: null,
      omen: null,
    },
    characterDevelopment: {
      focus: null,
      title: null,
      lesson: null,
      pressure: null,
      stage: 0,
      lastUpdatedAt: null,
    },
    sessionZero: {
      completed: false,
      originPlace: null,
      firstContact: null,
      completedAt: null,
    },
    inventory: [],
    conditions: [],
    progression: {
      titles: [],
      milestones: [],
      xp: 0,
    },
    worldFlags: [],
    discoveredSeeds: [],
    callbackMarkers: [],
    unresolvedBranches: [],
    threadCandidates: [],
    threadMemory: {},
    encounterMemory: {},
    story: {
      activeLocus: null,
      activeThread: null,
      chapter: 0,
      chapterTitle: null,
      tension: 'low',
      currentObjective: null,
      carryForward: null,
      continuation: null,
      sceneState: null,
      lastOutcomeKey: null,
      lastAdvancedAt: null,
    },
    magic: {
      rarityBudget: 0,
      omensSeen: 0,
      crossingsOpened: 0,
      activeImpossible: 'none',
      lastOmen: null,
      lastManifestationAt: null,
    },
    seaturtle: {
      bond: 0,
      favor: 0,
      appearances: 0,
      lastAppearanceAt: null,
    },
    runHistorySummary: {
      runsStarted: 0,
      runsFinished: 0,
      lastPlayedAt: null,
    },
  }
}

const SCENARIOS = [
  {
    label: 'relic-trail -> ocean-ship',
    route: ['talk-like-you-belong', 'laugh-like-you-mean-it'],
  },
  {
    label: 'broken-lamp-witnesses -> fae-realm',
    route: ['bow-slightly', 'meet-the-gaze'],
  },
  {
    label: 'oath-keepers -> old-tree',
    route: ['draw-steel', 'lower-the-blade'],
  },
  {
    label: 'sign-truth-fractures -> space-station',
    route: ['bow-slightly', 'keep-bowing'],
  },
  {
    label: 'quiet-refusals -> dark-dungeon',
    route: ['talk-like-you-belong', 'name-a-false-title'],
  },
]

function simulateScenario([openingChoice, secondChoice]) {
  let save = createDefaultSave()
  const snapshots = []

  for (let run = 1; run <= 9; run += 1) {
    const beforeRelevant = getSwordsOfChaosRelevantMemory(save)
    const resolution = resolveSwordsOfChaosRoute(openingChoice, secondChoice, {
      encounterLocus: beforeRelevant.encounterShift ?? 'alley',
      character: save.character,
      currentDevelopment: save.characterDevelopment,
      currentMagic: save.magic,
      currentChapter: beforeRelevant.storyChapter,
      previousObjective: beforeRelevant.currentObjective,
      relevantMemory: beforeRelevant,
    })
    save = processSwordsOfChaosEventBatch(save, resolution.eventBatch)
    const derived = deriveSwordsOfChaosMemory(save)
    const relevant = getSwordsOfChaosRelevantMemory(save)
    snapshots.push({
      run,
      outcome: resolution.outcome.key,
      canonThread: derived.canonThread ?? null,
      liveThread: derived.liveThread ?? null,
      encounterShift: derived.encounterShift,
      familiarPlace: relevant.familiarPlace ?? null,
      threadOmen: derived.threadOmen ?? null,
      revisitCount: relevant.revisitCount,
      recentTitle: relevant.recentTitle ?? null,
      recentRelic: relevant.recentRelic ?? null,
    })
  }

  return {
    finalSave: {
      threadMemory: save.threadMemory,
      encounterMemory: save.encounterMemory,
      inventory: save.inventory,
      titles: save.progression.titles,
    },
    snapshots,
  }
}

for (const scenario of SCENARIOS) {
  const result = simulateScenario(scenario.route)
  console.log(`\n=== ${scenario.label} ===`)
  console.log(JSON.stringify(result.snapshots, null, 2))
}
