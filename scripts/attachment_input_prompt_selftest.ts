import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function run(): void {
  const repoRoot = join(import.meta.dir, '..')
  const prompts = readFileSync(
    join(repoRoot, 'source/src/constants/prompts.ts'),
    'utf8',
  )

  assert.match(
    prompts,
    /User messages may already include attached images or PDFs as model input\./,
    'system prompt should teach CT that attached images and PDFs can already be part of model input',
  )
  assert.match(
    prompts,
    /Do not ask the user for a separate tool name or claim you cannot see the attachment just because it is not exposed as a callable tool\./,
    'system prompt should explicitly prevent the fake \"need a tool name\" failure mode for attachments',
  )
}

run()

console.log('attachment input prompt self-test passed')
