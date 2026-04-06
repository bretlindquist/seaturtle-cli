import {
  SWORDS_OF_CHAOS_OLD_TREE_OPENING_SHELL,
  SWORDS_OF_CHAOS_OLD_TREE_SECOND_BEATS,
  SWORDS_OF_CHAOS_OCEAN_SHIP_OPENING_SHELL,
  SWORDS_OF_CHAOS_OCEAN_SHIP_SECOND_BEATS,
  SWORDS_OF_CHAOS_OPENING_SHELL,
  SWORDS_OF_CHAOS_OPENING_LABELS,
  SWORDS_OF_CHAOS_OPENING_OPTIONS,
  SWORDS_OF_CHAOS_RETURNING_OPENING_SHELL,
  SWORDS_OF_CHAOS_RETURNING_SECOND_BEATS,
  SWORDS_OF_CHAOS_SEATURTLE_OPENING_SHELL,
  SWORDS_OF_CHAOS_FAE_REALM_OPENING_SHELL,
  SWORDS_OF_CHAOS_FAE_REALM_SECOND_BEATS,
  SWORDS_OF_CHAOS_DARK_DUNGEON_OPENING_SHELL,
  SWORDS_OF_CHAOS_DARK_DUNGEON_SECOND_BEATS,
  SWORDS_OF_CHAOS_MARS_OUTPOST_OPENING_SHELL,
  SWORDS_OF_CHAOS_MARS_OUTPOST_SECOND_BEATS,
  SWORDS_OF_CHAOS_SPACE_STATION_OPENING_SHELL,
  SWORDS_OF_CHAOS_SPACE_STATION_SECOND_BEATS,
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
  variant:
    | 'default'
    | 'returning'
    | 'threadmarked'
    | 'seaturtle'
    | 'old-tree'
    | 'ocean-ship'
    | 'space-station'
    | 'mars-outpost'
    | 'fae-realm'
    | 'dark-dungeon',
): SwordsOpeningShell {
  switch (variant) {
    case 'mars-outpost':
      return SWORDS_OF_CHAOS_MARS_OUTPOST_OPENING_SHELL
    case 'dark-dungeon':
      return SWORDS_OF_CHAOS_DARK_DUNGEON_OPENING_SHELL
    case 'fae-realm':
      return SWORDS_OF_CHAOS_FAE_REALM_OPENING_SHELL
    case 'space-station':
      return SWORDS_OF_CHAOS_SPACE_STATION_OPENING_SHELL
    case 'ocean-ship':
      return SWORDS_OF_CHAOS_OCEAN_SHIP_OPENING_SHELL
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
  variant:
    | 'default'
    | 'returning'
    | 'threadmarked'
    | 'old-tree'
    | 'ocean-ship'
    | 'space-station'
    | 'mars-outpost'
    | 'fae-realm'
    | 'dark-dungeon',
): SwordsSecondBeat {
  switch (variant) {
    case 'mars-outpost':
      return SWORDS_OF_CHAOS_MARS_OUTPOST_SECOND_BEATS[choice]
    case 'dark-dungeon':
      return SWORDS_OF_CHAOS_DARK_DUNGEON_SECOND_BEATS[choice]
    case 'fae-realm':
      return SWORDS_OF_CHAOS_FAE_REALM_SECOND_BEATS[choice]
    case 'space-station':
      return SWORDS_OF_CHAOS_SPACE_STATION_SECOND_BEATS[choice]
    case 'ocean-ship':
      return SWORDS_OF_CHAOS_OCEAN_SHIP_SECOND_BEATS[choice]
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
