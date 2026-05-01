import { feature } from 'bun:bundle';
import type { MCPServerConnection } from '../../services/mcp/types.js';
import type {
  ToolPermissionContext,
  ToolUseContext,
} from '../../Tool.js';
import type { EffortValue } from '../../utils/effort.js';
import {
  projectSystemContextForAutoworkProfile,
  projectSystemPromptForAutoworkProfile,
  projectUserContextForAutoworkProfile,
  resolveAutoworkPromptProfile,
} from '../../services/autowork/promptProfile.js';
import type { WorkflowRuntimeSnapshot } from '../../services/projectIdentity/workflowRuntime.js';

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
  currentInput,
  workflowRuntime,
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
  currentInput: string
  workflowRuntime?: WorkflowRuntimeSnapshot | null
}) {
  const {
    tools: freshTools,
    mcpClients: freshMcpClients,
  } = toolUseContext.options;
  const autoworkPromptProfile = resolveAutoworkPromptProfile({
    currentInput,
    workflowRuntime,
  })

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

  const userContext = projectUserContextForAutoworkProfile(
    autoworkPromptProfile,
    {
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
    },
  );
  const projectedSystemContext = projectSystemContextForAutoworkProfile(
    autoworkPromptProfile,
    systemContext,
  );
  const projectedDefaultSystemPrompt = projectSystemPromptForAutoworkProfile(
    autoworkPromptProfile,
    defaultSystemPrompt as string[],
  );

  return {
    defaultSystemPrompt: projectedDefaultSystemPrompt,
    userContext,
    systemContext: projectedSystemContext,
  };
}

import {
  checkAndDisableAutoModeIfNeeded,
  checkAndDisableBypassPermissionsIfNeeded,
} from '../../utils/permissions/bypassPermissionsKillswitch.js';
