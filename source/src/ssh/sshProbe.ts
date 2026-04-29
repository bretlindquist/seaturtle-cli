import type { SDKMessage } from '../entrypoints/agentSdkTypes.js'
import type { RemoteMessageContent } from '../utils/teleport/api.js'
import {
  createLocalSSHSession,
  createSSHSession,
  type SSHSession,
  SSHSessionError,
} from './createSSHSession.js'

const DEFAULT_SSH_PROBE_TIMEOUT_MS = 45_000
const SSH_PROBE_TOKEN = 'SSH_PROBE_OK'
const SSH_PROBE_PROMPT = `Reply with exactly ${SSH_PROBE_TOKEN} and nothing else. Do not call tools.`

export type SSHProbeOptions = {
  host?: string
  cwd?: string
  local: boolean
  localVersion: string
  permissionMode?: string
  dangerouslySkipPermissions?: boolean
  extraCliArgs?: string[]
  timeoutMs?: number
}

export type SSHProbeResult = {
  mode: 'local' | 'remote'
  host: string | null
  remoteCwd: string
  connected: true
  probeToken: string
}

type ProgressCallbacks = {
  onProgress?: (message: string) => void
}

function createProbeContent(): RemoteMessageContent {
  return [
    {
      type: 'text',
      text: SSH_PROBE_PROMPT,
    },
  ]
}

function extractAssistantText(message: SDKMessage): string | null {
  if (message.type !== 'assistant') {
    return null
  }

  const content = message.message?.content
  if (!Array.isArray(content)) {
    return null
  }

  return content
    .filter(
      (
        block,
      ): block is {
        type: 'text'
        text: string
      } => block.type === 'text' && typeof block.text === 'string',
    )
    .map(block => block.text)
    .join('')
}

function createSession(
  options: SSHProbeOptions,
  callbacks: ProgressCallbacks,
): Promise<SSHSession> | SSHSession {
  if (options.local) {
    return createLocalSSHSession({
      cwd: options.cwd,
      permissionMode: options.permissionMode,
      dangerouslySkipPermissions: options.dangerouslySkipPermissions,
      extraCliArgs: options.extraCliArgs,
    })
  }

  if (!options.host) {
    throw new SSHSessionError(
      'ssh-check requires a host unless --local is used.',
    )
  }

  return createSSHSession(
    {
      host: options.host,
      cwd: options.cwd,
      localVersion: options.localVersion,
      permissionMode: options.permissionMode,
      dangerouslySkipPermissions: options.dangerouslySkipPermissions,
      extraCliArgs: options.extraCliArgs,
    },
    callbacks,
  )
}

export async function runSSHProbe(
  options: SSHProbeOptions,
  callbacks: ProgressCallbacks = {},
): Promise<SSHProbeResult> {
  const session = await createSession(options, callbacks)

  return await new Promise<SSHProbeResult>((resolve, reject) => {
    const timeoutMs = options.timeoutMs ?? DEFAULT_SSH_PROBE_TIMEOUT_MS
    let settled = false
    let connected = false

    function finish(
      fn: (value?: unknown) => void,
      value?: unknown,
    ): void {
      if (settled) {
        return
      }
      settled = true
      clearTimeout(timeout)
      manager.disconnect()
      session.proxy.stop()
      fn(value)
    }

    const manager = session.createManager({
      onMessage: message => {
        const assistantText = extractAssistantText(message)
        if (!assistantText) {
          return
        }

        if (assistantText.trim() === SSH_PROBE_TOKEN) {
          finish(resolve, {
            mode: options.local ? 'local' : 'remote',
            host: options.local ? null : (options.host ?? null),
            remoteCwd: session.remoteCwd,
            connected: true,
            probeToken: SSH_PROBE_TOKEN,
          } satisfies SSHProbeResult)
        }
      },
      onPermissionRequest: (request, requestId) => {
        manager.respondToPermissionRequest(requestId, {
          behavior: 'deny',
          message:
            'ssh-check denied an unexpected permission request. The probe must complete without tool execution.',
        })
        finish(
          reject,
          new SSHSessionError(
            `ssh-check hit an unexpected permission request for ${request.tool_name}.`,
          ),
        )
      },
      onConnected: async () => {
        connected = true
        const ok = await manager.sendMessage(createProbeContent())
        if (!ok) {
          finish(
            reject,
            new SSHSessionError('ssh-check failed to send the probe message.'),
          )
        }
      },
      onDisconnected: () => {
        if (!settled) {
          finish(
            reject,
            new SSHSessionError(
              connected
                ? 'ssh-check disconnected before the probe completed.'
                : 'ssh-check disconnected before the session connected.',
            ),
          )
        }
      },
      onError: error => {
        finish(reject, error)
      },
    })

    const timeout = setTimeout(() => {
      finish(
        reject,
        new SSHSessionError(
          `ssh-check timed out after ${timeoutMs}ms waiting for ${SSH_PROBE_TOKEN}.`,
        ),
      )
    }, timeoutMs)

    manager.connect()
  })
}
