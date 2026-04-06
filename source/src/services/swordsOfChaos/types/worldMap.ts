export type SwordsOfChaosEncounterLocus =
  | 'alley'
  | 'old-tree'
  | 'ocean-ship'
  | 'space-station'
  | 'fae-realm'

export type SwordsOfChaosWorldMapNode = {
  connectiveWeight: string
  threadEchoes: Record<string, string>
}
