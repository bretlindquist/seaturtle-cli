import * as React from 'react';
import type { ReactNode, RefObject } from 'react';
import type { ScrollBoxHandle } from '../../ink/components/ScrollBox.js';
import { AlternateScreen } from '../../ink/components/AlternateScreen.js';
import { KeybindingSetup } from '../../keybindings/KeybindingProviderSetup.js';
import { FullscreenLayout } from '../../components/FullscreenLayout.js';
import { SandboxViolationExpandedView } from '../../components/SandboxViolationExpandedView.js';
import { isMouseTrackingEnabled } from '../../utils/fullscreen.js';
import { AnimatedTerminalTitle, TranscriptModeFooter } from './ReplShellHelpers.js';

type ReplTranscriptScreenProps = {
  titleIsAnimating: boolean
  terminalTitle: string
  titleDisabled: boolean
  showStatusInTerminalTab: boolean
  globalKeybindingsNode: ReactNode
  voiceNode: ReactNode
  commandKeybindingsNode: ReactNode
  scrollKeybindingsNode: ReactNode
  cancelRequestNode: ReactNode
  transcriptScrollRef?: RefObject<ScrollBoxHandle | null>
  transcriptMessagesElement: ReactNode
  transcriptToolJSX: ReactNode
  searchOpen: boolean
  transcriptSearchElement: ReactNode
  showAllInTranscript: boolean
  dumpMode: boolean
  editorStatus?: string
  searchBadge?: {
    current: number
    count: number
  }
}

export function ReplTranscriptScreen({
  titleIsAnimating,
  terminalTitle,
  titleDisabled,
  showStatusInTerminalTab,
  globalKeybindingsNode,
  voiceNode,
  commandKeybindingsNode,
  scrollKeybindingsNode,
  cancelRequestNode,
  transcriptScrollRef,
  transcriptMessagesElement,
  transcriptToolJSX,
  searchOpen,
  transcriptSearchElement,
  showAllInTranscript,
  dumpMode,
  editorStatus,
  searchBadge,
}: ReplTranscriptScreenProps): ReactNode {
  const transcriptReturn = <KeybindingSetup>
      <AnimatedTerminalTitle isAnimating={titleIsAnimating} title={terminalTitle} disabled={titleDisabled} noPrefix={showStatusInTerminalTab} />
      {globalKeybindingsNode}
      {voiceNode}
      {commandKeybindingsNode}
      {scrollKeybindingsNode}
      {cancelRequestNode}
      {transcriptScrollRef ? <FullscreenLayout forceFullscreen={true} scrollRef={transcriptScrollRef} scrollable={<>
              {transcriptMessagesElement}
              {transcriptToolJSX}
              <SandboxViolationExpandedView />
            </>} bottom={searchOpen ? transcriptSearchElement : <TranscriptModeFooter showAllInTranscript={showAllInTranscript} virtualScroll={true} status={editorStatus} searchBadge={searchBadge} />} /> : <>
          {transcriptMessagesElement}
          {transcriptToolJSX}
          <SandboxViolationExpandedView />
          {searchOpen ? transcriptSearchElement : <TranscriptModeFooter showAllInTranscript={showAllInTranscript} virtualScroll={false} suppressShowAll={dumpMode} status={editorStatus} searchBadge={searchBadge} />}
        </>}
    </KeybindingSetup>;

  if (transcriptScrollRef) {
    return <AlternateScreen mouseTracking={isMouseTrackingEnabled()}>
        {transcriptReturn}
      </AlternateScreen>;
  }

  return transcriptReturn;
}
