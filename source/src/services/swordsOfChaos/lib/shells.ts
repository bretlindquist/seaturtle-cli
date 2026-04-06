import {
  SWORDS_OF_CHAOS_OLD_TREE_OPENING_SHELL,
  SWORDS_OF_CHAOS_OLD_TREE_SECOND_BEATS,
  SWORDS_OF_CHAOS_OPENING_SHELL,
  SWORDS_OF_CHAOS_OPENING_LABELS,
  SWORDS_OF_CHAOS_OPENING_OPTIONS,
  SWORDS_OF_CHAOS_RETURNING_OPENING_SHELL,
  SWORDS_OF_CHAOS_RETURNING_SECOND_BEATS,
  SWORDS_OF_CHAOS_SEATURTLE_OPENING_SHELL,
  SWORDS_OF_CHAOS_SECOND_BEATS,
  SWORDS_OF_CHAOS_THREADMARKED_OPENING_SHELL,
  SWORDS_OF_CHAOS_THREADMARKED_SECOND_BEATS,
} from '../data/swordsOfChaosShells.js'
import type { SwordsOfChaosOpeningChoice } from '../types/outcomes.js'
import type {
  SwordsOpeningOption,
  SwordsOpeningShell,
  SwordsSecondBeat,
} from '../types/shells.js'

export function getSwordsOpeningLabel(
  choice: SwordsOfChaosOpeningChoice,
): string {
  return SWORDS_OF_CHAOS_OPENING_LABELS[choice]
}

export function getSwordsOpeningOptions(): SwordsOpeningOption[] {
  return SWORDS_OF_CHAOS_OPENING_OPTIONS
}

export function getSwordsOpeningShellVariant(
  variant: 'default' | 'returning' | 'threadmarked' | 'seaturtle' | 'old-tree',
): SwordsOpeningShell {
  switch (variant) {
    case 'old-tree':
      return SWORDS_OF_CHAOS_OLD_TREE_OPENING_SHELL
    case 'returning':
      return SWORDS_OF_CHAOS_RETURNING_OPENING_SHELL
    case 'threadmarked':
      return SWORDS_OF_CHAOS_THREADMARKED_OPENING_SHELL
    case 'seaturtle':
      return SWORDS_OF_CHAOS_SEATURTLE_OPENING_SHELL
    default:
      return SWORDS_OF_CHAOS_OPENING_SHELL
  }
}

export function getSwordsSecondBeat(
  choice: SwordsOfChaosOpeningChoice,
): SwordsSecondBeat {
  return SWORDS_OF_CHAOS_SECOND_BEATS[choice]
}

export function getSwordsSecondBeatVariant(
  choice: SwordsOfChaosOpeningChoice,
  variant: 'default' | 'returning' | 'threadmarked' | 'old-tree',
): SwordsSecondBeat {
  switch (variant) {
    case 'old-tree':
      return SWORDS_OF_CHAOS_OLD_TREE_SECOND_BEATS[choice]
    case 'returning':
      return SWORDS_OF_CHAOS_RETURNING_SECOND_BEATS[choice]
    case 'threadmarked':
      return SWORDS_OF_CHAOS_THREADMARKED_SECOND_BEATS[choice]
    default:
      return SWORDS_OF_CHAOS_SECOND_BEATS[choice]
  }
}
