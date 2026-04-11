import { getGlobalConfig } from '../../utils/config.js';
import { getFeatureValue_CACHED_MAY_BE_STALE } from 'src/services/analytics/growthbook.js';
import { getTotalInputTokens } from '../../bootstrap/state.js';

export function maybeOpenIdleReturnDialog({
  input,
  speculationAccept,
  skipIdleCheckRef,
  lastQueryCompletionTimeRef,
  setIdleReturnPending,
  setInputValue,
  helpers,
}: {
  input: string;
  speculationAccept?: unknown;
  skipIdleCheckRef: { current: boolean };
  lastQueryCompletionTimeRef: { current: number };
  setIdleReturnPending: (value: { input: string; idleMinutes: number }) => void;
  setInputValue: (value: string) => void;
  helpers: {
    setCursorOffset: (value: number) => void;
    clearBuffer: () => void;
  };
}): boolean {
  const willowMode = getFeatureValue_CACHED_MAY_BE_STALE('tengu_willow_mode', 'off');
  const idleThresholdMin = Number(process.env.CLAUDE_CODE_IDLE_THRESHOLD_MINUTES ?? 75);
  const tokenThreshold = Number(process.env.CLAUDE_CODE_IDLE_TOKEN_THRESHOLD ?? 100_000);

  if (willowMode === 'off' || getGlobalConfig().idleReturnDismissed || skipIdleCheckRef.current || speculationAccept || input.trim().startsWith('/') || lastQueryCompletionTimeRef.current <= 0 || getTotalInputTokens() < tokenThreshold) {
    return false;
  }

  const idleMs = Date.now() - lastQueryCompletionTimeRef.current;
  const idleMinutes = idleMs / 60_000;
  if (idleMinutes < idleThresholdMin || willowMode !== 'dialog') {
    return false;
  }

  setIdleReturnPending({
    input,
    idleMinutes,
  });
  setInputValue('');
  helpers.setCursorOffset(0);
  helpers.clearBuffer();
  return true;
}
