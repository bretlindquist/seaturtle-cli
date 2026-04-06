export type InstructionMemoryKind = 'managed' | 'user' | 'project' | 'local'

const PREFERRED_MEMORY_FILE_NAMES: Record<InstructionMemoryKind, string> = {
  managed: 'SeaTurtle.md',
  user: 'SeaTurtle.md',
  project: 'SeaTurtle.md',
  local: 'SeaTurtle.local.md',
}

const LEGACY_MEMORY_FILE_NAMES: Record<InstructionMemoryKind, string> = {
  managed: 'CLAUDE.md',
  user: 'CLAUDE.md',
  project: 'CLAUDE.md',
  local: 'CLAUDE.local.md',
}

export function getPreferredMemoryFileName(
  kind: InstructionMemoryKind,
): string {
  return PREFERRED_MEMORY_FILE_NAMES[kind]
}

export function getLegacyMemoryFileName(
  kind: InstructionMemoryKind,
): string {
  return LEGACY_MEMORY_FILE_NAMES[kind]
}

export function getCandidateMemoryFileNames(
  kind: InstructionMemoryKind,
): string[] {
  const preferred = getPreferredMemoryFileName(kind)
  const legacy = getLegacyMemoryFileName(kind)
  return preferred === legacy ? [preferred] : [preferred, legacy]
}

export function isInstructionMemoryFileName(name: string): boolean {
  return (
    name === 'SeaTurtle.md' ||
    name === 'SeaTurtle.local.md' ||
    name === 'CLAUDE.md' ||
    name === 'CLAUDE.local.md'
  )
}
