import { feature } from 'bun:bundle';
import { spawnSync } from 'child_process';
import { useCallback, useRef } from 'react';
import exit from '../../commands/exit/index.js';
import { ExitFlow } from '../../components/ExitFlow.js';
import { getCurrentWorktreeSession } from '../../utils/worktree.js';
import { isBgSession } from '../../utils/concurrentSessions.js';
import { getAutoRunCommand } from '../../utils/autoRunIssue.js';
import { logForDebugging } from '../../utils/debug.js';
import { getSurveyRequestFeedbackCommand } from './replAntRuntime.js';

export function useReplUiActions({
  autoRunIssueReason,
  setAutoRunIssueReason,
  onSubmit,
  setIsExiting,
  setExitFlow,
  setIsMessageSelectorVisible,
}: {
  autoRunIssueReason: any;
  setAutoRunIssueReason: (value: any) => void;
  onSubmit: (...args: any[]) => Promise<any>;
  setIsExiting: (value: boolean) => void;
  setExitFlow: (value: any) => void;
  setIsMessageSelectorVisible: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const handleAutoRunIssue = useCallback(() => {
    const command = autoRunIssueReason ? getAutoRunCommand(autoRunIssueReason) : '/issue';
    setAutoRunIssueReason(null);
    onSubmit(command, {
      setCursorOffset: () => {},
      clearBuffer: () => {},
      resetHistory: () => {},
    }).catch(err => {
      logForDebugging(`Auto-run ${command} failed: ${err instanceof Error ? err.message : String(err)}`);
    });
  }, [autoRunIssueReason, onSubmit, setAutoRunIssueReason]);

  const handleCancelAutoRunIssue = useCallback(() => {
    setAutoRunIssueReason(null);
  }, [setAutoRunIssueReason]);

  const handleSurveyRequestFeedback = useCallback(() => {
    onSubmit(getSurveyRequestFeedbackCommand(), {
      setCursorOffset: () => {},
      clearBuffer: () => {},
      resetHistory: () => {},
    }).catch(err => {
      logForDebugging(
        `Survey feedback request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    });
  }, [onSubmit]);

  const onSubmitRef = useRef(onSubmit);
  onSubmitRef.current = onSubmit;
  const handleOpenRateLimitOptions = useCallback(() => {
    void onSubmitRef.current('/rate-limit-options', {
      setCursorOffset: () => {},
      clearBuffer: () => {},
      resetHistory: () => {},
    });
  }, []);

  const handleExit = useCallback(async () => {
    setIsExiting(true);
    if (feature('BG_SESSIONS') && isBgSession()) {
      spawnSync('tmux', ['detach-client'], {
        stdio: 'ignore',
      });
      setIsExiting(false);
      return;
    }
    const showWorktree = getCurrentWorktreeSession() !== null;
    if (showWorktree) {
      setExitFlow(
        <ExitFlow
          showWorktree
          onDone={() => {}}
          onCancel={() => {
            setExitFlow(null);
            setIsExiting(false);
          }}
        />,
      );
      return;
    }
    const exitMod = await exit.load();
    const exitFlowResult = await exitMod.call(() => {});
    setExitFlow(exitFlowResult);
    if (exitFlowResult === null) {
      setIsExiting(false);
    }
  }, [setExitFlow, setIsExiting]);

  const handleShowMessageSelector = useCallback(() => {
    setIsMessageSelectorVisible(prev => !prev);
  }, [setIsMessageSelectorVisible]);

  return {
    handleAutoRunIssue,
    handleCancelAutoRunIssue,
    handleSurveyRequestFeedback,
    handleOpenRateLimitOptions,
    handleExit,
    handleShowMessageSelector,
  };
}
