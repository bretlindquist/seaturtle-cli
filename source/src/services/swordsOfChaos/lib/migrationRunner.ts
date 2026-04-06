import type { SwordsOfChaosSaveFile } from '../types/save.js'
import { validateSwordsOfChaosSave } from './stateValidator.js'

export function migrateSwordsOfChaosSave(
  input: unknown,
): SwordsOfChaosSaveFile {
  if (!input || typeof input !== 'object') {
    return validateSwordsOfChaosSave(input)
  }

  const candidate = input as Partial<SwordsOfChaosSaveFile> & {
    threadMemory?: SwordsOfChaosSaveFile['threadMemory']
    encounterMemory?: SwordsOfChaosSaveFile['encounterMemory']
  }

  return validateSwordsOfChaosSave({
    ...candidate,
    threadMemory: candidate.threadMemory ?? {},
    encounterMemory: candidate.encounterMemory ?? {},
  })
}
