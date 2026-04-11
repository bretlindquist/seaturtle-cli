import type { AutoworkPlanChunk } from './planParser.js'

const DEV_CHECK_COMMAND = 'npm run dev-check'
const OPENAI_CODEX_CHECK_COMMAND = 'npm run openai-codex-check'

const DOCS_ONLY_EXTENSIONS = new Set([
  '.md',
  '.mdx',
  '.txt',
  '.rst',
] as const)

const OPENAI_RUNTIME_PATH_PATTERNS = [
  /openai/i,
  /codex/i,
  /provider/i,
  /runtime/i,
  /auth/i,
  /services\/api\//i,
  /services\/oauth\//i,
  /commands\/login/i,
  /commands\/model/i,
  /commands\/effort/i,
] as const

export type AutoworkValidationCommand = {
  command: string
  reason: string
}

export type AutoworkValidationPlan = {
  commands: AutoworkValidationCommand[]
  source: 'explicit' | 'default'
  docsOnly: boolean
  summary: string
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function splitValidationLines(value: string): string[] {
  return value
    .split('\n')
    .map(line => line.trim())
    .flatMap(line => line.split(/[;,]/))
    .map(normalizeWhitespace)
    .filter(Boolean)
}

function isDocsOnlyPath(path: string): boolean {
  const normalized = path.trim().toLowerCase()
  if (!normalized) {
    return false
  }

  for (const extension of DOCS_ONLY_EXTENSIONS) {
    if (normalized.endsWith(extension)) {
      return true
    }
  }

  return normalized.startsWith('docs/') || normalized === 'readme.md'
}

function isDocsOnlyChunk(chunk: AutoworkPlanChunk): boolean {
  return chunk.files.length > 0 && chunk.files.every(isDocsOnlyPath)
}

function needsOpenAiRuntimeValidation(chunk: AutoworkPlanChunk): boolean {
  const corpus = [
    chunk.purpose,
    chunk.validation,
    chunk.done,
    ...chunk.files,
    ...chunk.dependencies,
    ...chunk.risks,
  ].join('\n')

  return OPENAI_RUNTIME_PATH_PATTERNS.some(pattern => pattern.test(corpus))
}

function dedupeCommands(
  commands: AutoworkValidationCommand[],
): AutoworkValidationCommand[] {
  const seen = new Set<string>()
  const deduped: AutoworkValidationCommand[] = []

  for (const command of commands) {
    if (seen.has(command.command)) {
      continue
    }
    seen.add(command.command)
    deduped.push(command)
  }

  return deduped
}

function getExplicitValidationCommands(
  chunk: AutoworkPlanChunk,
): AutoworkValidationCommand[] {
  const lowerValidation = chunk.validation.toLowerCase()

  if (
    lowerValidation.includes('no build required') ||
    lowerValidation.includes('docs-only') ||
    lowerValidation.includes('documentation only')
  ) {
    return []
  }

  const commands: AutoworkValidationCommand[] = []
  const validationLines = splitValidationLines(chunk.validation)

  for (const entry of validationLines) {
    const normalized = entry.toLowerCase()

    if (normalized === DEV_CHECK_COMMAND) {
      commands.push({
        command: DEV_CHECK_COMMAND,
        reason: `Chunk ${chunk.id} explicitly requests the canonical repo dev check.`,
      })
      continue
    }

    if (normalized === OPENAI_CODEX_CHECK_COMMAND) {
      commands.push({
        command: OPENAI_CODEX_CHECK_COMMAND,
        reason: `Chunk ${chunk.id} explicitly requests the OpenAI/Codex regression check.`,
      })
    }
  }

  return dedupeCommands(commands)
}

export function resolveAutoworkValidationPlan(
  chunk: AutoworkPlanChunk,
): AutoworkValidationPlan {
  const explicitCommands = getExplicitValidationCommands(chunk)

  if (explicitCommands.length > 0) {
    return {
      commands: explicitCommands,
      source: 'explicit',
      docsOnly: false,
      summary: `Chunk ${chunk.id} uses explicit validation from its plan metadata.`,
    }
  }

  if (isDocsOnlyChunk(chunk)) {
    return {
      commands: [],
      source: 'default',
      docsOnly: true,
      summary: `Chunk ${chunk.id} appears docs-only, so no build validation is required by default.`,
    }
  }

  const commands: AutoworkValidationCommand[] = [
    {
      command: DEV_CHECK_COMMAND,
      reason: `Chunk ${chunk.id} changes code, so the canonical repo dev check is required by default.`,
    },
  ]

  if (needsOpenAiRuntimeValidation(chunk)) {
    commands.push({
      command: OPENAI_CODEX_CHECK_COMMAND,
      reason: `Chunk ${chunk.id} touches OpenAI/runtime/provider surfaces, so the OpenAI/Codex regression check is also required.`,
    })
  }

  return {
    commands,
    source: 'default',
    docsOnly: false,
    summary:
      explicitCommands.length === 0
        ? `Chunk ${chunk.id} uses conservative default validation planning.`
        : `Chunk ${chunk.id} uses explicit validation planning.`,
  }
}

