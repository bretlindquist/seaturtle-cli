import { dirname } from 'path'
import { safeParseJSON } from '../../../utils/json.js'
import { writeFileSyncAndFlush_DEPRECATED } from '../../../utils/file.js'
import { getFsImplementation } from '../../../utils/fsOperations.js'
import { jsonStringify } from '../../../utils/slowOperations.js'
import type { SwordsOfChaosSaveFile } from '../types/save.js'
import { saveSwordsOfChaosDerivedMemory } from './derivedMemory.js'
import { appendSwordsOfChaosEvent } from './eventHistory.js'
import { deriveSwordsOfChaosMemory } from './memoryModel.js'
import { migrateSwordsOfChaosSave } from './migrationRunner.js'
import { getSwordsOfChaosPaths } from './paths.js'

function ensureParentDir(path: string): void {
  getFsImplementation().mkdirSync(dirname(path))
}

export function createDefaultSwordsOfChaosSave(): SwordsOfChaosSaveFile {
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

export function loadSwordsOfChaosSave(): SwordsOfChaosSaveFile {
  const { savePath } = getSwordsOfChaosPaths()
  const fs = getFsImplementation()

  if (!fs.existsSync(savePath)) {
    return createDefaultSwordsOfChaosSave()
  }

  const raw = fs.readFileSync(savePath, { encoding: 'utf-8' })
  return migrateSwordsOfChaosSave(safeParseJSON(raw))
}

export function ensureSwordsOfChaosSaveExists(): SwordsOfChaosSaveFile {
  const { savePath } = getSwordsOfChaosPaths()
  const fs = getFsImplementation()

  if (!fs.existsSync(savePath)) {
    const created = saveSwordsOfChaosSave(createDefaultSwordsOfChaosSave())
    appendSwordsOfChaosEvent({
      at: Date.now(),
      kind: 'save_initialized',
      detail: {
        version: created.version,
      },
    })
    return created
  }

  return loadSwordsOfChaosSave()
}

export function saveSwordsOfChaosSave(
  save: SwordsOfChaosSaveFile,
): SwordsOfChaosSaveFile {
  const { savePath } = getSwordsOfChaosPaths()
  const next = migrateSwordsOfChaosSave(save)
  ensureParentDir(savePath)
  writeFileSyncAndFlush_DEPRECATED(
    savePath,
    jsonStringify(next, null, 2) + '\n',
    {
      encoding: 'utf-8',
    },
  )
  saveSwordsOfChaosDerivedMemory(deriveSwordsOfChaosMemory(next))
  return next
}
