import { addToHistory } from '../../history.js';
import { prependModeCharacterToInput } from '../../components/PromptInput/inputModes.js';
import { prependToShellHistoryCache } from '../../utils/suggestions/shellHistoryCompletion.js';
import { maybeRunImmediateLocalJsxCommand } from './maybeRunImmediateLocalJsxCommand.js';
import { maybeOpenIdleReturnDialog } from './maybeOpenIdleReturnDialog.js';
import { prepareReplSubmitState } from './prepareReplSubmitState.js';
import { handleReplSpeculationAcceptance } from './handleReplSpeculationAcceptance.js';
import { submitRemoteReplInput } from './submitRemoteReplInput.js';
import { submitLocalReplPrompt } from './submitLocalReplPrompt.js';

export async function runReplSubmit({
  input,
  helpers,
  speculationAccept,
  options,
  repinScroll,
  resumeProactive,
  immediateLocalJsxArgs,
  activeRemote,
  skipIdleReturnArgs,
  historyArgs,
  prepareArgs,
  speculationArgs,
  remoteSubmitArgs,
  localSubmitArgs,
}: {
  input: string
  helpers: any
  speculationAccept?: {
    state: unknown
    speculationSessionTimeSavedMs: number
    setAppState: unknown
  }
  options?: {
    fromKeybinding?: boolean
  }
  repinScroll: () => void
  resumeProactive: () => void
  immediateLocalJsxArgs: Omit<
    Parameters<typeof maybeRunImmediateLocalJsxCommand>[0],
    'input' | 'helpers' | 'speculationAccept' | 'options'
  >
  activeRemote: {
    isRemoteMode: boolean
  }
  skipIdleReturnArgs: Omit<
    Parameters<typeof maybeOpenIdleReturnDialog>[0],
    'input' | 'speculationAccept' | 'helpers'
  >
  historyArgs: {
    inputMode: string
    pastedContents: Record<string, any>
  }
  prepareArgs: Omit<
    Parameters<typeof prepareReplSubmitState>[0],
    'input' | 'speculationAccept' | 'options'
  >
  speculationArgs: Omit<
    Parameters<typeof handleReplSpeculationAcceptance>[0],
    'input' | 'speculationAccept'
  >
  remoteSubmitArgs: Omit<
    Parameters<typeof submitRemoteReplInput>[0],
    'input' | 'isSlashCommand'
  >
  localSubmitArgs: Omit<
    Parameters<typeof submitLocalReplPrompt>[0],
    'input' | 'helpers' | 'isSlashCommand' | 'isLoading' | 'stashedPrompt'
  > & {
    isLoading: boolean
    stashedPrompt: any
  }
}) {
  repinScroll();
  resumeProactive();

  if (
    await maybeRunImmediateLocalJsxCommand({
      ...immediateLocalJsxArgs,
      input,
      helpers,
      speculationAccept,
      options,
    })
  ) {
    return;
  }

  if (activeRemote.isRemoteMode && !input.trim()) {
    return;
  }

  if (
    maybeOpenIdleReturnDialog({
      ...skipIdleReturnArgs,
      input,
      speculationAccept,
      helpers,
    })
  ) {
    return;
  }

  if (!options?.fromKeybinding) {
    addToHistory({
      display: speculationAccept
        ? input
        : prependModeCharacterToInput(input, historyArgs.inputMode),
      mode: historyArgs.inputMode === 'prompt' ? undefined : historyArgs.inputMode,
      pastedContents: speculationAccept ? {} : historyArgs.pastedContents,
    });

    if (historyArgs.inputMode === 'bash') {
      prependToShellHistoryCache(input.trim());
    }
  }

  const { isSlashCommand } = prepareReplSubmitState({
    ...prepareArgs,
    input,
    speculationAccept,
    options,
  });

  if (
    await handleReplSpeculationAcceptance({
      ...speculationArgs,
      input,
      speculationAccept,
    })
  ) {
    return;
  }

  if (
    await submitRemoteReplInput({
      ...remoteSubmitArgs,
      input,
      isSlashCommand,
    })
  ) {
    return;
  }

  await submitLocalReplPrompt({
    ...localSubmitArgs,
    input,
    helpers,
    isSlashCommand,
    isLoading: localSubmitArgs.isLoading,
    stashedPrompt: localSubmitArgs.stashedPrompt,
  });
}
