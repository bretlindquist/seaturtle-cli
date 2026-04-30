import { spawn } from 'node:child_process'
import { closeSync, openSync } from 'node:fs'
import { unlink } from 'node:fs/promises'
import { generateTaskId, type SetAppState, type Task, type TaskContext } from '../../Task.js'
import { TASK_ID_TAG, TASK_NOTIFICATION_TAG, TASK_TYPE_TAG, STATUS_TAG, SUMMARY_TAG, TOOL_USE_ID_TAG, OUTPUT_FILE_TAG } from '../../constants/xml.js'
import { enqueuePendingNotification } from '../../utils/messageQueueManager.js'
import { registerTask, updateTaskState } from '../../utils/task/framework.js'
import { initTaskOutput } from '../../utils/task/diskOutput.js'
import {
  deleteRemoteAutoworkMetadata,
  getRemoteAutoworkHandoffPath,
  getRemoteAutoworkStatusPath,
  listRemoteAutoworkMetadata,
  type RemoteAutoworkMetadata,
  writeRemoteAutoworkMetadata,
} from '../../utils/sessionStorage.js'
import {
  readRemoteAutoworkHandoffMirrorFile,
  readRemoteAutoworkStatusFile,
} from '../../services/autowork/offloadStatusFile.js'
import { isProcessRunning } from '../../utils/genericProcessUtils.js'
import { logForDebugging } from '../../utils/debug.js'
import { getTaskOutputPath } from '../../utils/task/diskOutput.js'
import { createTaskStateBase } from '../../Task.js'
import type { RemoteAutoworkTaskState } from './guards.js'
import {
  importWorkflowHandoffPacket,
  updateWorkExecutionPacket,
} from '../../services/projectIdentity/workflowState.js'
import { syncWorkflowRuntimeState } from '../../state/workflowRuntimeState.js'

const POLL_INTERVAL_MS = 1_000

export type RemoteAutoworkLaunchOptions = {
  entryPoint: 'autowork' | 'swim'
  action: 'run' | 'step' | 'verify' | 'status' | 'doctor'
  host?: string
  cwd?: string
  local: boolean
  timeBudget?: string
  permissionMode?: string
  dangerouslySkipPermissions?: boolean
  timeoutMs?: number
  toolUseId?: string
}

function localSpawnCommand(): { command: string; args: string[] } {
  const scriptPath = process.argv[1]
  if (!scriptPath) {
    throw new Error(
      'Cannot determine the current SeaTurtle CLI entrypoint for remote autowork backgrounding.',
    )
  }

  return {
    command: process.execPath,
    args: [scriptPath],
  }
}

function buildCliArgs(
  taskId: string,
  options: RemoteAutoworkLaunchOptions,
  statusFile: string,
  handoffFile: string,
): string[] {
  const args = [
    'ssh-autowork',
    '--entry-point',
    options.entryPoint,
    '--action',
    options.action,
    '--background-status-file',
    statusFile,
    '--workflow-handoff-output-file',
    handoffFile,
  ]

  if (options.local) {
    args.push('--local')
  } else if (options.host) {
    args.push('--host', options.host)
  }

  if (options.cwd) {
    args.push('--dir', options.cwd)
  }
  if (options.timeBudget) {
    args.push('--time-budget', options.timeBudget)
  }
  if (options.permissionMode) {
    args.push('--permission-mode', options.permissionMode)
  }
  if (options.dangerouslySkipPermissions) {
    args.push('--dangerously-skip-permissions')
  }
  if (options.timeoutMs) {
    args.push('--timeout-ms', String(options.timeoutMs))
  }

  return args
}

function getTaskSummary(state: RemoteAutoworkTaskState): string {
  const location = state.mode === 'local' ? 'local child' : (state.host ?? 'remote host')
  const budget = state.timeBudget ? ` ${state.timeBudget}` : ''
  return `${state.entryPoint} ${state.action}${budget} via ${location}`
}

