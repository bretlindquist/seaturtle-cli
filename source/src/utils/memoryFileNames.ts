export type InstructionMemoryKind = 'managed' | 'user' | 'project' | 'local'

const PREFERRED_MEMORY_FILE_NAMES: Record<InstructionMemoryKind, string> = {
  managed: 'SEATURTLE.md',
  user: 'SEATURTLE.md',
  project: 'SEATURTLE.md',
  local: 'SEATURTLE.local.md',
}

const LEGACY_MEMORY_FILE_NAMES: Record<InstructionMemoryKind, string[]> = {
  managed: ['SeaTurtle.md', 'CLAUDE.md'],
  user: ['SeaTurtle.md', 'CLAUDE.md'],
  project: ['SeaTurtle.md', 'CLAUDE.md'],
  local: ['SeaTurtle.local.md', 'CLAUDE.local.md'],
}

export function getPreferredMemoryFileName(
  kind: InstructionMemoryKind,
): string {
  return PREFERRED_MEMORY_FILE_NAMES[kind]
}

export function getLegacyMemoryFileName(
  kind: InstructionMemoryKind,
): string {
  return LEGACY_MEMORY_FILE_NAMES[kind][0]
}

export function getCandidateMemoryFileNames(
  kind: InstructionMemoryKind,
): string[] {
  const preferred = getPreferredMemoryFileName(kind)
  return [preferred, ...LEGACY_MEMORY_FILE_NAMES[kind]].filter(
    (value, index, values) => values.indexOf(value) === index,
  )
}

export function isInstructionMemoryFileName(name: string): boolean {
  return (
    name === 'SEATURTLE.md' ||
    name === 'SEATURTLE.local.md' ||
    name === 'SeaTurtle.md' ||
    name === 'SeaTurtle.local.md' ||
    name === 'CLAUDE.md' ||
    name === 'CLAUDE.local.md'
  )
}
