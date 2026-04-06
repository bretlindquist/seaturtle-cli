export const WAGER_RARITY_UNLOCK = 'wager-with-the-mighty-seaturtle'
export const TIDE_DICE_RARITY_UNLOCK = 'roll-the-tide-dice'
export const SWORDS_OF_CHAOS_RARITY_UNLOCK = 'swords-of-chaos'

export const WAGER_REWARDS = {
  title: 'Friend of the Mighty SeaTurtle',
  inventory: 'shell-marked lucky token',
  rarityUnlock: WAGER_RARITY_UNLOCK,
} as const

export const TIDE_DICE_REWARDS = {
  inventory: 'tide-polished die',
  rarityUnlock: TIDE_DICE_RARITY_UNLOCK,
} as const

export type SwordsOfChaosOpeningChoice =
  | 'draw-steel'
  | 'bow-slightly'
  | 'talk-like-you-belong'

export type SwordsOfChaosSecondChoice =
  | 'cut-the-sign-chain'
  | 'hold-the-line'
  | 'lower-the-blade'
  | 'keep-bowing'
  | 'meet-the-gaze'
  | 'ask-the-price'
  | 'name-a-false-title'
  | 'laugh-like-you-mean-it'
  | 'double-down'

export type SwordsOfChaosRoute =
  `${SwordsOfChaosOpeningChoice}:${SwordsOfChaosSecondChoice}`

type SwordsOfChaosOutcomeBase = {
  gameResult: 'played' | 'win' | 'loss'
  legendEvent: string
  ending: string
}

type SwordsOfChaosRelicOutcome = SwordsOfChaosOutcomeBase & {
  key: 'relic'
  inventory: string
  rarityUnlock?: string
}

type SwordsOfChaosTitleOutcome = SwordsOfChaosOutcomeBase & {
  key: 'title'
  title: string
}

type SwordsOfChaosOathOutcome = SwordsOfChaosOutcomeBase & {
  key: 'oath'
  oath: string
}

type SwordsOfChaosTruthOutcome = SwordsOfChaosOutcomeBase & {
  key: 'truth'
  truth: string
}

type SwordsOfChaosRefusalOutcome = SwordsOfChaosOutcomeBase & {
  key: 'refusal'
}

export type SwordsOfChaosOutcome =
  | SwordsOfChaosRelicOutcome
  | SwordsOfChaosTitleOutcome
  | SwordsOfChaosOathOutcome
  | SwordsOfChaosTruthOutcome
  | SwordsOfChaosRefusalOutcome

const SWORDS_OF_CHAOS_OUTCOMES: Record<SwordsOfChaosRoute, SwordsOfChaosOutcome> = {
  'draw-steel:cut-the-sign-chain': {
    key: 'relic',
    inventory: 'trench-coat relic blade',
    rarityUnlock: SWORDS_OF_CHAOS_RARITY_UNLOCK,
    gameResult: 'win',
    legendEvent:
      'Cut the broken sign free in Swords of Chaos and left the alley carrying the trench-coat relic blade.',
    ending:
      'Steel rings against old neon. The sign chain snaps, the alley goes dark, and the trench-coat turtle leaves behind a trench-coat relic blade.\n\nThe relic is now in the Half-Shell Archives.',
  },
  'draw-steel:hold-the-line': {
    key: 'title',
    title: 'Keeper of the Neon Line',
    gameResult: 'win',
    legendEvent:
      'Held the line in Swords of Chaos until the alley named you Keeper of the Neon Line.',
    ending:
      'Nobody swings. Nobody retreats. The broken lamp hums like a crown being forged.\n\nThe trench-coat turtle names you Keeper of the Neon Line, then steps back into static.\n\nThe title is now in the Half-Shell Archives.',
  },
  'draw-steel:lower-the-blade': {
    key: 'oath',
    oath: 'Do not mistake restraint for surrender.',
    gameResult: 'played',
    legendEvent:
      'Lowered the blade in Swords of Chaos and left the alley carrying an oath instead of a wound.',
    ending:
      'The alley was ready for violence, and you refused to give it the full satisfaction.\n\nThe trench-coat turtle leaves you with an oath: "Do not mistake restraint for surrender."\n\nThe oath is now in the Half-Shell Archives.',
  },
  'bow-slightly:keep-bowing': {
    key: 'truth',
    truth: 'Some doors open only when you stop trying to break them.',
    gameResult: 'played',
    legendEvent:
      'Stayed in the bow long enough for Swords of Chaos to answer with a truth instead of a prize.',
    ending:
      'You keep the bow long enough for the alley to shift around you.\n\nThe trench-coat turtle says only this: "Some doors open only when you stop trying to break them."\n\nThe truth is now in the Half-Shell Archives.',
  },
  'bow-slightly:meet-the-gaze': {
    key: 'title',
    title: 'Witness of the Broken Lamp',
    gameResult: 'win',
    legendEvent:
      'Met the trench-coat turtle gaze-for-gaze in Swords of Chaos and earned the title Witness of the Broken Lamp.',
    ending:
      'You raise your head. The turtle does not flinch. Somewhere above, the broken lamp steadies.\n\nThe trench-coat turtle names you Witness of the Broken Lamp.\n\nThe title is now in the Half-Shell Archives.',
  },
  'bow-slightly:ask-the-price': {
    key: 'oath',
    oath: 'Pay attention before you pay in full.',
    gameResult: 'played',
    legendEvent:
      'Asked the price in Swords of Chaos and came away with a warning oath.',
    ending:
      'The turtle laughs once, softly, like a coin settling on stone.\n\nIt offers no weapon, only an oath: "Pay attention before you pay in full."\n\nThe oath is now in the Half-Shell Archives.',
  },
  'talk-like-you-belong:name-a-false-title': {
    key: 'refusal',
    gameResult: 'loss',
    legendEvent:
      'Bluffed a false title in Swords of Chaos and the alley turned you away.',
    ending:
      'The wrong name leaves your mouth and the alley knows it immediately.\n\nThe trench-coat turtle tilts its head, decides you are not ready, and the static closes over the sign.\n\nThe refusal is recorded in the Half-Shell Archives.',
  },
  'talk-like-you-belong:laugh-like-you-mean-it': {
    key: 'relic',
    inventory: 'static-lacquer arcade chip',
    gameResult: 'win',
    legendEvent:
      'Laughed with the alley in Swords of Chaos and walked away with a static-lacquer arcade chip.',
    ending:
      'Against all sensible advice, you laugh. The turtle answers with the smallest possible grin.\n\nSomething bright skids across the pavement: a static-lacquer arcade chip.\n\nThe relic is now in the Half-Shell Archives.',
  },
  'talk-like-you-belong:double-down': {
    key: 'truth',
    truth: 'Confidence becomes prophecy if you survive it.',
    gameResult: 'played',
    legendEvent:
      'Doubled down in Swords of Chaos until the alley answered with a dangerous little truth.',
    ending:
      'You keep talking like you own the place until the alley almost believes you.\n\nThe trench-coat turtle leaves you with a truth: "Confidence becomes prophecy if you survive it."\n\nThe truth is now in the Half-Shell Archives.',
  },
}

export function getSwordsOfChaosOutcome(
  route: SwordsOfChaosRoute,
): SwordsOfChaosOutcome {
  return SWORDS_OF_CHAOS_OUTCOMES[route]
}
