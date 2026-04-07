import { PromptDialog } from '../../components/hooks/PromptDialog.js';
import { WorkerPendingPermission } from '../../components/permissions/WorkerPendingPermission.js';
import { SandboxPermissionRequest } from '../../components/permissions/SandboxPermissionRequest.js';
import type { PromptRequest } from '../../types/hooks.js';
import type { NetworkHostPattern } from '../../utils/sandbox/sandbox-adapter.js';
import type { FocusedInputDialog } from './dialogFocus.js';

type PromptQueueItem = {
  title: string
  toolInputSummary?: string
  request: PromptRequest
}

type PendingWorkerRequest = {
  toolName: string
  description?: string
} | null

type PendingSandboxRequest = {
  host: string
} | null

type WorkerSandboxRequest = {
  requestId: string
  host: string
}

type ReplPermissionOverlaysProps = {
  focusedInputDialog: FocusedInputDialog | undefined
  sandboxHostPattern: React.ComponentProps<typeof SandboxPermissionRequest>['hostPattern'] | undefined
  onSandboxPermissionResponse: React.ComponentProps<typeof SandboxPermissionRequest>['onUserResponse']
  promptItem: PromptQueueItem | undefined
  onPromptRespond: React.ComponentProps<typeof PromptDialog>['onRespond']
  onPromptAbort: React.ComponentProps<typeof PromptDialog>['onAbort']
  pendingWorkerRequest: PendingWorkerRequest
  pendingSandboxRequest: PendingSandboxRequest
  workerSandboxRequest: WorkerSandboxRequest | undefined
  onWorkerSandboxPermissionResponse: React.ComponentProps<typeof SandboxPermissionRequest>['onUserResponse']
}

export function ReplPermissionOverlays({
  focusedInputDialog,
  sandboxHostPattern,
  onSandboxPermissionResponse,
  promptItem,
  onPromptRespond,
  onPromptAbort,
  pendingWorkerRequest,
  pendingSandboxRequest,
  workerSandboxRequest,
  onWorkerSandboxPermissionResponse,
}: ReplPermissionOverlaysProps) {
  return <>
      {focusedInputDialog === 'sandbox-permission' && sandboxHostPattern && <SandboxPermissionRequest key={sandboxHostPattern.host} hostPattern={sandboxHostPattern} onUserResponse={onSandboxPermissionResponse} />}
      {focusedInputDialog === 'prompt' && promptItem && <PromptDialog key={promptItem.request.prompt} title={promptItem.title} toolInputSummary={promptItem.toolInputSummary} request={promptItem.request} onRespond={onPromptRespond} onAbort={onPromptAbort} />}
      {pendingWorkerRequest && <WorkerPendingPermission toolName={pendingWorkerRequest.toolName} description={pendingWorkerRequest.description} />}
      {pendingSandboxRequest && <WorkerPendingPermission toolName="Network Access" description={`Waiting for leader to approve network access to ${pendingSandboxRequest.host}`} />}
      {focusedInputDialog === 'worker-sandbox-permission' && workerSandboxRequest && <SandboxPermissionRequest key={workerSandboxRequest.requestId} hostPattern={{
      host: workerSandboxRequest.host,
      port: undefined
    } as NetworkHostPattern} onUserResponse={onWorkerSandboxPermissionResponse} />}
    </>;
}
