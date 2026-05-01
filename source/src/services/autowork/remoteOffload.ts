import { getCtProjectRoot } from '../projectIdentity/paths.js'
import {
  importWorkflowHandoffPacket,
  readActiveWorkflowHandoffPacket,
  type WorkflowHandoffPacket,
} from '../projectIdentity/workflowState.js'
import {
  createLocalSSHSession,
  createSSHSession,
  SSHSessionError,
  type SSHSession,
} from '../../ssh/createSSHSession.js'
import type { AutoworkEntryPoint } from './runner.js'
import { writeRemoteAutoworkHandoffMirrorFile } from './offloadStatusFile.js'

const DEFAULT_REMOTE_ACTION_TIMEOUT_MS = 60_000
const AUTOWORK_OFFLOAD_CHILD_ENV = 'SEATURTLE_AUTOWORK_OFFLOAD_CHILD'
const AUTOWORK_CONTINUATION_ALLOWED_ENV =
  'SEATURTLE_AUTOWORK_CONTINUATION_ALLOWED'
const WORKFLOW_HANDOFF_STREAM_INTERVAL_ENV =
  'SEATURTLE_WORKFLOW_HANDOFF_STREAM_INTERVAL_MS'

export type RemoteAutoworkAction = {
  kind: 'run' | 'step' | 'verify' | 'status' | 'doctor'
  entryPoint: AutoworkEntryPoint
  timeBudget?: string
}

export type RemoteAutoworkOffloadOptions = {
  host?: string
  cwd?: string
  local: boolean
  localVersion: string
  permissionMode?: string
  dangerouslySkipPermissions?: boolean
  action: RemoteAutoworkAction
  timeoutMs?: number
}

export type RemoteAutoworkOffloadResult = {
  mode: 'local' | 'remote'
  host: string | null
  remoteCwd: string
  output: string
  workflowHandoff: WorkflowHandoffPacket | null
}

type ProgressCallbacks = {
  onProgress?: (message: string) => void
  onWorkflowHandoff?: (handoff: WorkflowHandoffPacket) => void
}

function buildAutoworkPrompt(action: RemoteAutoworkAction): string {
  const base = `/${action.entryPoint}`

  switch (action.kind) {
    case 'run':
      return action.timeBudget?.trim()
        ? `${base} run ${action.timeBudget.trim()}`
        : `${base} run`
    case 'step':
      return action.timeBudget?.trim()
        ? `${base} step ${action.timeBudget.trim()}`
        : `${base} step`
    case 'verify':
      return `${base} verify`
    case 'status':
    case 'doctor':
      return ''
  }
}

function createSession(
  options: RemoteAutoworkOffloadOptions,
  callbacks: ProgressCallbacks,
): Promise<SSHSession> | SSHSession {
  const workflowHandoff = readActiveWorkflowHandoffPacket(getCtProjectRoot())
  const workflowHandoffJson = workflowHandoff
    ? JSON.stringify(workflowHandoff, null, 2)
    : undefined
  const prompt = buildAutoworkPrompt(options.action)
  const actionCliArgs =
    options.action.kind === 'status'
      ? ['--autowork-status']
      : options.action.kind === 'doctor'
        ? ['--autowork-doctor']
        : []
  const allowContinuation =
    options.action.kind === 'run' ||
    options.action.kind === 'step' ||
    options.action.kind === 'verify'

  if (options.local) {
    return createLocalSSHSession({
      cwd: options.cwd,
      permissionMode: options.permissionMode,
      dangerouslySkipPermissions: options.dangerouslySkipPermissions,
      extraCliArgs: [
        '--emit-workflow-handoff-stream',
        ...actionCliArgs,
      ],
      extraEnv: {
        [AUTOWORK_OFFLOAD_CHILD_ENV]: '1',
        [AUTOWORK_CONTINUATION_ALLOWED_ENV]: allowContinuation ? '1' : '0',
        [WORKFLOW_HANDOFF_STREAM_INTERVAL_ENV]: '2000',
      },
      prompt,
      structuredInput: false,
      workflowHandoffJson,
      replaceWorkflowHandoff: !!workflowHandoffJson,
    })
  }

  if (!options.host) {
    throw new SSHSessionError(
      'Remote autowork offload requires a host unless --local is used.',
    )
  }

  return createSSHSession(
    {
      host: options.host,
      cwd: options.cwd,
      localVersion: options.localVersion,
      permissionMode: options.permissionMode,
      dangerouslySkipPermissions: options.dangerouslySkipPermissions,
      extraCliArgs: [
        '--emit-workflow-handoff-stream',
        ...actionCliArgs,
      ],
      extraEnv: {
        [AUTOWORK_OFFLOAD_CHILD_ENV]: '1',
        [AUTOWORK_CONTINUATION_ALLOWED_ENV]: allowContinuation ? '1' : '0',
        [WORKFLOW_HANDOFF_STREAM_INTERVAL_ENV]: '2000',
      },
      prompt,
      structuredInput: false,
      workflowHandoffJson,
      replaceWorkflowHandoff: !!workflowHandoffJson,
    },
    callbacks,
  )
}

