import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function run(): void {
  const repoRoot = join(import.meta.dir, '..')
  const configTs = readFileSync(
    join(repoRoot, 'source/src/utils/config.ts'),
    'utf8',
  )
  const devOverrides = readFileSync(
    join(repoRoot, 'source/src/utils/devOverrides.ts'),
    'utf8',
  )
  const runtimeUserType = readFileSync(
    join(repoRoot, 'source/src/utils/runtimeUserType.ts'),
    'utf8',
  )
  const configUi = readFileSync(
    join(repoRoot, 'source/src/components/Settings/Config.tsx'),
    'utf8',
  )
  const configHelp = readFileSync(
    join(repoRoot, 'source/src/components/Settings/configHelpText.ts'),
    'utf8',
  )
  const gates = readFileSync(
    join(repoRoot, 'source/src/utils/computerUse/gates.ts'),
    'utf8',
  )
  const queryConfig = readFileSync(
    join(repoRoot, 'source/src/query/config.ts'),
    'utf8',
  )
  const planModeV2 = readFileSync(
    join(repoRoot, 'source/src/utils/planModeV2.ts'),
    'utf8',
  )
  const toolSearch = readFileSync(
    join(repoRoot, 'source/src/utils/toolSearch.ts'),
    'utf8',
  )
  const shellToolUtils = readFileSync(
    join(repoRoot, 'source/src/utils/shell/shellToolUtils.ts'),
    'utf8',
  )
  const shouldUseSandbox = readFileSync(
    join(repoRoot, 'source/src/tools/BashTool/shouldUseSandbox.ts'),
    'utf8',
  )
  const toolConstants = readFileSync(
    join(repoRoot, 'source/src/constants/tools.ts'),
    'utf8',
  )
  const exploreAgent = readFileSync(
    join(repoRoot, 'source/src/tools/AgentTool/built-in/exploreAgent.ts'),
    'utf8',
  )
  const loadAgentsDir = readFileSync(
    join(repoRoot, 'source/src/tools/AgentTool/loadAgentsDir.ts'),
    'utf8',
  )
  const agentSwarmsEnabled = readFileSync(
    join(repoRoot, 'source/src/utils/agentSwarmsEnabled.ts'),
    'utf8',
  )
  const toolExecution = readFileSync(
    join(repoRoot, 'source/src/services/tools/toolExecution.ts'),
    'utf8',
  )

  assert.match(
    configTs,
    /devRuntimeOverrides\?: \{/,
    'global config should persist dev runtime overrides',
  )
  assert.match(
    devOverrides,
    /isSimulatedAntRuntimeEnabled/,
    'dev override helper should expose simulated ant runtime access',
  )
  assert.match(
    devOverrides,
    /isChicagoGateForcedForTesting/,
    'dev override helper should expose Chicago gate forcing',
  )
  assert.match(
    runtimeUserType,
    /export function isAntRuntimeEnabled/,
    'runtime user-type helper should expose a central ant runtime decision',
  )
  assert.match(
    configUi,
    /id: 'simulateAntRuntime'/,
    '/config should expose a simulate ant runtime toggle',
  )
  assert.match(
    configUi,
    /id: 'forceChicagoGate'/,
    '/config should expose a force Chicago gate toggle',
  )
  assert.match(
    configHelp,
    /case 'simulateAntRuntime'/,
    'config help should explain the ant simulation override',
  )
  assert.match(
    configHelp,
    /case 'forceChicagoGate'/,
    'config help should explain the Chicago gate override',
  )
  assert.match(
    gates,
    /isAntRuntimeEnabled\(\)/,
    'computer-use gates should honor the centralized ant runtime helper',
  )
  assert.match(
    gates,
    /isChicagoGateForcedForTesting\(\)/,
    'computer-use gates should honor the forced Chicago gate override',
  )
  assert.match(
    queryConfig,
    /isAntRuntimeEnabled\(\)/,
    'query config should snapshot ant runtime state through the centralized helper',
  )
  assert.match(
    planModeV2,
    /isAntRuntimeEnabled\(\)/,
    'plan-mode interview gating should honor the centralized ant runtime helper',
  )
  assert.match(
    toolSearch,
    /isAntRuntimeEnabled\(\)/,
    'deferred-tools delta gating should honor the centralized ant runtime helper',
  )
  assert.match(
    shellToolUtils,
    /isAntRuntimeEnabled\(\)/,
    'PowerShell tool gating should honor the centralized ant runtime helper',
  )
  assert.match(
    shouldUseSandbox,
    /isAntRuntimeEnabled\(\)/,
    'shell sandbox rollout gating should honor the centralized ant runtime helper',
  )
  assert.match(
    toolConstants,
    /isAntRuntimeEnabled\(\)/,
    'nested-agent tool gating should honor the centralized ant runtime helper',
  )
  assert.match(
    exploreAgent,
    /isAntRuntimeEnabled\(\)/,
    'explore-agent runtime defaults should honor the centralized ant runtime helper',
  )
  assert.match(
    loadAgentsDir,
    /isAntRuntimeEnabled\(\)/,
    'agent isolation parsing should honor the centralized ant runtime helper',
  )
  assert.match(
    agentSwarmsEnabled,
    /isAntRuntimeEnabled\(\)/,
    'agent swarm gating should honor the centralized ant runtime helper',
  )
  assert.match(
    toolExecution,
    /isAntRuntimeEnabled\(\)/,
    'tool-hook inline summaries should honor the centralized ant runtime helper',
  )
}

run()

console.log('dev runtime overrides self-test passed')
