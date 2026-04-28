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
    configToolSettings,
    /EXTERNAL_PERMISSION_MODES/,
    'ConfigTool permission-mode options should derive from the shared permission mode constants',
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
