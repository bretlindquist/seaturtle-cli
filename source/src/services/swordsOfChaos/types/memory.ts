export type SwordsOfChaosRelevantMemory = {
  familiarPlace?: string
  encounterShift?:
    | 'alley'
    | 'old-tree'
    | 'ocean-ship'
    | 'space-station'
    | 'mars-outpost'
    | 'fae-realm'
    | 'dark-dungeon'
  priorRoutes: string[]
  roadNotTakenHint?: string
  revisitCount: number
  lastRoute?: string
  recentTitle?: string
  recentRelic?: string
  liveThread?: string
  canonThread?: string
  threadOmen?: string
  seaturtleGlimpsed: boolean
  seaturtleBond: number
  seaturtleFavor: number
  recurringSymbol?: string
}

export type SwordsOfChaosDerivedMemory = {
  version: 1
  callbackCandidates: string[]
  priorRoutes: string[]
  familiarPlaces: string[]
  encounterShift?:
    | 'alley'
    | 'old-tree'
    | 'ocean-ship'
    | 'space-station'
    | 'mars-outpost'
    | 'fae-realm'
    | 'dark-dungeon'
  recentTitle?: string
  recentRelic?: string
  liveThread?: string
  canonThread?: string
  threadOmen?: string
  recurringSymbol?: string
}
