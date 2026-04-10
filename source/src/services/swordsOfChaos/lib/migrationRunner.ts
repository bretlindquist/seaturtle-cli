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
    characterDevelopment?: SwordsOfChaosSaveFile['characterDevelopment']
    magic?: SwordsOfChaosSaveFile['magic']
    sessionZero?: SwordsOfChaosSaveFile['sessionZero']
    story?: SwordsOfChaosSaveFile['story']
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
    characterDevelopment: {
      focus: candidate.characterDevelopment?.focus ?? null,
      title: candidate.characterDevelopment?.title ?? null,
      lesson: candidate.characterDevelopment?.lesson ?? null,
      pressure: candidate.characterDevelopment?.pressure ?? null,
      stage: candidate.characterDevelopment?.stage ?? 0,
      lastUpdatedAt: candidate.characterDevelopment?.lastUpdatedAt ?? null,
    },
    sessionZero: {
      completed: candidate.sessionZero?.completed ?? false,
      originPlace: candidate.sessionZero?.originPlace ?? null,
      firstContact: candidate.sessionZero?.firstContact ?? null,
      completedAt: candidate.sessionZero?.completedAt ?? null,
    },
    threadMemory: candidate.threadMemory ?? {},
    encounterMemory: candidate.encounterMemory ?? {},
    story: {
      activeLocus: candidate.story?.activeLocus ?? null,
      activeThread: candidate.story?.activeThread ?? null,
      chapter: candidate.story?.chapter ?? 0,
      chapterTitle: candidate.story?.chapterTitle ?? null,
      tension: candidate.story?.tension ?? 'low',
      currentObjective: candidate.story?.currentObjective ?? null,
      carryForward: candidate.story?.carryForward ?? null,
      continuation: candidate.story?.continuation ?? null,
      sceneState: candidate.story?.sceneState ?? null,
      lastOutcomeKey: candidate.story?.lastOutcomeKey ?? null,
      lastAdvancedAt: candidate.story?.lastAdvancedAt ?? null,
    },
    magic: {
      rarityBudget: candidate.magic?.rarityBudget ?? 0,
      omensSeen: candidate.magic?.omensSeen ?? 0,
      crossingsOpened: candidate.magic?.crossingsOpened ?? 0,
      activeImpossible: candidate.magic?.activeImpossible ?? 'none',
      lastOmen: candidate.magic?.lastOmen ?? null,
      lastManifestationAt: candidate.magic?.lastManifestationAt ?? null,
    },
  })
}
