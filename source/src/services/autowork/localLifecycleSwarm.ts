import type { CanUseToolFn } from '../../hooks/useCanUseTool.js'
import type { ToolUseContext } from '../../Tool.js'
import { runAsyncAgentLifecycle } from '../../tools/AgentTool/agentToolUtils.js'
import {
  findCompatibleAgentDefinition,
  isBuiltInAgent,
  type AgentDefinition,
} from '../../tools/AgentTool/loadAgentsDir.js'
import { runAgent } from '../../tools/AgentTool/runAgent.js'
import {
  registerAsyncAgent,
  type LocalAgentTaskState,
} from '../../tasks/LocalAgentTask/LocalAgentTask.js'
import { syncWorkflowRuntimeState } from '../../state/workflowRuntimeState.js'
import { createUserMessage } from '../../utils/messages.js'
import { getAgentModel } from '../../utils/model/agent.js'
import { createAgentId } from '../../utils/uuid.js'
import { updateWorkExecutionPacket } from '../projectIdentity/workflowState.js'
import type { AutoworkBackendPolicy } from './backendPolicy.js'
import type { AutoworkEntryPoint } from './runner.js'
import type { AutoworkMode } from './state.js'

type LocalLifecycleAutoworkMode = Extract<
  AutoworkMode,
  'discovery' | 'research' | 'plan-hardening' | 'audit-and-polish'
>

type LocalLifecycleSwarmLaunchOptions = {
  entryPoint: AutoworkEntryPoint
  repoRoot: string
  mode: LocalLifecycleAutoworkMode
  prompt: string
  toolUseContext: ToolUseContext
  canUseTool: CanUseToolFn
}

type LocalLifecycleSwarmLaunchResult =
  | {
      ok: true
      task: LocalAgentTaskState
      agent: AgentDefinition
    }
  | {
      ok: false
      message: string
    }

function syncLocalLifecycleSwarmActivity(
  repoRoot: string,
  setAppState: ToolUseContext['setAppState'],
  options: {
    active: boolean
  },
): void {
  updateWorkExecutionPacket(
    current => ({
      ...current,
      swarmBackend: options.active ? 'local' : 'none',
      swarmActive: options.active,
      swarmWorkerCount: options.active ? 1 : 0,
      lastActivityAt: Date.now(),
    }),
    repoRoot,
  )
  syncWorkflowRuntimeState(repoRoot, setAppState)
}

function resolveLifecycleSwarmAgent(
  toolUseContext: ToolUseContext,
): AgentDefinition | null {
  return (
    findCompatibleAgentDefinition(
      'general-purpose',
      toolUseContext.options.agentDefinitions.activeAgents,
    ) ?? null
  )
}

export function canLaunchLocalLifecycleSwarm(
  mode: AutoworkMode,
  backendPolicy: AutoworkBackendPolicy,
  toolUseContext: ToolUseContext,
  canUseTool: CanUseToolFn | undefined,
): mode is LocalLifecycleAutoworkMode {
  if (toolUseContext.options.isNonInteractiveSession) {
    return false
  }

  if (!canUseTool) {
    return false
  }

  if (
    mode !== 'discovery' &&
    mode !== 'research' &&
    mode !== 'plan-hardening' &&
    mode !== 'audit-and-polish'
  ) {
    return false
  }

  return (
    backendPolicy.target === 'local-swarm' &&
    backendPolicy.localExecutorMode === 'in-process'
  )
}

export function launchLocalLifecycleSwarm(
  options: LocalLifecycleSwarmLaunchOptions,
): LocalLifecycleSwarmLaunchResult {
  const {
    entryPoint,
    repoRoot,
    mode,
    prompt,
    toolUseContext,
    canUseTool,
  } = options

  const selectedAgent = resolveLifecycleSwarmAgent(toolUseContext)
  if (!selectedAgent) {
    return {
      ok: false,
      message:
        'SeaTurtle could not resolve the general-purpose agent needed for local lifecycle swarm supervision.',
    }
  }

  const rootSetAppState =
    toolUseContext.setAppStateForTasks ?? toolUseContext.setAppState
  const agentId = createAgentId(`autowork-${mode}`)
  const description = `${entryPoint} ${mode} local swarm`
  const task = registerAsyncAgent({
    agentId,
    description,
    prompt,
    selectedAgent,
    setAppState: rootSetAppState,
    toolUseId: toolUseContext.toolUseId,
  })

  syncLocalLifecycleSwarmActivity(repoRoot, rootSetAppState, {
    active: true,
  })

  const metadata = {
    prompt,
    resolvedAgentModel: getAgentModel(
      selectedAgent.model,
      toolUseContext.options.mainLoopModel,
      undefined,
      toolUseContext.getAppState().toolPermissionContext.mode,
    ),
    isBuiltInAgent: isBuiltInAgent(selectedAgent),
    startTime: Date.now(),
    agentType: selectedAgent.agentType,
    isAsync: true,
  }

  void runAsyncAgentLifecycle({
    taskId: task.agentId,
    abortController: task.abortController!,
    makeStream: onCacheSafeParams =>
      runAgent({
        agentDefinition: selectedAgent,
        promptMessages: [createUserMessage({ content: prompt })],
        toolUseContext,
        canUseTool,
        isAsync: true,
        querySource: 'agent:custom',
        availableTools: toolUseContext.options.tools,
        description,
        transcriptSubdir: `autowork/${entryPoint}`,
        onCacheSafeParams,
        override: {
          agentId: task.agentId,
          abortController: task.abortController!,
        },
      }),
    metadata,
    description,
    toolUseContext,
    rootSetAppState,
    agentIdForCleanup: task.agentId,
    enableSummarization: true,
    getWorktreeResult: async () => ({}),
  }).finally(() => {
    syncLocalLifecycleSwarmActivity(repoRoot, rootSetAppState, {
      active: false,
    })
  })

  return {
    ok: true,
    task,
    agent: selectedAgent,
  }
}
