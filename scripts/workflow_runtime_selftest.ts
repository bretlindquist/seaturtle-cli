import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(root: string, relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run(): void {
  const projectRoot = join(import.meta.dir, '..')
  const runtimeSource = read(
    projectRoot,
    'source/src/services/projectIdentity/workflowRuntime.ts',
  )

  assert.match(
    runtimeSource,
    /cloudOffloadStatus: 'unavailable'/,
    'expected workflow runtime defaults to carry an explicit cloud offload status field',
  )
  assert.match(
    runtimeSource,
    /resolveAutoworkCloudOffloadCapability\(\{\s*active:/,
    'expected workflow runtime projection to resolve cloud offload capability from the centralized seam',
  )
  assert.match(
    runtimeSource,
    /cloudOffloadPath: cloudCapability\.path/,
    'expected workflow runtime snapshots to carry the active cloud offload path',
  )
  assert.match(
    runtimeSource,
    /cloudStatusText: cloudCapability\.reason/,
    'expected workflow runtime snapshots to carry truthful cloud offload status text',
  )

  const footerSource = read(
    projectRoot,
    'source/src/components/PromptInput/PromptInputFooterLeftSide.tsx',
  )
  assert.match(
    footerSource,
    /label="Cloud"/,
    'expected the footer to surface cloud offload state explicitly during workflow/autowork runs',
  )
  assert.match(
    footerSource,
    /function formatCloudValue/,
    'expected the footer to format cloud offload state through a dedicated value helper',
  )
}

run()

console.log('workflow runtime selftest passed')
