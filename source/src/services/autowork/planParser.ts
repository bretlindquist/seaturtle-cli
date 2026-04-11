import { dirname, relative, resolve, sep } from 'path'
import { execFileNoThrowWithCwd } from '../../utils/execFileNoThrow.js'
import { getFsImplementation } from '../../utils/fsOperations.js'
import { findCanonicalGitRoot, gitExe } from '../../utils/git.js'

const EXECUTABLE_PLAN_FILENAME_REGEX = /^\d{4}-\d{2}-\d{2}-.+-state\.md$/u
const CHUNK_HEADER_REGEX = /^#{2,6}\s+Chunk\s+(.+?)\s*$/gmu

const FIELD_ALIASES = {
  status: ['Status'],
  purpose: ['Purpose'],
  files: ['Files', 'Files/areas'],
  dependencies: ['Dependencies'],
  risks: ['Risks'],
  validation: ['Validation'],
  done: ['Done'],
} as const

const ALLOWED_CHUNK_STATUSES = new Set([
  'pending',
  'in-progress',
  'implemented-but-unverified',
  'successful',
  'completed',
  'failed',
  'blocked',
] as const)

type ChunkFieldName = keyof typeof FIELD_ALIASES

export type AutoworkChunkStatus =
  | 'pending'
  | 'in-progress'
  | 'implemented-but-unverified'
  | 'successful'
  | 'completed'
  | 'failed'
  | 'blocked'

export type AutoworkPlanChunk = {
  id: string
  name: string
  status: AutoworkChunkStatus
  purpose: string
  files: string[]
  dependencies: string[]
  risks: string[]
  validation: string
  done: string
  startLine: number
}

export type AutoworkPlanParseFailure = {
  ok: false
  path: string
  code: string
  message: string
  chunkId?: string
  line?: number
}

export type AutoworkPlanParseSuccess = {
  ok: true
  path: string
  repoRoot: string
  chunks: AutoworkPlanChunk[]
}

export type AutoworkPlanParseResult =
  | AutoworkPlanParseFailure
  | AutoworkPlanParseSuccess

function isAllowedChunkStatus(value: string): value is AutoworkChunkStatus {
  return ALLOWED_CHUNK_STATUSES.has(value as AutoworkChunkStatus)
}

function getLabelToFieldMap(): Map<string, ChunkFieldName> {
  const map = new Map<string, ChunkFieldName>()
  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as Array<
    [ChunkFieldName, readonly string[]]
  >) {
    for (const alias of aliases) {
      map.set(alias.toLowerCase(), field)
    }
  }
  return map
}

const LABEL_TO_FIELD = getLabelToFieldMap()

function getLineNumber(content: string, index: number): number {
  return content.slice(0, index).split('\n').length
}

function normalizeMultilineField(value: string): string {
  return value
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .join(' ')
    .trim()
}

function splitListField(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split('\n')
        .flatMap(line => line.split(','))
        .map(entry => entry.replace(/^[-*]\s+/, '').trim())
        .filter(Boolean),
    ),
  )
}

function fail(
  path: string,
  code: string,
  message: string,
  options?: { chunkId?: string; line?: number },
): AutoworkPlanParseFailure {
  return {
    ok: false,
    path,
    code,
    message,
    chunkId: options?.chunkId,
    line: options?.line,
  }
}

function parseChunkFields(
  path: string,
  chunkName: string,
  chunkContent: string,
  startLine: number,
): AutoworkPlanParseFailure | Record<ChunkFieldName, string> {
  const values: Partial<Record<ChunkFieldName, string[]>> = {}
  const lines = chunkContent.split('\n')
  let currentField: ChunkFieldName | null = null

  for (let index = 0; index < lines.length; index++) {
    const rawLine = lines[index] ?? ''
    const line = rawLine.trimEnd()
    const trimmed = line.trim()
    const lineNumber = startLine + index + 1

    if (!trimmed) {
      continue
    }

    const fieldMatch = trimmed.match(/^([A-Za-z][A-Za-z/ -]*):\s*(.*)$/u)
    if (fieldMatch) {
      const label = fieldMatch[1]?.trim().toLowerCase()
      const initialValue = fieldMatch[2]?.trim() ?? ''
      const field = label ? LABEL_TO_FIELD.get(label) : undefined
      if (!field) {
        return fail(
          path,
          'unknown_chunk_field',
          `Chunk ${chunkName} contains unknown field "${fieldMatch[1]?.trim()}".`,
          { chunkId: chunkName, line: lineNumber },
        )
      }
      currentField = field
      values[field] = initialValue ? [initialValue] : []
      continue
    }

    if (!currentField) {
      return fail(
        path,
        'unexpected_chunk_text',
        `Chunk ${chunkName} contains freeform text outside the required fields.`,
        { chunkId: chunkName, line: lineNumber },
      )
    }

    values[currentField] ??= []
    values[currentField]!.push(trimmed)
  }

  const requiredFields = Object.keys(FIELD_ALIASES) as ChunkFieldName[]
  for (const field of requiredFields) {
    const fieldValue = normalizeMultilineField((values[field] ?? []).join('\n'))
    if (!fieldValue) {
      return fail(
        path,
        'missing_chunk_field',
        `Chunk ${chunkName} is missing required field "${field}".`,
        { chunkId: chunkName, line: startLine },
      )
    }
  }

  return {
    status: normalizeMultilineField((values.status ?? []).join('\n')),
    purpose: normalizeMultilineField((values.purpose ?? []).join('\n')),
    files: (values.files ?? []).join('\n'),
    dependencies: (values.dependencies ?? []).join('\n'),
    risks: (values.risks ?? []).join('\n'),
    validation: normalizeMultilineField((values.validation ?? []).join('\n')),
    done: normalizeMultilineField((values.done ?? []).join('\n')),
  }
}

