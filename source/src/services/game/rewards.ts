export const WAGER_RARITY_UNLOCK = 'wager-with-the-mighty-seaturtle'
export const TIDE_DICE_RARITY_UNLOCK = 'roll-the-tide-dice'

export const WAGER_REWARDS = {
  title: 'Friend of the Mighty SeaTurtle',
  inventory: 'shell-marked lucky token',
  rarityUnlock: WAGER_RARITY_UNLOCK,
} as const

export const TIDE_DICE_REWARDS = {
  inventory: 'tide-polished die',
  rarityUnlock: TIDE_DICE_RARITY_UNLOCK,
} as const

const SWORDS_OF_CHAOS_OUTCOMES = [
  {
    key: 'relic',
    inventory: 'trench-coat relic blade',
  },
  {
    key: 'title',
    title: 'Walker of the Salt Arcade',
  },
  {
    key: 'oath',
    oath: 'Leave one mystery unsolved on purpose.',
  },
  {
    key: 'refusal',
  },
] as const

export type SwordsOfChaosOutcome = (typeof SWORDS_OF_CHAOS_OUTCOMES)[number]

export function getSwordsOfChaosOutcome(index: number): SwordsOfChaosOutcome {
  return (
    SWORDS_OF_CHAOS_OUTCOMES[index % SWORDS_OF_CHAOS_OUTCOMES.length] ??
    SWORDS_OF_CHAOS_OUTCOMES[0]
  )
}
