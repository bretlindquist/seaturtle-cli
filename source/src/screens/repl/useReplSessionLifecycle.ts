import type { UUID } from 'crypto';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getOriginalCwd } from '../../bootstrap/state.js';
import type { ResumeEntrypoint } from '../../commands.js';
import { restoreLocalLifecycleSwarmTasks } from '../../services/autowork/localLifecycleSwarm.js';
import { createFileStateCacheWithSizeLimit, READ_FILE_STATE_CACHE_SIZE } from '../../utils/fileStateCache.js';
import type { Message as MessageType } from '../../types/message.js';
import type { LogOption } from '../../types/logs.js';
import { restoreRemoteAgentTasks } from '../../tasks/RemoteAgentTask/RemoteAgentTask.js';
import { restoreRemoteAutoworkTasks } from '../../tasks/RemoteAutoworkTask/RemoteAutoworkTask.js';
import { restoreReplReadFileState } from './restoreReplReadFileState.js';
import { resumeReplSession } from './resumeReplSession.js';

export function useReplSessionLifecycle({
  initialMessages,
  setAppState,
  store,
  mainThreadAgentDefinition,
  mainLoopModel,
  initialMainThreadAgentDefinition,
  agentDefinitions,
  setMainThreadAgentDefinition,
  updateSessionName,
  resetLoadingState,
  setAbortController,
  setConversationId,
  haikuTitleAttemptedRef,
  setHaikuTitle,
  adoptResumedSessionFile,
  saveWorktreeState,
  getCurrentWorktreeSession,
  setMessages,
  setToolJSX,
  setInputValue,
  contentReplacementStateRef,
}: {
  initialMessages?: MessageType[];
  setAppState: (updater: any) => void;
  store: any;
  mainThreadAgentDefinition: any;
  mainLoopModel: string;
  initialMainThreadAgentDefinition: any;
  agentDefinitions: any;
  setMainThreadAgentDefinition: (value: any) => void;
  updateSessionName: (sessionId: string, title: string) => void;
  resetLoadingState: () => void;
  setAbortController: (value: AbortController | null) => void;
  setConversationId: (value: any) => void;
  haikuTitleAttemptedRef: { current: boolean };
  setHaikuTitle: (value: string | null) => void;
  adoptResumedSessionFile: (...args: any[]) => void;
  saveWorktreeState: (...args: any[]) => void;
  getCurrentWorktreeSession: (...args: any[]) => any;
  setMessages: (updater: any) => void;
  setToolJSX: (value: any) => void;
  setInputValue: (value: string) => void;
  contentReplacementStateRef: { current: any };
}) {
  const [initialReadFileState] = useState(() =>
    createFileStateCacheWithSizeLimit(READ_FILE_STATE_CACHE_SIZE),
  );
  const readFileState = useRef(initialReadFileState);
  const bashTools = useRef(new Set<string>());
  const bashToolsProcessedIdx = useRef(0);

  const restoreReadFileState = useCallback((messages: MessageType[], cwd: string) => {
    restoreReplReadFileState({
      messages,
      cwd,
      readFileState,
      bashTools,
    });
  }, []);

  const resume = useCallback(
    async (sessionId: UUID, log: LogOption, entrypoint: ResumeEntrypoint) => {
      await resumeReplSession({
        sessionId,
        log,
        entrypoint,
        prepareArgs: {
          store,
          setAppState,
          mainThreadAgentDefinition,
          mainLoopModel,
        },
        finishArgs: {
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
          restoreLocalLifecycleSwarmTasks,
          restoreRemoteAgentTasks,
          restoreRemoteAutoworkTasks,
          store,
          saveWorktreeState,
          getCurrentWorktreeSession,
          setMessages,
          setToolJSX,
          setInputValue,
          contentReplacementStateRef,
        },
      });
    },
    [
      adoptResumedSessionFile,
      agentDefinitions,
      getCurrentWorktreeSession,
      initialMainThreadAgentDefinition,
      mainLoopModel,
      mainThreadAgentDefinition,
      resetLoadingState,
      saveWorktreeState,
      setAbortController,
      setAppState,
      setConversationId,
      setHaikuTitle,
      setInputValue,
      setMainThreadAgentDefinition,
      setMessages,
      setToolJSX,
      store,
      updateSessionName,
      restoreReadFileState,
      contentReplacementStateRef,
      haikuTitleAttemptedRef,
    ],
  );

  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      restoreReadFileState(initialMessages, getOriginalCwd());
      void restoreRemoteAgentTasks({
        abortController: new AbortController(),
        getAppState: () => store.getState(),
        setAppState,
      });
      void restoreLocalLifecycleSwarmTasks({
        abortController: new AbortController(),
        getAppState: () => store.getState(),
        setAppState,
      });
      void restoreRemoteAutoworkTasks({
        abortController: new AbortController(),
        getAppState: () => store.getState(),
        setAppState,
      });
    }
    // initialMessages is mount-only state in REPL
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    resume,
    readFileState,
    bashTools,
    bashToolsProcessedIdx,
    restoreReadFileState,
  };
}
