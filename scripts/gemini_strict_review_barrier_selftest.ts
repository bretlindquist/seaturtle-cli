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

const reviewContextSource = read(
  'source/src/services/api/geminiStrictReviewContext.ts',
)
assert(
  reviewContextSource.includes('extractGeminiStrictReviewContext'),
  'expected Gemini strict review context helper to exist',
)
assert(
  reviewContextSource.includes('toolUseResult') &&
    reviewContextSource.includes('structuredPatch'),
  'expected review context extraction to inspect file tool results',
)

const reviewSource = read('source/src/services/api/geminiStrictReview.ts')
assert(
  reviewSource.includes('querySmallFastViaProviderRuntime'),
  'expected Gemini strict reviewer to use the provider-runtime helper path',
)
assert(
  reviewSource.includes("'approve', 'needs_changes', 'blocked'"),
  'expected Gemini strict reviewer to require structured review statuses',
)
assert(
  reviewSource.includes("runtime.family !== 'gemini'"),
  'expected Gemini strict reviewer to stay Gemini-only',
)

const queryEngineSource = read('source/src/QueryEngine.ts')
assert(
  queryEngineSource.includes('extractGeminiStrictReviewContext') &&
    queryEngineSource.includes('runGeminiStrictReview'),
  'expected QueryEngine to invoke the Gemini strict reviewer barrier',
)
assert(
  queryEngineSource.includes("strictReview.status !== 'approve'"),
  'expected QueryEngine to block completion on non-approved strict reviews',
)

const docsSource = read('docs/GEMINI.md')
assert(
  docsSource.includes('reviewer barrier'),
  'expected Gemini docs to mention the strict reviewer barrier',
)

console.log('gemini strict review barrier self-test passed')
