import { dirname, resolve } from 'path'
import { getFsImplementation } from '../../utils/fsOperations.js'
import { execFileNoThrowWithCwd } from '../../utils/execFileNoThrow.js'
import { findCanonicalGitRoot, getIsClean, gitExe } from '../../utils/git.js'
import type { AutoworkPlanChunk, AutoworkPlanParseFailure } from './planParser.js'
import { parseAutoworkPlanFile } from './planParser.js'
import type { AutoworkRunMode } from './state.js'

const REQUIRED_GITIGNORE_ENTRIES = [
  '.env',
  '.env.*',
  '.codex/',
  '.claude/',
  '.mcp.json',
  '/credentials.json',
] as const

const FORBIDDEN_TRACKED_PATHSPECS = [
  '.env',
  '.env.*',
  '.codex',
  '.codex/**',
  '.claude',
  '.claude/**',
  '.mcp.json',
  'auth.json',
  'credentials.json',
  'oauth.json',
  'oauth.local.json',
  'token.json',
  'tokens.json',
] as const

export type AutoworkEligibilityCheckName =
  | 'git-repo'
  | 'clean-tree'
  | 'plan-file'
  | 'plan-parse'
  | 'pending-chunks'
  | 'ignore-hygiene'
  | 'forbidden-tracked-files'

export type AutoworkEligibilityCheck = {
  name: AutoworkEligibilityCheckName
  ok: boolean
  summary: string
}

export type AutoworkEligibilityFailureCode =
  | 'not_in_git_repo'
  | 'dirty_worktree'
  | 'missing_plan_file'
  | 'plan_parse_failed'
  | 'no_pending_chunks'
  | 'ignore_hygiene_failed'
  | 'forbidden_tracked_files'

export type AutoworkEligibilityFailure = {
  ok: false
  code: AutoworkEligibilityFailureCode
  message: string
  failedCheck: AutoworkEligibilityCheckName
  repoRoot: string | null
  planPath: string
  checks: AutoworkEligibilityCheck[]
  parseFailure?: AutoworkPlanParseFailure
}

export type AutoworkEligibilitySuccess = {
  ok: true
  repoRoot: string
  planPath: string
  checks: AutoworkEligibilityCheck[]
  parsedPlan: {
    path: string
    chunks: AutoworkPlanChunk[]
    pendingChunkIds: string[]
  }
}

export type AutoworkEligibilityResult =
  | AutoworkEligibilityFailure
  | AutoworkEligibilitySuccess

function fail(
  code: AutoworkEligibilityFailureCode,
  message: string,
  failedCheck: AutoworkEligibilityCheckName,
  repoRoot: string | null,
  planPath: string,
  checks: AutoworkEligibilityCheck[],
  parseFailure?: AutoworkPlanParseFailure,
): AutoworkEligibilityFailure {
  return {
    ok: false,
    code,
    message,
    failedCheck,
    repoRoot,
    planPath,
    checks,
    parseFailure,
  }
}

function normalizeLines(value: string): string[] {
  return value
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
}

async function getTrackedForbiddenFiles(repoRoot: string): Promise<string[]> {
  const { stdout, code } = await execFileNoThrowWithCwd(
    gitExe(),
    [
      '--no-optional-locks',
      'ls-files',
      '--cached',
      '--full-name',
      '--',
      ...FORBIDDEN_TRACKED_PATHSPECS,
    ],
    { cwd: repoRoot },
  )

  if (code !== 0) {
    return []
  }

  return Array.from(new Set(normalizeLines(stdout)))
}

function findMissingIgnoreEntries(repoRoot: string): string[] {
  const gitignorePath = resolve(repoRoot, '.gitignore')
  const fs = getFsImplementation()
  if (!fs.existsSync(gitignorePath)) {
    return [...REQUIRED_GITIGNORE_ENTRIES]
  }

  const content = fs.readFileSync(gitignorePath, { encoding: 'utf-8' })
  const lines = new Set(normalizeLines(content))
  return REQUIRED_GITIGNORE_ENTRIES.filter(entry => !lines.has(entry))
}

export type AutoworkHygieneStatus = {
  ok: boolean
  missingIgnoreEntries: string[]
  forbiddenTrackedFiles: string[]
}

export async function assessAutoworkHygiene(
  repoRoot: string,
): Promise<AutoworkHygieneStatus> {
  const missingIgnoreEntries = findMissingIgnoreEntries(repoRoot)
  const forbiddenTrackedFiles = await getTrackedForbiddenFiles(repoRoot)

  return {
    ok:
      missingIgnoreEntries.length === 0 && forbiddenTrackedFiles.length === 0,
    missingIgnoreEntries,
    forbiddenTrackedFiles,
  }
}

