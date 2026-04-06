import type { SwordsOfChaosSaveFile } from '../types/save.js'
import { validateSwordsOfChaosSave } from './stateValidator.js'

export function migrateSwordsOfChaosSave(
  input: unknown,
): SwordsOfChaosSaveFile {
  return validateSwordsOfChaosSave(input)
}
