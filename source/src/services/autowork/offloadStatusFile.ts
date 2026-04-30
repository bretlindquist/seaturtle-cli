import { readFileSync, writeFileSync } from 'fs'

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
