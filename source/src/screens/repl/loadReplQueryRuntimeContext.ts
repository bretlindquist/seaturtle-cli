import { feature } from 'bun:bundle';
import type { MCPServerConnection } from '../../services/mcp/types.js';
import type {
  ToolPermissionContext,
  ToolUseContext,
} from '../../Tool.js';
import type { EffortValue } from '../../utils/effort.js';

type UserContext = Record<string, unknown>;
type SystemContext = Record<string, unknown>;

export async function loadReplQueryRuntimeContext({
  toolUseContext,
  effort,
  toolPermissionContext,
  setAppState,
  mainLoopModel,
  fastMode,
  getSystemPrompt,
  getUserContext,
  getSystemContext,
  getCoordinatorUserContext,
  isScratchpadEnabled,
  getScratchpadDir,
  terminalFocused,
  proactiveActive,
}: {
  toolUseContext: ToolUseContext
  effort: EffortValue | undefined
  toolPermissionContext: ToolPermissionContext
  setAppState: (updater: (prev: any) => any) => void
  mainLoopModel: string
  fastMode: boolean
  getSystemPrompt: (
    tools: ToolUseContext['options']['tools'],
    mainLoopModel: string,
    additionalWorkingDirectories: string[],
    mcpClients: MCPServerConnection[],
  ) => Promise<unknown>
  getUserContext: () => Promise<UserContext>
  getSystemContext: () => Promise<SystemContext>
  getCoordinatorUserContext: (
    mcpClients: ReadonlyArray<MCPServerConnection>,
    scratchpadDir?: string,
  ) => UserContext
  isScratchpadEnabled: () => boolean
  getScratchpadDir: () => string
  terminalFocused: boolean
  proactiveActive: boolean
}) {
  const {
    tools: freshTools,
    mcpClients: freshMcpClients,
  } = toolUseContext.options;

  if (effort !== undefined) {
    const previousGetAppState = toolUseContext.getAppState;
    toolUseContext.getAppState = () => ({
      ...previousGetAppState(),
      effortValue: effort,
    });
  }

  const [, , defaultSystemPrompt, baseUserContext, systemContext] =
    await Promise.all([
      checkAndDisableBypassPermissionsIfNeeded(toolPermissionContext, setAppState),
      feature('TRANSCRIPT_CLASSIFIER')
        ? checkAndDisableAutoModeIfNeeded(
            toolPermissionContext,
            setAppState,
            fastMode,
          )
        : undefined,
      getSystemPrompt(
        freshTools,
        mainLoopModel,
        Array.from(toolPermissionContext.additionalWorkingDirectories.keys()),
        freshMcpClients,
      ),
      getUserContext(),
      getSystemContext(),
    ]);

  const userContext = {
    ...baseUserContext,
    ...getCoordinatorUserContext(
      freshMcpClients,
      isScratchpadEnabled() ? getScratchpadDir() : undefined,
    ),
    ...((feature('PROACTIVE') || feature('KAIROS')) &&
    proactiveActive &&
    !terminalFocused
      ? {
          terminalFocus:
            'The terminal is unfocused — the user is not actively watching.',
        }
      : {}),
  };

  return {
    defaultSystemPrompt,
    userContext,
    systemContext,
  };
}

import {
  checkAndDisableAutoModeIfNeeded,
  checkAndDisableBypassPermissionsIfNeeded,
} from '../../utils/permissions/bypassPermissionsKillswitch.js';
