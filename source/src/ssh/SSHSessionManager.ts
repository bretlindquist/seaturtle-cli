import { randomUUID } from 'crypto'
import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import type { SDKMessage } from '../entrypoints/agentSdkTypes.js'
import type {
  SDKControlPermissionRequest,
  StdoutMessage,
} from '../entrypoints/sdk/controlTypes.js'
import type { RemotePermissionResponse } from '../remote/RemoteSessionManager.js'
import { logForDebugging } from '../utils/debug.js'
import { jsonParse, jsonStringify } from '../utils/slowOperations.js'
import type { RemoteMessageContent } from '../utils/teleport/api.js'

export type SSHSessionManagerCallbacks = {
  onMessage: (message: SDKMessage) => void
  onPermissionRequest: (
    request: SDKControlPermissionRequest,
    requestId: string,
  ) => void
  onConnected?: () => void
  onDisconnected?: () => void
  onReconnecting?: (attempt: number, max: number) => void
  onError?: (error: Error) => void
}

function isStdoutMessage(value: unknown): value is StdoutMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof value.type === 'string'
  )
}

function shouldForwardSdkMessage(message: StdoutMessage): message is SDKMessage {
  return (
    message.type !== 'control_request' &&
    message.type !== 'control_response' &&
    message.type !== 'control_cancel_request' &&
    message.type !== 'keep_alive' &&
    message.type !== 'streamlined_text' &&
    message.type !== 'streamlined_tool_use_summary' &&
    !(message.type === 'system' && message.subtype === 'post_turn_summary')
  )
}

export class SSHSessionManager {
  private buffer = ''
  private connected = false
  private disconnected = false

  constructor(
    private readonly proc: ChildProcessWithoutNullStreams,
    private readonly callbacks: SSHSessionManagerCallbacks,
  ) {}

  connect(): void {
    this.proc.stdout.setEncoding('utf8')
    this.proc.stderr.setEncoding('utf8')

    this.proc.stdout.on('data', this.handleStdoutData)
    this.proc.on('spawn', this.handleConnected)
    this.proc.on('close', this.handleDisconnected)
    this.proc.on('error', this.handleError)
  }

  private readonly handleConnected = (): void => {
    if (this.connected) {
      return
    }
    this.connected = true
    this.callbacks.onConnected?.()
  }

  private readonly handleDisconnected = (): void => {
    if (this.disconnected) {
      return
    }
    this.disconnected = true
    this.callbacks.onDisconnected?.()
  }

  private readonly handleError = (error: Error): void => {
    this.callbacks.onError?.(error)
  }

  private readonly handleStdoutData = (chunk: string | Buffer): void => {
    this.buffer += String(chunk)

    while (true) {
      const newlineIndex = this.buffer.indexOf('\n')
      if (newlineIndex === -1) {
        return
      }

      const line = this.buffer.slice(0, newlineIndex).trim()
      this.buffer = this.buffer.slice(newlineIndex + 1)

      if (!line) {
        continue
      }

      let parsed: unknown
      try {
        parsed = jsonParse(line)
      } catch {
        logForDebugging(`[SSHSessionManager] ignoring non-JSON stdout: ${line}`)
        continue
      }

      if (!isStdoutMessage(parsed)) {
        continue
      }

      if (parsed.type === 'control_request') {
        if (parsed.request.subtype === 'can_use_tool') {
          this.callbacks.onPermissionRequest(parsed.request, parsed.request_id)
        } else {
          this.sendErrorResponse(
            parsed.request_id,
            `Unsupported control request subtype: ${parsed.request.subtype}`,
          )
        }
        continue
      }

      if (shouldForwardSdkMessage(parsed)) {
        this.callbacks.onMessage(parsed)
      }
    }
  }

  async sendMessage(content: RemoteMessageContent): Promise<boolean> {
    if (!this.isConnected()) {
      return false
    }

    const payload = jsonStringify({
      type: 'user',
      message: {
        role: 'user',
        content,
      },
      parent_tool_use_id: null,
      session_id: '',
    })

    return this.proc.stdin.write(`${payload}\n`)
  }

  respondToPermissionRequest(
    requestId: string,
    result: RemotePermissionResponse,
  ): void {
    if (!this.isConnected()) {
      return
    }

    const response = jsonStringify({
      type: 'control_response',
      response: {
        subtype: 'success',
        request_id: requestId,
        response:
          result.behavior === 'allow'
            ? {
                behavior: 'allow',
                updatedInput: result.updatedInput,
              }
            : {
                behavior: 'deny',
                message: result.message,
              },
      },
    })

    this.proc.stdin.write(`${response}\n`)
  }

  sendInterrupt(): void {
    if (!this.isConnected()) {
      return
    }

    const request = jsonStringify({
      type: 'control_request',
      request_id: randomUUID(),
      request: {
        subtype: 'interrupt',
      },
    })

    this.proc.stdin.write(`${request}\n`)
  }

  disconnect(): void {
    if (this.disconnected) {
      return
    }

    this.proc.stdout.off('data', this.handleStdoutData)
    this.proc.off('spawn', this.handleConnected)
    this.proc.off('close', this.handleDisconnected)
    this.proc.off('error', this.handleError)

    if (!this.proc.killed) {
      this.proc.kill('SIGTERM')
    }
  }

  isConnected(): boolean {
    return this.connected && !this.disconnected && !this.proc.stdin.destroyed
  }

  private sendErrorResponse(requestId: string, error: string): void {
    if (!this.isConnected()) {
      return
    }

    const response = jsonStringify({
      type: 'control_response',
      response: {
        subtype: 'error',
        request_id: requestId,
        error,
      },
    })

    this.proc.stdin.write(`${response}\n`)
  }
}
