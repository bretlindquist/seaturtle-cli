import { feature } from 'bun:bundle';
import { useEffect, useRef } from 'react';
import { getSessionId } from '../../bootstrap/state.js';
import type { PromptInputHelpers } from '../../utils/handlePromptSubmit.js';
import type { Message as MessageType, UserMessage } from '../../types/message.js';
import type { SetAppState } from '../../utils/messageQueueManager.js';
import { getPlanSlug, setPlanSlug } from '../../utils/plans.js';
import { fileHistoryEnabled, fileHistoryMakeSnapshot, type FileHistoryState } from '../../utils/fileHistory.js';
import { buildPermissionUpdates } from '../../components/permissions/ExitPlanModePermissionRequest/ExitPlanModePermissionRequest.js';
import { applyPermissionUpdates } from '../../utils/permissions/PermissionUpdate.js';
import { stripDangerousPermissionsForAutoMode } from '../../utils/permissions/permissionSetup.js';
import { isEnvTruthy } from '../../utils/envUtils.js';
import { isReplAntBuild } from './replAntRuntime.js';

type InitialMessageState = {
  message: UserMessage
  clearContext?: boolean
  mode?: string
  allowedPrompts?: unknown[]
} | null

type UseInitialMessageProcessingInput = {
  initialMessage: InitialMessageState
  isLoading: boolean
  setMessages: (updater: MessageType[] | ((prev: MessageType[]) => MessageType[])) => void
  readFileStateRef: React.RefObject<unknown>
  discoveredSkillNamesRef: React.RefObject<string[]>
  loadedNestedMemoryPathsRef: React.RefObject<ReadonlySet<string>>
  getAppState: () => unknown
  setAppState: SetAppState
  setConversationId: (id: string) => void
  resetConversationChrome: () => void
  awaitPendingHooks: () => Promise<void>
  onSubmit: (input: string, helpers: PromptInputHelpers) => Promise<void>
  onQuery: (newMessages: MessageType[], abortController: AbortController, shouldQuery: boolean, additionalAllowedTools: string[], mainLoopModelParam: string) => Promise<void>
  createAbortController: () => AbortController
  setAbortController: (controller: AbortController | null) => void
  mainLoopModel: string
}

export function useInitialMessageProcessing({
  initialMessage,
  isLoading,
  setMessages,
  readFileStateRef,
  discoveredSkillNamesRef,
  loadedNestedMemoryPathsRef,
  getAppState,
  setAppState,
  setConversationId,
  resetConversationChrome,
  awaitPendingHooks,
  onSubmit,
  onQuery,
  createAbortController,
  setAbortController,
  mainLoopModel,
}: UseInitialMessageProcessingInput) {
  const initialMessageRef = useRef(false);

  useEffect(() => {
    const pending = initialMessage;
    if (!pending || isLoading || initialMessageRef.current) return;

    initialMessageRef.current = true;

    async function processInitialMessage(initialMsg: NonNullable<InitialMessageState>) {
      if (initialMsg.clearContext) {
        const oldPlanSlug = initialMsg.message.planContent ? getPlanSlug() : undefined;
        const { clearConversation } = await import('../../commands/clear/conversation.js');
        await clearConversation({
          setMessages,
          readFileState: readFileStateRef.current as never,
          discoveredSkillNames: discoveredSkillNamesRef.current,
          loadedNestedMemoryPaths: loadedNestedMemoryPathsRef.current,
          getAppState,
          setAppState,
          setConversationId,
        });
        resetConversationChrome();
        if (oldPlanSlug) {
          setPlanSlug(getSessionId(), oldPlanSlug);
        }
      }

      const shouldStorePlanForVerification = initialMsg.message.planContent && isReplAntBuild() && isEnvTruthy(undefined);
      setAppState(prev => {
        let updatedToolPermissionContext = initialMsg.mode
          ? applyPermissionUpdates(prev.toolPermissionContext, buildPermissionUpdates(initialMsg.mode as never, initialMsg.allowedPrompts as never))
          : prev.toolPermissionContext;
        if (feature('TRANSCRIPT_CLASSIFIER') && initialMsg.mode === 'auto') {
          updatedToolPermissionContext = stripDangerousPermissionsForAutoMode({
            ...updatedToolPermissionContext,
            mode: 'auto',
            prePlanMode: undefined,
          });
        }
        return {
          ...prev,
          initialMessage: null,
          toolPermissionContext: updatedToolPermissionContext,
          ...(shouldStorePlanForVerification && {
            pendingPlanVerification: {
              plan: initialMsg.message.planContent!,
              verificationStarted: false,
              verificationCompleted: false,
            },
          }),
        };
      });

      if (fileHistoryEnabled()) {
        void fileHistoryMakeSnapshot((updater: (prev: FileHistoryState) => FileHistoryState) => {
          setAppState(prev => ({
            ...prev,
            fileHistory: updater(prev.fileHistory),
          }));
        }, initialMsg.message.uuid);
      }

      await awaitPendingHooks();

      const content = initialMsg.message.message.content;
      if (typeof content === 'string' && !initialMsg.message.planContent) {
        void onSubmit(content, {
          setCursorOffset: () => {},
          clearBuffer: () => {},
          resetHistory: () => {},
        });
      } else {
        const newAbortController = createAbortController();
        setAbortController(newAbortController);
        void onQuery([initialMsg.message], newAbortController, true, [], mainLoopModel);
      }

      setTimeout(ref => {
        ref.current = false;
      }, 100, initialMessageRef);
    }

    void processInitialMessage(pending);
  }, [awaitPendingHooks, createAbortController, discoveredSkillNamesRef, getAppState, initialMessage, isLoading, loadedNestedMemoryPathsRef, mainLoopModel, onQuery, onSubmit, readFileStateRef, resetConversationChrome, setAbortController, setAppState, setConversationId, setMessages]);
}
