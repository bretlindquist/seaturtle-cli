import { peekActiveWorkstream } from '../projectIdentity/workflowState.js'
import {
  listLocalLifecycleSwarmMetadata,
  listRemoteAutoworkMetadata,
} from '../../utils/sessionStorage.js'
import type { AutoworkEntryPoint } from './runner.js'

export type ActiveSupervisedAutoworkRun =
  | {
      kind: 'cloud-offload'
      source: 'metadata' | 'workflow-packet'
      repoRoot: string
      taskId: string | null
      entryPoint: AutoworkEntryPoint | null
      summary: string
    }
  | {
      kind: 'local-lifecycle-swarm'
      source: 'metadata' | 'workflow-packet'
      repoRoot: string
      taskId: string | null
      entryPoint: AutoworkEntryPoint | null
      summary: string
    }

function selectMostRecentRun<T extends { localCwd: string }>(
  runs: readonly T[],
  repoRoot: string,
  getTimestamp: (run: T) => number,
): T | null {
  const matching = runs.filter(run => run.localCwd === repoRoot)
  if (matching.length === 0) {
    return null
  }

  return matching.sort((left, right) => getTimestamp(right) - getTimestamp(left))[0]!
}

function getWorkflowPacketFallback(
  repoRoot: string,
): ActiveSupervisedAutoworkRun | null {
  const execution = peekActiveWorkstream(repoRoot)?.packets.execution ?? null
  if (!execution?.swarmActive) {
    return null
  }

  if (execution.swarmBackend === 'cloud') {
    return {
      kind: 'cloud-offload',
      source: 'workflow-packet',
      repoRoot,
      taskId: null,
      entryPoint: null,
      summary: execution.statusText ?? 'Cloud offload is marked active.',
    }
  }

  if (execution.swarmBackend === 'local') {
    return {
      kind: 'local-lifecycle-swarm',
      source: 'workflow-packet',
      repoRoot,
      taskId: null,
      entryPoint: null,
      summary:
        execution.statusText ?? 'Local lifecycle swarm is marked active.',
    }
  }

  return null
}

export async function inspectActiveSupervisedAutoworkRun(
  repoRoot: string,
): Promise<ActiveSupervisedAutoworkRun | null> {
  const [remoteRuns, localRuns] = await Promise.all([
    listRemoteAutoworkMetadata(),
    listLocalLifecycleSwarmMetadata(),
  ])

  const remote = selectMostRecentRun(
    remoteRuns,
    repoRoot,
    run => run.spawnedAt,
  )
  if (remote) {
    return {
      kind: 'cloud-offload',
      source: 'metadata',
      repoRoot,
      taskId: remote.taskId,
      entryPoint: remote.entryPoint,
      summary: `Cloud offload running: ${remote.entryPoint} ${remote.action}`,
    }
  }

  const local = selectMostRecentRun(localRuns, repoRoot, run => run.startTime)
  if (local) {
    return {
      kind: 'local-lifecycle-swarm',
      source: 'metadata',
      repoRoot,
      taskId: local.taskId,
      entryPoint: local.entryPoint,
      summary: `Local lifecycle swarm running: ${local.entryPoint} ${local.mode}`,
    }
  }

  return getWorkflowPacketFallback(repoRoot)
}

export function getSupervisedAutoworkGuardMessage(
  entryPoint: AutoworkEntryPoint,
  run: ActiveSupervisedAutoworkRun,
): string {
  if (run.kind === 'cloud-offload') {
    return [
      'Autowork already has an active background cloud-offload run for this workstream.',
      '',
      `Next: inspect /tasks for the remote autowork task, use /${entryPoint} status for workflow truth, or stop the cloud run before starting local execution here.`,
    ].join('\n')
  }

  return [
    'Autowork already has an active local-swarm lifecycle run for this workstream.',
    '',
    `Next: inspect /tasks for the lifecycle worker, use /${entryPoint} status for workflow truth, or stop the local swarm task before starting another local autowork run here.`,
  ].join('\n')
}
