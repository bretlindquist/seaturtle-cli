import * as React from 'react';
import type { ReactNode, RefObject } from 'react';
import { Box } from '../../ink.js';
import type { ScrollBoxHandle } from '../../ink/components/ScrollBox.js';
import { ScrollKeybindingHandler } from '../../components/ScrollKeybindingHandler.js';
import { Messages } from '../../components/Messages.js';
import type { Command } from '../../commands.js';
import type { Tools } from '../../Tool.js';
import type { AgentDefinitionsResult } from '../../tools/AgentTool/loadAgentsDir.js';
import type { RenderableMessage } from '../../types/message.js';
import type { StreamingThinking, StreamingToolUse } from '../../utils/messages.js';
import type { DOMElement } from '../../ink/dom.js';
import type { JumpHandle } from '../../components/VirtualMessageList.js';
import type { TranscriptSearchProgressSink, TranscriptSearchBadge } from './useTranscriptSearchTracker.js';
import { TranscriptSearchBar } from './ReplShellHelpers.js';
import { ReplTranscriptScreen } from './ReplTranscriptScreen.js';

type ReplTranscriptModeProps = {
  titleIsAnimating: boolean
  terminalTitle: string
  titleDisabled: boolean
  showStatusInTerminalTab: boolean
  globalKeybindingsNode: ReactNode
  voiceNode: ReactNode
  commandKeybindingsNode: ReactNode
  cancelRequestNode: ReactNode
  scrollRef: RefObject<ScrollBoxHandle | null>
  transcriptVirtualScrollActive: boolean
  focusedInputDialog?: string
  transcriptMessages: RenderableMessage[]
  tools: Tools
  commands: Command[]
  inProgressToolUseIDs: Set<string>
  conversationId: string
  agentDefinitions?: AgentDefinitionsResult['agentDefinitions']
  transcriptStreamingToolUses: StreamingToolUse[]
  showAllInTranscript: boolean
  onOpenRateLimitOptions: () => void
  isLoading: boolean
  streamingThinking: StreamingThinking | null
  jumpRef: RefObject<JumpHandle | null>
  searchProgress: TranscriptSearchProgressSink
  scanElement?: (el: DOMElement) => import('../../ink/render-to-screen.js').MatchPosition[]
  dumpMode: boolean
  toolJsxNode?: ReactNode
  searchOpen: boolean
  searchCount: number
  searchCurrent: number
  onCloseSearchBar: (query: string) => void
  onCancelSearchBar: () => void
  editorStatus?: string
  searchBadge?: TranscriptSearchBadge
}

export function ReplTranscriptMode({
  titleIsAnimating,
  terminalTitle,
  titleDisabled,
  showStatusInTerminalTab,
  globalKeybindingsNode,
  voiceNode,
  commandKeybindingsNode,
  cancelRequestNode,
  scrollRef,
  transcriptVirtualScrollActive,
  focusedInputDialog,
  transcriptMessages,
  tools,
  commands,
  inProgressToolUseIDs,
  conversationId,
  agentDefinitions,
  transcriptStreamingToolUses,
  showAllInTranscript,
  onOpenRateLimitOptions,
  isLoading,
  streamingThinking,
  jumpRef,
  searchProgress,
  scanElement,
  dumpMode,
  toolJsxNode,
  searchOpen,
  searchCount,
  searchCurrent,
  onCloseSearchBar,
  onCancelSearchBar,
  editorStatus,
  searchBadge,
}: ReplTranscriptModeProps): ReactNode {
  const transcriptScrollRef = transcriptVirtualScrollActive ? scrollRef : undefined;
  const transcriptMessagesElement = <Box flexDirection="column">
      <Messages messages={transcriptMessages} tools={tools} commands={commands} verbose={true} toolJSX={null} toolUseConfirmQueue={[]} inProgressToolUseIDs={inProgressToolUseIDs} isMessageSelectorVisible={false} conversationId={conversationId} screen="transcript" agentDefinitions={agentDefinitions} streamingToolUses={transcriptStreamingToolUses} showAllInTranscript={showAllInTranscript} onOpenRateLimitOptions={onOpenRateLimitOptions} isLoading={isLoading} hidePastThinking={true} streamingThinking={streamingThinking} scrollRef={transcriptScrollRef} jumpRef={jumpRef} searchProgress={searchProgress} scanElement={scanElement} disableRenderCap={dumpMode} />
    </Box>;
  const transcriptSearchElement = <TranscriptSearchBar jumpRef={jumpRef}
    initialQuery=""
    count={searchCount}
    current={searchCurrent}
    onClose={onCloseSearchBar}
    onCancel={onCancelSearchBar} />;

  return <ReplTranscriptScreen titleIsAnimating={titleIsAnimating} terminalTitle={terminalTitle} titleDisabled={titleDisabled} showStatusInTerminalTab={showStatusInTerminalTab} globalKeybindingsNode={globalKeybindingsNode} voiceNode={voiceNode} commandKeybindingsNode={commandKeybindingsNode} scrollKeybindingsNode={transcriptScrollRef ? <ScrollKeybindingHandler scrollRef={scrollRef} isActive={focusedInputDialog !== 'ultraplan-choice'} isModal={!searchOpen} onScroll={() => jumpRef.current?.disarmSearch()} /> : null} cancelRequestNode={cancelRequestNode} transcriptScrollRef={transcriptScrollRef} transcriptMessagesElement={transcriptMessagesElement} transcriptToolJSX={toolJsxNode ?? null} searchOpen={searchOpen} transcriptSearchElement={transcriptSearchElement} showAllInTranscript={showAllInTranscript} dumpMode={dumpMode} editorStatus={editorStatus} searchBadge={searchBadge} />;
}
