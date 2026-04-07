export type SwordsOfChaosPlayerState = {
  level: number
  hp: number
  maxHp: number
  stats: Record<string, number>
}

export type SwordsOfChaosCreationMode = 'premade' | 'procedural' | 'custom'

export type SwordsOfChaosCharacterSheet = {
  name: string | null
  creationMode: SwordsOfChaosCreationMode | null
  archetype: string | null
  className: string | null
  species: string | null
  origin: string | null
  strength: string | null
  flaw: string | null
  keepsake: string | null
  drive: string | null
  omen: string | null
}

export type SwordsOfChaosSessionZeroState = {
  completed: boolean
  originPlace: string | null
  firstContact: string | null
  completedAt: number | null
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

export type SwordsOfChaosEncounterMemory = {
  visits: number
  seenOpeners: string[]
  seenRoutes: string[]
  lastRoute: string | null
}

export type SwordsOfChaosThreadMemory = {
  sightings: number
  canonized: boolean
  lastSeenAt: number | null
}

export type SwordsOfChaosSaveFile = {
  version: 1
  player: SwordsOfChaosPlayerState
  character: SwordsOfChaosCharacterSheet
  sessionZero: SwordsOfChaosSessionZeroState
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
  threadMemory: Record<string, SwordsOfChaosThreadMemory>
  encounterMemory: Record<string, SwordsOfChaosEncounterMemory>
  seaturtle: SwordsOfChaosSeaTurtleState
  runHistorySummary: SwordsOfChaosRunHistorySummary
}