function parseExecutableChunks(
  path: string,
  content: string,
): AutoworkPlanParseFailure | AutoworkPlanChunk[] {
  const matches = Array.from(content.matchAll(CHUNK_HEADER_REGEX))
  if (matches.length === 0) {
    return fail(
      path,
      'missing_chunk_headers',
      'Executable autowork plan must contain stable markdown chunk headers.',
    )
  }

  const chunks: AutoworkPlanChunk[] = []
  const seenChunkIds = new Set<string>()

  for (let index = 0; index < matches.length; index++) {
    const match = matches[index]
    const headerName = match[1]?.trim() ?? ''
    const matchIndex = match.index ?? 0
    const chunkBodyStart = matchIndex + match[0].length
    const chunkBodyEnd =
      index + 1 < matches.length
        ? (matches[index + 1]?.index ?? content.length)
        : content.length
    const chunkContent = content.slice(chunkBodyStart, chunkBodyEnd)
    const startLine = getLineNumber(content, matchIndex)

    if (!headerName) {
      return fail(
        path,
        'invalid_chunk_header',
        'Executable autowork plan contains an empty chunk header.',
        { line: startLine },
      )
    }

    if (seenChunkIds.has(headerName)) {
      return fail(
        path,
        'duplicate_chunk_id',
        `Executable autowork plan contains duplicate chunk header "${headerName}".`,
        { chunkId: headerName, line: startLine },
      )
    }
    seenChunkIds.add(headerName)

    if (!chunkContent.trim()) {
      return fail(
        path,
        'empty_chunk_body',
        `Chunk ${headerName} has no executable body.`,
        { chunkId: headerName, line: startLine },
      )
    }

    const parsedFields = parseChunkFields(path, headerName, chunkContent, startLine)
    if (!('status' in parsedFields)) {
      return parsedFields
    }

    const status = parsedFields.status.toLowerCase()
    if (!isAllowedChunkStatus(status)) {
      return fail(
        path,
        'invalid_chunk_status',
        `Chunk ${headerName} has unsupported status "${parsedFields.status}".`,
        { chunkId: headerName, line: startLine },
      )
    }

    chunks.push({
      id: headerName,
      name: headerName,
      status,
      purpose: parsedFields.purpose,
      files: splitListField(parsedFields.files),
      dependencies: splitListField(parsedFields.dependencies),
      risks: splitListField(parsedFields.risks),
      validation: parsedFields.validation,
      done: parsedFields.done,
      startLine,
    })
  }

  return chunks
}

async function isTrackedPlanFile(path: string, repoRoot: string): Promise<boolean> {
  const gitPath = relative(repoRoot, path).split(sep).join('/')
  const { code } = await execFileNoThrowWithCwd(
    gitExe(),
    ['--no-optional-locks', 'ls-files', '--error-unmatch', gitPath],
    { cwd: repoRoot },
  )
  return code === 0
}

export async function parseAutoworkPlanFile(
  path: string,
): Promise<AutoworkPlanParseResult> {
  const resolvedPath = resolve(path)
  const filename = resolvedPath.split(sep).pop() ?? ''
  if (!EXECUTABLE_PLAN_FILENAME_REGEX.test(filename)) {
    return fail(
      resolvedPath,
      'invalid_plan_filename',
      'Autowork requires a tracked dated plan file ending in -state.md.',
    )
  }

  const fs = getFsImplementation()
  if (!fs.existsSync(resolvedPath)) {
    return fail(
      resolvedPath,
      'missing_plan_file',
      'Autowork plan file does not exist.',
    )
  }

  const repoRoot = findCanonicalGitRoot(dirname(resolvedPath))
  if (!repoRoot) {
    return fail(
      resolvedPath,
      'plan_not_in_git_repo',
      'Autowork plan file must live inside a git repository.',
    )
  }

  if (!(await isTrackedPlanFile(resolvedPath, repoRoot))) {
    return fail(
      resolvedPath,
      'plan_not_tracked',
      'Autowork plan file must be tracked by git before execution can begin.',
    )
  }

  const content = fs.readFileSync(resolvedPath, { encoding: 'utf-8' })
  const parsedChunks = parseExecutableChunks(resolvedPath, content)
  if (!Array.isArray(parsedChunks)) {
    return parsedChunks
  }

  return {
    ok: true,
    path: resolvedPath,
    repoRoot,
    chunks: parsedChunks,
  }
}
