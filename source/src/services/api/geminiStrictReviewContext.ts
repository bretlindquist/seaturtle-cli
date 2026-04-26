import type { StructuredPatchHunk } from 'diff'
import type { Output as FileWriteOutput } from '../../tools/FileWriteTool/FileWriteTool.js'
import type { FileEditOutput } from '../../tools/FileEditTool/types.js'
import type { Message } from '../../types/message.js'

type FileEditResult = FileEditOutput | FileWriteOutput

export type GeminiStrictReviewedFile = {
  filePath: string
  isNewFile: boolean
  linesAdded: number
  linesRemoved: number
  patchPreview: string
}

export type GeminiStrictReviewContext = {
  userPrompt: string
  files: GeminiStrictReviewedFile[]
  stats: {
    filesChanged: number
    linesAdded: number
    linesRemoved: number
  }
}

const MAX_PREVIEW_LINES_PER_FILE = 80

function isToolResultUserMessage(message: Message): boolean {
  return (
    message.type === 'user' &&
    (message.toolUseResult !== undefined ||
      (Array.isArray(message.message.content) &&
        message.message.content.some(block => block.type === 'tool_result')))
  )
}

function isHumanPromptMessage(message: Message): boolean {
  return (
    message.type === 'user' && !message.isMeta && !isToolResultUserMessage(message)
  )
}

function isFileEditResult(result: unknown): result is FileEditResult {
  if (!result || typeof result !== 'object') return false
  const r = result as Record<string, unknown>
  const hasFilePath = typeof r.filePath === 'string'
  const hasStructuredPatch =
    Array.isArray(r.structuredPatch) && r.structuredPatch.length > 0
  const isNewFile = r.type === 'create' && typeof r.content === 'string'
  return hasFilePath && (hasStructuredPatch || isNewFile)
}

function isFileWriteOutput(result: FileEditResult): result is FileWriteOutput {
  return (
    'type' in result && (result.type === 'create' || result.type === 'update')
  )
}

function countHunkLines(hunks: StructuredPatchHunk[]): {
  added: number
  removed: number
} {
  let added = 0
  let removed = 0
  for (const hunk of hunks) {
    for (const line of hunk.lines) {
      if (line.startsWith('+')) added++
      else if (line.startsWith('-')) removed++
    }
  }
  return { added, removed }
}

function truncatePatchPreview(hunks: StructuredPatchHunk[]): string {
  const lines: string[] = []
  for (const hunk of hunks) {
    lines.push(
      `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`,
    )
    for (const line of hunk.lines) {
      lines.push(line)
      if (lines.length >= MAX_PREVIEW_LINES_PER_FILE) {
        return `${lines.join('\n')}\n...[truncated]`
      }
    }
  }
  return lines.join('\n')
}

function getUserPromptText(message: Message): string {
  if (message.type !== 'user') return ''
  const content = message.message.content
  if (typeof content === 'string') {
    return content.trim()
  }
  return content
    .filter(
      (block): block is Extract<(typeof content)[number], { type: 'text' }> =>
        block.type === 'text',
    )
    .map(block => block.text)
    .join('\n')
    .trim()
}

export function extractGeminiStrictReviewContext(
  messages: Message[],
): GeminiStrictReviewContext | null {
  const latestPromptIndex = messages.findLastIndex(isHumanPromptMessage)
  if (latestPromptIndex === -1) {
    return null
  }

  const promptMessage = messages[latestPromptIndex]
  const fileMap = new Map<
    string,
    {
      filePath: string
      isNewFile: boolean
      hunks: StructuredPatchHunk[]
      linesAdded: number
      linesRemoved: number
    }
  >()

  for (const message of messages.slice(latestPromptIndex + 1)) {
    if (message.type !== 'user' || message.toolUseResult === undefined) {
      continue
    }

    const result = message.toolUseResult
    if (!isFileEditResult(result)) {
      continue
    }

    const { filePath, structuredPatch } = result
    const isNewFile = 'type' in result && result.type === 'create'
    let fileEntry = fileMap.get(filePath)

    if (!fileEntry) {
      fileEntry = {
        filePath,
        isNewFile,
        hunks: [],
        linesAdded: 0,
        linesRemoved: 0,
      }
      fileMap.set(filePath, fileEntry)
    }

    if (
      isNewFile &&
      structuredPatch.length === 0 &&
      isFileWriteOutput(result)
    ) {
      const contentLines = result.content.split('\n')
      const syntheticHunk: StructuredPatchHunk = {
        oldStart: 0,
        oldLines: 0,
        newStart: 1,
        newLines: contentLines.length,
        lines: contentLines.map(line => `+${line}`),
      }
      fileEntry.hunks.push(syntheticHunk)
      fileEntry.linesAdded += contentLines.length
      fileEntry.isNewFile = true
      continue
    }

    fileEntry.hunks.push(...structuredPatch)
    const { added, removed } = countHunkLines(structuredPatch)
    fileEntry.linesAdded += added
    fileEntry.linesRemoved += removed
    if (isNewFile) {
      fileEntry.isNewFile = true
    }
  }

  if (fileMap.size === 0) {
    return null
  }

  const files = Array.from(fileMap.values()).map(file => ({
    filePath: file.filePath,
    isNewFile: file.isNewFile,
    linesAdded: file.linesAdded,
    linesRemoved: file.linesRemoved,
    patchPreview: truncatePatchPreview(file.hunks),
  }))

  return {
    userPrompt: getUserPromptText(promptMessage),
    files,
    stats: {
      filesChanged: files.length,
      linesAdded: files.reduce((sum, file) => sum + file.linesAdded, 0),
      linesRemoved: files.reduce((sum, file) => sum + file.linesRemoved, 0),
    },
  }
}
