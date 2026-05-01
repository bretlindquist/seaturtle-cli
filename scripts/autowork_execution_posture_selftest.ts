import assert from 'node:assert/strict'

import { resolveAutoworkExecutionPosture } from '../source/src/services/autowork/executionPosture.js'

const idleRuntime = {
  version: 1 as const,
  workId: null,
  workflowPhase: 'idle' as const,
  autoworkMode: 'idle' as const,
  autoworkActive: false,
  activeChunkId: null,
  executionScope: 'none' as const,
  timeBudgetMs: null,
  deadlineAt: null,
  heartbeatEnabled: false,
  heartbeatIntervalMs: null,
  swarmBackend: 'none' as const,
  swarmActive: false,
  swarmWorkerCount: 0,
  backendPolicyTarget: 'main-thread' as const,
  backendPolicyExecutorMode: null,
  backendPolicyText: null,
  cloudOffloadStatus: 'unavailable' as const,
  cloudOffloadPath: 'none' as const,
  cloudConfiguredHostCount: 0,
  cloudRecommendation: 'none' as const,
  cloudStatusText: null,
  cloudRecommendationText: null,
  cloudNextStep: null,
  statusText: null,
  lastActivityAt: null,
}

const activeRuntime = {
  ...idleRuntime,
  autoworkActive: true,
  autoworkMode: 'research' as const,
  workflowPhase: 'research' as const,
  executionScope: 'plan' as const,
  heartbeatEnabled: true,
  heartbeatIntervalMs: 300000,
}

const activePosture = resolveAutoworkExecutionPosture({
  currentInput: 'continue',
  workflowRuntime: activeRuntime,
})
assert.equal(activePosture.active, true)
assert.equal(activePosture.reason, 'runtime')
assert.match(
  activePosture.addendum ?? '',
  /Current posture: autowork execution/,
)
assert.match(
  activePosture.addendum ?? '',
  /Suppress the normal open\/explore conversational posture/,
)

const directivePosture = resolveAutoworkExecutionPosture({
  currentInput: 'switch into autowork',
  workflowRuntime: idleRuntime,
})
assert.equal(directivePosture.active, true)
assert.equal(directivePosture.reason, 'natural-language')
assert.equal(directivePosture.entryPoint, 'autowork')

const slashPosture = resolveAutoworkExecutionPosture({
  currentInput: '/swim status',
  workflowRuntime: idleRuntime,
})
assert.equal(slashPosture.active, true)
assert.equal(slashPosture.reason, 'slash-command')
assert.equal(slashPosture.entryPoint, 'swim')

const ordinaryMention = resolveAutoworkExecutionPosture({
  currentInput: 'autowork mode in the footer is wrong',
  workflowRuntime: idleRuntime,
})
assert.equal(ordinaryMention.active, false)
assert.equal(ordinaryMention.addendum, null)

console.log('autowork execution posture selftest passed')
