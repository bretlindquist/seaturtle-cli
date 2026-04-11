export async function clearReplConversationForIdleReturn({
  setMessages,
  readFileState,
  discoveredSkillNamesRef,
  loadedNestedMemoryPathsRef,
  getAppState,
  setAppState,
  setConversationId,
  haikuTitleAttemptedRef,
  setHaikuTitle,
  bashTools,
  bashToolsProcessedIdx,
}: {
  setMessages: (updater: any) => void
  readFileState: { current: unknown }
  discoveredSkillNamesRef: { current: Set<string> }
  loadedNestedMemoryPathsRef: { current: Set<string> }
  getAppState: () => unknown
  setAppState: (updater: any) => void
  setConversationId: (value: string) => void
  haikuTitleAttemptedRef: { current: boolean }
  setHaikuTitle: (value: string | undefined) => void
  bashTools: { current: Set<string> }
  bashToolsProcessedIdx: { current: number }
}) {
  const { clearConversation } = await import('../../commands/clear/conversation.js');
  await clearConversation({
    setMessages,
    readFileState: readFileState.current,
    discoveredSkillNames: discoveredSkillNamesRef.current,
    loadedNestedMemoryPaths: loadedNestedMemoryPathsRef.current,
    getAppState,
    setAppState,
    setConversationId,
  });

  haikuTitleAttemptedRef.current = false;
  setHaikuTitle(undefined);
  bashTools.current.clear();
  bashToolsProcessedIdx.current = 0;
}
