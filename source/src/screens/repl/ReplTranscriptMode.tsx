import * as React from 'react';
import type { ReactNode, RefObject } from 'react';
import { Box } from '../../ink.js';
import type { ScrollBoxHandle } from '../../ink/components/ScrollBox.js';
import type { DOMElement } from '../../ink/dom.js';
import { ScrollKeybindingHandler } from '../../components/ScrollKeybindingHandler.js';
import { Messages } from '../../components/Messages.js';
import type { Command } from '../../commands.js';
import type { Tools } from '../../Tool.js';
import type { AgentDefinitionsResult } from '../../tools/AgentTool/loadAgentsDir.js';
import type { RenderableMessage } from '../../types/message.js';
import type { StreamingThinking, StreamingToolUse } from '../../utils/messages.js';
import type { MatchPosition } from '../../ink/render-to-screen.js';
import type { TranscriptSearchProgressSink, TranscriptSearchBadge } from './useTranscriptSearchTracker.js';
import { TranscriptSearchBar } from './ReplShellHelpers.js';
import { ReplTranscriptScreen } from './ReplTranscriptScreen.js';
import type { TranscriptJumpHandle } from './transcriptJumpHandle.js';

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
  jumpRef: RefObject<TranscriptJumpHandle | null>
  searchProgress: TranscriptSearchProgressSink
  scanElement?: (el: DOMElement) => MatchPosition[]
  dumpMode: boolean
  toolJsxNode?: ReactNode
  searchOpen: boolean
  searchQuery: string
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
  searchQuery,
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
    initialQuery={searchQuery}
    searchBadge={searchBadge}
    onClose={onCloseSearchBar}
    onCancel={onCancelSearchBar} />;

  return <ReplTranscriptScreen titleIsAnimating={titleIsAnimating} terminalTitle={terminalTitle} titleDisabled={titleDisabled} showStatusInTerminalTab={showStatusInTerminalTab} globalKeybindingsNode={globalKeybindingsNode} voiceNode={voiceNode} commandKeybindingsNode={commandKeybindingsNode} scrollKeybindingsNode={transcriptScrollRef ? <ScrollKeybindingHandler scrollRef={scrollRef} isActive={focusedInputDialog !== 'ultraplan-choice'} isModal={!searchOpen} onScroll={() => jumpRef.current?.disarmSearch()} /> : null} cancelRequestNode={cancelRequestNode} transcriptScrollRef={transcriptScrollRef} transcriptMessagesElement={transcriptMessagesElement} transcriptToolJSX={toolJsxNode ?? null} searchOpen={searchOpen} transcriptSearchElement={transcriptSearchElement} showAllInTranscript={showAllInTranscript} dumpMode={dumpMode} editorStatus={editorStatus} searchBadge={searchBadge} />;
}
