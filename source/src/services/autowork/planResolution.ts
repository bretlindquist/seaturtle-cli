import { basename, join } from 'path'
import { execFileNoThrowWithCwd } from '../../utils/execFileNoThrow.js'
import { findCanonicalGitRoot, gitExe } from '../../utils/git.js'
import { getCtProjectRoot } from '../projectIdentity/paths.js'
import { readAutoworkState } from './state.js'

const EXECUTABLE_PLAN_FILENAME_REGEX = /^\d{4}-\d{2}-\d{2}-.+-state\.md$/u

export type AutoworkPlanResolutionResult =
  | {
      ok: true
      repoRoot: string
      planPath: string
      source: 'state' | 'tracked-root'
    }
  | {
      ok: false
      repoRoot: string | null
      code:
        | 'not_in_git_repo'
        | 'no_tracked_plan'
        | 'multiple_tracked_plans'
        | 'stale_state_plan'
      message: string
      candidates: string[]
    }

async function listTrackedRootStatePlans(repoRoot: string): Promise<string[]> {
  const { stdout, code } = await execFileNoThrowWithCwd(
    gitExe(),
    ['--no-optional-locks', 'ls-files', '--cached', '--full-name', '--', '*-state.md'],
    { cwd: repoRoot, preserveOutputOnError: false, shell: false },
  )

  if (code !== 0) {
    return []
  }

  return stdout
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .filter(candidate => !candidate.includes('/'))
    .filter(candidate => EXECUTABLE_PLAN_FILENAME_REGEX.test(basename(candidate)))
    .map(candidate => join(repoRoot, candidate))
}

export async function resolveActiveAutoworkPlanFile(
  root: string = getCtProjectRoot(),
): Promise<AutoworkPlanResolutionResult> {
  const repoRoot = findCanonicalGitRoot(root)
  if (!repoRoot) {
    return {
      ok: false,
      repoRoot: null,
      code: 'not_in_git_repo',
      message: 'Autowork requires a git repository before it can resolve a plan file.',
      candidates: [],
    }
  }

  const state = readAutoworkState(repoRoot)
  const trackedCandidates = await listTrackedRootStatePlans(repoRoot)

  if (state.sourcePlanPath) {
    const normalizedStatePath = join(repoRoot, basename(state.sourcePlanPath))
    if (trackedCandidates.includes(state.sourcePlanPath)) {
      return {
        ok: true,
        repoRoot,
        planPath: state.sourcePlanPath,
        source: 'state',
      }
    }

    if (trackedCandidates.includes(normalizedStatePath)) {
      return {
        ok: true,
        repoRoot,
        planPath: normalizedStatePath,
        source: 'state',
      }
    }

    return {
      ok: false,
      repoRoot,
      code: 'stale_state_plan',
      message:
        'Autowork state points to a plan file that is no longer tracked at the repo root.',
      candidates: trackedCandidates,
    }
  }

  if (trackedCandidates.length === 1) {
    return {
      ok: true,
      repoRoot,
      planPath: trackedCandidates[0]!,
      source: 'tracked-root',
    }
  }

  if (trackedCandidates.length === 0) {
    return {
      ok: false,
      repoRoot,
      code: 'no_tracked_plan',
      message:
        'No tracked root-level dated *-state.md plan file was found for autowork.',
      candidates: [],
    }
  }

  return {
    ok: false,
    repoRoot,
    code: 'multiple_tracked_plans',
    message:
      'Multiple tracked root-level dated *-state.md plan files exist; autowork needs one active source of truth.',
    candidates: trackedCandidates,
  }
}
