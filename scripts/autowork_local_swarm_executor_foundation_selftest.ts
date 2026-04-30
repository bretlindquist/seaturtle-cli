import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(root: string, relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run(): void {
  const projectRoot = join(import.meta.dir, '..')

  const registrySource = read(
    projectRoot,
    'source/src/utils/swarm/backends/registry.ts',
  )
  assert.match(
    registrySource,
    /export async function getInitializedTeammateExecutor/,
    'expected swarm registry to expose an initialized teammate executor helper',
  )
  assert.match(
    registrySource,
    /setContext\(context\)/,
    'expected initialized teammate executors to receive ToolUseContext centrally',
  )

  const typesSource = read(
    projectRoot,
    'source/src/utils/swarm/backends/types.ts',
  )
  assert.match(
    typesSource,
    /description\?: string/,
    'expected teammate executor spawn config to carry optional description metadata',
  )
  assert.match(
    typesSource,
    /agentDefinition\?: CustomAgentDefinition/,
    'expected teammate executor spawn config to carry optional custom agent definitions',
  )
  assert.match(
    typesSource,
    /invokingRequestId\?: string/,
    'expected teammate executor spawn config to carry optional invoking request lineage',
  )

  const inProcessBackendSource = read(
    projectRoot,
    'source/src/utils/swarm/backends/InProcessBackend.ts',
  )
  assert.match(
    inProcessBackendSource,
    /description: config\.description/,
    'expected in-process executor spawn to forward description metadata into teammate startup',
  )
  assert.match(
    inProcessBackendSource,
    /agentDefinition: config\.agentDefinition/,
    'expected in-process executor spawn to forward custom agent definitions into teammate startup',
  )
  assert.match(
    inProcessBackendSource,
    /invokingRequestId: config\.invokingRequestId/,
    'expected in-process executor spawn to forward lineage request ids into teammate startup',
  )

  const spawnSource = read(
    projectRoot,
    'source/src/tools/shared/spawnMultiAgent.ts',
  )
  assert.match(
    spawnSource,
    /getInitializedTeammateExecutor\(context, true\)/,
    'expected spawnMultiAgent to use the initialized in-process executor seam',
  )
  assert.doesNotMatch(
    spawnSource,
    /from '\.\.\/\.\.\/utils\/swarm\/spawnInProcess\.js'/,
    'expected spawnMultiAgent to stop importing the direct spawnInProcess helper',
  )
  assert.doesNotMatch(
    spawnSource,
    /from '\.\.\/\.\.\/utils\/swarm\/inProcessRunner\.js'/,
    'expected spawnMultiAgent to stop importing the direct inProcess runner',
  )
  assert.doesNotMatch(
    spawnSource,
    /const result = await spawnInProcessTeammate\(/,
    'expected spawnMultiAgent to stop calling spawnInProcessTeammate directly',
  )
}

run()

console.log('autowork local swarm executor foundation selftest passed')
