import { feature } from 'bun:bundle';
import { isPromptLikeInputMode } from '../../components/PromptInput/inputModes.js';
import { incrementPromptCount } from '../../utils/commitAttribution.js';
import { logForDebugging } from '../../utils/debug.js';
import { recordAttributionSnapshot } from '../../utils/sessionStorage.js';

export function prepareReplSubmitState({
  input,
  speculationAccept,
  isLoading,
  isRemoteMode,
  stashedPrompt,
  options,
  setInputValue,
  helpers,
  setPastedContents,
  setStashedPrompt,
  setInputMode,
  setIDESelection,
  setSubmitCount,
  tipPickedThisTurnRef,
  inputMode,
  setUserInputOnProcessing,
  resetTimingRefs,
  setAppState,
}: {
  input: string;
  speculationAccept?: unknown;
  isLoading: boolean;
  isRemoteMode: boolean;
  stashedPrompt: any;
  options?: { fromKeybinding?: boolean };
  setInputValue: (value: string) => void;
  helpers: {
    setCursorOffset: (value: number) => void;
    clearBuffer: () => void;
  };
  setPastedContents: (value: any) => void;
  setStashedPrompt: (value: any) => void;
  setInputMode: (value: any) => void;
  setIDESelection: (value: any) => void;
  setSubmitCount: (updater: (prev: number) => number) => void;
  tipPickedThisTurnRef: { current: boolean };
  inputMode: string;
  setUserInputOnProcessing: (value: string | undefined) => void;
  resetTimingRefs: () => void;
  setAppState: (updater: any) => void;
}) {
  const isSlashCommand = !speculationAccept && input.trim().startsWith('/');
  const submitsNow = !isLoading || Boolean(speculationAccept) || isRemoteMode;

  if (stashedPrompt !== undefined && !isSlashCommand && submitsNow) {
    setInputValue(stashedPrompt.text);
    helpers.setCursorOffset(stashedPrompt.cursorOffset);
    setPastedContents(stashedPrompt.pastedContents);
    setStashedPrompt(undefined);
  } else if (submitsNow) {
    if (!options?.fromKeybinding) {
      setInputValue('');
      helpers.setCursorOffset(0);
    }
    setPastedContents({});
  }

  if (submitsNow) {
    setInputMode('prompt');
    setIDESelection(undefined);
    setSubmitCount(prev => prev + 1);
    helpers.clearBuffer();
    tipPickedThisTurnRef.current = false;

    if (!isSlashCommand && isPromptLikeInputMode(inputMode) && !speculationAccept && !isRemoteMode) {
      setUserInputOnProcessing(input);
      resetTimingRefs();
    }

    if (feature('COMMIT_ATTRIBUTION')) {
      setAppState((prev: any) => ({
        ...prev,
        attribution: incrementPromptCount(prev.attribution, snapshot => {
          void recordAttributionSnapshot(snapshot).catch(error => {
            logForDebugging(`Attribution: Failed to save snapshot: ${error}`);
          });
        }),
      }));
    }
  }

  return {
    isSlashCommand,
    submitsNow,
  };
}

export function restoreDeferredReplStashedPrompt({
  shouldRestore,
  stashedPrompt,
  setInputValue,
  helpers,
  setPastedContents,
  setStashedPrompt,
}: {
  shouldRestore: boolean;
  stashedPrompt: any;
  setInputValue: (value: string) => void;
  helpers: {
    setCursorOffset: (value: number) => void;
  };
  setPastedContents: (value: any) => void;
  setStashedPrompt: (value: any) => void;
}) {
  if (!shouldRestore || stashedPrompt === undefined) {
    return;
  }

  setInputValue(stashedPrompt.text);
  helpers.setCursorOffset(stashedPrompt.cursorOffset);
  setPastedContents(stashedPrompt.pastedContents);
  setStashedPrompt(undefined);
}
