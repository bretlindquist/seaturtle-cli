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
    character?: SwordsOfChaosSaveFile['character']
    sessionZero?: SwordsOfChaosSaveFile['sessionZero']
  }

  return validateSwordsOfChaosSave({
    ...candidate,
    character: {
      name: candidate.character?.name ?? null,
      creationMode: candidate.character?.creationMode ?? null,
      archetype: candidate.character?.archetype ?? null,
      className: candidate.character?.className ?? null,
      species: candidate.character?.species ?? null,
      origin: candidate.character?.origin ?? null,
      strength: candidate.character?.strength ?? null,
      flaw: candidate.character?.flaw ?? null,
      keepsake: candidate.character?.keepsake ?? null,
      drive: candidate.character?.drive ?? null,
      omen: candidate.character?.omen ?? null,
    },
    sessionZero: {
      completed: candidate.sessionZero?.completed ?? false,
      originPlace: candidate.sessionZero?.originPlace ?? null,
      firstContact: candidate.sessionZero?.firstContact ?? null,
      completedAt: candidate.sessionZero?.completedAt ?? null,
    },
    threadMemory: candidate.threadMemory ?? {},
    encounterMemory: candidate.encounterMemory ?? {},
  })
}
