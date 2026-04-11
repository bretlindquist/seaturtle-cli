import { dirname } from 'path';
import { getOriginalCwd, setCostStateForRestore, switchSession } from '../../bootstrap/state.js';
import { clearSessionMetadata, restoreSessionMetadata } from '../../utils/sessionStorage.js';
import { saveCurrentSessionCosts, resetCostState, getStoredSessionCosts } from '../../cost-tracker.js';
import {
  computeStandaloneAgentContext,
  exitRestoredWorktree,
  restoreAgentFromSession,
  restoreSessionStateFromLog,
  restoreWorktreeForResume,
} from '../../utils/sessionRestore.js';
import { copyFileHistoryForResume } from '../../utils/fileHistory.js';
import { reconstructContentReplacementState } from '../../utils/toolResultStorage.js';

export async function finishReplSessionResume({
  sessionId,
  log,
  entrypoint,
  setAppState,
  initialMainThreadAgentDefinition,
  agentDefinitions,
  setMainThreadAgentDefinition,
  updateSessionName,
  restoreReadFileState,
  resetLoadingState,
  setAbortController,
  setConversationId,
  haikuTitleAttemptedRef,
  setHaikuTitle,
  bashTools,
  bashToolsProcessedIdx,
  adoptResumedSessionFile,
  restoreRemoteAgentTasks,
  store,
  saveWorktreeState,
  getCurrentWorktreeSession,
  setMessages,
  setToolJSX,
  setInputValue,
  contentReplacementStateRef,
  messages,
}: {
  sessionId: any;
  log: any;
  entrypoint: any;
  setAppState: (updater: any) => void;
  initialMainThreadAgentDefinition: any;
  agentDefinitions: any;
  setMainThreadAgentDefinition: (value: any) => void;
  updateSessionName: (value: any) => Promise<void> | void;
  restoreReadFileState: (messages: any[], cwd: string) => void;
  resetLoadingState: () => void;
  setAbortController: (value: any) => void;
  setConversationId: (value: any) => void;
  haikuTitleAttemptedRef: { current: boolean };
  setHaikuTitle: (value: any) => void;
  bashTools: { current: Set<string> };
  bashToolsProcessedIdx: { current: number };
  adoptResumedSessionFile: () => void;
  restoreRemoteAgentTasks: (args: any) => Promise<void>;
  store: any;
  saveWorktreeState: (value: any) => void;
  getCurrentWorktreeSession: () => any;
  setMessages: (value: any) => void;
  setToolJSX: (value: any) => void;
  setInputValue: (value: string) => void;
  contentReplacementStateRef: { current: any };
  messages: any[];
}) {
  restoreSessionStateFromLog(log, setAppState);
  if (log.fileHistorySnapshots) {
    void copyFileHistoryForResume(log);
  }

  const { agentDefinition: restoredAgent } = restoreAgentFromSession(
    log.agentSetting,
    initialMainThreadAgentDefinition,
    agentDefinitions,
  );
  setMainThreadAgentDefinition(restoredAgent);
  setAppState((prev: any) => ({
    ...prev,
    agent: restoredAgent?.agentType,
  }));

  setAppState((prev: any) => ({
    ...prev,
    standaloneAgentContext: computeStandaloneAgentContext(log.agentName, log.agentColor),
  }));
  void updateSessionName(log.agentName);

  restoreReadFileState(messages, log.projectPath ?? getOriginalCwd());
  resetLoadingState();
  setAbortController(null);
  setConversationId(sessionId);

  const targetSessionCosts = getStoredSessionCosts(sessionId);
  saveCurrentSessionCosts();
  resetCostState();

  switchSession(sessionId, log.fullPath ? dirname(log.fullPath) : null);
  const { renameRecordingForSession } = await import('../../utils/asciicast.js');
  await renameRecordingForSession();
  const { resetSessionFilePointer } = await import('../../utils/sessionStorage.js');
  await resetSessionFilePointer();

  clearSessionMetadata();
  restoreSessionMetadata(log);
  haikuTitleAttemptedRef.current = true;
  setHaikuTitle(undefined);
  bashTools.current.clear();
  bashToolsProcessedIdx.current = 0;

  if (entrypoint !== 'fork') {
    exitRestoredWorktree();
    restoreWorktreeForResume(log.worktreeSession);
    adoptResumedSessionFile();
    void restoreRemoteAgentTasks({
      abortController: new AbortController(),
      getAppState: () => store.getState(),
      setAppState,
    });
  } else {
    const ws = getCurrentWorktreeSession();
    if (ws) saveWorktreeState(ws);
  }

  if (targetSessionCosts) {
    setCostStateForRestore(targetSessionCosts);
  }

  if (contentReplacementStateRef.current && entrypoint !== 'fork') {
    contentReplacementStateRef.current = reconstructContentReplacementState(
      messages,
      log.contentReplacements ?? [],
    );
  }

  setMessages(() => messages);
  setToolJSX(null);
  setInputValue('');
}
