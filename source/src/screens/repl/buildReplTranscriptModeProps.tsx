import type * as React from 'react';
import type { Command } from '../../commands.js';
import type { Tools } from '../../Tool.js';
import type { AgentDefinitionsResult } from '../../tools/AgentTool/loadAgentsDir.js';
import type { RenderableMessage } from '../../types/message.js';
import type { StreamingThinking, StreamingToolUse } from '../../utils/messages.js';
import type { MatchPosition } from '../../ink/render-to-screen.js';
import type { DOMElement } from '../../ink/dom.js';
import type { ScrollBoxHandle } from '../../ink/components/ScrollBox.js';
import type { TranscriptSearchBadge, TranscriptSearchProgressSink } from './useTranscriptSearchTracker.js';
import type { ReplTranscriptMode } from './ReplTranscriptMode.js';
import type { TranscriptJumpHandle } from './transcriptJumpHandle.js';

type BuildReplTranscriptModePropsArgs = {
  titleIsAnimating: boolean
  terminalTitle: string
  titleDisabled: boolean
  showStatusInTerminalTab: boolean
  globalKeybindingsNode: React.ReactNode
  voiceNode: React.ReactNode
  commandKeybindingsNode: React.ReactNode
  cancelRequestNode: React.ReactNode
  scrollRef: React.RefObject<ScrollBoxHandle | null>
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
  jumpRef: React.RefObject<TranscriptJumpHandle | null>
  searchProgress: TranscriptSearchProgressSink
  scanElement?: (el: DOMElement) => MatchPosition[]
  dumpMode: boolean
  toolJsxNode?: React.ReactNode
  searchOpen: boolean
  searchQuery: string
  onCloseSearchBar: (query: string) => void
  onCancelSearchBar: () => void
  editorStatus?: string
  searchBadge?: TranscriptSearchBadge
}

export function buildReplTranscriptModeProps(args: BuildReplTranscriptModePropsArgs): React.ComponentProps<typeof ReplTranscriptMode> {
  return args;
}
