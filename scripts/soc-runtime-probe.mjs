import { deriveSwordsOfChaosMemory } from '../source/src/services/swordsOfChaos/lib/memoryModel.ts'
import { getSwordsOfChaosRelevantMemory } from '../source/src/services/swordsOfChaos/lib/relevantMemory.ts'
import { processSwordsOfChaosEventBatch } from '../source/src/services/swordsOfChaos/lib/eventProcessor.ts'
import { resolveSwordsOfChaosRoute } from '../source/src/services/swordsOfChaos/lib/resolution.ts'

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
  let save = {
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
  const snapshots = []

  for (let run = 1; run <= 5; run += 1) {
    const beforeRelevant = getSwordsOfChaosRelevantMemory(save)
    const resolution = resolveSwordsOfChaosRoute(openingChoice, secondChoice, {
      encounterLocus: beforeRelevant.encounterShift ?? 'alley',
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
