import { useCallback } from 'react';
import { Text } from '../../ink.js';
import type { PromptInputHelpers } from '../../utils/handlePromptSubmit.js';
import type { SetAppState } from '../../utils/messageQueueManager.js';
import { getCommandQueue } from '../../utils/messageQueueManager.js';
import type { Message as MessageType } from '../../types/message.js';
import { createUserMessage } from '../../utils/messages.js';
import { errorMessage } from '../../utils/errors.js';
import { logForDebugging } from '../../utils/debug.js';
import type { LocalAgentTaskState } from '../../tasks/LocalAgentTask/LocalAgentTask.js';
import { appendMessageToLocalAgent, isLocalAgentTask, queuePendingMessage } from '../../tasks/LocalAgentTask/LocalAgentTask.js';
import { injectUserMessageToTeammate, type InProcessTeammateTaskState } from '../../tasks/InProcessTeammateTask/InProcessTeammateTask.js';
import { resumeAgentBackground } from '../../tools/AgentTool/resumeAgent.js';
import { isPromptLikeInputMode } from '../../components/PromptInput/inputModes.js';

type AddNotification = (notification: {
  key: string
  jsx: React.ReactNode
  priority: 'low' | 'medium' | 'immediate'
}) => void

type UseIncomingSubmissionsInput = {
  queryIsActive: () => boolean
  createAbortController: () => AbortController
  setAbortController: (controller: AbortController | null) => void
  onQuery: (newMessages: MessageType[], abortController: AbortController, shouldQuery: boolean, additionalAllowedTools: string[], mainLoopModelParam: string) => Promise<void>
  mainLoopModel: string
  setAppState: SetAppState
  setInputValue: (value: string) => void
  getToolUseContext: (messagesIncludingNewMessages: MessageType[], newMessages: MessageType[], abortController: AbortController, mainLoopModelParam: string) => unknown
  messagesRef: React.RefObject<MessageType[]>
  canUseTool: unknown
  addNotification: AddNotification
}

export function useIncomingSubmissions({
  queryIsActive,
  createAbortController,
  setAbortController,
  onQuery,
  mainLoopModel,
  setAppState,
  setInputValue,
  getToolUseContext,
  messagesRef,
  canUseTool,
  addNotification,
}: UseIncomingSubmissionsInput) {
  const onAgentSubmit = useCallback(async (input: string, task: InProcessTeammateTaskState | LocalAgentTaskState, helpers: PromptInputHelpers) => {
    if (isLocalAgentTask(task)) {
      appendMessageToLocalAgent(task.id, createUserMessage({
        content: input,
      }), setAppState);
      if (task.status === 'running') {
        queuePendingMessage(task.id, input, setAppState);
      } else {
        void resumeAgentBackground({
          agentId: task.id,
          prompt: input,
          toolUseContext: getToolUseContext(messagesRef.current, [], new AbortController(), mainLoopModel),
          canUseTool,
        }).catch(err => {
          logForDebugging(`resumeAgentBackground failed: ${errorMessage(err)}`);
          addNotification({
            key: `resume-agent-failed-${task.id}`,
            jsx: <Text color="error">
                Failed to resume agent: {errorMessage(err)}
              </Text>,
            priority: 'low',
          });
        });
      }
    } else {
      injectUserMessageToTeammate(task.id, input, setAppState);
    }
    setInputValue('');
    helpers.setCursorOffset(0);
    helpers.clearBuffer();
  }, [addNotification, canUseTool, getToolUseContext, mainLoopModel, messagesRef, setAppState, setInputValue]);

  const handleIncomingPrompt = useCallback((content: string, options?: {
    isMeta?: boolean
  }): boolean => {
    if (queryIsActive()) return false;
    if (getCommandQueue().some(cmd => isPromptLikeInputMode(cmd.mode) || cmd.mode === 'bash')) {
      return false;
    }
    const newAbortController = createAbortController();
    setAbortController(newAbortController);
    const userMessage = createUserMessage({
      content,
      isMeta: options?.isMeta ? true : undefined,
    });
    void onQuery([userMessage], newAbortController, true, [], mainLoopModel);
    return true;
  }, [createAbortController, mainLoopModel, onQuery, queryIsActive, setAbortController]);

  return {
    onAgentSubmit,
    handleIncomingPrompt,
  };
}
