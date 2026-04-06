import { dirname } from 'path'
import { writeFileSyncAndFlush_DEPRECATED } from '../../../utils/file.js'
import { getFsImplementation } from '../../../utils/fsOperations.js'
import { jsonStringify } from '../../../utils/slowOperations.js'
import type { SwordsOfChaosEventRecord } from '../types/events.js'
import { getSwordsOfChaosPaths } from './paths.js'

function ensureParentDir(path: string): void {
  getFsImplementation().mkdirSync(dirname(path))
}

export function appendSwordsOfChaosEvent(
  event: SwordsOfChaosEventRecord,
): SwordsOfChaosEventRecord {
  const { eventsPath } = getSwordsOfChaosPaths()
  const fs = getFsImplementation()
  ensureParentDir(eventsPath)
  const current = fs.existsSync(eventsPath)
    ? fs.readFileSync(eventsPath, { encoding: 'utf-8' })
    : ''

  writeFileSyncAndFlush_DEPRECATED(
    eventsPath,
    current + jsonStringify(event) + '\n',
    {
      encoding: 'utf-8',
    },
  )

  return event
}
