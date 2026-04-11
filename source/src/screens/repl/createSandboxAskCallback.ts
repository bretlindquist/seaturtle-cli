import { feature } from 'bun:bundle';
import { randomUUID } from 'crypto';
import { isSwarmWorker, generateSandboxRequestId, sendSandboxPermissionRequestViaMailbox } from '../../utils/swarm/permissionSync.js';
import { registerSandboxPermissionCallback } from '../../hooks/useSwarmPermissionPoller.js';
import { SANDBOX_NETWORK_ACCESS_TOOL_NAME } from '../../cli/structuredIO.js';

export function createSandboxAskCallback({
  setAppState,
  store,
  setSandboxPermissionRequestQueue,
  sandboxBridgeCleanupRef,
  isAgentSwarmsEnabled,
}: {
  setAppState: (updater: any) => void;
  store: any;
  setSandboxPermissionRequestQueue: (updater: any) => void;
  sandboxBridgeCleanupRef: { current: Map<string, Array<() => void>> };
  isAgentSwarmsEnabled: () => boolean;
}) {
  return async (hostPattern: any) => {
    if (isAgentSwarmsEnabled() && isSwarmWorker()) {
      const requestId = generateSandboxRequestId();
      const sent = await sendSandboxPermissionRequestViaMailbox(hostPattern.host, requestId);
      return new Promise(resolveShouldAllowHost => {
        if (!sent) {
          setSandboxPermissionRequestQueue((prev: any[]) => [
            ...prev,
            {
              hostPattern,
              resolvePromise: resolveShouldAllowHost,
            },
          ]);
          return;
        }

        registerSandboxPermissionCallback({
          requestId,
          host: hostPattern.host,
          resolve: resolveShouldAllowHost,
        });

        setAppState((prev: any) => ({
          ...prev,
          pendingSandboxRequest: {
            requestId,
            host: hostPattern.host,
          },
        }));
      });
    }

    return new Promise(resolveShouldAllowHost => {
      let resolved = false;
      function resolveOnce(allow: boolean): void {
        if (resolved) return;
        resolved = true;
        resolveShouldAllowHost(allow);
      }

      setSandboxPermissionRequestQueue((prev: any[]) => [
        ...prev,
        {
          hostPattern,
          resolvePromise: resolveOnce,
        },
      ]);

      if (feature('BRIDGE_MODE')) {
        const bridgeCallbacks = store.getState().replBridgePermissionCallbacks;
        if (bridgeCallbacks) {
          const bridgeRequestId = randomUUID();
          bridgeCallbacks.sendRequest(
            bridgeRequestId,
            SANDBOX_NETWORK_ACCESS_TOOL_NAME,
            { host: hostPattern.host },
            randomUUID(),
            `Allow network connection to ${hostPattern.host}?`,
          );
          const unsubscribe = bridgeCallbacks.onResponse(bridgeRequestId, (response: any) => {
            unsubscribe();
            const allow = response.behavior === 'allow';
            setSandboxPermissionRequestQueue((queue: any[]) => {
              queue
                .filter(item => item.hostPattern.host === hostPattern.host)
                .forEach(item => item.resolvePromise(allow));
              return queue.filter(item => item.hostPattern.host !== hostPattern.host);
            });

            const siblingCleanups = sandboxBridgeCleanupRef.current.get(hostPattern.host);
            if (siblingCleanups) {
              for (const fn of siblingCleanups) fn();
              sandboxBridgeCleanupRef.current.delete(hostPattern.host);
            }
          });

          const cleanup = () => {
            unsubscribe();
            bridgeCallbacks.cancelRequest(bridgeRequestId);
          };
          const existing = sandboxBridgeCleanupRef.current.get(hostPattern.host) ?? [];
          existing.push(cleanup);
          sandboxBridgeCleanupRef.current.set(hostPattern.host, existing);
        }
      }
    });
  };
}
