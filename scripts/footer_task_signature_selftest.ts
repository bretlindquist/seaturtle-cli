import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function read(root: string, relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run(): void {
  const projectRoot = join(import.meta.dir, '..')
  const footerSource = read(
    projectRoot,
    'source/src/components/PromptInput/PromptInputFooterLeftSide.tsx',
  )
  const backgroundStatusSource = read(
    projectRoot,
    'source/src/components/tasks/BackgroundTaskStatus.tsx',
  )
  const utilsSource = read(
    projectRoot,
    'source/src/components/tasks/taskStatusUtils.tsx',
  )

  assert.match(
    utilsSource,
    /export function getBackgroundTaskRenderSignature\(/,
    'expected a shared background-task render signature helper',
  )
  assert.match(
    footerSource,
    /useAppState\(s => getBackgroundTaskRenderSignature\(s\.tasks\)\)/,
    'expected the footer to subscribe through the background-task render signature instead of the full tasks map',
  )
  assert.match(
    backgroundStatusSource,
    /useAppState\(_temp\)/,
    'expected BackgroundTaskStatus to subscribe through the compact task render selector',
  )
  assert.doesNotMatch(
    footerSource,
    /const tasks = useAppState\(s => s\.tasks\)/,
    'expected the footer to stop subscribing directly to the full tasks object',
  )
  assert.doesNotMatch(
    backgroundStatusSource,
    /const tasks = useAppState\(_temp\d*\);/,
    'expected BackgroundTaskStatus to stop reading the full tasks object reactively',
  )
}

run()

console.log('footer task signature selftest passed')
