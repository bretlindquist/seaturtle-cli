import type { SwordsOfChaosRelevantMemory } from '../types/memory.js'
import type { SwordsOfChaosOpeningChoice } from '../types/outcomes.js'
import { getSwordsEncounterPlaceName } from './worldMap.js'

function getOpeningChoiceImage(
  openingChoice: SwordsOfChaosOpeningChoice | undefined,
): string {
  switch (openingChoice) {
    case 'draw-steel':
      return 'your raised blade'
    case 'bow-slightly':
      return 'the shape of your own restraint'
    case 'talk-like-you-belong':
      return 'the bluff you almost made real'
    default:
      return 'the alley making room for you to leave'
  }
}

export function getSwordsOfChaosRetreatNarration(input: {
  stage: 'opening' | 'second-beat'
  openingChoice?: SwordsOfChaosOpeningChoice
  relevantMemory?: SwordsOfChaosRelevantMemory
}): string {
  const locus = input.relevantMemory?.encounterShift ?? 'alley'
  const place = getSwordsEncounterPlaceName(locus)
  const familiar = Boolean(input.relevantMemory?.familiarPlace)

  if (input.stage === 'opening') {
    return familiar
      ? `The pressure in ${place} hums once as you step back. For a second the place seems disappointed, as if it expected you to finish a sentence you started last time.\n\nBy the time the air reaches the back of your neck, whatever knew you here has agreed to wait.`
      : `From somewhere deeper in ${place}, something heavy shifts in the dark. You do not stay to learn whether it was a boot, a blade, a root, or a machine settling into place.\n\nBy the time the cold air reaches your neck, ${place} has already begun pretending you were never there.`
  }

  return familiar
    ? `You let the moment fold instead of break. ${place.charAt(0).toUpperCase() + place.slice(1)} keeps ${getOpeningChoiceImage(input.openingChoice)} for itself and gives you back a narrow exit.\n\nAs you step away, you get the uneasy sense that the place has marked the choice you did not make just as carefully as the one you did.`
    : `The pressure in ${place} changes first. Then something behind the visible scene rises just enough to warn you that you have seen enough for one night.\n\nYou lower ${getOpeningChoiceImage(input.openingChoice)} and leave with the distinct feeling that something in the dark has agreed to postpone the rest.`
}
