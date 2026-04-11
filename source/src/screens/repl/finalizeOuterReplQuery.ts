import { feature } from 'bun:bundle';
import { count } from '../../utils/array.js';
import { getBudgetContinuationCount, getCurrentTurnTokenBudget, getTurnOutputTokens, snapshotOutputTokensForTurn } from '../../bootstrap/state.js';
import { createTurnDurationMessage, type UserMessage } from '../../utils/messages.js';
import { isLoggableMessage } from '../../utils/sessionStorage.js';
import { getAllInProcessTeammateTasks } from '../../tasks/InProcessTeammateTask/InProcessTeammateTask.js';
import { getCommandQueueLength } from '../../utils/messageQueueManager.js';
import { messagesAfterAreOnlySynthetic, selectableUserMessagesFilter } from '../../components/MessageSelector.js';
import { removeLastFromHistory } from '../../history.js';

export async function finalizeCompletedOuterReplQuery({
  abortController,
  setLastQueryCompletionTime,
  skipIdleCheckRef,
  resetLoadingState,
  mrOnTurnComplete,
  messagesRef,
  sendBridgeResult,
  isReplAntBuild,
  setAppState,
  loadingStartTimeRef,
  totalPausedMsRef,
  proactiveActive,
  tasks,
  swarmStartTimeRef,
  swarmBudgetInfoRef,
  setMessages,
  setAbortController,
}: {
  abortController: AbortController
  setLastQueryCompletionTime: (time: number) => void
  skipIdleCheckRef: React.RefObject<boolean>
  resetLoadingState: () => void
  mrOnTurnComplete: (messages: any[], aborted: boolean) => Promise<void>
  messagesRef: React.RefObject<any[]>
  sendBridgeResult: () => void
  isReplAntBuild: boolean
  setAppState: (updater: (prev: any) => any) => void
  loadingStartTimeRef: React.RefObject<number>
  totalPausedMsRef: React.RefObject<number>
  proactiveActive: boolean
  tasks: Record<string, any>
  swarmStartTimeRef: React.RefObject<number | null>
  swarmBudgetInfoRef: React.RefObject<
    | {
        tokens: number
        limit: number
        nudges: number
      }
    | undefined
  >
  setMessages: React.Dispatch<React.SetStateAction<any[]>>
  setAbortController: (controller: AbortController | null) => void
}) {
  setLastQueryCompletionTime(Date.now());
  skipIdleCheckRef.current = false;
  resetLoadingState();
  await mrOnTurnComplete(messagesRef.current, abortController.signal.aborted);
  sendBridgeResult();

  if (isReplAntBuild && !abortController.signal.aborted) {
    setAppState(prev => {
      if (prev.tungstenActiveSession === undefined) return prev;
      if (prev.tungstenPanelAutoHidden === true) return prev;
      return {
        ...prev,
        tungstenPanelAutoHidden: true,
      };
    });
  }

  let budgetInfo:
    | {
        tokens: number
        limit: number
        nudges: number
      }
    | undefined;

  if (feature('TOKEN_BUDGET')) {
    if (
      getCurrentTurnTokenBudget() !== null &&
      getCurrentTurnTokenBudget()! > 0 &&
      !abortController.signal.aborted
    ) {
      budgetInfo = {
        tokens: getTurnOutputTokens(),
        limit: getCurrentTurnTokenBudget()!,
        nudges: getBudgetContinuationCount(),
      };
    }
    snapshotOutputTokensForTurn(null);
  }

  const turnDurationMs =
    Date.now() - loadingStartTimeRef.current - totalPausedMsRef.current;
  if (
    (turnDurationMs > 30000 || budgetInfo !== undefined) &&
    !abortController.signal.aborted &&
    !proactiveActive
  ) {
    const hasRunningSwarmAgents = getAllInProcessTeammateTasks(tasks).some(
      task => task.status === 'running',
    );
    if (hasRunningSwarmAgents) {
      if (swarmStartTimeRef.current === null) {
        swarmStartTimeRef.current = loadingStartTimeRef.current;
      }
      if (budgetInfo) {
        swarmBudgetInfoRef.current = budgetInfo;
      }
    } else {
      setMessages(prev => [
        ...prev,
        createTurnDurationMessage(
          turnDurationMs,
          budgetInfo,
          count(prev, isLoggableMessage),
        ),
      ]);
    }
  }

  setAbortController(null);
}

export function maybeRestoreCanceledOuterReplQuery({
  abortController,
  queryIsActive,
  inputValue,
  viewingAgentTaskId,
  messagesRef,
  restoreMessageSync,
}: {
  abortController: AbortController
  queryIsActive: boolean
  inputValue: string
  viewingAgentTaskId: string | undefined
  messagesRef: React.RefObject<any[]>
  restoreMessageSync: (message: UserMessage) => void
}) {
  if (
    abortController.signal.reason !== 'user-cancel' ||
    queryIsActive ||
    inputValue !== '' ||
    getCommandQueueLength() !== 0 ||
    viewingAgentTaskId
  ) {
    return;
  }

  const messages = messagesRef.current;
  const lastUserMessage = messages.findLast(
    selectableUserMessagesFilter,
  ) as UserMessage | undefined;
  if (!lastUserMessage) return;

  const index = messages.lastIndexOf(lastUserMessage);
  if (!messagesAfterAreOnlySynthetic(messages, index)) return;

  removeLastFromHistory();
  restoreMessageSync(lastUserMessage);
}
