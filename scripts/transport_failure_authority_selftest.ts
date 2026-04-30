import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  describeTransientTransportFailure,
  isTransientTransportFailure,
} from '../source/src/services/api/errorUtils.ts'

function read(root: string, relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

function run(): void {
  assert.equal(
    describeTransientTransportFailure({
      status: 503,
      statusText: 'Service Unavailable',
      body: 'upstream connect error or disconnect/reset before headers. reset reason: connection termination',
    }),
    '503 Service Unavailable · upstream transport reset before the request completed. Retry in a moment.',
  )

  assert.equal(
    describeTransientTransportFailure(
      new Error('Compaction transport terminated before completion'),
    ),
    'Transport temporarily unavailable · transport terminated before completion. Retry in a moment.',
  )

  assert.equal(
    isTransientTransportFailure(
      new Error(
        'API Error: 503 Service Unavailable · upstream connect error or disconnect/reset before headers. reset reason: connection termination',
      ),
    ),
    true,
  )

  const repoRoot = join(import.meta.dir, '..')
  const errorsSource = read(repoRoot, 'source/src/services/api/errors.ts')
  const openAiSource = read(repoRoot, 'source/src/services/api/openaiCodex.ts')
  const geminiSource = read(repoRoot, 'source/src/services/api/gemini.ts')
  const compactSource = read(repoRoot, 'source/src/commands/compact/compact.ts')

  assert.match(
    errorsSource,
    /describeTransientTransportFailure\(error\)/,
    'expected shared API error mapping to route transient transport failures through the shared classifier',
  )
  assert.match(
    openAiSource,
    /describeTransientTransportFailure\(params\)/,
    'expected OpenAI/Codex HTTP error formatting to use the shared transport classifier',
  )
  assert.match(
    openAiSource,
    /describeTransientTransportFailure\(error\)/,
    'expected OpenAI/Codex catch blocks to use the shared transport classifier',
  )
  assert.match(
    geminiSource,
    /describeTransientTransportFailure\(error\)/,
    'expected Gemini catch blocks to use the shared transport classifier',
  )
  assert.match(
    compactSource,
    /isTransientTransportFailure\(error\)/,
    'expected compaction retry detection to use the shared transport classifier',
  )
}

run()

console.log('transport failure authority selftest passed')
