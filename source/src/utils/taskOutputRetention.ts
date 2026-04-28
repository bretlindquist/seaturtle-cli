import { formatTaskOutput } from './task/outputFormatting.js'

type RetainedTaskOutput = {
  task_id: string
  task_type: string
  output: string
}

type RetainedTaskOutputToolResult = {
  retrieval_status: 'success' | 'timeout' | 'not_ready'
  task: RetainedTaskOutput | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isRetainedTaskOutputToolResult(
  value: unknown,
): value is RetainedTaskOutputToolResult {
  if (!isRecord(value)) return false
  const task = value.task
  if (task === null) return true
  if (!isRecord(task)) return false
  return (
    typeof task.task_id === 'string' &&
    typeof task.task_type === 'string' &&
    typeof task.output === 'string'
  )
}

/**
 * TaskOutputTool already truncates oversized stdout/stderr for model-facing
 * tool_result blocks, but the retained toolUseResult object can still carry
 * the entire task output in memory and in the transcript. Reuse the same
 * formatter here so retained state stays bounded without a second policy.
 */
export function compactRetainedTaskOutputToolResult(
  toolUseResult: unknown,
): unknown {
  if (!isRetainedTaskOutputToolResult(toolUseResult)) {
    return toolUseResult
  }

  const task = toolUseResult.task
  if (!task || task.task_type !== 'local_bash') {
    return toolUseResult
  }

  const formatted = formatTaskOutput(task.output, task.task_id)
  if (!formatted.wasTruncated) {
    return toolUseResult
  }

  return {
    ...toolUseResult,
    task: {
      ...task,
      output: formatted.content,
    },
  }
}
