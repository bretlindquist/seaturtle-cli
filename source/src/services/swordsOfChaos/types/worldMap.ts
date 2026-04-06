export type SwordsOfChaosEncounterLocus =
  | 'alley'
  | 'old-tree'
  | 'ocean-ship'
  | 'post-apocalyptic-ruin'
  | 'space-station'
  | 'mars-outpost'
  | 'fae-realm'
  | 'dark-dungeon'

export type SwordsOfChaosWorldMapNode = {
  connectiveWeight: string
  threadEchoes: Record<string, string>
  recurringSymbol?: string
}
