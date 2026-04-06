import {
  SWORDS_OF_CHAOS_OPENING_LABELS,
  SWORDS_OF_CHAOS_OPENING_OPTIONS,
  SWORDS_OF_CHAOS_RETURNING_SECOND_BEATS,
  SWORDS_OF_CHAOS_SECOND_BEATS,
  SWORDS_OF_CHAOS_THREADMARKED_SECOND_BEATS,
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

export function getSwordsSecondBeatVariant(
  choice: SwordsOfChaosOpeningChoice,
  variant: 'default' | 'returning' | 'threadmarked',
): SwordsSecondBeat {
  switch (variant) {
    case 'returning':
      return SWORDS_OF_CHAOS_RETURNING_SECOND_BEATS[choice]
    case 'threadmarked':
      return SWORDS_OF_CHAOS_THREADMARKED_SECOND_BEATS[choice]
    default:
      return SWORDS_OF_CHAOS_SECOND_BEATS[choice]
  }
}
