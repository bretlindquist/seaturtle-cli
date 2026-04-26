import { readFileSync } from 'fs'
import { join } from 'path'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

const repoRoot = process.cwd()

function read(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8')
}

const reviewSource = read('source/src/services/api/geminiStrictReview.ts')
assert(
  reviewSource.includes('GEMINI_STRICT_MAX_REPAIR_ATTEMPTS = 1'),
  'expected Gemini strict review to cap automatic repair attempts',
)
assert(
  reviewSource.includes('buildGeminiStrictRepairPrompt'),
  'expected Gemini strict review helper to expose a repair prompt builder',
)

const queryEngineSource = read('source/src/QueryEngine.ts')
assert(
  queryEngineSource.includes('strictRepairAttempts < GEMINI_STRICT_MAX_REPAIR_ATTEMPTS'),
  'expected QueryEngine to allow only bounded strict repair retries',
)
assert(
  queryEngineSource.includes('createUserMessage') &&
    queryEngineSource.includes('buildGeminiStrictRepairPrompt'),
  'expected QueryEngine to enqueue hidden Gemini strict repair prompts',
)
assert(
  queryEngineSource.includes('Automatic repair budget exhausted.'),
  'expected QueryEngine to fail closed when the strict repair budget is exhausted',
)

const docsSource = read('docs/GEMINI.md')
assert(
  docsSource.includes('one automatic repair attempt'),
  'expected Gemini docs to mention the bounded automatic repair attempt',
)

console.log('gemini strict review repair self-test passed')
