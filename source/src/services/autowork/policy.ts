import type {
  AutoworkEligibilityCheckName,
  AutoworkEligibilityFailureCode,
} from './eligibility.js'
import type { AutoworkGitCheckFailureCode } from './gitChecks.js'
import type { AutoworkRunMode } from './state.js'

export type AutoworkRelaxableFailureCode =
  | 'dirty_worktree'
  | 'dirty_worktree_before_chunk'
  | 'validation_failed'
  | 'no_new_commit'
  | 'dirty_worktree_after_commit'

export type AutoworkRelaxableFailedCheck =
  | 'clean-tree'
  | 'validation'
  | 'commit-gate'

export type AutoworkRunPolicy = {
  runMode: AutoworkRunMode
  retainedHardFailureCodes: readonly string[]
  relaxableFailureCodes: readonly AutoworkRelaxableFailureCode[]
  relaxableFailedChecks: readonly AutoworkRelaxableFailedCheck[]
}

const RETAINED_HARD_FAILURE_CODES = [
  'not_in_git_repo',
  'missing_plan_file',
  'plan_parse_failed',
  'no_pending_chunks',
  'ignore_hygiene_failed',
  'forbidden_tracked_files',
  'plan_not_in_git_repo',
  'plan_not_tracked',
  'invalid_plan_filename',
  'missing_required_section',
  'duplicate_chunk_id',
] as const

const DANGEROUS_RELAXABLE_FAILURE_CODES = [
  'dirty_worktree',
  'dirty_worktree_before_chunk',
  'validation_failed',
  'no_new_commit',
  'dirty_worktree_after_commit',
] as const

const DANGEROUS_RELAXABLE_FAILED_CHECKS = [
  'clean-tree',
  'validation',
  'commit-gate',
] as const

type FailureCode =
  | AutoworkEligibilityFailureCode
  | AutoworkGitCheckFailureCode
  | AutoworkRelaxableFailureCode
  | string

type FailedCheck =
  | AutoworkEligibilityCheckName
  | AutoworkRelaxableFailedCheck
  | string

export function getAutoworkRunPolicy(runMode: AutoworkRunMode): AutoworkRunPolicy {
  return {
    runMode,
    retainedHardFailureCodes: RETAINED_HARD_FAILURE_CODES,
    relaxableFailureCodes:
      runMode === 'dangerous' ? DANGEROUS_RELAXABLE_FAILURE_CODES : [],
    relaxableFailedChecks:
      runMode === 'dangerous' ? DANGEROUS_RELAXABLE_FAILED_CHECKS : [],
  }
}

export function isAutoworkHardFailureCode(
  runMode: AutoworkRunMode,
  code: FailureCode,
): boolean {
  const policy = getAutoworkRunPolicy(runMode)
  if (policy.relaxableFailureCodes.includes(code as AutoworkRelaxableFailureCode)) {
    return false
  }

  return policy.retainedHardFailureCodes.includes(code)
}

export function isAutoworkRelaxableFailureCode(
  runMode: AutoworkRunMode,
  code: FailureCode,
): boolean {
  return getAutoworkRunPolicy(runMode).relaxableFailureCodes.includes(
    code as AutoworkRelaxableFailureCode,
  )
}

export function isAutoworkRelaxableFailedCheck(
  runMode: AutoworkRunMode,
  failedCheck: FailedCheck | undefined,
): boolean {
  if (!failedCheck) {
    return false
  }

  return getAutoworkRunPolicy(runMode).relaxableFailedChecks.includes(
    failedCheck as AutoworkRelaxableFailedCheck,
  )
}
