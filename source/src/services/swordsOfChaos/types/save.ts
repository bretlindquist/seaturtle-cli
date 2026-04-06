export type SwordsOfChaosPlayerState = {
  level: number
  hp: number
  maxHp: number
  stats: Record<string, number>
}

export type SwordsOfChaosSeaTurtleState = {
  bond: number
  favor: number
  appearances: number
  lastAppearanceAt: number | null
}

export type SwordsOfChaosRunHistorySummary = {
  runsStarted: number
  runsFinished: number
  lastPlayedAt: number | null
}

export type SwordsOfChaosSaveFile = {
  version: 1
  player: SwordsOfChaosPlayerState
  inventory: string[]
  conditions: string[]
  progression: {
    titles: string[]
    milestones: string[]
    xp: number
  }
  worldFlags: string[]
  discoveredSeeds: string[]
  callbackMarkers: string[]
  unresolvedBranches: string[]
  threadCandidates: string[]
  seaturtle: SwordsOfChaosSeaTurtleState
  runHistorySummary: SwordsOfChaosRunHistorySummary
}
