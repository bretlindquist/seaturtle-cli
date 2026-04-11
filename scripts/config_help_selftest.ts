import {
  getConfigHelpText,
  getPermissionModeHelpText,
} from '../source/src/components/Settings/configHelpText.js'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function run(): void {
  assert(
    getPermissionModeHelpText('bypassPermissions').includes('Full access'),
    'expected bypassPermissions help to explain full access',
  )
  assert(
    getPermissionModeHelpText('dontAsk').includes('denied'),
    "expected dontAsk help to explain that unapproved actions are denied",
  )
  assert(
    getConfigHelpText({
      id: 'copyCommandBehavior',
      value: 'copyLatestResponse',
    }).includes('immediately copy'),
    'expected copyLatestResponse help to explain the immediate-copy behavior',
  )
  assert(
    getConfigHelpText({
      id: 'copyCommandBehavior',
      value: 'showMenu',
    }).includes('Always open the /copy menu'),
    'expected showMenu help to explain the interactive copy menu',
  )
  assert(
    getConfigHelpText({
      id: 'defaultPermissionMode',
      value: 'default',
    }).includes('higher-risk actions'),
    'expected default permission help to stay user-facing and explicit',
  )
  assert(
    getConfigHelpText({
      id: 'spinnerTipsEnabled',
    }).includes('rotating usage tips'),
    'expected spinner tips help to describe the feature clearly',
  )
}

run()
