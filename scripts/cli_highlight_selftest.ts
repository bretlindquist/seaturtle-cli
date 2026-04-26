import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

async function run(): Promise<void> {
  const repoRoot = process.cwd()
  const bundleEntry = join(repoRoot, 'dist/cli.bundle/src/entrypoints/cli.js')
  const bundleSource = readFileSync(bundleEntry, 'utf8')

  assert.doesNotMatch(
    bundleSource,
    /cli-highlight/,
    'bundled CLI should not depend on cli-highlight runtime interop',
  )
  assert.match(
    bundleSource,
    /failed to initialize local CLI syntax highlighting/,
    'bundled CLI should include the local cliHighlight bridge logic',
  )

  process.env.FORCE_COLOR = '1'
  const workspaceModuleUrl = pathToFileURL(
    join(repoRoot, '.cache/workspace/src/utils/cliHighlight.ts'),
  ).href
  const cliHighlightModule = await import(workspaceModuleUrl)
  const highlight = await cliHighlightModule.getCliHighlightPromise()

  assert.ok(
    highlight,
    'workspace highlight module should initialize after build workspace preparation',
  )
  assert.equal(
    highlight.supportsLanguage('js'),
    true,
    'workspace highlight module should report JavaScript support',
  )

  const ansi = highlight.highlight('const x = 1', { language: 'js' })
  assert.match(
    ansi,
    /\x1b\[[0-9;]*mconst\x1b\[[0-9;]*m/,
    'highlighted output should contain ANSI styling for JavaScript keywords',
  )

  const languageName = await cliHighlightModule.getLanguageName('example.ts')
  assert.equal(
    languageName,
    'TypeScript',
    'language name lookup should resolve file extensions via highlight.js',
  )
}

await run()

console.log('cli-highlight selftest passed')