function enqueueRemoteAutoworkNotification(
  task: Pick<
    RemoteAutoworkTaskState,
    'id' | 'toolUseId' | 'description' | 'status' | 'result' | 'outputFile'
  >,
  summary: string,
): void {
  const toolUseIdLine = task.toolUseId
    ? `\n<${TOOL_USE_ID_TAG}>${task.toolUseId}</${TOOL_USE_ID_TAG}>`
    : ''
  const message = `<${TASK_NOTIFICATION_TAG}>
<${TASK_ID_TAG}>${task.id}</${TASK_ID_TAG}>${toolUseIdLine}
<${TASK_TYPE_TAG}>remote_autowork</${TASK_TYPE_TAG}>
<${OUTPUT_FILE_TAG}>${task.outputFile}</${OUTPUT_FILE_TAG}>
<${STATUS_TAG}>${task.status}</${STATUS_TAG}>
<${SUMMARY_TAG}>${summary}</${SUMMARY_TAG}>
</${TASK_NOTIFICATION_TAG}>`
  enqueuePendingNotification({
    value: message,
    mode: 'task-notification',
    priority: 'later',
  })
}

function enqueueRemoteAutoworkMetadataNotification(
  meta: RemoteAutoworkMetadata,
  status: 'completed' | 'failed',
  summary: string,
): void {
  const message = `<${TASK_NOTIFICATION_TAG}>
<${TASK_ID_TAG}>${meta.taskId}</${TASK_ID_TAG}>
<${TASK_TYPE_TAG}>remote_autowork</${TASK_TYPE_TAG}>
<${OUTPUT_FILE_TAG}>${getTaskOutputPath(meta.taskId)}</${OUTPUT_FILE_TAG}>
<${STATUS_TAG}>${status}</${STATUS_TAG}>
<${SUMMARY_TAG}>${summary}</${SUMMARY_TAG}>
</${TASK_NOTIFICATION_TAG}>`
  enqueuePendingNotification({
    value: message,
    mode: 'task-notification',
    priority: 'later',
  })
}

async function removeMetadataAndSidecars(
  taskId: string,
  statusFile: string,
  handoffFile: string,
): Promise<void> {
  try {
    await deleteRemoteAutoworkMetadata(taskId)
  } catch (e) {
    logForDebugging(`deleteRemoteAutoworkMetadata failed: ${String(e)}`)
  }
  try {
    await unlink(statusFile)
  } catch {}
  try {
    await unlink(handoffFile)
  } catch {}
}

function syncCloudOffloadExecutionState(
  root: string,
  setAppState: SetAppState,
  options: {
    active: boolean
    statusText: string
  },
): void {
  updateWorkExecutionPacket(
    current => ({
      ...current,
      swarmBackend: options.active ? 'cloud' : 'none',
      swarmActive: options.active,
      swarmWorkerCount: options.active ? 1 : 0,
      lastActivityAt: Date.now(),
      statusText: options.statusText,
    }),
    root,
  )
  syncWorkflowRuntimeState(root, setAppState)
}

function getRemoteAutoworkHandoffFile(
  meta: Pick<RemoteAutoworkMetadata, 'taskId'> & {
    handoffFile?: string
  },
): string {
  return meta.handoffFile || getRemoteAutoworkHandoffPath(meta.taskId)
}

function importRunningWorkflowHandoff(
  meta: RemoteAutoworkMetadata,
  setAppState: SetAppState,
  lastImportedAt: number,
): number {
  const handoff = readRemoteAutoworkHandoffMirrorFile(
    getRemoteAutoworkHandoffFile(meta),
  )
  if (!handoff || handoff.exportedAt <= lastImportedAt) {
    return lastImportedAt
  }

  importWorkflowHandoffPacket(handoff, meta.localCwd)
  updateWorkExecutionPacket(
    current => ({
      ...current,
      swarmBackend: 'cloud',
      swarmActive: true,
      swarmWorkerCount: 1,
      statusText:
        handoff.packets.execution.statusText ??
        `Cloud offload running: ${meta.entryPoint} ${meta.action}`,
      lastActivityAt:
        handoff.packets.execution.lastActivityAt ?? current.lastActivityAt,
    }),
    meta.localCwd,
  )
  syncWorkflowRuntimeState(meta.localCwd, setAppState)
  return handoff.exportedAt
}

