import * as React from 'react';
import type { Command } from '../../commands.js';
import type { Tool } from '../../Tool.js';
import type { Message as MessageType } from '../../types/message.js';
import type { ToolUseConfirm } from '../../components/permissions/PermissionRequest.js';
import type { StreamingToolUse } from '../../utils/messages.js';
import type { AgentDefinition } from '../../tools/AgentTool/loadAgentsDir.js';
import type { Screen } from '../REPL.js';
import { ReplScrollablePane } from './ReplScrollablePane.js';
import { TeammateViewHeader } from '../../components/TeammateViewHeader.js';
import { Messages } from '../../components/Messages.js';
import { AwsAuthStatusBox } from '../../components/AwsAuthStatusBox.js';
import { UserTextMessage } from 'src/components/messages/UserTextMessage.js';
import { PromptInputQueuedCommands } from '../../components/PromptInput/PromptInputQueuedCommands.js';
import { SpinnerWithVerb, BriefIdleStatus, type SpinnerMode } from '../../components/Spinner.js';

type ReplMainScrollableContentProps = {
  displayedMessages: MessageType[]
  tools: Tool[]
  commands: Command[]
  verbose: boolean
  toolJSX: React.ComponentProps<typeof Messages>['toolJSX']
  toolUseConfirmQueue: ToolUseConfirm[]
  inProgressToolUseIDs: Set<string>
  isMessageSelectorVisible: boolean
  conversationId: string | undefined
  screen: Screen
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
  scrollRef: React.RefObject<unknown>
  trackStickyPrompt: boolean | undefined
  cursor: number | null
  setCursor: (cursor: number | null) => void
  cursorNavRef: React.RefObject<unknown>
  showAwsAuthStatus: boolean
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
  hasActiveTools: boolean
  userInputOnProcessing: string | undefined
  hasRunningTeammates: boolean
  viewedAgentTask: unknown
  showQueuedCommands: boolean
}

export function ReplMainScrollableContent({
  displayedMessages,
  tools,
  commands,
  verbose,
  toolJSX,
  toolUseConfirmQueue,
  inProgressToolUseIDs,
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
  showAwsAuthStatus,
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
  hasActiveTools,
  userInputOnProcessing,
  hasRunningTeammates,
  viewedAgentTask,
  showQueuedCommands,
}: ReplMainScrollableContentProps) {
  return (
    <ReplScrollablePane
      teammateHeader={<TeammateViewHeader />}
      messagesNode={
        <Messages
          messages={displayedMessages}
          tools={tools}
          commands={commands}
          verbose={verbose}
          toolJSX={toolJSX}
          toolUseConfirmQueue={toolUseConfirmQueue}
          inProgressToolUseIDs={inProgressToolUseIDs}
          isMessageSelectorVisible={isMessageSelectorVisible}
          conversationId={conversationId}
          screen={screen}
          streamingToolUses={streamingToolUses}
          showAllInTranscript={showAllInTranscript}
          agentDefinitions={agentDefinitions}
          onOpenRateLimitOptions={onOpenRateLimitOptions}
          isLoading={isLoading}
          streamingText={streamingText}
          isBriefOnly={isBriefOnly}
          unseenDivider={unseenDivider}
          scrollRef={scrollRef}
          trackStickyPrompt={trackStickyPrompt}
          cursor={cursor}
          setCursor={setCursor}
          cursorNavRef={cursorNavRef}
        />
      }
      awsAuthStatus={showAwsAuthStatus ? <AwsAuthStatusBox /> : null}
      placeholderNode={
        !disabled && placeholderText && !centeredModal ? (
          <UserTextMessage
            param={{ text: placeholderText, type: 'text' }}
            addMargin={true}
            verbose={verbose}
          />
        ) : null
      }
      deferredLocalJsx={deferredLocalJsx}
      antMonitor={antMonitor}
      browserPanel={browserPanel}
      spinnerNode={
        showSpinner ? (
          <SpinnerWithVerb
            mode={streamMode}
            spinnerTip={spinnerTip}
            responseLengthRef={responseLengthRef}
            apiMetricsRef={apiMetricsRef}
            overrideMessage={spinnerMessage}
            spinnerSuffix={stopHookSpinnerSuffix}
            verbose={verbose}
            loadingStartTimeRef={loadingStartTimeRef}
            totalPausedMsRef={totalPausedMsRef}
            pauseStartTimeRef={pauseStartTimeRef}
            overrideColor={spinnerColor}
            overrideShimmerColor={spinnerShimmerColor}
            hasActiveTools={hasActiveTools}
            leaderIsIdle={!isLoading}
          />
        ) : null
      }
      briefIdleStatus={
        !showSpinner &&
        !isLoading &&
        !userInputOnProcessing &&
        !hasRunningTeammates &&
        isBriefOnly &&
        !viewedAgentTask ? (
          <BriefIdleStatus />
        ) : null
      }
      queuedCommands={showQueuedCommands ? <PromptInputQueuedCommands /> : null}
    />
  );
}
