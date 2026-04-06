export type SwordsOfChaosRelevantMemory = {
  familiarPlace?: string
  priorRoutes: string[]
  roadNotTakenHint?: string
  revisitCount: number
  lastRoute?: string
  recentTitle?: string
  recentRelic?: string
  liveThread?: string
}

export type SwordsOfChaosDerivedMemory = {
  version: 1
  callbackCandidates: string[]
  priorRoutes: string[]
  familiarPlaces: string[]
  recentTitle?: string
  recentRelic?: string
  liveThread?: string
}
