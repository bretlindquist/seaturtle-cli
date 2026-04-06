import type { SwordsOfChaosRelevantMemory } from '../types/memory.js'
import type { SwordsOfChaosOpeningChoice } from '../types/outcomes.js'

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
  const familiar =
    input.relevantMemory?.familiarPlace === 'trench-coat turtle alley'

  if (input.stage === 'opening') {
    return familiar
      ? `The broken lamp hums once as you step back. For a second the alley seems disappointed, as if it expected you to finish a sentence you started last time.\n\nCold rain touches the back of your neck. When you look up again, the sign is only a sign. Whatever knew you here is willing to wait.`
      : `From somewhere beyond the broken lamp, something heavy shifts in the dark. You do not stay to learn whether it was a boot, a blade, or a machine settling into place.\n\nBy the time the cold air reaches your neck, the alley has already begun pretending you were never there.`
  }

  return familiar
    ? `You let the moment fold instead of break. The alley keeps ${getOpeningChoiceImage(input.openingChoice)} for itself and gives you back the rain.\n\nAs you step away, you get the uneasy sense that the place has marked the choice you did not make just as carefully as the one you did.`
    : `The pressure in the alley changes first. Then the hum behind the broken sign rises, and the night around you decides it has shown enough.\n\nYou lower ${getOpeningChoiceImage(input.openingChoice)} and leave with the distinct feeling that something in the dark has agreed to postpone the rest.`
}
