export function isDisallowedMetaPrompt(input: string): boolean {
  const trimmed = input.trim()
  if (!trimmed) {
    return false
  }

  if (/^clear$/iu.test(trimmed)) {
    return true
  }

  if (/^cd\s+.+?\s*&&\s*clear$/iu.test(trimmed)) {
    return true
  }

  return false
}
