export type SwordsOfChaosEncounterLocus =
  | 'alley'
  | 'old-tree'
  | 'ocean-ship'
  | 'space-station'
  | 'fae-realm'
  | 'dark-dungeon'

export type SwordsOfChaosWorldMapNode = {
  connectiveWeight: string
  threadEchoes: Record<string, string>
}