function parseHeadlessOffloadOutput(stdout: string): {
  output: string
  workflowHandoff: WorkflowHandoffPacket | null
} {
  const lines = stdout
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      try {
        return JSON.parse(line) as {
          type?: string
          subtype?: string
          result?: string
          errors?: string[]
          message?: {
            content?: Array<{
              type?: string
              text?: string
            }>
          }
          workflow_handoff?: WorkflowHandoffPacket
        }
      } catch {
        return null
      }
    })
    .filter(value => value !== null)

  const resultLine = lines
    .find(
      value =>
        value?.type === 'result' &&
        (value.subtype === 'success' || value.subtype === 'error_during_execution'),
    )

  if (!resultLine) {
    throw new SSHSessionError('Remote autowork offload did not emit a result message.')
  }

  if (resultLine.subtype === 'error_during_execution') {
    throw new SSHSessionError(
      resultLine.errors?.join('\n') || 'Remote autowork offload failed.',
    )
  }

  const workflowHandoff =
    [...lines]
      .reverse()
      .find(
        value =>
          value?.type === 'system' &&
          value.subtype === 'workflow_handoff' &&
          value.workflow_handoff,
      )?.workflow_handoff ?? null

  if (typeof resultLine.result === 'string' && resultLine.result.trim().length > 0) {
    return {
      output: resultLine.result.trim(),
      workflowHandoff,
    }
  }

  const assistantText = [...lines]
    .reverse()
    .find(
      value =>
        value?.type === 'assistant' &&
        value.message?.content?.[0]?.type === 'text' &&
        typeof value.message.content[0].text === 'string' &&
        value.message.content[0].text.trim().length > 0,
    )?.message?.content?.[0]?.text

  if (assistantText?.trim()) {
    return {
      output: assistantText.trim(),
      workflowHandoff,
    }
  }

  throw new SSHSessionError(
    'Remote autowork offload completed without a text result.',
  )
}

export async function runRemoteAutoworkOffload(
  options: RemoteAutoworkOffloadOptions,
  callbacks: ProgressCallbacks = {},
): Promise<RemoteAutoworkOffloadResult> {
  const session = await createSession(options, callbacks)

  return await new Promise<RemoteAutoworkOffloadResult>((resolve, reject) => {
    const timeoutMs = options.timeoutMs ?? DEFAULT_REMOTE_ACTION_TIMEOUT_MS
    const stdoutChunks: string[] = []
    const stderrChunks: string[] = []
    let stdoutBuffer = ''
    let settled = false

    function finish(fn: (value?: unknown) => void, value?: unknown): void {
      if (settled) {
        return
      }
      settled = true
      clearTimeout(timeout)
      session.proxy.stop()
      fn(value)
    }

    session.proc.stdout.setEncoding('utf8')
    session.proc.stderr.setEncoding('utf8')

    session.proc.stdout.on('data', chunk => {
      const text = String(chunk)
      stdoutChunks.push(text)
      stdoutBuffer += text
      const lines = stdoutBuffer.split('\n')
      stdoutBuffer = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) {
          continue
        }
        try {
          const parsed = JSON.parse(trimmed) as {
            type?: string
            subtype?: string
            workflow_handoff?: WorkflowHandoffPacket
          }
          if (
            parsed.type === 'system' &&
            parsed.subtype === 'workflow_handoff' &&
            parsed.workflow_handoff
          ) {
            callbacks.onWorkflowHandoff?.(parsed.workflow_handoff)
          }
        } catch {
        }
      }
    })
    session.proc.stderr.on('data', chunk => {
      stderrChunks.push(String(chunk))
    })
    session.proc.on('error', error => {
      finish(reject, error)
    })
    session.proc.on('close', code => {
      try {
        if (code !== 0) {
          throw new SSHSessionError(
            stderrChunks.join('').trim() ||
              `Remote autowork offload exited with code ${code ?? 'unknown'}.`,
          )
        }

        const parsed = parseHeadlessOffloadOutput(stdoutChunks.join(''))
        const localRoot = getCtProjectRoot()
        if (parsed.workflowHandoff) {
          importWorkflowHandoffPacket(parsed.workflowHandoff, localRoot)
        }

        finish(resolve, {
          mode: options.local ? 'local' : 'remote',
          host: options.local ? null : (options.host ?? null),
          remoteCwd: session.remoteCwd,
          output: parsed.output,
          workflowHandoff: parsed.workflowHandoff,
        } satisfies RemoteAutoworkOffloadResult)
      } catch (error) {
        finish(reject, error)
      }
    })

    const timeout = setTimeout(() => {
      finish(
        reject,
        new SSHSessionError(
          `Remote autowork offload timed out after ${timeoutMs}ms.`,
        ),
      )
    }, timeoutMs)
  })
}

export function mirrorRemoteAutoworkWorkflowHandoff(
  outputFile: string,
  handoff: WorkflowHandoffPacket,
): void {
  writeRemoteAutoworkHandoffMirrorFile(outputFile, handoff)
}
