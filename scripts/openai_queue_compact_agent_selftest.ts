import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))

function run(): void {
  const openAiCodexSource = readFileSync(
    join(repoRoot, 'source/src/services/api/openaiCodex.ts'),
    'utf8',
  )
  assert.match(
    openAiCodexSource,
    /ensureToolResultPairing\(/,
    'OpenAI/Codex request collection should repair missing tool outputs before serialization',
  )
  assert.match(
    openAiCodexSource,
    /messages\.filter\(\s*\(message\): message is UserMessage \| AssistantMessage =>/,
    'OpenAI/Codex pairing repair should run over the user\/assistant message stream before serialization',
  )

  const loadAgentsDirSource = readFileSync(
    join(repoRoot, 'source/src/tools/AgentTool/loadAgentsDir.ts'),
    'utf8',
  )
  assert.match(
    loadAgentsDirSource,
    /reviewer:\s*'general-purpose'/,
    'reviewer should resolve to the general-purpose compatibility agent when available',
  )
  assert.match(
    loadAgentsDirSource,
    /'code-reviewer':\s*'general-purpose'/,
    'code-reviewer should resolve to the general-purpose compatibility agent when available',
  )
  assert.match(
    loadAgentsDirSource,
    /export function findCompatibleAgentDefinition/,
    'agent compatibility should expose a shared compatible-definition lookup helper',
  )

  const agentToolSource = readFileSync(
    join(repoRoot, 'source/src/tools/AgentTool/AgentTool.tsx'),
    'utf8',
  )
  assert.match(
    agentToolSource,
    /resolveCompatibleAgentType\(/,
    'AgentTool should resolve compatibility aliases before failing unknown agent types',
  )
  assert.match(
    agentToolSource,
    /agent_type:\s*resolvedSubagentType/,
    'AgentTool teammate spawns should pass the canonical compatible agent type downstream',
  )

  const spawnMultiAgentSource = readFileSync(
    join(repoRoot, 'source/src/tools/shared/spawnMultiAgent.ts'),
    'utf8',
  )
  assert.match(
    spawnMultiAgentSource,
    /Resolved agent alias/,
    'spawnTeammate should canonicalize compatibility aliases before teammate launch',
  )

  const sessionRestoreSource = readFileSync(
    join(repoRoot, 'source/src/utils/sessionRestore.ts'),
    'utf8',
  )
  assert.match(
    sessionRestoreSource,
    /findCompatibleAgentDefinition\(/,
    'session restore should resolve compatible agent aliases when resuming older sessions',
  )

  const printSource = readFileSync(
    join(repoRoot, 'source/src/cli/print.ts'),
    'utf8',
  )
  assert.match(
    printSource,
    /const resolvedAgentType = resolveCompatibleAgentType\(options\.agent, agents\)/,
    'print mode should compare already-resolved agent state against the canonical compatible agent type',
  )

  const compactSource = readFileSync(
    join(repoRoot, 'source/src/commands/compact/compact.ts'),
    'utf8',
  )
  assert.match(
    compactSource,
    /runCompactionWithTransientRetry/,
    'compact command should retry transient transport termination failures',
  )

  console.log('openai queue/compact/agent self-test passed')
}

run()
