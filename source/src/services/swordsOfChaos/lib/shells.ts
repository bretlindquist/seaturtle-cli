import {
  SWORDS_OF_CHAOS_OPENING_LABELS,
  SWORDS_OF_CHAOS_OPENING_OPTIONS,
  SWORDS_OF_CHAOS_SECOND_BEATS,
} from '../data/swordsOfChaosShells.js'
import type { SwordsOfChaosOpeningChoice } from '../types/outcomes.js'
import type { SwordsOpeningOption, SwordsSecondBeat } from '../types/shells.js'

export function getSwordsOpeningLabel(
  choice: SwordsOfChaosOpeningChoice,
): string {
  return SWORDS_OF_CHAOS_OPENING_LABELS[choice]
}

export function getSwordsOpeningOptions(): SwordsOpeningOption[] {
  return SWORDS_OF_CHAOS_OPENING_OPTIONS
}

export function getSwordsSecondBeat(
  choice: SwordsOfChaosOpeningChoice,
): SwordsSecondBeat {
  return SWORDS_OF_CHAOS_SECOND_BEATS[choice]
}
