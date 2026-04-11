import {
  FOOTER_CONTROL_GROUPS,
  getAdjacentExecutionMode,
  getAvailableFooterControlGroups,
  getFooterExecutionModeLabel,
  getNextFooterControlGroup,
} from '../source/src/components/PromptInput/footerControlCore.js'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function run(): void {
  assert(
    FOOTER_CONTROL_GROUPS.join(',') === 'execution,permissions',
    'footer control groups should keep execution before permissions',
  )

  assert(
    getAvailableFooterControlGroups(true).join(',') === 'execution,permissions',
    'full footer control set should include execution and permissions',
  )
  assert(
    getAvailableFooterControlGroups(false).join(',') === 'permissions',
    'agent/task constrained footer controls should collapse to permissions only',
  )

  const fullGroups = getAvailableFooterControlGroups(true)
  assert(
    getNextFooterControlGroup(null, fullGroups) === 'execution',
    'shift+tab should focus execution first when execution controls are available',
  )
  assert(
    getNextFooterControlGroup('execution', fullGroups) === 'permissions',
    'shift+tab should move from execution to permissions',
  )
  assert(
    getNextFooterControlGroup('permissions', fullGroups) === null,
    'shift+tab should clear footer focus after the last control group',
  )

  assert(
    getAdjacentExecutionMode('prompt', 1) === 'convo',
    'execution mode cycling should advance from prompt to convo',
  )
  assert(
    getAdjacentExecutionMode('convo', 1) === 'discovery',
    'execution mode cycling should expose discovery as the next lane after convo',
  )
  assert(
    getAdjacentExecutionMode('prompt', -1) === 'debug',
    'execution mode cycling should wrap backwards from prompt to debug',
  )
  assert(
    getAdjacentExecutionMode('debug', 1) === 'prompt',
    'execution mode cycling should wrap forwards from debug to prompt',
  )

  assert(
    getFooterExecutionModeLabel('prompt') === 'general',
    'footer execution label should present prompt mode as general rather than leaking the internal default label',
  )
  assert(
    getFooterExecutionModeLabel('discovery') === 'discovery',
    'footer execution label should expose discovery explicitly',
  )

}

run()
