import { dirname } from 'path'
import { safeParseJSON } from '../../../utils/json.js'
import { writeFileSyncAndFlush_DEPRECATED } from '../../../utils/file.js'
import { getFsImplementation } from '../../../utils/fsOperations.js'
import { jsonStringify } from '../../../utils/slowOperations.js'
import type { SwordsOfChaosDerivedMemory } from '../types/memory.js'
import type { SwordsOfChaosSaveFile } from '../types/save.js'
import { getSwordsOfChaosPaths } from './paths.js'

function ensureParentDir(path: string): void {
  getFsImplementation().mkdirSync(dirname(path))
}

export function deriveSwordsOfChaosMemory(
  save: SwordsOfChaosSaveFile,
): SwordsOfChaosDerivedMemory {
  const alleyMemory = save.encounterMemory['trench-coat-turtle-alley']
  const priorRoutes = alleyMemory?.seenRoutes ?? save.callbackMarkers.filter(marker =>
    marker.includes(':'),
  )
  const recentTitle = save.progression.titles.at(-1)
  const recentRelic = save.inventory.at(-1)
  const canonThread = Object.entries(save.threadMemory)
    .filter(([, thread]) => thread.canonized)
    .sort((left, right) => right[1].sightings - left[1].sightings)[0]?.[0]
  const encounterShift =
    alleyMemory &&
    alleyMemory.visits >= 4 &&
    canonThread === 'alley-oath-keepers'
      ? 'old-tree'
      : 'alley'
  const liveThread = [...save.threadCandidates]
    .reverse()
    .find(
      thread =>
        thread !== 'trench-coat-turtle-alley' && thread !== canonThread,
    )

  return {
    version: 1,
    callbackCandidates: [
      ...new Set([
        ...save.callbackMarkers,
        ...Object.keys(save.encounterMemory),
      ]),
    ],
    priorRoutes,
    familiarPlaces:
      alleyMemory && alleyMemory.visits > 0 ? ['trench-coat turtle alley'] : [],
    encounterShift,
    recentTitle,
    recentRelic,
    liveThread,
    canonThread,
  }
}

export function saveSwordsOfChaosDerivedMemory(
  memory: SwordsOfChaosDerivedMemory,
): SwordsOfChaosDerivedMemory {
  const { derivedMemoryPath } = getSwordsOfChaosPaths()
  ensureParentDir(derivedMemoryPath)
  writeFileSyncAndFlush_DEPRECATED(
    derivedMemoryPath,
    jsonStringify(memory, null, 2) + '\n',
    {
      encoding: 'utf-8',
    },
  )
  return memory
}

export function loadSwordsOfChaosDerivedMemory():
  | SwordsOfChaosDerivedMemory
  | null {
  const { derivedMemoryPath } = getSwordsOfChaosPaths()
  const fs = getFsImplementation()
  if (!fs.existsSync(derivedMemoryPath)) {
    return null
  }

  return safeParseJSON(
    fs.readFileSync(derivedMemoryPath, { encoding: 'utf-8' }),
  ) as SwordsOfChaosDerivedMemory | null
}
