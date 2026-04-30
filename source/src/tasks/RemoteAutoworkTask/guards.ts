import type { TaskStateBase } from '../../Task.js'

export type RemoteAutoworkTaskState = TaskStateBase & {
  type: 'remote_autowork'
  mode: 'local' | 'remote'
  host: string | null
  localCwd: string
  remoteCwd: string
  entryPoint: 'autowork' | 'swim'
  action: 'run' | 'step' | 'verify' | 'status' | 'doctor'
  timeBudget?: string
  pid: number
  statusFile: string
  result?: {
    code: number
    summary: string
  }
}

export function isRemoteAutoworkTask(
  task: unknown,
): task is RemoteAutoworkTaskState {
  return (
    typeof task === 'object' &&
    task !== null &&
    'type' in task &&
    task.type === 'remote_autowork'
  )
}
