import type {
  SwordsOfChaosCharacterDevelopment,
  SwordsOfChaosSceneState,
  SwordsOfChaosStoryContinuation,
} from './save.js'

export type SwordsOfChaosRelevantMemory = {
  familiarPlace?: string
  encounterShift?:
    | 'alley'
    | 'old-tree'
    | 'ocean-ship'
    | 'post-apocalyptic-ruin'
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
  activeThread?: string
  liveThreadTitle?: string
  canonThreadTitle?: string
  storyChapter: number
  chapterTitle?: string
  storyTension: 'low' | 'rising' | 'high'
  currentObjective?: string
  carryForward?: string
  continuation?: SwordsOfChaosStoryContinuation
  sceneState?: SwordsOfChaosSceneState
  characterDevelopment?: SwordsOfChaosCharacterDevelopment
  lastOutcomeKey?: 'relic' | 'title' | 'oath' | 'truth' | 'refusal'
  threadOmen?: string
  seaturtleGlimpsed: boolean
  seaturtleOpeningPending: boolean
  seaturtleBond: number
  seaturtleFavor: number
  recurringSymbol?: string
  magicState?: {
    rarityBudget: number
    omensSeen: number
    crossingsOpened: number
    activeImpossible: 'none' | 'omen' | 'crossing' | 'witness' | 'relic-sign'
    lastOmen?: string
  }
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
    | 'post-apocalyptic-ruin'
    | 'space-station'
    | 'mars-outpost'
    | 'fae-realm'
    | 'dark-dungeon'
  recentTitle?: string
  recentRelic?: string
  liveThread?: string
  canonThread?: string
  activeThread?: string
  liveThreadTitle?: string
  canonThreadTitle?: string
  storyChapter: number
  chapterTitle?: string
  storyTension: 'low' | 'rising' | 'high'
  currentObjective?: string
  carryForward?: string
  continuation?: SwordsOfChaosStoryContinuation
  sceneState?: SwordsOfChaosSceneState
  characterDevelopment?: SwordsOfChaosCharacterDevelopment
  lastOutcomeKey?: 'relic' | 'title' | 'oath' | 'truth' | 'refusal'
  threadOmen?: string
  recurringSymbol?: string
  magicState?: {
    rarityBudget: number
    omensSeen: number
    crossingsOpened: number
    activeImpossible: 'none' | 'omen' | 'crossing' | 'witness' | 'relic-sign'
    lastOmen?: string
  }
}
