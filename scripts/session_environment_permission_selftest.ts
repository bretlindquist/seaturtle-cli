import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function run(): void {
  const repoRoot = join(import.meta.dir, '..')
  const source = readFileSync(
    join(repoRoot, 'source/src/utils/sessionEnvironment.ts'),
    'utf8',
  )

  assert.match(
    source,
    /code !== 'EACCES' && code !== 'EPERM'/,
    'expected session environment setup to treat EACCES and EPERM as non-fatal',
  )
  assert.match(
    source,
    /Session environment directory unavailable:/,
    'expected session environment failures to degrade to debug logging instead of surfacing as tool errors',
  )
}

run()

console.log('session environment permission self-test passed')
