import { getCtProjectRoot } from '../projectIdentity/paths.js'
import { readActiveWorkflowHandoffPacket } from '../projectIdentity/workflowState.js'
import {
  createLocalSSHSession,
  createSSHSession,
  SSHSessionError,
  type SSHSession,
} from '../../ssh/createSSHSession.js'
import type { AutoworkEntryPoint } from './runner.js'

const DEFAULT_REMOTE_ACTION_TIMEOUT_MS = 60_000

export type RemoteAutoworkInspectionAction = {
  kind: 'status' | 'doctor'
  entryPoint: AutoworkEntryPoint
}

export type RemoteAutoworkOffloadOptions = {
  host?: string
  cwd?: string
  local: boolean
  localVersion: string
  permissionMode?: string
  dangerouslySkipPermissions?: boolean
  action: RemoteAutoworkInspectionAction
  timeoutMs?: number
}

export type RemoteAutoworkOffloadResult = {
  mode: 'local' | 'remote'
  host: string | null
  remoteCwd: string
  output: string
}

type ProgressCallbacks = {
  onProgress?: (message: string) => void
}

function getInspectionFlag(
  action: RemoteAutoworkInspectionAction,
): '--autowork-status' | '--autowork-doctor' {
  switch (action.kind) {
    case 'status':
      return '--autowork-status'
    case 'doctor':
      return '--autowork-doctor'
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
  // Headless SSH children run the print/stream-json path, where local JSX
  // slash commands like /autowork are not available. Use the dedicated
  // hidden inspection flags instead of sending slash-command prompts.
  const extraCliArgs = [getInspectionFlag(options.action)]

  if (options.local) {
    return createLocalSSHSession({
      cwd: options.cwd,
      permissionMode: options.permissionMode,
      dangerouslySkipPermissions: options.dangerouslySkipPermissions,
      extraCliArgs,
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
      extraCliArgs,
      workflowHandoffJson,
      replaceWorkflowHandoff: !!workflowHandoffJson,
    },
    callbacks,
  )
}

function parseHeadlessInspectionOutput(stdout: string): string {
  const resultLine = stdout
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
        }
      } catch {
        return null
      }
    })
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
      resultLine.errors?.join('\n') || 'Remote autowork inspection failed.',
    )
  }

  if (typeof resultLine.result !== 'string' || resultLine.result.trim().length === 0) {
    throw new SSHSessionError(
      'Remote autowork inspection completed without a text result.',
    )
  }

  return resultLine.result.trim()
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
      stdoutChunks.push(String(chunk))
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
              `Remote autowork inspection exited with code ${code ?? 'unknown'}.`,
          )
        }

        finish(resolve, {
          mode: options.local ? 'local' : 'remote',
          host: options.local ? null : (options.host ?? null),
          remoteCwd: session.remoteCwd,
          output: parseHeadlessInspectionOutput(stdoutChunks.join('')),
        } satisfies RemoteAutoworkOffloadResult)
      } catch (error) {
        finish(reject, error)
      }
    })

    const timeout = setTimeout(() => {
      finish(
        reject,
        new SSHSessionError(
          `Remote autowork inspection timed out after ${timeoutMs}ms.`,
        ),
      )
    }, timeoutMs)
  })
}
