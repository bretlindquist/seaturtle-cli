import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(repoRoot: string, relPath: string): string {
  return readFileSync(join(repoRoot, relPath), 'utf8')
}

function run(): void {
  const repoRoot = join(import.meta.dir, '..')
  const permissionSetup = read(
    repoRoot,
    'source/src/utils/permissions/permissionSetup.ts',
  )
  const mainSource = read(repoRoot, 'source/src/main.tsx')
  const setupSource = read(repoRoot, 'source/src/setup.ts')
  const interactiveHelpers = read(repoRoot, 'source/src/interactiveHelpers.tsx')
  const configUi = read(repoRoot, 'source/src/components/Settings/Config.tsx')
  const telegramSettings = read(
    repoRoot,
    'source/src/components/telegram/TelegramSettings.tsx',
  )
  const applySettingsChange = read(
    repoRoot,
    'source/src/utils/settings/applySettingsChange.ts',
  )
  const appState = read(repoRoot, 'source/src/state/AppState.tsx')
  const configToolSettings = read(
    repoRoot,
    'source/src/tools/ConfigTool/supportedSettings.ts',
  )
  const printSource = read(repoRoot, 'source/src/cli/print.ts')
  const replBridge = read(repoRoot, 'source/src/hooks/useReplBridge.tsx')

  assert.match(
    permissionSetup,
    /export function getBypassPermissionsSessionState\(/,
    'permissionSetup should expose a centralized bypass session-state helper',
  )
  assert.match(
    permissionSetup,
    /export function getResolvedSettingsPermissionMode\(/,
    'permissionSetup should expose a centralized settings default-mode resolver',
  )
  assert.match(
    permissionSetup,
    /export function reconcilePermissionContextAfterSettingsChange\(/,
    'permissionSetup should expose a centralized settings-change reconcile helper',
  )
  assert.match(
    permissionSetup,
    /export function getDefaultPermissionModeOptions\(/,
    'permissionSetup should expose a centralized default-mode picker helper',
  )
  assert.match(
    permissionSetup,
    /isBypassPermissionsModeAvailable:\s*bypassPermissionsSessionState\.isAvailable/,
    'tool permission context should derive bypass availability from the centralized helper',
  )
  assert.match(
    mainSource,
    /getBypassPermissionsSessionState/,
    'main startup should import the centralized bypass session-state helper',
  )
  assert.match(
    mainSource,
    /setSessionBypassPermissionsMode\(\s*bypassPermissionsSessionState\.isAvailable,/,
    'main startup should store the resolved session bypass capability, not just current mode',
  )
  assert.match(
    setupSource,
    /if \(bypassPermissionsSessionState\.isAvailable\)/,
    'setup safety checks should gate on the centralized bypass session-state helper',
  )
  assert.match(
    interactiveHelpers,
    /if \(bypassPermissionsSessionState\.isAvailable && !hasSkipDangerousModePermissionPrompt\(\)\)/,
    'interactive startup prompt flow should gate on the centralized bypass session-state helper',
  )
  assert.match(
    configUi,
    /toolPermissionContext\.isBypassPermissionsModeAvailable/,
    '/config should derive bypass option visibility from live permission context state',
  )
  assert.match(
    configUi,
    /getDefaultPermissionModeOptions\(\{/,
    '/config should derive default-mode options from the centralized picker helper',
  )
  assert.match(
    configUi,
    /applySettingsChange\('userSettings', setAppState\)/,
    '/config should reconcile AppState through the shared settings-change path after default-mode writes',
  )
  assert.match(
    telegramSettings,
    /getDefaultPermissionModeOptions\(\{/,
    'Telegram permissions picker should derive options from the centralized picker helper',
  )
  assert.match(
    telegramSettings,
    /applySettingsChange\('userSettings', setAppState\)/,
    'Telegram settings should reconcile AppState through the shared settings-change path after default-mode writes',
  )
  assert.match(
    applySettingsChange,
    /reconcilePermissionContextAfterSettingsChange\(/,
    'settings-change application should use the centralized permission-context reconcile helper',
  )
  assert.match(
    appState,
    /reconcileBypassPermissionsAvailability/,
    'AppState mount reconciliation should use the centralized bypass-availability helper',
  )
  assert.match(
    configToolSettings,
    /EXTERNAL_PERMISSION_MODES/,
    'ConfigTool permission-mode options should derive from the shared permission mode constants',
  )
  assert.doesNotMatch(
    mainSource,
    /toolPermissionContext\.mode === 'bypassPermissions' \|\| allowDangerouslySkipPermissions/,
    'main should not retain ad hoc bypass checks once live availability is centralized',
  )
  assert.match(
    printSource,
    /bypass permissions is not enabled for this session/,
    'print control-path messaging should reflect the centralized session capability semantics',
  )
  assert.match(
    replBridge,
    /bypass permissions is not enabled for this session/,
    'bridge control-path messaging should reflect the centralized session capability semantics',
  )
}

run()
