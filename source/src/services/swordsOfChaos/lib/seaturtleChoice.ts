import type {
  SwordsOfChaosOpeningChoice,
  SwordsOfChaosSecondChoice,
} from '../types/outcomes.js'

export function getSwordsSeaTurtleFavoredSecondChoice(
  openingChoice: SwordsOfChaosOpeningChoice,
): SwordsOfChaosSecondChoice {
  switch (openingChoice) {
    case 'draw-steel':
      return 'lower-the-blade'
    case 'bow-slightly':
      return 'meet-the-gaze'
    case 'talk-like-you-belong':
      return 'laugh-like-you-mean-it'
  }
}

export function isSwordsSeaTurtleFavoredChoice(
  openingChoice: SwordsOfChaosOpeningChoice,
  secondChoice: SwordsOfChaosSecondChoice,
): boolean {
  return getSwordsSeaTurtleFavoredSecondChoice(openingChoice) === secondChoice
}
