import type { SwordsOfChaosEncounterLocus } from './worldMap.js'

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

export type SwordsOfChaosCharacterDevelopment = {
  focus:
    | 'edge'
    | 'composure'
    | 'nerve'
    | 'witness'
    | 'threshold'
    | 'myth'
    | null
  title: string | null
  lesson: string | null
  pressure: string | null
  stage: number
  lastUpdatedAt: number | null
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

export type SwordsOfChaosStoryContinuation = {
  kind:
    | 'watcher-pressure'
    | 'wrong-name-echo'
    | 'oath-binding'
    | 'threshold-strain'
    | 'relic-resonance'
    | 'unquiet-aftermath'
  summary: string
  nextPressure: string
  pacing: 'linger' | 'press' | 'reveal'
}

export type SwordsOfChaosSceneState = {
  kind:
    | 'watched-approach'
    | 'threshold-contest'
    | 'name-pressure'
    | 'relic-nearness'
    | 'oath-test'
    | 'unquiet-scene'
  status: 'live' | 'complicating' | 'revealing' | 'paying-off'
  commitment: string
  hazard: string
  pendingReveal: string
  beatsElapsed: number
  lastProgressedAt: number | null
}

export type SwordsOfChaosMagicState = {
  rarityBudget: number
  omensSeen: number
  crossingsOpened: number
  activeImpossible:
    | 'none'
    | 'omen'
    | 'crossing'
    | 'witness'
    | 'relic-sign'
  lastOmen: string | null
  lastManifestationAt: number | null
}

export type SwordsOfChaosStoryState = {
  activeLocus: SwordsOfChaosEncounterLocus | null
  activeThread: string | null
  chapter: number
  chapterTitle: string | null
  tension: 'low' | 'rising' | 'high'
  currentObjective: string | null
  carryForward: string | null
  continuation: SwordsOfChaosStoryContinuation | null
  sceneState: SwordsOfChaosSceneState | null
  lastOutcomeKey: 'relic' | 'title' | 'oath' | 'truth' | 'refusal' | null
  lastAdvancedAt: number | null
}

export type SwordsOfChaosSaveFile = {
  version: 1
  player: SwordsOfChaosPlayerState
  character: SwordsOfChaosCharacterSheet
  characterDevelopment: SwordsOfChaosCharacterDevelopment
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
  story: SwordsOfChaosStoryState
  magic: SwordsOfChaosMagicState
  seaturtle: SwordsOfChaosSeaTurtleState
  runHistorySummary: SwordsOfChaosRunHistorySummary
}
