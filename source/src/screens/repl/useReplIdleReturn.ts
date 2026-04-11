import { useCallback } from 'react';
import { clearReplConversationForIdleReturn } from './clearReplConversationForIdleReturn.js';

export function useReplIdleReturn({
  setMessages,
  readFileState,
  discoveredSkillNamesRef,
  loadedNestedMemoryPathsRef,
  store,
  setAppState,
  setConversationId,
  haikuTitleAttemptedRef,
  setHaikuTitle,
  bashTools,
  bashToolsProcessedIdx,
}: {
  setMessages: (updater: any) => void;
  readFileState: any;
  discoveredSkillNamesRef: { current: Set<string> };
  loadedNestedMemoryPathsRef: { current: Set<string> };
  store: any;
  setAppState: (updater: any) => void;
  setConversationId: (value: any) => void;
  haikuTitleAttemptedRef: { current: boolean };
  setHaikuTitle: (value: any) => void;
  bashTools: { current: Set<string> };
  bashToolsProcessedIdx: { current: number };
}) {
  return useCallback(async () => {
    await clearReplConversationForIdleReturn({
      setMessages,
      readFileState,
      discoveredSkillNamesRef,
      loadedNestedMemoryPathsRef,
      getAppState: () => store.getState(),
      setAppState,
      setConversationId,
      haikuTitleAttemptedRef,
      setHaikuTitle,
      bashTools,
      bashToolsProcessedIdx,
    });
  }, [
    bashTools,
    bashToolsProcessedIdx,
    discoveredSkillNamesRef,
    haikuTitleAttemptedRef,
    loadedNestedMemoryPathsRef,
    readFileState,
    setAppState,
    setConversationId,
    setHaikuTitle,
    setMessages,
    store,
  ]);
}
