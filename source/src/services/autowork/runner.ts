import { dirname, resolve } from 'path'
import { execFileNoThrowWithCwd } from '../../utils/execFileNoThrow.js'
import { findCanonicalGitRoot, gitExe } from '../../utils/git.js'
import {
  assessAutoworkEligibility,
  assessAutoworkHygiene,
  type AutoworkEligibilityResult,
} from './eligibility.js'
import { selectAutoworkMode } from './modeSelection.js'
import {
  parseAutoworkPlanFile,
  type AutoworkPlanParseResult,
} from './planParser.js'
import {
  readAutoworkState,
  type AutoworkMode,
  type AutoworkStartupInspection,
  type AutoworkState,
} from './state.js'

async function getGitStatusShortLines(repoRoot: string): Promise<string[]> {
  const { stdout } = await execFileNoThrowWithCwd(
    gitExe(),
    ['--no-optional-locks', 'status', '--short'],
    { cwd: repoRoot, preserveOutputOnError: false },
  )

  return stdout
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
}

async function getCurrentBranch(repoRoot: string): Promise<string | null> {
  const { stdout, code } = await execFileNoThrowWithCwd(
    gitExe(),
    ['branch', '--show-current'],
    { cwd: repoRoot, preserveOutputOnError: false },
  )

  if (code !== 0) {
    return null
  }

  const branch = stdout.trim()
  return branch || null
}

async function getLatestRelevantCommits(
  repoRoot: string,
  limit: number = 5,
): Promise<string[]> {
  const { stdout, code } = await execFileNoThrowWithCwd(
    gitExe(),
    ['log', '--oneline', `-${String(limit)}`],
    { cwd: repoRoot, preserveOutputOnError: false },
  )

  if (code !== 0) {
    return []
  }

  return stdout
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
}

export type AutoworkStartupContext = {
  repoRoot: string | null
  planPath: string
  state: AutoworkState
  inspection: AutoworkStartupInspection
  parsedPlan: AutoworkPlanParseResult
  eligibility: AutoworkEligibilityResult
  mode: AutoworkMode
  modeReason: string
  nextPendingChunkId: string | null
}

export async function inspectAndSelectAutoworkMode(
  planPath: string,
): Promise<AutoworkStartupContext> {
  const resolvedPlanPath = resolve(planPath)
  const repoRoot = findCanonicalGitRoot(dirname(resolvedPlanPath))
  const state = readAutoworkState(repoRoot ?? undefined)

  const [branch, gitStatusShort, latestRelevantCommits, parsedPlan, eligibility, hygiene] =
    repoRoot
      ? await Promise.all([
          getCurrentBranch(repoRoot),
          getGitStatusShortLines(repoRoot),
          getLatestRelevantCommits(repoRoot),
          parseAutoworkPlanFile(resolvedPlanPath),
          assessAutoworkEligibility(resolvedPlanPath),
          assessAutoworkHygiene(repoRoot),
        ])
      : [
          null,
          [],
          [],
          ({
            ok: false,
            path: resolvedPlanPath,
            code: 'plan_not_in_git_repo',
            message: 'Autowork plan file must live inside a git repository.',
          } as const),
          ({
            ok: false,
            code: 'not_in_git_repo',
            message: 'Autowork requires a git repository before it can start.',
            failedCheck: 'git-repo',
            repoRoot: null,
            planPath: resolvedPlanPath,
            checks: [
              {
                name: 'git-repo',
                ok: false,
                summary: 'Current working context is not inside a git repository.',
              },
            ],
          } as const),
          {
            ok: false,
            missingIgnoreEntries: [],
            forbiddenTrackedFiles: [],
          },
        ]

  const inspection: AutoworkStartupInspection = {
    branch,
    gitStatusShort,
    latestRelevantCommits,
    hasUncommittedChanges: gitStatusShort.length > 0,
    hasExecutablePlanFile: parsedPlan.ok,
    hasRecentlyCompletedUnverifiedChunk:
      state.implementedButUnverified ||
      (parsedPlan.ok
        ? parsedPlan.chunks.some(
            chunk => chunk.status === 'implemented-but-unverified',
          )
        : false),
    validationKnownForLastChunk: state.lastValidationResult !== null,
    ignoreHygieneOk: hygiene.ok,
    capturedAt: Date.now(),
  }

  const decision = selectAutoworkMode(inspection, state, parsedPlan)

  return {
    repoRoot,
    planPath: resolvedPlanPath,
    state,
    inspection,
    parsedPlan,
    eligibility,
    mode: decision.mode,
    modeReason: decision.reason,
    nextPendingChunkId: decision.nextPendingChunkId,
  }
}