function applyTerminalStatus(
  taskId: string,
  statusFile: string,
  setAppState: SetAppState,
  meta?: RemoteAutoworkMetadata,
): boolean {
  const status = readRemoteAutoworkStatusFile(statusFile)
  if (!status) {
    return false
  }

  let completedTask: RemoteAutoworkTaskState | null = null
  updateTaskState<RemoteAutoworkTaskState>(taskId, setAppState, task => {
    if (task.status !== 'running' && task.status !== 'pending') {
      return task
    }

    const next: RemoteAutoworkTaskState = {
      ...task,
      status: status.success ? 'completed' : 'failed',
      remoteCwd: status.remoteCwd || task.remoteCwd,
      endTime: status.finishedAt,
      result: {
        code: status.exitCode,
        summary:
          status.success
            ? `Remote autowork ${getTaskSummary(task)} completed`
            : status.error || `Remote autowork ${getTaskSummary(task)} failed`,
      },
    }
    completedTask = next
    return next
  })

  if (!completedTask) {
    if (meta) {
      syncCloudOffloadExecutionState(meta.localCwd, setAppState, {
        active: false,
        statusText: status.success
          ? `Cloud offload finished: ${meta.entryPoint} ${meta.action}`
          : status.error || `Cloud offload failed: ${meta.entryPoint} ${meta.action}`,
      })
      enqueueRemoteAutoworkMetadataNotification(
        meta,
        status.success ? 'completed' : 'failed',
        status.success
          ? `Remote autowork ${meta.entryPoint} ${meta.action} finished while the session was away.`
          : status.error || `Remote autowork ${meta.entryPoint} ${meta.action} failed while the session was away.`,
      )
      void removeMetadataAndSidecars(
        meta.taskId,
        meta.statusFile,
        getRemoteAutoworkHandoffFile(meta),
      )
    }
    return true
  }

  enqueueRemoteAutoworkNotification(
    completedTask,
    completedTask.result?.summary ?? completedTask.description,
  )
  syncCloudOffloadExecutionState(completedTask.localCwd, setAppState, {
    active: false,
    statusText:
      completedTask.result?.summary ?? `Cloud offload finished: ${completedTask.description}`,
  })
  void removeMetadataAndSidecars(
    taskId,
    statusFile,
    completedTask.handoffFile,
  )
  return true
}

function startRemoteAutoworkPolling(
  meta: RemoteAutoworkMetadata,
  setAppState: SetAppState,
): void {
  let lastImportedAt = 0
  const timer = setInterval(() => {
    lastImportedAt = importRunningWorkflowHandoff(
      meta,
      setAppState,
      lastImportedAt,
    )

    if (applyTerminalStatus(meta.taskId, meta.statusFile, setAppState, meta)) {
      clearInterval(timer)
      return
    }

    if (isProcessRunning(meta.pid)) {
      return
    }

    updateTaskState<RemoteAutoworkTaskState>(meta.taskId, setAppState, task => {
      if (task.status !== 'running' && task.status !== 'pending') {
        return task
      }
      return {
        ...task,
        status: 'failed',
        endTime: Date.now(),
        result: {
          code: 1,
          summary: `Remote autowork ${getTaskSummary(task)} exited without a status file.`,
        },
      }
    })
    syncCloudOffloadExecutionState(meta.localCwd, setAppState, {
      active: false,
      statusText: `Cloud offload failed: ${meta.entryPoint} ${meta.action} exited without a status file.`,
    })
    clearInterval(timer)
    void removeMetadataAndSidecars(
      meta.taskId,
      meta.statusFile,
      getRemoteAutoworkHandoffFile(meta),
    )
  }, POLL_INTERVAL_MS)
  timer.unref()
}

function createTaskStateFromMetadata(
  meta: RemoteAutoworkMetadata,
  toolUseId?: string,
): RemoteAutoworkTaskState {
  const description = `${meta.entryPoint} ${meta.action} offload`
  return {
    ...createTaskStateBase(meta.taskId, 'remote_autowork', description, toolUseId),
    type: 'remote_autowork',
    status: 'running',
    mode: meta.mode,
    host: meta.host,
    localCwd: meta.localCwd,
    remoteCwd: meta.remoteCwd,
    entryPoint: meta.entryPoint,
    action: meta.action,
    timeBudget: meta.timeBudget,
    pid: meta.pid,
    statusFile: meta.statusFile,
    handoffFile: getRemoteAutoworkHandoffFile(meta),
  }
}

