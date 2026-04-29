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
    /resolveAutoworkBackendPolicy\(/,
    'expected workflow runtime projection to resolve cloud truth through the centralized backend policy seam',
  )
  assert.match(
    runtimeSource,
    /cloudOffloadPath: backendPolicy\.cloudPath/,
    'expected workflow runtime snapshots to carry the active cloud offload path',
  )
  assert.match(
    runtimeSource,
    /cloudStatusText: backendPolicy\.cloudReason/,
    'expected workflow runtime snapshots to carry truthful cloud offload status text',
  )
  assert.match(
    runtimeSource,
    /cloudRecommendation: backendPolicy\.cloudRecommendation/,
    'expected workflow runtime snapshots to carry the distinct cloud recommendation state',
  )
  assert.match(
    runtimeSource,
    /cloudRecommendationText: backendPolicy\.cloudRecommendationReason/,
    'expected workflow runtime snapshots to carry the cloud recommendation explanation',
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
  assert.match(
    footerSource,
    /snapshot\.cloudRecommendation === 'recommended'/,
    'expected the footer to surface when cloud offload is the recommended next path',
  )
}

run()

console.log('workflow runtime selftest passed')
