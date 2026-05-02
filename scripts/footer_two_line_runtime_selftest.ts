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

  assert.match(
    footerSource,
    /const primaryParts = \[/,
    'expected the footer to split the main operator row into an explicit primary parts collection',
  )
  assert.match(
    footerSource,
    /const runtimeParts = \[/,
    'expected the footer to split runtime state into an explicit secondary-row parts collection',
  )
  assert.match(
    footerSource,
    /const stateParts = \[\.\.\.primaryParts, \.\.\.runtimeParts\]/,
    'expected the footer to merge primary and runtime state into one stable operator row',
  )
  assert.doesNotMatch(
    footerSource,
    /parts\.push\(\.\.\.hintParts\)/,
    'expected footer hints to stop being merged into the primary row before rendering again below',
  )
  assert.match(
    footerSource,
    /label="Autowork"/,
    'expected the two-line footer to surface explicit autowork state',
  )
  assert.match(
    footerSource,
    /label="Heartbeat"/,
    'expected the two-line footer to surface explicit heartbeat state',
  )
  assert.match(
    footerSource,
    /return `on \(\$\{formatDuration\(snapshot\.heartbeatIntervalMs/,
    'expected heartbeat formatting to show explicit on-state plus interval',
  )
  assert.match(
    footerSource,
    /<Byline>\{hintParts\}<\/Byline>/,
    'expected the lower footer row to render only hint text, not mixed runtime state',
  )
}

run()

console.log('footer two-line runtime selftest passed')
