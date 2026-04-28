import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const helperSource = readFileSync(
  new URL('../source/src/utils/taskOutputRetention.ts', import.meta.url),
  'utf8',
)

assert(
  helperSource.includes("task.task_type !== 'local_bash'"),
  'expected retained task-output compaction to stay scoped to local_bash task results',
)

assert(
  helperSource.includes('formatTaskOutput(task.output, task.task_id)'),
  'expected retained task-output compaction to reuse the standard task output formatter',
)

assert(
  helperSource.includes('output: formatted.content'),
  'expected retained task-output compaction to replace oversized retained output with the formatted truncated content',
)

const sessionStorageSource = readFileSync(
  new URL('../source/src/utils/sessionStorage.ts', import.meta.url),
  'utf8',
)
assert(
  sessionStorageSource.includes('compactRetainedTaskOutputToolResult('),
  'expected transcript load path to compact oversized retained task output on resume',
)

const toolExecutionSource = readFileSync(
  new URL('../source/src/services/tools/toolExecution.ts', import.meta.url),
  'utf8',
)
assert(
  toolExecutionSource.includes(
    'compactRetainedTaskOutputToolResult(toolUseResult)',
  ),
  'expected live tool result retention to compact oversized task output before persistence',
)

console.log('task_output_retention_selftest: ok')
