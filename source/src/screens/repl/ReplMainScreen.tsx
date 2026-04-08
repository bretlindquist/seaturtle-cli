import * as React from 'react';
import type { ReactNode, RefObject } from 'react';
import type { ScrollBoxHandle } from '../../ink/components/ScrollBox.js';
import { AlternateScreen } from '../../ink/components/AlternateScreen.js';
import { KeybindingSetup } from '../../keybindings/KeybindingProviderSetup.js';
import { MCPConnectionManager } from '../../services/mcp/MCPConnectionManager.js';
import { FullscreenLayout } from '../../components/FullscreenLayout.js';
import { isFullscreenEnvEnabled, isMouseTrackingEnabled } from '../../utils/fullscreen.js';
import { AnimatedTerminalTitle } from './ReplShellHelpers.js';

type ReplMainScreenProps = {
  titleIsAnimating: boolean
  terminalTitle: string
  titleDisabled: boolean
  showStatusInTerminalTab: boolean
  globalKeybindingsNode: ReactNode
  voiceNode: ReactNode
  commandKeybindingsNode: ReactNode
  scrollKeybindingsNode: ReactNode
  messageActionsNode: ReactNode
  cancelRequestNode: ReactNode
  remountKey: React.Key
  dynamicMcpConfig: unknown
  strictMcpConfig: boolean
  scrollRef: RefObject<ScrollBoxHandle | null>
  overlayNode: ReactNode
  bottomFloatNode?: ReactNode
  modalNode: ReactNode
  modalScrollRef: RefObject<ScrollBoxHandle | null>
  dividerYRef: RefObject<number>
  hidePill: boolean
  hideSticky: boolean
  newMessageCount: number
  onPillClick: () => void
  scrollableNode: ReactNode
  bottomNode: ReactNode
}

export function ReplMainScreen({
  titleIsAnimating,
  terminalTitle,
  titleDisabled,
  showStatusInTerminalTab,
  globalKeybindingsNode,
  voiceNode,
  commandKeybindingsNode,
  scrollKeybindingsNode,
  messageActionsNode,
  cancelRequestNode,
  remountKey,
  dynamicMcpConfig,
  strictMcpConfig,
  scrollRef,
  overlayNode,
  bottomFloatNode,
  modalNode,
  modalScrollRef,
  dividerYRef,
  hidePill,
  hideSticky,
  newMessageCount,
  onPillClick,
  scrollableNode,
  bottomNode,
}: ReplMainScreenProps): ReactNode {
  const mainReturn = <KeybindingSetup>
      <AnimatedTerminalTitle isAnimating={titleIsAnimating} title={terminalTitle} disabled={titleDisabled} noPrefix={showStatusInTerminalTab} />
      {globalKeybindingsNode}
      {voiceNode}
      {commandKeybindingsNode}
      {scrollKeybindingsNode}
      {messageActionsNode}
      {cancelRequestNode}
      <MCPConnectionManager key={remountKey} dynamicMcpConfig={dynamicMcpConfig} isStrictMcpConfig={strictMcpConfig}>
        <FullscreenLayout scrollRef={scrollRef} overlay={overlayNode} bottomFloat={bottomFloatNode} modal={modalNode} modalScrollRef={modalScrollRef} dividerYRef={dividerYRef} hidePill={hidePill} hideSticky={hideSticky} newMessageCount={newMessageCount} onPillClick={onPillClick} scrollable={scrollableNode} bottom={bottomNode} />
      </MCPConnectionManager>
    </KeybindingSetup>;

  if (isFullscreenEnvEnabled()) {
    return <AlternateScreen mouseTracking={isMouseTrackingEnabled()}>
        {mainReturn}
      </AlternateScreen>;
  }

  return mainReturn;
}
