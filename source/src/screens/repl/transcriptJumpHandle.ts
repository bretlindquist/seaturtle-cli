export type TranscriptJumpHandle = {
  jumpToIndex: (index: number) => void
  setSearchQuery: (query: string) => void
  nextMatch: () => void
  prevMatch: () => void
  refreshCurrentMatch: () => void
  setAnchor: () => void
  warmSearchIndex: () => Promise<number>
  disarmSearch: () => void
}
