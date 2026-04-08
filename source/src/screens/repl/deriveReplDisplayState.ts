import {
  isInProcessTeammateTask,
} from '../../tasks/InProcessTeammateTask/types.js';
import { isLocalAgentTask } from '../../tasks/LocalAgentTask/LocalAgentTask.js';

type DeriveReplDisplayStateArgs<TMessage, TTaskMap> = {
  viewingAgentTaskId: string | undefined
  tasks: TTaskMap
  showStreamingText: boolean
  isLoading: boolean
  messages: TMessage[]
  deferredMessages: TMessage[]
  userInputOnProcessing: string | undefined
  userInputBaseline: number
};

type TaskValue<TTaskMap> = TTaskMap extends Record<string, infer TValue>
  ? TValue
  : never;

export function deriveReplDisplayState<
  TMessage,
  TTaskMap extends Record<string, unknown>,
>({
  viewingAgentTaskId,
  tasks,
  showStreamingText,
  isLoading,
  messages,
  deferredMessages,
  userInputOnProcessing,
  userInputBaseline,
}: DeriveReplDisplayStateArgs<TMessage, TTaskMap>) {
  const viewedTask = viewingAgentTaskId ? tasks[viewingAgentTaskId] : undefined;
  const viewedTeammateTask =
    viewedTask && isInProcessTeammateTask(viewedTask) ? viewedTask : undefined;
  const viewedAgentTask =
    viewedTeammateTask ??
    (viewedTask && isLocalAgentTask(viewedTask) ? viewedTask : undefined);

  const usesSyncMessages = showStreamingText || !isLoading;
  const displayedMessages = viewedAgentTask
    ? (viewedAgentTask.messages ?? [])
    : usesSyncMessages
      ? messages
      : deferredMessages;
  const placeholderText =
    userInputOnProcessing &&
    !viewedAgentTask &&
    displayedMessages.length <= userInputBaseline
      ? userInputOnProcessing
      : undefined;

  return {
    viewedTask: viewedTask as TaskValue<TTaskMap> | undefined,
    viewedTeammateTask: viewedTeammateTask as TaskValue<TTaskMap> | undefined,
    viewedAgentTask: viewedAgentTask as TaskValue<TTaskMap> | undefined,
    usesSyncMessages,
    displayedMessages,
    placeholderText,
  };
}
