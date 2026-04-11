import { SWORDS_OF_CHAOS_OUTCOMES } from '../data/swordsOfChaosOutcomes.js'
import type {
  SwordsOfChaosOutcome,
  SwordsOfChaosRoute,
} from '../types/outcomes.js'

export function getSwordsOfChaosOutcome(
  route: SwordsOfChaosRoute,
): SwordsOfChaosOutcome {
  return SWORDS_OF_CHAOS_OUTCOMES[route]
}
