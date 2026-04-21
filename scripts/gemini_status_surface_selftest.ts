import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function run(): void {
  const repoRoot = join(import.meta.dir, '..')
  const statusSource = readFileSync(
    join(repoRoot, 'source/src/utils/status.tsx'),
    'utf8',
  )

  assert.match(
    statusSource,
    /CT secure storage/,
    'Gemini status surface should describe CT-managed Gemini auth as secure storage, not generic provider jargon.',
  )
  assert.match(
    statusSource,
    /GEMINI_API_KEY env/,
    'Gemini status surface should describe env-based Gemini auth explicitly.',
  )
  assert.match(
    statusSource,
    /Available to activate/,
    'Gemini status should distinguish available auth from active execution.',
  )
}

run()

console.log('gemini status surface self-test passed')
