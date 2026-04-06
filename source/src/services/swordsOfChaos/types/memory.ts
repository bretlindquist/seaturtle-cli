export type SwordsOfChaosRelevantMemory = {
  familiarPlace?: string
  encounterShift?:
    | 'alley'
    | 'old-tree'
    | 'ocean-ship'
    | 'space-station'
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
    | 'fae-realm'
    | 'dark-dungeon'
  recentTitle?: string
  recentRelic?: string
  liveThread?: string
  canonThread?: string
  threadOmen?: string
}
