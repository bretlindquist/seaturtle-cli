import type * as React from 'react';
import type { Command } from '../../commands.js';
import type { Tool } from '../../Tool.js';
import type { AgentDefinition } from '../../tools/AgentTool/loadAgentsDir.js';
import type { Message as MessageType } from '../../types/message.js';
import type { StreamingToolUse } from '../../utils/messages.js';
import type { SpinnerMode } from '../../components/Spinner.js';
import type { ReplMainModeProps } from './ReplMainMode.js';
import type { ReplMainScreen } from './ReplMainScreen.js';
import type { ReplMainScrollableContent } from './ReplMainScrollableContent.js';

type BuildReplMainModePropsArgs = {
  mainScreenProps: ReplMainModeProps['mainScreenProps']
  displayedMessages: MessageType[]
  tools: Tool[]
  commands: Command[]
  verbose: boolean
  toolJSX: React.ComponentProps<typeof ReplMainScrollableContent>['toolJSX']
  toolUseConfirmQueue: ReplMainModeProps['scrollableContentProps']['toolUseConfirmQueue']
  inProgressToolUseIDs: Set<string>
  teammateInProgressToolUseIDs?: Set<string>
  isMessageSelectorVisible: boolean
  conversationId: string | undefined
  screen: React.ComponentProps<typeof ReplMainScrollableContent>['screen']
  streamingToolUses: StreamingToolUse[]
  showAllInTranscript: boolean
  agentDefinitions: {
    activeAgents: AgentDefinition[]
  }
  onOpenRateLimitOptions: () => void
  isLoading: boolean
  streamingText: string | null
  isBriefOnly: boolean
  unseenDivider: { count: number } | undefined
  scrollRef: React.ComponentProps<typeof ReplMainScreen>['scrollRef']
  trackStickyPrompt: boolean | undefined
  cursor: number | null
  setCursor: (cursor: number | null) => void
  cursorNavRef: React.RefObject<unknown>
  disabled: boolean
  placeholderText: string | undefined
  centeredModal: React.ReactNode
  deferredLocalJsx: React.ReactNode
  antMonitor: React.ReactNode
  browserPanel: React.ReactNode
  showSpinner: boolean
  streamMode: SpinnerMode
  spinnerTip: string | null | undefined
  responseLengthRef: React.RefObject<number>
  apiMetricsRef: React.RefObject<unknown[]>
  spinnerMessage: string | undefined
  stopHookSpinnerSuffix: string | undefined
  loadingStartTimeRef: React.RefObject<number | undefined>
  totalPausedMsRef: React.RefObject<number>
  pauseStartTimeRef: React.RefObject<number | null>
  spinnerColor: string | undefined
  spinnerShimmerColor: string | undefined
  userInputOnProcessing: string | undefined
  hasRunningTeammates: boolean
  viewedAgentTask: unknown
  showQueuedCommands: boolean
  companionNarrow: boolean
  companionVisible: boolean
  isFullscreenEnabled: boolean
  permissionStickyFooter: React.ReactNode
  immediateLocalJsx: React.ReactNode
  standaloneTodos: React.ReactNode
  bottomDialogSection: React.ReactNode
  moreRightNode: React.ReactNode
  promptChrome: React.ReactNode
  messageActionsBar: React.ReactNode
  messageSelector: React.ReactNode
  antChrome: React.ReactNode
}

export function buildReplMainModeProps({
  mainScreenProps,
  displayedMessages,
  tools,
  commands,
  verbose,
  toolJSX,
  toolUseConfirmQueue,
  inProgressToolUseIDs,
  teammateInProgressToolUseIDs,
  isMessageSelectorVisible,
  conversationId,
  screen,
  streamingToolUses,
  showAllInTranscript,
  agentDefinitions,
  onOpenRateLimitOptions,
  isLoading,
  streamingText,
  isBriefOnly,
  unseenDivider,
  scrollRef,
  trackStickyPrompt,
  cursor,
  setCursor,
  cursorNavRef,
  disabled,
  placeholderText,
  centeredModal,
  deferredLocalJsx,
  antMonitor,
  browserPanel,
  showSpinner,
  streamMode,
  spinnerTip,
  responseLengthRef,
  apiMetricsRef,
  spinnerMessage,
  stopHookSpinnerSuffix,
  loadingStartTimeRef,
  totalPausedMsRef,
  pauseStartTimeRef,
  spinnerColor,
  spinnerShimmerColor,
  userInputOnProcessing,
  hasRunningTeammates,
  viewedAgentTask,
  showQueuedCommands,
  companionNarrow,
  companionVisible,
  isFullscreenEnabled,
  permissionStickyFooter,
  immediateLocalJsx,
  standaloneTodos,
  bottomDialogSection,
  moreRightNode,
  promptChrome,
  messageActionsBar,
  messageSelector,
  antChrome,
}: BuildReplMainModePropsArgs): ReplMainModeProps {
  return {
    mainScreenProps,
    scrollableContentProps: {
      displayedMessages,
      tools,
      commands,
      verbose,
      toolJSX,
      toolUseConfirmQueue,
      inProgressToolUseIDs: teammateInProgressToolUseIDs ?? inProgressToolUseIDs,
      isMessageSelectorVisible,
      conversationId,
      screen,
      streamingToolUses,
      showAllInTranscript,
      agentDefinitions,
      onOpenRateLimitOptions,
      isLoading,
      streamingText,
      isBriefOnly,
      unseenDivider,
      scrollRef,
      trackStickyPrompt,
      cursor,
      setCursor,
      cursorNavRef,
      showAwsAuthStatus: true,
      disabled,
      placeholderText,
      centeredModal,
      deferredLocalJsx,
      antMonitor,
      browserPanel,
      showSpinner,
      streamMode,
      spinnerTip,
      responseLengthRef,
      apiMetricsRef,
      spinnerMessage,
      stopHookSpinnerSuffix,
      loadingStartTimeRef,
      totalPausedMsRef,
      pauseStartTimeRef,
      spinnerColor,
      spinnerShimmerColor,
      hasActiveTools: inProgressToolUseIDs.size > 0,
      userInputOnProcessing,
      hasRunningTeammates,
      viewedAgentTask,
      showQueuedCommands,
    },
    mainBottomRowProps: {
      companionNarrow,
      companionVisible,
      isFullscreenEnabled,
    },
    bottomPaneProps: {
      permissionStickyFooter,
      immediateLocalJsx,
      standaloneTodos,
      dialogSection: bottomDialogSection,
      moreRightNode,
      promptChrome,
      messageActionsBar,
      messageSelector,
      antChrome,
    },
  };
}
