function truncateSingleLine(text: string, maxLength: number): string {
  const firstLine = text.split('\n', 1)[0] ?? ''
  const needsEllipsis = text.includes('\n') || firstLine.length > maxLength

  if (!needsEllipsis) {
    return firstLine
  }

  if (maxLength <= 1) {
    return '…'
  }

  return `${firstLine.slice(0, maxLength - 1)}…`
}

export function normalizeSendMessageSummary(
  summary: string | undefined,
  content: string,
): string | undefined {
  const trimmedSummary = summary?.trim()
  if (trimmedSummary) {
    return trimmedSummary
  }

  const trimmedContent = content.trim()
  return trimmedContent.length > 0
    ? truncateSingleLine(trimmedContent, 50)
    : undefined
}
