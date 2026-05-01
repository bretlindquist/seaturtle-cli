import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function run(): void {
  const projectRoot = join(import.meta.dir, '..')
  const source = readFileSync(
    join(projectRoot, 'source/src/hooks/useTasksV2.ts'),
    'utf8',
  )

  assert.match(
    source,
    /export function areTaskListsEquivalent\(/,
    'expected the task snapshot comparison seam to be factored into one shared helper',
  )
  assert.match(
    source,
    /const tasksChanged = !areTaskListsEquivalent\(prevTasks, current\)/,
    'expected task polling to compare the previous and current snapshots before notifying subscribers',
  )
  assert.match(
    source,
    /if \(tasksChanged \|\| this.#hidden !== prevHidden\) \{\s*this.#notify\(\)/,
    'expected subscriber notification to stay gated on real task snapshot or hidden-state changes',
  )
  assert.doesNotMatch(
    source,
    /this.#tasks = current\s*\n\s*\n\s*const hasIncomplete = current\.some/,
    'expected the task store to stop replacing the cached task array unconditionally on every poll',
  )
}

run()

console.log('tasks v2 snapshot stability selftest passed')
