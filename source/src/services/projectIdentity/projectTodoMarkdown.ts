export const CT_PROJECT_TODO_TITLE = '# CT Project Todo'
export const CT_PROJECT_TODO_ACTIVE_HEADING = '## Active'
export const CT_PROJECT_TODO_PLACEHOLDER_LINE =
  '- [ ] Add the next project task here'

function normalizeTodoItemText(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

export function toProjectTodoTaskLine(raw: string): string {
  return `- [ ] ${normalizeTodoItemText(raw)}`
}

export function buildDefaultProjectTodoMarkdown(initialItem?: string): string {
  const lines = [CT_PROJECT_TODO_TITLE, '', CT_PROJECT_TODO_ACTIVE_HEADING]

  if (initialItem) {
    lines.push(toProjectTodoTaskLine(initialItem))
  } else {
    lines.push(CT_PROJECT_TODO_PLACEHOLDER_LINE)
  }

  return `${lines.join('\n')}\n`
}

function findActiveHeadingRange(markdown: string): { start: number; end: number } | null {
  const match = markdown.match(/^## Active\s*$/m)
  if (!match || match.index === undefined) {
    return null
  }

  const start = match.index
  const afterHeading = start + match[0].length
  return { start, end: afterHeading }
}

export function addTodoItemToMarkdown(markdown: string, rawItem: string): { content: string; added: boolean } {
  const item = normalizeTodoItemText(rawItem)
  if (item.length === 0) {
    return { content: markdown, added: false }
  }

  const taskLine = toProjectTodoTaskLine(item)
  if (markdown.includes(taskLine)) {
    return { content: markdown, added: false }
  }

  const trimmed = markdown.trim()
  if (trimmed.length === 0) {
    return { content: buildDefaultProjectTodoMarkdown(item), added: true }
  }

  const activeHeading = findActiveHeadingRange(markdown)
  if (activeHeading) {
    const before = markdown.slice(0, activeHeading.end)
    const after = markdown.slice(activeHeading.end)
    let normalizedAfter = after.startsWith('\n\n')
      ? after.slice(1)
      : after.startsWith('\n')
        ? after
        : `\n${after}`

    const placeholderLine = `\n${CT_PROJECT_TODO_PLACEHOLDER_LINE}`
    if (normalizedAfter.startsWith(`${placeholderLine}\n`)) {
      normalizedAfter = normalizedAfter.slice(placeholderLine.length)
    } else if (normalizedAfter.trim() === CT_PROJECT_TODO_PLACEHOLDER_LINE) {
      normalizedAfter = '\n'
    }

    return {
      content: `${before}\n${taskLine}${normalizedAfter}`,
      added: true,
    }
  }

  const separator = markdown.endsWith('\n') ? '' : '\n'
  return {
    content: `${markdown}${separator}\n${CT_PROJECT_TODO_ACTIVE_HEADING}\n${taskLine}\n`,
    added: true,
  }
}
