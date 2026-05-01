import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(root: string, relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run(): void {
  const projectRoot = join(import.meta.dir, '..')
  const source = read(
    projectRoot,
    'source/src/services/autowork/localLifecycleSwarm.ts',
  )
  assert.match(
    source,
    /writeLocalLifecycleSwarmMetadata/,
    'expected local lifecycle swarm launches to persist restore metadata',
  )
  assert.match(
    source,
    /restoreLocalLifecycleSwarmTasks/,
    'expected a dedicated restore seam for local lifecycle swarm tasks',
  )
  assert.match(
    source,
    /previous SeaTurtle session exited/,
    'expected restore to surface interrupted local lifecycle workers truthfully',
  )
  assert.match(
    source,
    /syncAutoworkExecutionAuthority/,
    'expected local lifecycle restore to clear local swarm backend authority through the shared execution authority seam',
  )
  assert.match(
    source,
    /registerTask\(\s*createInterruptedLocalLifecycleTask/,
    'expected restore to surface an interrupted local agent task instead of silently dropping it',
  )

  const lifecycleSource = read(
    projectRoot,
    'source/src/screens/repl/useReplSessionLifecycle.ts',
  )
  assert.match(
    lifecycleSource,
    /restoreLocalLifecycleSwarmTasks/,
    'expected REPL lifecycle to restore interrupted local lifecycle swarm truth on mount',
  )
  const resumeSource = read(
    projectRoot,
    'source/src/screens/repl/finishReplSessionResume.ts',
  )
  assert.match(
    resumeSource,
    /restoreLocalLifecycleSwarmTasks/,
    'expected resumed sessions to restore interrupted local lifecycle swarm truth',
  )

  const storageSource = read(projectRoot, 'source/src/utils/sessionStorage.ts')
  assert.match(
    storageSource,
    /export type LocalLifecycleSwarmMetadata/,
    'expected local lifecycle swarm restore truth to have a dedicated persisted metadata contract',
  )
  assert.match(
    storageSource,
    /writeLocalLifecycleSwarmMetadata/,
    'expected local lifecycle swarm metadata to be persisted explicitly',
  )
  assert.match(
    storageSource,
    /listLocalLifecycleSwarmMetadata/,
    'expected local lifecycle swarm restore to enumerate persisted metadata',
  )
  assert.match(
    storageSource,
    /deleteLocalLifecycleSwarmMetadata/,
    'expected local lifecycle swarm restore to clean consumed metadata',
  )
}

run()

console.log('autowork local lifecycle restore selftest passed')
