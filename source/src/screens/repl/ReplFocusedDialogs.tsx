import type * as React from 'react';
import { CostThresholdDialog } from '../../components/CostThresholdDialog.js';
import { IdleReturnDialog } from '../../components/IdleReturnDialog.js';
import { IdeOnboardingDialog } from '../../components/IdeOnboardingDialog.js';
import { EffortCallout } from '../../components/EffortCallout.js';
import { RemoteCallout } from '../../components/RemoteCallout.js';
import { ElicitationDialog } from '../../components/mcp/ElicitationDialog.js';
import { LspRecommendationMenu } from '../../components/LspRecommendation/LspRecommendationMenu.js';
import { PluginHintMenu } from '../../components/ClaudeCodeHint/PluginHintMenu.js';
import { DesktopUpsellStartup } from '../../components/DesktopUpsell/DesktopUpsellStartup.js';
import type { LspRecommendationState } from '../../hooks/useLspPluginRecommendation.js';
import type { PluginHintRecommendation } from '../../utils/plugins/hintRecommendation.js';
import type { IDEExtensionInstallationStatus } from '../../utils/ide.js';
import type { FocusedInputDialog } from './dialogFocus.js';

type IdleReturnAction = Parameters<NonNullable<React.ComponentProps<typeof IdleReturnDialog>['onDone']>>[0]
type EffortSelection = Parameters<NonNullable<React.ComponentProps<typeof EffortCallout>['onDone']>>[0]
type RemoteSelection = Parameters<NonNullable<React.ComponentProps<typeof RemoteCallout>['onDone']>>[0]

type ReplFocusedDialogsProps = {
  focusedInputDialog: FocusedInputDialog | undefined
  elicitationEvent: React.ComponentProps<typeof ElicitationDialog>['event'] | undefined
  onElicitationResponse: React.ComponentProps<typeof ElicitationDialog>['onResponse']
  onElicitationWaitingDismiss: React.ComponentProps<typeof ElicitationDialog>['onWaitingDismiss']
  onCostDone: () => void
  idleReturnPending: {
    idleMinutes: number
  } | null
  totalInputTokens: number
  onIdleReturnDone: (action: IdleReturnAction) => void | Promise<void>
  onIdeOnboardingDone: () => void
  ideInstallationStatus: IDEExtensionInstallationStatus | null
  mainLoopModel: React.ComponentProps<typeof EffortCallout>['model']
  onEffortCalloutDone: (selection: EffortSelection) => void
  onRemoteCalloutDone: (selection: RemoteSelection) => void
  exitFlow: React.ReactNode
  hintRecommendation: PluginHintRecommendation | null
  onHintResponse: React.ComponentProps<typeof PluginHintMenu>['onResponse']
  lspRecommendation: LspRecommendationState
  onLspResponse: React.ComponentProps<typeof LspRecommendationMenu>['onResponse']
  onDesktopUpsellDone: () => void
}

export function ReplFocusedDialogs({
  focusedInputDialog,
  elicitationEvent,
  onElicitationResponse,
  onElicitationWaitingDismiss,
  onCostDone,
  idleReturnPending,
  totalInputTokens,
  onIdleReturnDone,
  onIdeOnboardingDone,
  ideInstallationStatus,
  mainLoopModel,
  onEffortCalloutDone,
  onRemoteCalloutDone,
  exitFlow,
  hintRecommendation,
  onHintResponse,
  lspRecommendation,
  onLspResponse,
  onDesktopUpsellDone,
}: ReplFocusedDialogsProps) {
  return <>
      {focusedInputDialog === 'elicitation' && elicitationEvent && <ElicitationDialog key={elicitationEvent.serverName + ':' + String(elicitationEvent.requestId)} event={elicitationEvent} onResponse={onElicitationResponse} onWaitingDismiss={onElicitationWaitingDismiss} />}
      {focusedInputDialog === 'cost' && <CostThresholdDialog onDone={onCostDone} />}
      {focusedInputDialog === 'idle-return' && idleReturnPending && <IdleReturnDialog idleMinutes={idleReturnPending.idleMinutes} totalInputTokens={totalInputTokens} onDone={onIdleReturnDone} />}
      {focusedInputDialog === 'ide-onboarding' && <IdeOnboardingDialog onDone={onIdeOnboardingDone} installationStatus={ideInstallationStatus} />}
      {focusedInputDialog === 'effort-callout' && <EffortCallout model={mainLoopModel} onDone={onEffortCalloutDone} />}
      {focusedInputDialog === 'remote-callout' && <RemoteCallout onDone={onRemoteCalloutDone} />}
      {exitFlow}
      {focusedInputDialog === 'plugin-hint' && hintRecommendation && <PluginHintMenu pluginName={hintRecommendation.pluginName} pluginDescription={hintRecommendation.pluginDescription} marketplaceName={hintRecommendation.marketplaceName} sourceCommand={hintRecommendation.sourceCommand} onResponse={onHintResponse} />}
      {focusedInputDialog === 'lsp-recommendation' && lspRecommendation && <LspRecommendationMenu pluginName={lspRecommendation.pluginName} pluginDescription={lspRecommendation.pluginDescription} fileExtension={lspRecommendation.fileExtension} onResponse={onLspResponse} />}
      {focusedInputDialog === 'desktop-upsell' && <DesktopUpsellStartup onDone={onDesktopUpsellDone} />}
    </>;
}
