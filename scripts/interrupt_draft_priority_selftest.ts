import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function run(): void {
  const repoRoot = join(import.meta.dir, '..')
  const cancelRequest = readFileSync(
    join(repoRoot, 'source/src/hooks/useCancelRequest.ts'),
    'utf8',
  )
  const replCancelController = readFileSync(
    join(repoRoot, 'source/src/screens/repl/useReplCancelController.ts'),
    'utf8',
  )

  assert.match(
    cancelRequest,
    /hasDraftInput\?: boolean/,
    'cancel handler props should track whether the prompt currently has draft input',
  )
  assert.match(
    cancelRequest,
    /onClearDraft\?: \(\) => void/,
    'cancel handler props should accept a draft-clearing callback',
  )
  assert.match(
    cancelRequest,
    /if \(hasDraftInput && onClearDraft\) \{\s*onClearDraft\(\)\s*return\s*\}/,
    'Ctrl+C should clear the current draft before interrupting the active request',
  )
  assert.match(
    replCancelController,
    /hasDraftInput:\s*inputValue\.length > 0 \|\| Object\.keys\(pastedContents\)\.length > 0/,
    'REPL cancel controller should treat both typed text and pasted image draft state as clearable input',
  )
  assert.match(
    replCancelController,
    /const handleClearDraft = useCallback\(\(\) => \{\s*setInputValue\(''\);\s*setInputMode\('prompt'\);\s*setPastedContents\(\{\}\);\s*\}/,
    'REPL cancel controller should clear draft text, restore prompt mode, and drop pasted draft attachments on first Ctrl+C',
  )
}

run()

console.log('interrupt draft priority self-test passed')
