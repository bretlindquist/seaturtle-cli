import { createTaskStateBase, type TaskContext } from '../../Task.js'
import type { CanUseToolFn } from '../../hooks/useCanUseTool.js'
import type { ToolUseContext } from '../../Tool.js'
import { runAsyncAgentLifecycle } from '../../tools/AgentTool/agentToolUtils.js'
import {
  findCompatibleAgentDefinition,
  isBuiltInAgent,
  type AgentDefinition,
} from '../../tools/AgentTool/loadAgentsDir.js'
import {
  enqueueAgentNotification,
  registerAsyncAgent,
  type LocalAgentTaskState,
} from '../../tasks/LocalAgentTask/LocalAgentTask.js'
import { logForDebugging } from '../../utils/debug.js'
import { registerTask } from '../../utils/task/framework.js'
import { runAgent } from '../../tools/AgentTool/runAgent.js'
import { createUserMessage } from '../../utils/messages.js'
import { getAgentModel } from '../../utils/model/agent.js'
import {
  deleteLocalLifecycleSwarmMetadata,
  listLocalLifecycleSwarmMetadata,
  writeLocalLifecycleSwarmMetadata,
  type LocalLifecycleSwarmMetadata,
} from '../../utils/sessionStorage.js'
import { createAgentId } from '../../utils/uuid.js'
import type { AutoworkBackendPolicy } from './backendPolicy.js'
import { syncAutoworkExecutionAuthority } from './executionAuthority.js'
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
    statusText?: string | null
  },
): void {
  syncAutoworkExecutionAuthority(repoRoot, setAppState, {
    backend: 'local',
    active: options.active,
    workerCount: 1,
    statusText: options.statusText ?? null,
  })
}

function getLocalLifecycleSwarmEndedStatusText(
  metadata: Pick<LocalLifecycleSwarmMetadata, 'entryPoint' | 'mode'>,
): string {
  return `Local lifecycle swarm ended: ${metadata.entryPoint} ${metadata.mode}`
}

function getInterruptedLocalLifecycleSwarmMessage(
  metadata: Pick<LocalLifecycleSwarmMetadata, 'entryPoint' | 'mode'>,
): string {
  return `Local lifecycle swarm interrupted: ${metadata.entryPoint} ${metadata.mode} ended when the previous SeaTurtle session exited.`
}

function createInterruptedLocalLifecycleTask(
  metadata: LocalLifecycleSwarmMetadata,
): LocalAgentTaskState {
  return {
    ...createTaskStateBase(
      metadata.taskId,
      'local_agent',
      metadata.description,
      metadata.toolUseId,
    ),
    type: 'local_agent',
    status: 'failed',
    agentId: metadata.taskId,
    prompt: metadata.prompt,
    agentType: metadata.agentType,
    retrieved: false,
    lastReportedToolCount: 0,
    lastReportedTokenCount: 0,
    isBackgrounded: true,
    pendingMessages: [],
    retain: false,
    diskLoaded: false,
    startTime: metadata.startTime,
    endTime: Date.now(),
    error: getInterruptedLocalLifecycleSwarmMessage(metadata),
  }
}

async function cleanupLocalLifecycleSwarmMetadata(taskId: string): Promise<void> {
  try {
    await deleteLocalLifecycleSwarmMetadata(taskId)
  } catch (error) {
    logForDebugging(
      `Failed to delete local lifecycle swarm metadata for ${taskId}: ${String(error)}`,
    )
  }
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

export async function launchLocalLifecycleSwarm(
  options: LocalLifecycleSwarmLaunchOptions,
): Promise<LocalLifecycleSwarmLaunchResult> {
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
  const metadata: LocalLifecycleSwarmMetadata = {
    taskId: agentId,
    localCwd: repoRoot,
    entryPoint,
    mode,
    description,
    prompt,
    agentType: selectedAgent.agentType,
    toolUseId: toolUseContext.toolUseId,
    startTime: Date.now(),
  }

  try {
    await writeLocalLifecycleSwarmMetadata(agentId, metadata)
  } catch (error) {
    return {
      ok: false,
      message: `SeaTurtle could not persist local lifecycle swarm restore metadata: ${String(error)}`,
    }
  }

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
    statusText: `Local lifecycle swarm running: ${entryPoint} ${mode}`,
  })

  const runtimeMetadata = {
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
    metadata: runtimeMetadata,
    description,
    toolUseContext,
    rootSetAppState,
    agentIdForCleanup: task.agentId,
    enableSummarization: true,
    getWorktreeResult: async () => ({}),
  }).finally(() => {
    syncLocalLifecycleSwarmActivity(repoRoot, rootSetAppState, {
      active: false,
      statusText: getLocalLifecycleSwarmEndedStatusText({
        entryPoint,
        mode,
      }),
    })
    void cleanupLocalLifecycleSwarmMetadata(agentId)
  })

  return {
    ok: true,
    task,
    agent: selectedAgent,
  }
}

export async function restoreLocalLifecycleSwarmTasks(
  context: TaskContext,
): Promise<void> {
  const persisted = await listLocalLifecycleSwarmMetadata()

  for (const metadata of persisted) {
    registerTask(
      createInterruptedLocalLifecycleTask(metadata),
      context.setAppState,
    )
    enqueueAgentNotification({
      taskId: metadata.taskId,
      description: metadata.description,
      status: 'failed',
      error: getInterruptedLocalLifecycleSwarmMessage(metadata),
      setAppState: context.setAppState,
      toolUseId: metadata.toolUseId,
    })
    syncLocalLifecycleSwarmActivity(metadata.localCwd, context.setAppState, {
      active: false,
      statusText: getInterruptedLocalLifecycleSwarmMessage(metadata),
    })
    await cleanupLocalLifecycleSwarmMetadata(metadata.taskId)
  }
}
