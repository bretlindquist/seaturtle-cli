import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function run(): void {
  const repoRoot = join(import.meta.dir, '..')
  const files = [
    'source/src/services/api/gemini.ts',
    'source/src/services/api/geminiWebSearch.ts',
    'source/src/services/api/geminiCodeExecution.ts',
    'source/src/services/api/geminiFileSearch.ts',
    'source/src/services/api/geminiUrlContext.ts',
    'source/src/services/api/geminiImageGeneration.ts',
    'source/src/services/api/geminiComputerUse.ts',
  ]

  for (const relativePath of files) {
    const source = readFileSync(join(repoRoot, relativePath), 'utf8')
    assert.match(
      source,
      /Use \/login to link Gemini in CT/,
      `Expected ${relativePath} to prefer /login in Gemini auth recovery copy.`,
    )
    assert.match(
      source,
      /GEMINI_API_KEY/,
      `Expected ${relativePath} to retain GEMINI_API_KEY guidance for explicit env-driven setups.`,
    )
  }
}

run()

console.log('gemini recovery copy self-test passed')
