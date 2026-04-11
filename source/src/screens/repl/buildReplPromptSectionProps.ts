import type * as React from 'react';
import type PromptInput from '../../components/PromptInput/PromptInput.js';
import type { SessionBackgroundHint } from '../../components/SessionBackgroundHint.js';

type PromptSectionProps = {
  promptInputProps: React.ComponentProps<typeof PromptInput>
  sessionBackgroundHintProps: React.ComponentProps<typeof SessionBackgroundHint>
};

type BuildReplPromptSectionPropsArgs = {
  debug: boolean
  ideSelection: unknown
  hasSuppressedDialogs: boolean
  isLocalJSXCommandActive: boolean
  getToolUseContext: unknown
  toolPermissionContext: unknown
  setToolPermissionContext: unknown
  apiKeyStatus: unknown
  commands: unknown
  activeAgents: unknown
  isLoading: boolean
  onExit: () => void
  verbose: boolean
  messages: unknown
  onAutoUpdaterResult: unknown
  autoUpdaterResult: unknown
  input: string
  onInputChange: (value: string) => void
  mode: unknown
  onModeChange: unknown
  stashedPrompt: unknown
  setStashedPrompt: unknown
  submitCount: number
  onShowMessageSelector: () => void
  onMessageActionsEnter: (() => void) | undefined
  mcpClients: unknown
  pastedContents: unknown
  setPastedContents: unknown
  vimMode: unknown
  setVimMode: unknown
  showBashesDialog: boolean
  setShowBashesDialog: unknown
  onSubmit: unknown
  onAgentSubmit: unknown
  isSearchingHistory: boolean
  setIsSearchingHistory: unknown
  helpOpen: boolean
  setHelpOpen: unknown
  insertTextRef: unknown
  voiceInterimRange: unknown
  onBackgroundSession: () => void
};

export function buildReplPromptSectionProps({
  debug,
  ideSelection,
  hasSuppressedDialogs,
  isLocalJSXCommandActive,
  getToolUseContext,
  toolPermissionContext,
  setToolPermissionContext,
  apiKeyStatus,
  commands,
  activeAgents,
  isLoading,
  onExit,
  verbose,
  messages,
  onAutoUpdaterResult,
  autoUpdaterResult,
  input,
  onInputChange,
  mode,
  onModeChange,
  stashedPrompt,
  setStashedPrompt,
  submitCount,
  onShowMessageSelector,
  onMessageActionsEnter,
  mcpClients,
  pastedContents,
  setPastedContents,
  vimMode,
  setVimMode,
  showBashesDialog,
  setShowBashesDialog,
  onSubmit,
  onAgentSubmit,
  isSearchingHistory,
  setIsSearchingHistory,
  helpOpen,
  setHelpOpen,
  insertTextRef,
  voiceInterimRange,
  onBackgroundSession,
}: BuildReplPromptSectionPropsArgs): PromptSectionProps {
  return {
    promptInputProps: {
      debug,
      ideSelection,
      hasSuppressedDialogs,
      isLocalJSXCommandActive,
      getToolUseContext,
      toolPermissionContext,
      setToolPermissionContext,
      apiKeyStatus,
      commands,
      agents: activeAgents,
      isLoading,
      onExit,
      verbose,
      messages,
      onAutoUpdaterResult,
      autoUpdaterResult,
      input,
      onInputChange,
      mode,
      onModeChange,
      stashedPrompt,
      setStashedPrompt,
      submitCount,
      onShowMessageSelector,
      onMessageActionsEnter,
      mcpClients,
      pastedContents,
      setPastedContents,
      vimMode,
      setVimMode,
      showBashesDialog,
      setShowBashesDialog,
      onSubmit,
      onAgentSubmit,
      isSearchingHistory,
      setIsSearchingHistory,
      helpOpen,
      setHelpOpen,
      insertTextRef,
      voiceInterimRange,
    },
    sessionBackgroundHintProps: {
      onBackgroundSession,
      isLoading,
    },
  };
}
