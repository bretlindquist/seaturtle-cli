export const CT_PROJECT_FEEDBACK_TITLE = '# CT Project Feedback'
export const CT_PROJECT_FEEDBACK_ACTIVE_HEADING = '## Entries'

function normalizeLine(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

function normalizeBody(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trim()
}

function escapeMarkdownInline(raw: string): string {
  return raw.replace(/\|/g, '\\|')
}

function toBullet(raw: string): string {
  return `- ${escapeMarkdownInline(normalizeLine(raw))}`
}

export type ProjectFeedbackEntry = {
  timestamp: string
  status: 'submitted' | 'local-only'
  description: string
  version?: string | null
  platform?: string | null
  terminal?: string | null
  feedbackId?: string | null
}

export function buildProjectFeedbackEntryMarkdown(
  entry: ProjectFeedbackEntry,
): string {
  const lines = [`### ${entry.timestamp}`]

  lines.push(toBullet(`Status: ${entry.status}`))

  if (entry.feedbackId) {
    lines.push(toBullet(`Feedback ID: ${entry.feedbackId}`))
  }
  if (entry.version) {
    lines.push(toBullet(`Version: ${entry.version}`))
  }
  if (entry.platform) {
    lines.push(toBullet(`Platform: ${entry.platform}`))
  }
  if (entry.terminal) {
    lines.push(toBullet(`Terminal: ${entry.terminal}`))
  }

  lines.push('')
  lines.push(normalizeBody(entry.description))
  lines.push('')

  return `${lines.join('\n')}\n`
}

export function buildDefaultProjectFeedbackMarkdown(
  initialEntry?: ProjectFeedbackEntry,
): string {
  const lines = [CT_PROJECT_FEEDBACK_TITLE, '', CT_PROJECT_FEEDBACK_ACTIVE_HEADING]

  if (initialEntry) {
    lines.push('', buildProjectFeedbackEntryMarkdown(initialEntry).trimEnd())
  } else {
    lines.push('', '_Feedback entries from `/feedback` will appear here._')
  }

  return `${lines.join('\n')}\n`
}

function findEntriesHeadingRange(
  markdown: string,
): { start: number; end: number } | null {
  const match = markdown.match(/^## Entries\s*$/m)
  if (!match || match.index === undefined) {
    return null
  }

  const start = match.index
  const afterHeading = start + match[0].length
  return { start, end: afterHeading }
}

export function addFeedbackEntryToMarkdown(
  markdown: string,
  entry: ProjectFeedbackEntry,
): string {
  const entryMarkdown = buildProjectFeedbackEntryMarkdown(entry).trimEnd()
  const trimmed = markdown.trim()

  if (trimmed.length === 0) {
    return buildDefaultProjectFeedbackMarkdown(entry)
  }

  const entriesHeading = findEntriesHeadingRange(markdown)
  if (entriesHeading) {
    const before = markdown.slice(0, entriesHeading.end).replace(/\n+$/, '')
    const after = markdown.slice(entriesHeading.end)
    const normalizedAfter =
      after.startsWith('\n\n')
        ? after.slice(1)
        : after.startsWith('\n')
          ? after
          : `\n${after}`

    return `${before}\n\n${entryMarkdown}\n${normalizedAfter}`
  }

  const separator = markdown.endsWith('\n') ? '' : '\n'
  return `${markdown}${separator}\n${CT_PROJECT_FEEDBACK_ACTIVE_HEADING}\n\n${entryMarkdown}\n`
}
