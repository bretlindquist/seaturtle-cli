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

function getThreadOmen(thread: string | undefined): string | undefined {
  switch (thread) {
    case 'half-shell-relic-trail':
      return 'A shell-green gleam keeps appearing where metal ought to be dull.'
    case 'broken-lamp-witnesses':
      return 'A watching light keeps finding the edge of the scene, even when there should be none.'
    case 'alley-oath-keepers':
      return 'Promises seem to settle into places like roots rather than words.'
    case 'sign-truth-fractures':
      return 'Wrong names and cracked messages keep surfacing as if reality is revising itself badly.'
    case 'quiet-refusals':
      return 'Refused outcomes leave a pressure behind, as if closed doors are still listening.'
    default:
      return undefined
  }
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
    .sort((left, right) => {
      const seenDelta =
        (right[1].lastSeenAt ?? 0) - (left[1].lastSeenAt ?? 0)
      if (seenDelta !== 0) {
        return seenDelta
      }

      return right[1].sightings - left[1].sightings
    })[0]?.[0]
  const encounterShift =
    alleyMemory &&
    alleyMemory.visits >= 4 &&
    canonThread === 'alley-oath-keepers'
      ? 'old-tree'
      : alleyMemory &&
          alleyMemory.visits >= 4 &&
          canonThread === 'half-shell-relic-trail'
        ? 'ocean-ship'
        : alleyMemory &&
            alleyMemory.visits >= 4 &&
            canonThread === 'broken-lamp-witnesses'
          ? 'fae-realm'
        : alleyMemory &&
            alleyMemory.visits >= 4 &&
            canonThread === 'quiet-refusals'
          ? 'dark-dungeon'
        : alleyMemory &&
            alleyMemory.visits >= 4 &&
            canonThread === 'sign-truth-fractures'
          ? 'space-station'
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
    threadOmen: getThreadOmen(canonThread ?? liveThread),
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