export const RemoteAutoworkTask: Task = {
  name: 'RemoteAutoworkTask',
  type: 'remote_autowork',
  async kill(taskId, setAppState) {
    let taskState: RemoteAutoworkTaskState | null = null
    updateTaskState<RemoteAutoworkTaskState>(taskId, setAppState, task => {
      taskState = task
      if (task.status !== 'running' && task.status !== 'pending') {
        return task
      }
      return {
        ...task,
        status: 'killed',
        endTime: Date.now(),
        result: {
          code: 130,
          summary: `Remote autowork ${getTaskSummary(task)} was stopped.`,
        },
      }
    })

    if (!taskState) {
      return
    }

    try {
      process.kill(-taskState.pid, 'SIGTERM')
    } catch {
    try {
      process.kill(taskState.pid, 'SIGTERM')
    } catch {}
  }

    syncCloudOffloadExecutionState(taskState.localCwd, setAppState, {
      active: false,
      statusText: taskState.result?.summary ?? `Cloud offload stopped: ${taskState.description}`,
    })
    void removeMetadataAndSidecars(
      taskId,
      taskState.statusFile,
      taskState.handoffFile,
    )
  },
}

export async function launchRemoteAutoworkTask(
  options: RemoteAutoworkLaunchOptions,
  context: TaskContext,
): Promise<{ taskId: string }> {
  const taskId = generateTaskId('remote_autowork')
  await initTaskOutput(taskId)
  const outputFile = getTaskOutputPath(taskId)
  const statusFile = getRemoteAutoworkStatusPath(taskId)
  const handoffFile = getRemoteAutoworkHandoffPath(taskId)
  const local = localSpawnCommand()
  const stdoutFd = openSync(outputFile, 'a')
  const stderrFd = openSync(outputFile, 'a')
  const args = buildCliArgs(taskId, options, statusFile, handoffFile)
  const child = spawn(local.command, [...local.args, ...args], {
    cwd: options.cwd ?? process.cwd(),
    env: process.env,
    detached: true,
    stdio: ['ignore', stdoutFd, stderrFd],
  })
  closeSync(stdoutFd)
  closeSync(stderrFd)
  child.unref()

  const meta: RemoteAutoworkMetadata = {
    taskId,
    pid: child.pid ?? -1,
    mode: options.local ? 'local' : 'remote',
    host: options.local ? null : (options.host ?? null),
    localCwd: options.cwd ?? process.cwd(),
    remoteCwd: options.cwd ?? process.cwd(),
    entryPoint: options.entryPoint,
    action: options.action,
    timeBudget: options.timeBudget,
    statusFile,
    handoffFile,
    spawnedAt: Date.now(),
  }

  await writeRemoteAutoworkMetadata(taskId, meta)
  registerTask(createTaskStateFromMetadata(meta, options.toolUseId), context.setAppState)
  syncCloudOffloadExecutionState(meta.localCwd, context.setAppState, {
    active: true,
    statusText: `Cloud offload running: ${meta.entryPoint} ${meta.action}`,
  })
  startRemoteAutoworkPolling(meta, context.setAppState)
  return { taskId }
}

export async function restoreRemoteAutoworkTasks(
  context: TaskContext,
): Promise<void> {
  const persisted = await listRemoteAutoworkMetadata()
  for (const meta of persisted) {
    if (applyTerminalStatus(meta.taskId, meta.statusFile, context.setAppState, meta)) {
      continue
    }
    if (!isProcessRunning(meta.pid)) {
      syncCloudOffloadExecutionState(meta.localCwd, context.setAppState, {
        active: false,
        statusText: `Cloud offload ended without a recoverable child: ${meta.entryPoint} ${meta.action}`,
      })
      void removeMetadataAndSidecars(
        meta.taskId,
        meta.statusFile,
        getRemoteAutoworkHandoffFile(meta),
      )
      continue
    }
    registerTask(createTaskStateFromMetadata(meta), context.setAppState)
    syncCloudOffloadExecutionState(meta.localCwd, context.setAppState, {
      active: true,
      statusText: `Cloud offload running: ${meta.entryPoint} ${meta.action}`,
    })
    startRemoteAutoworkPolling(meta, context.setAppState)
  }
}
