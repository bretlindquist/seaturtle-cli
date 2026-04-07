import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { getSwordsOfChaosRelevantMemory } from '../source/src/services/swordsOfChaos/lib/relevantMemory.ts'
import { processSwordsOfChaosEventBatch } from '../source/src/services/swordsOfChaos/lib/eventProcessor.ts'
import { resolveSwordsOfChaosRoute } from '../source/src/services/swordsOfChaos/lib/resolution.ts'
import { renderSwordsOfChaosHybridScene } from '../source/src/services/swordsOfChaos/lib/hybridDm.ts'

export function createDefaultSave() {
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
}

export function applyRoute(save, openingChoice, secondChoice, options = {}) {
  const beforeRelevant = getSwordsOfChaosRelevantMemory(save)
  const resolution = resolveSwordsOfChaosRoute(openingChoice, secondChoice, {
    encounterLocus: beforeRelevant.encounterShift ?? 'alley',
    seaturtleWitnessed: options.seaturtleWitnessed,
  })
  return processSwordsOfChaosEventBatch(save, resolution.eventBatch)
}

export function repeatRoute(save, route, times, options = {}) {
  let next = save
  for (let i = 0; i < times; i += 1) {
    next = applyRoute(next, route[0], route[1], options)
  }
  return next
}

export function buildSceneSnapshot(label, save, openingChoice) {
  const relevantMemory = getSwordsOfChaosRelevantMemory(save)
  const saveSummary = {
    level: save.player.level,
    titles: save.progression.titles.length,
    inventory: save.inventory.length,
  }
  const opening = renderSwordsOfChaosHybridScene({
    stage: 'opening',
    relevantMemory,
    saveSummary,
  })
  const secondBeat = renderSwordsOfChaosHybridScene({
    stage: 'second-beat',
    openingChoice,
    relevantMemory,
    saveSummary,
  })

  return {
    label,
    meta: {
      encounterShift: relevantMemory.encounterShift ?? 'alley',
      familiarPlace: relevantMemory.familiarPlace ?? null,
      revisitCount: relevantMemory.revisitCount,
      liveThread: relevantMemory.liveThreadTitle ?? relevantMemory.liveThread ?? null,
      canonThread:
        relevantMemory.canonThreadTitle ?? relevantMemory.canonThread ?? null,
      seaturtleGlimpsed: relevantMemory.seaturtleGlimpsed,
      seaturtleBond: relevantMemory.seaturtleBond,
      seaturtleFavor: relevantMemory.seaturtleFavor,
    },
    opening,
    secondBeat,
  }
}

export function formatOptions(options) {
  return options
    .map(
      (option, index) =>
        `${index + 1}. ${option.label}\n   ${option.description}`,
    )
    .join('\n')
}

export function renderSnapshot(snapshot) {
  return [
    `# ${snapshot.label}`,
    '',
    `- encounterShift: ${snapshot.meta.encounterShift}`,
    `- familiarPlace: ${snapshot.meta.familiarPlace ?? 'none'}`,
    `- revisitCount: ${snapshot.meta.revisitCount}`,
    `- liveThread: ${snapshot.meta.liveThread ?? 'none'}`,
    `- canonThread: ${snapshot.meta.canonThread ?? 'none'}`,
    `- seaturtle: glimpsed=${snapshot.meta.seaturtleGlimpsed} bond=${snapshot.meta.seaturtleBond} favor=${snapshot.meta.seaturtleFavor}`,
    '',
    '## Opening',
    snapshot.opening.subtitle,
    '',
    snapshot.opening.sceneText,
    '',
    formatOptions(snapshot.opening.options),
    '',
    `Hint: ${snapshot.opening.hintText ?? '(none)'}`,
    '',
    '## Second Beat',
    snapshot.secondBeat.subtitle,
    '',
    snapshot.secondBeat.sceneText,
    '',
    formatOptions(snapshot.secondBeat.options),
    '',
    `Hint: ${snapshot.secondBeat.hintText ?? '(none)'}`,
    '',
    '---',
    '',
  ].join('\n')
}

export function buildSceneSnapshots() {
  const base = createDefaultSave()
  const returningAlley = repeatRoute(
    createDefaultSave(),
    ['talk-like-you-belong', 'laugh-like-you-mean-it'],
    1,
  )
  const threadmarkedAlley = repeatRoute(
    createDefaultSave(),
    ['talk-like-you-belong', 'laugh-like-you-mean-it'],
    3,
  )
  const oldTree = repeatRoute(
    createDefaultSave(),
    ['draw-steel', 'lower-the-blade'],
    4,
  )
  const oceanShip = repeatRoute(
    createDefaultSave(),
    ['talk-like-you-belong', 'laugh-like-you-mean-it'],
    4,
  )
  const faeRealm = repeatRoute(
    createDefaultSave(),
    ['bow-slightly', 'meet-the-gaze'],
    4,
  )
  const seaTurtleTouched = {
    ...repeatRoute(
      createDefaultSave(),
      ['bow-slightly', 'keep-bowing'],
      3,
    ),
    seaturtle: {
      bond: 2,
      favor: 1,
      appearances: 1,
      lastAppearanceAt: Date.now(),
    },
  }

  return [
    buildSceneSnapshot('Fresh Alley Bluff', base, 'talk-like-you-belong'),
    buildSceneSnapshot(
      'Returning Alley Bluff',
      returningAlley,
      'talk-like-you-belong',
    ),
    buildSceneSnapshot(
      'Canon Thread Alley Bluff',
      threadmarkedAlley,
      'talk-like-you-belong',
    ),
    buildSceneSnapshot('Old Tree Callback', oldTree, 'draw-steel'),
    buildSceneSnapshot(
      'Ocean Ship Callback',
      oceanShip,
      'talk-like-you-belong',
    ),
    buildSceneSnapshot('Fae Realm Callback', faeRealm, 'bow-slightly'),
    buildSceneSnapshot(
      'SeaTurtle-Touched Alley',
      seaTurtleTouched,
      'bow-slightly',
    ),
  ]
}

export function renderSceneProbeOutput() {
  return buildSceneSnapshots().map(renderSnapshot).join('\n')
}

if (import.meta.main) {
  const output = renderSceneProbeOutput()
  console.log(output)

  if (process.argv.includes('--write')) {
    const writeIndex = process.argv.indexOf('--write')
    const target = process.argv[writeIndex + 1]
    if (target) {
      const absoluteTarget = resolve(process.cwd(), target)
      mkdirSync(dirname(absoluteTarget), { recursive: true })
      writeFileSync(absoluteTarget, output)
      console.error(`Wrote ${absoluteTarget}`)
    }
  }
}
