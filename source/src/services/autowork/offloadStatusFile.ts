import { readFileSync, writeFileSync } from 'fs'
import {
  sanitizeWorkflowHandoffPacket,
  type WorkflowHandoffPacket,
} from '../projectIdentity/workflowState.js'

export type RemoteAutoworkStatusFile = {
  success: boolean
  exitCode: number
  output: string
  mode: 'local' | 'remote'
  host: string | null
  remoteCwd: string
  finishedAt: number
  error?: string
}

export function writeRemoteAutoworkStatusFile(
  path: string,
  status: RemoteAutoworkStatusFile,
): void {
  writeFileSync(path, JSON.stringify(status, null, 2))
}

export function readRemoteAutoworkStatusFile(
  path: string,
): RemoteAutoworkStatusFile | null {
  try {
    const raw = readFileSync(path, 'utf8')
    return JSON.parse(raw) as RemoteAutoworkStatusFile
  } catch {
    return null
  }
}

export function writeRemoteAutoworkHandoffMirrorFile(
  path: string,
  handoff: WorkflowHandoffPacket,
): void {
  writeFileSync(path, JSON.stringify(handoff, null, 2))
}

export function readRemoteAutoworkHandoffMirrorFile(
  path: string,
): WorkflowHandoffPacket | null {
  try {
    const raw = readFileSync(path, 'utf8')
    return sanitizeWorkflowHandoffPacket(JSON.parse(raw))
  } catch {
    return null
  }
}
