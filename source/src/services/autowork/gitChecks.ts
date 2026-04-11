import { dirname, resolve } from 'path'
import { execFileNoThrowWithCwd } from '../../utils/execFileNoThrow.js'
import { findCanonicalGitRoot, gitExe } from '../../utils/git.js'

export type AutoworkGitSnapshot = {
  repoRoot: string
  headSha: string | null
  statusShort: string[]
}

export type AutoworkGitCheckFailureCode =
  | 'not_in_git_repo'
  | 'missing_head'
  | 'dirty_worktree_before_chunk'
  | 'no_new_commit'
  | 'unexpected_head_after_chunk'
  | 'dirty_worktree_after_commit'

export type AutoworkGitCheckFailure = {
  ok: false
  code: AutoworkGitCheckFailureCode
  message: string
  repoRoot: string | null
  snapshot: AutoworkGitSnapshot | null
}

export type AutoworkGitCheckSuccess = {
  ok: true
  repoRoot: string
  snapshot: AutoworkGitSnapshot
}

export type AutoworkGitCheckResult =
  | AutoworkGitCheckFailure
  | AutoworkGitCheckSuccess

function normalizeLines(value: string): string[] {
  return value
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
}

async function getGitStatusShort(repoRoot: string): Promise<string[]> {
  const { stdout } = await execFileNoThrowWithCwd(
    gitExe(),
    ['--no-optional-locks', 'status', '--short'],
    { cwd: repoRoot, preserveOutputOnError: false },
  )

  return normalizeLines(stdout)
}

async function getHeadSha(repoRoot: string): Promise<string | null> {
  const { stdout, code } = await execFileNoThrowWithCwd(
    gitExe(),
    ['rev-parse', 'HEAD'],
    { cwd: repoRoot, preserveOutputOnError: false },
  )

  if (code !== 0) {
    return null
  }

  const headSha = stdout.trim()
  return headSha || null
}

function fail(
  code: AutoworkGitCheckFailureCode,
  message: string,
  repoRoot: string | null,
  snapshot: AutoworkGitSnapshot | null,
): AutoworkGitCheckFailure {
  return {
    ok: false,
    code,
    message,
    repoRoot,
    snapshot,
  }
}

export async function captureAutoworkGitSnapshot(
  repoRootOrPath: string,
): Promise<AutoworkGitCheckResult> {
  const resolvedPath = resolve(repoRootOrPath)
  const repoRoot =
    findCanonicalGitRoot(resolvedPath) ??
    findCanonicalGitRoot(dirname(resolvedPath))

  if (!repoRoot) {
    return fail(
      'not_in_git_repo',
      'Autowork git checks require a git repository.',
      null,
      null,
    )
  }

  const [headSha, statusShort] = await Promise.all([
    getHeadSha(repoRoot),
    getGitStatusShort(repoRoot),
  ])

  const snapshot: AutoworkGitSnapshot = {
    repoRoot,
    headSha,
    statusShort,
  }

  return {
    ok: true,
    repoRoot,
    snapshot,
  }
}

export async function verifyAutoworkPreChunkGitState(
  repoRootOrPath: string,
): Promise<AutoworkGitCheckResult> {
  const captured = await captureAutoworkGitSnapshot(repoRootOrPath)
  if (!captured.ok) {
    return captured
  }

  if (!captured.snapshot.headSha) {
    return fail(
      'missing_head',
      'Autowork requires a valid HEAD commit before a chunk can start.',
      captured.repoRoot,
      captured.snapshot,
    )
  }

  if (captured.snapshot.statusShort.length > 0) {
    return fail(
      'dirty_worktree_before_chunk',
      'Autowork safe mode requires a clean working tree before a chunk can start.',
      captured.repoRoot,
      captured.snapshot,
    )
  }

  return captured
}

export async function verifyAutoworkPostChunkCommit(
  repoRootOrPath: string,
  beforeHeadSha: string,
  expectedHeadSha?: string | null,
): Promise<AutoworkGitCheckResult> {
  const captured = await captureAutoworkGitSnapshot(repoRootOrPath)
  if (!captured.ok) {
    return captured
  }

  const currentHeadSha = captured.snapshot.headSha
  if (!currentHeadSha) {
    return fail(
      'missing_head',
      'Autowork could not resolve HEAD after chunk execution.',
      captured.repoRoot,
      captured.snapshot,
    )
  }

  if (currentHeadSha === beforeHeadSha) {
    return fail(
      'no_new_commit',
      'Autowork requires a new commit after chunk execution before progression can continue.',
      captured.repoRoot,
      captured.snapshot,
    )
  }

  if (expectedHeadSha && currentHeadSha !== expectedHeadSha) {
    return fail(
      'unexpected_head_after_chunk',
      'Autowork detected a post-chunk HEAD that does not match the expected commit.',
      captured.repoRoot,
      captured.snapshot,
    )
  }

  return captured
}

export async function verifyAutoworkPostCommitCleanTree(
  repoRootOrPath: string,
  expectedHeadSha?: string | null,
): Promise<AutoworkGitCheckResult> {
  const captured = await captureAutoworkGitSnapshot(repoRootOrPath)
  if (!captured.ok) {
    return captured
  }

  const currentHeadSha = captured.snapshot.headSha
  if (!currentHeadSha) {
    return fail(
      'missing_head',
      'Autowork could not resolve HEAD after commit.',
      captured.repoRoot,
      captured.snapshot,
    )
  }

  if (expectedHeadSha && currentHeadSha !== expectedHeadSha) {
    return fail(
      'unexpected_head_after_chunk',
      'Autowork detected a post-commit HEAD that does not match the expected commit.',
      captured.repoRoot,
      captured.snapshot,
    )
  }

  if (captured.snapshot.statusShort.length > 0) {
    return fail(
      'dirty_worktree_after_commit',
      'Autowork requires a clean working tree after the checkpoint commit.',
      captured.repoRoot,
      captured.snapshot,
    )
  }

  return captured
}

