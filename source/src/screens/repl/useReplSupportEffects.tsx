import * as React from 'react';
import { useEffect, useRef } from 'react';
import { Text } from '../../ink.js';
import { getFeatureValue_CACHED_MAY_BE_STALE } from '../../services/analytics/growthbook.js';
import { logEvent, type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '../../services/analytics/index.js';
import { sendNotification } from '../../services/notifier.js';
import { activityManager } from '../../utils/activityManager.js';
import { startBackgroundHousekeeping } from '../../utils/backgroundHousekeeping.js';
import { getGlobalConfig, saveGlobalConfig } from '../../utils/config.js';
import { formatTokens } from '../../utils/format.js';
import type { FocusedInputDialog } from './dialogFocus.js';
import { updateLastInteractionTime, getLastInteractionTime, getTotalInputTokens } from '../../bootstrap/state.js';
import type { QueuedCommand } from '../../types/textInputTypes.js';
import { enqueue } from '../../utils/messageQueueManager.js';

type AddNotification = (notification: {
  key: string
  jsx: React.ReactNode
  priority: 'medium'
  timeoutMs: number
}) => void

type RemoveNotification = (key: string) => void

type UseReplSupportEffectsInput = {
  queuedCommands: QueuedCommand[]
  isQueryActive: boolean
  isShowingLocalJsxCommand: boolean
  parkedPrompts: QueuedCommand[]
  setParkedPrompts: (updater: (prev: QueuedCommand[]) => QueuedCommand[]) => void
  inputValue: string
  submitCount: number
  isLoading: boolean
  lastQueryCompletionTime: number
  toolJsxPresent: boolean
  focusedInputDialogRef: React.RefObject<FocusedInputDialog | undefined>
  terminal: unknown
  messagesRef: React.RefObject<readonly unknown[]>
  addNotification: AddNotification
  removeNotification: RemoveNotification
  idleHintShownRef: React.RefObject<string | false>
}

export function useReplSupportEffects({
  queuedCommands,
  isQueryActive,
  isShowingLocalJsxCommand,
  parkedPrompts,
  setParkedPrompts,
  inputValue,
  submitCount,
  isLoading,
  lastQueryCompletionTime,
  toolJsxPresent,
  focusedInputDialogRef,
  terminal,
  messagesRef,
  addNotification,
  removeNotification,
  idleHintShownRef,
}: UseReplSupportEffectsInput) {
  const hasCountedQueueUseRef = useRef(false);

  useEffect(() => {
    if (queuedCommands.length < 1) {
      hasCountedQueueUseRef.current = false;
      return;
    }
    if (hasCountedQueueUseRef.current) return;
    hasCountedQueueUseRef.current = true;
    saveGlobalConfig(current => ({
      ...current,
      promptQueueUseCount: (current.promptQueueUseCount ?? 0) + 1,
    }));
  }, [queuedCommands.length]);

  useEffect(() => {
    if (isQueryActive) return;
    if (isShowingLocalJsxCommand) return;
    if (queuedCommands.length > 0) return;
    if (parkedPrompts.length === 0) return;

    const [nextParked, ...remaining] = parkedPrompts;
    if (!nextParked) return;

    setParkedPrompts(() => remaining);
    enqueue({
      ...nextParked,
      priority: 'later',
    });
  }, [isQueryActive, isShowingLocalJsxCommand, parkedPrompts, queuedCommands.length, setParkedPrompts]);

  useEffect(() => {
    activityManager.recordUserActivity();
    updateLastInteractionTime(true);
  }, [inputValue, submitCount]);

  useEffect(() => {
    if (submitCount === 1) {
      startBackgroundHousekeeping();
    }
  }, [submitCount]);

  useEffect(() => {
    if (isLoading) return;
    if (submitCount === 0) return;
    if (lastQueryCompletionTime === 0) return;

    const thresholdMs = getGlobalConfig().messageIdleNotifThresholdMs;
    const timer = setTimeout((queryCompletionTime, loading, toolJsx, dialogRef, term) => {
      const lastUserInteraction = getLastInteractionTime();
      if (lastUserInteraction > queryCompletionTime) {
        return;
      }
      const idleTimeSinceResponse = Date.now() - queryCompletionTime;
      if (!loading && !toolJsx && dialogRef.current === undefined && idleTimeSinceResponse >= thresholdMs) {
        void sendNotification({
          message: 'CT is waiting for your input',
          notificationType: 'idle_prompt',
        }, term as never);
      }
    }, thresholdMs, lastQueryCompletionTime, isLoading, toolJsxPresent, focusedInputDialogRef, terminal);

    return () => clearTimeout(timer);
  }, [focusedInputDialogRef, isLoading, lastQueryCompletionTime, submitCount, terminal, toolJsxPresent]);

  useEffect(() => {
    if (lastQueryCompletionTime === 0) return;
    if (isLoading) return;

    const willowMode: string = getFeatureValue_CACHED_MAY_BE_STALE('tengu_willow_mode', 'off');
    if (willowMode !== 'hint' && willowMode !== 'hint_v2') return;
    if (getGlobalConfig().idleReturnDismissed) return;

    const tokenThreshold = Number(process.env.CLAUDE_CODE_IDLE_TOKEN_THRESHOLD ?? 100_000);
    const totalInputTokens = getTotalInputTokens();
    if (totalInputTokens < tokenThreshold) return;

    const idleThresholdMs = Number(process.env.CLAUDE_CODE_IDLE_THRESHOLD_MINUTES ?? 75) * 60_000;
    const elapsed = Date.now() - lastQueryCompletionTime;
    const remaining = idleThresholdMs - elapsed;

    const timer = setTimeout((queryCompletionTime, mode, hintRef) => {
      if (messagesRef.current.length === 0) return;
      const totalTokens = getTotalInputTokens();
      const formattedTokens = formatTokens(totalTokens);
      const idleMinutes = (Date.now() - queryCompletionTime) / 60_000;
      addNotification({
        key: 'idle-return-hint',
        jsx: mode === 'hint_v2' ? <>
              <Text dimColor>new task? </Text>
              <Text color="suggestion">/clear</Text>
              <Text dimColor> to save </Text>
              <Text color="suggestion">{formattedTokens} tokens</Text>
            </> : <Text color="warning">
              new task? /clear to save {formattedTokens} tokens
            </Text>,
        priority: 'medium',
        timeoutMs: 0x7fffffff,
      });
      hintRef.current = mode;
      logEvent('tengu_idle_return_action', {
        action: 'hint_shown' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        variant: mode as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        idleMinutes: Math.round(idleMinutes),
        messageCount: messagesRef.current.length,
        totalInputTokens: totalTokens,
      });
    }, Math.max(0, remaining), lastQueryCompletionTime, willowMode, idleHintShownRef);

    return () => {
      clearTimeout(timer);
      removeNotification('idle-return-hint');
      idleHintShownRef.current = false;
    };
  }, [addNotification, idleHintShownRef, isLoading, lastQueryCompletionTime, messagesRef, removeNotification]);
}
