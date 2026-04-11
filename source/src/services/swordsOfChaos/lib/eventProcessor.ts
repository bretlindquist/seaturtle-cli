import type { SwordsOfChaosEventBatch } from '../types/events.js'
import type { SwordsOfChaosSaveFile } from '../types/save.js'
import { applySwordsOfChaosEventBatch } from './eventApplier.js'
import { validateSwordsOfChaosEventBatch } from './eventValidators.js'

export function processSwordsOfChaosEventBatch(
  save: SwordsOfChaosSaveFile,
  batch: SwordsOfChaosEventBatch,
): SwordsOfChaosSaveFile {
  const validated = validateSwordsOfChaosEventBatch(batch)
  return applySwordsOfChaosEventBatch(save, validated)
}