export async function assessAutoworkEligibility(
  planPath: string,
  runMode: AutoworkRunMode = 'safe',
): Promise<AutoworkEligibilityResult> {
  const resolvedPlanPath = resolve(planPath)
  const checks: AutoworkEligibilityCheck[] = []
  const repoRoot = findCanonicalGitRoot(dirname(resolvedPlanPath))

  if (!repoRoot) {
    checks.push({
      name: 'git-repo',
      ok: false,
      summary: 'Current working context is not inside a git repository.',
    })
    return fail(
      'not_in_git_repo',
      'Autowork requires a git repository before it can start.',
      'git-repo',
      null,
      resolvedPlanPath,
      checks,
    )
  }

  checks.push({
    name: 'git-repo',
    ok: true,
    summary: `Repository root: ${repoRoot}`,
  })

  const fs = getFsImplementation()
  if (!fs.existsSync(resolvedPlanPath)) {
    checks.push({
      name: 'plan-file',
      ok: false,
      summary: `Plan file is missing: ${resolvedPlanPath}`,
    })
    return fail(
      'missing_plan_file',
      'Autowork requires a tracked dated plan file before it can start.',
      'plan-file',
      repoRoot,
      resolvedPlanPath,
      checks,
    )
  }

  checks.push({
    name: 'plan-file',
    ok: true,
    summary: `Plan file exists: ${resolvedPlanPath}`,
  })

  const hygiene = await assessAutoworkHygiene(repoRoot)
  if (hygiene.missingIgnoreEntries.length > 0) {
    checks.push({
      name: 'ignore-hygiene',
      ok: false,
      summary: `Missing .gitignore entries: ${hygiene.missingIgnoreEntries.join(', ')}`,
    })
    return fail(
      'ignore_hygiene_failed',
      'Autowork requires basic ignore hygiene before it can start.',
      'ignore-hygiene',
      repoRoot,
      resolvedPlanPath,
      checks,
    )
  }

  checks.push({
    name: 'ignore-hygiene',
    ok: true,
    summary: '.gitignore includes the required local-secret guardrails.',
  })

  if (hygiene.forbiddenTrackedFiles.length > 0) {
    checks.push({
      name: 'forbidden-tracked-files',
      ok: false,
      summary: `Tracked local-secret paths found: ${hygiene.forbiddenTrackedFiles.join(', ')}`,
    })
    return fail(
      'forbidden_tracked_files',
      'Autowork refused to start because tracked local-secret paths were detected.',
      'forbidden-tracked-files',
      repoRoot,
      resolvedPlanPath,
      checks,
    )
  }

  checks.push({
    name: 'forbidden-tracked-files',
    ok: true,
    summary: 'No obvious tracked local-secret paths were detected.',
  })

  const parsedPlan = await parseAutoworkPlanFile(resolvedPlanPath)
  if (!parsedPlan.ok) {
    checks.push({
      name: 'plan-parse',
      ok: false,
      summary: parsedPlan.message,
    })
    return fail(
      'plan_parse_failed',
      'Autowork plan failed the executable plan contract.',
      'plan-parse',
      repoRoot,
      resolvedPlanPath,
      checks,
      parsedPlan,
    )
  }

  checks.push({
    name: 'plan-parse',
    ok: true,
    summary: `Plan parsed successfully with ${parsedPlan.chunks.length} chunks.`,
  })

  const pendingChunkIds = parsedPlan.chunks
    .filter(chunk => chunk.status === 'pending')
    .map(chunk => chunk.id)

  if (pendingChunkIds.length === 0) {
    checks.push({
      name: 'pending-chunks',
      ok: false,
      summary: 'Plan parsed successfully but does not contain any pending chunks.',
    })
    return fail(
      'no_pending_chunks',
      'Autowork needs at least one pending chunk before it can start.',
      'pending-chunks',
      repoRoot,
      resolvedPlanPath,
      checks,
    )
  }

  checks.push({
    name: 'pending-chunks',
    ok: true,
    summary: `Pending chunks: ${pendingChunkIds.join(', ')}`,
  })

  const isClean = await getIsClean()
  if (!isClean) {
    checks.push({
      name: 'clean-tree',
      ok: false,
      summary:
        runMode === 'dangerous'
          ? 'Working tree is not clean. Dangerous mode may continue, but this is recorded as checkpoint debt.'
          : 'Working tree is not clean. Commit, stash, or remove changes before autowork starts.',
    })

    if (runMode !== 'dangerous') {
      return fail(
        'dirty_worktree',
        'Autowork safe mode requires a clean working tree before the first chunk.',
        'clean-tree',
        repoRoot,
        resolvedPlanPath,
        checks,
      )
    }
  } else {
    checks.push({
      name: 'clean-tree',
      ok: true,
      summary: 'Working tree is clean.',
    })
  }

  return {
    ok: true,
    repoRoot,
    planPath: resolvedPlanPath,
    checks,
    parsedPlan: {
      path: parsedPlan.path,
      chunks: parsedPlan.chunks,
      pendingChunkIds,
    },
  }
}
