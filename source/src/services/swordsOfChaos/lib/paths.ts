import { homedir } from 'os'
import { join } from 'path'

const SWORDS_OF_CHAOS_DIRNAME = 'swords-of-chaos'
const GAMES_DIRNAME = 'games'

export type SwordsOfChaosPaths = {
  rootDir: string
  savePath: string
  eventsPath: string
  derivedMemoryPath: string
  telemetryDir: string
}

export function getSwordsOfChaosPaths(): SwordsOfChaosPaths {
  const rootDir = join(
    homedir(),
    '.ct',
    GAMES_DIRNAME,
    SWORDS_OF_CHAOS_DIRNAME,
  )

  return {
    rootDir,
    savePath: join(rootDir, 'save.json'),
    eventsPath: join(rootDir, 'events.jsonl'),
    derivedMemoryPath: join(rootDir, 'derived-memory.json'),
    telemetryDir: join(rootDir, 'telemetry'),
  }
}
