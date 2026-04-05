import { readCtArchives, type CtArchives } from './archives.js'
import { getCtProjectRoot } from './paths.js'

export type CtArchiveSummary = {
  titles: number
  inventory: number
  oaths: number
  truths: number
  legendEvents: number
  rarityUnlocks: number
  gamesPlayed: number
  wins: number
  losses: number
}

export function getCtArchiveSummary(
  root: string = getCtProjectRoot(),
): CtArchiveSummary {
  const archives = readCtArchives(root)
  return {
    titles: archives.titles.length,
    inventory: archives.inventory.length,
    oaths: archives.oaths.length,
    truths: archives.userRevealedTruths.length,
    legendEvents: archives.legendEvents.length,
    rarityUnlocks: archives.rarityUnlocks.length,
    gamesPlayed: archives.gamesPlayed,
    wins: archives.wins,
    losses: archives.losses,
  }
}

function getMostRecentArchiveCallback(archives: CtArchives): string | null {
  const latestLegendEvent = archives.legendEvents.at(-1)
  if (latestLegendEvent) {
    return `Latest Half-Shell Archives entry: ${latestLegendEvent}`
  }

  const latestTitle = archives.titles.at(-1)
  if (latestTitle) {
    return `Current title in the archives: ${latestTitle}`
  }

  const latestUnlock = archives.rarityUnlocks.at(-1)
  if (latestUnlock) {
    return `Most recent rarity unlock: ${latestUnlock}`
  }

  const latestInventory = archives.inventory.at(-1)
  if (latestInventory) {
    return `Archive inventory remembers: ${latestInventory}`
  }

  const latestOath = archives.oaths.at(-1)
  if (latestOath) {
    return `Archive oath on record: ${latestOath}`
  }

  return null
}

export function getCtCanonCallback(
  root: string = getCtProjectRoot(),
): string | null {
  return getMostRecentArchiveCallback(readCtArchives(root))
}
