type BuildReplGlobalKeybindingPropsArgs = {
  screen: string
  setScreen: (screen: string) => void
  showAllInTranscript: boolean
  setShowAllInTranscript: (value: boolean) => void
  messageCount: number
  onEnterTranscript: () => void
  onExitTranscript: () => void
  virtualScrollActive: boolean
  searchBarOpen: boolean
};

export function buildReplGlobalKeybindingProps({
  screen,
  setScreen,
  showAllInTranscript,
  setShowAllInTranscript,
  messageCount,
  onEnterTranscript,
  onExitTranscript,
  virtualScrollActive,
  searchBarOpen,
}: BuildReplGlobalKeybindingPropsArgs) {
  return {
    screen,
    setScreen,
    showAllInTranscript,
    setShowAllInTranscript,
    messageCount,
    onEnterTranscript,
    onExitTranscript,
    virtualScrollActive,
    searchBarOpen,
  };
}
