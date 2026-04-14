import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function run(): void {
  const repoRoot = join(import.meta.dir, '..')
  const queueManager = readFileSync(
    join(repoRoot, 'source/src/utils/messageQueueManager.ts'),
    'utf8',
  )
  const promptInput = readFileSync(
    join(repoRoot, 'source/src/components/PromptInput/PromptInput.tsx'),
    'utf8',
  )
  const restoreQueuedCancelInput = readFileSync(
    join(repoRoot, 'source/src/screens/repl/restoreQueuedCancelInput.ts'),
    'utf8',
  )

  assert.match(
    queueManager,
    /export function popNextEditable/,
    'queue manager should expose a single-item queued-prompt edit helper',
  )
  assert.doesNotMatch(
    promptInput,
    /popAllEditable/,
    'prompt input should not merge all queued prompts into one draft for editing',
  )
  assert.match(
    promptInput,
    /const hasDraftInput =\s*input\.length > 0 \|\| Object\.keys\(pastedContents\)\.length > 0;/,
    'queued-prompt editing should only pull from queue when there is no current draft input',
  )
  assert.match(
    promptInput,
    /void popNextCommandFromQueue\(\);/,
    'prompt input should pull one queued prompt at a time for editing',
  )
  assert.match(
    restoreQueuedCancelInput,
    /popNextEditable/,
    'cancel-path queue restore should also restore one queued prompt at a time',
  )
}

run()

console.log('queued prompt edit self-test passed')
