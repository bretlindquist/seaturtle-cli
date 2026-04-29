import { homedir } from 'os'
import { join, resolve } from 'path'
import { findCanonicalGitRoot } from '../../utils/git.js'
import {
  CT_ARCHIVES_FILENAME,
  CT_ATTUNEMENT_FILENAME,
  CT_AUTOWORK_STATE_FILENAME,
  CT_BOOTSTRAP_FILENAME,
  CT_DIRNAME,
  CT_FEEDBACK_FILENAME,
  CT_GAME_STATE_FILENAME,
  CT_IDENTITY_FILENAME,
  CT_ROLE_FILENAME,
  CT_ROUTER_FILENAME,
  CT_SESSION_FILENAME,
  CT_SOUL_FILENAME,
  CT_STATE_ARCHIVE_DIRNAME,
  CT_STATE_DIRNAME,
  CT_TODO_FILENAME,
  CT_USER_FILENAME,
  CT_WORK_EXECUTION_FILENAME,
  CT_WORK_INDEX_FILENAME,
  CT_WORK_INTENT_FILENAME,
  CT_WORK_PHASE_FILENAME,
  CT_WORK_PLAN_FILENAME,
  CT_WORK_RESEARCH_FILENAME,
  CT_WORK_VERIFICATION_FILENAME,
  getCtArchivedWorkDir as getCtArchivedWorkDirForRoot,
  getCtArchivedWorkExecutionPath as getCtArchivedWorkExecutionPathForRoot,
  getCtArchivedWorkIntentPath as getCtArchivedWorkIntentPathForRoot,
  getCtArchivedWorkPhasePath as getCtArchivedWorkPhasePathForRoot,
  getCtArchivedWorkPlanPath as getCtArchivedWorkPlanPathForRoot,
  getCtArchivedWorkResearchPath as getCtArchivedWorkResearchPathForRoot,
  getCtArchivedWorkVerificationPath as getCtArchivedWorkVerificationPathForRoot,
  getCtArchivesPath as getCtArchivesPathForRoot,
  getCtAttunementPath as getCtAttunementPathForRoot,
  getCtAutoworkStatePath as getCtAutoworkStatePathForRoot,
  getCtBootstrapPath as getCtBootstrapPathForRoot,
  getCtCompatBridgePath as getCtCompatBridgePathForRoot,
  getCtFeedbackPath as getCtFeedbackPathForRoot,
  getCtGameStatePath as getCtGameStatePathForRoot,
  getCtIdentityPath as getCtIdentityPathForRoot,
  getCtProjectDir as getCtProjectDirForRoot,
  getCtRolePath as getCtRolePathForRoot,
  getCtRouterPath as getCtRouterPathForRoot,
  getCtSessionPath as getCtSessionPathForRoot,
  getCtSoulPath as getCtSoulPathForRoot,
  getCtStateArchiveDir as getCtStateArchiveDirForRoot,
  getCtStateDir as getCtStateDirForRoot,
  getCtTodoPath as getCtTodoPathForRoot,
  getCtUserPath as getCtUserPathForRoot,
  getCtWorkExecutionPath as getCtWorkExecutionPathForRoot,
  getCtWorkIndexPath as getCtWorkIndexPathForRoot,
  getCtWorkIntentPath as getCtWorkIntentPathForRoot,
  getCtWorkPhasePath as getCtWorkPhasePathForRoot,
  getCtWorkPlanPath as getCtWorkPlanPathForRoot,
  getCtWorkResearchPath as getCtWorkResearchPathForRoot,
  getCtWorkVerificationPath as getCtWorkVerificationPathForRoot,
} from './pathLayout.js'

export {
  CT_ARCHIVES_FILENAME,
  CT_ATTUNEMENT_FILENAME,
  CT_AUTOWORK_STATE_FILENAME,
  CT_BOOTSTRAP_FILENAME,
  CT_DIRNAME,
  CT_FEEDBACK_FILENAME,
  CT_GAME_STATE_FILENAME,
  CT_IDENTITY_FILENAME,
  CT_ROLE_FILENAME,
  CT_ROUTER_FILENAME,
  CT_SESSION_FILENAME,
  CT_SOUL_FILENAME,
  CT_STATE_ARCHIVE_DIRNAME,
  CT_STATE_DIRNAME,
  CT_TODO_FILENAME,
  CT_USER_FILENAME,
  CT_WORK_EXECUTION_FILENAME,
  CT_WORK_INDEX_FILENAME,
  CT_WORK_INTENT_FILENAME,
  CT_WORK_PHASE_FILENAME,
  CT_WORK_PLAN_FILENAME,
  CT_WORK_RESEARCH_FILENAME,
  CT_WORK_VERIFICATION_FILENAME,
} from './pathLayout.js'

function getStableOriginalCwd(): string {
  return process.env.SEATURTLE_ORIGINAL_CWD ?? process.cwd()
}

export function getCtProjectRoot(): string {
  return findCanonicalGitRoot(getStableOriginalCwd()) ?? resolve(getStableOriginalCwd())
}

export function getCtProjectDir(root: string = getCtProjectRoot()): string {
  return getCtProjectDirForRoot(root)
}

export function getCtRouterPath(root: string = getCtProjectRoot()): string {
  return getCtRouterPathForRoot(root)
}

export function getCtIdentityPath(root: string = getCtProjectRoot()): string {
  return getCtIdentityPathForRoot(root)
}

export function getCtSoulPath(root: string = getCtProjectRoot()): string {
  return getCtSoulPathForRoot(root)
}

export function getCtRolePath(root: string = getCtProjectRoot()): string {
  return getCtRolePathForRoot(root)
}

export function getCtUserPath(root: string = getCtProjectRoot()): string {
  return getCtUserPathForRoot(root)
}

export function getCtBootstrapPath(root: string = getCtProjectRoot()): string {
  return getCtBootstrapPathForRoot(root)
}

export function getCtSessionPath(root: string = getCtProjectRoot()): string {
  return getCtSessionPathForRoot(root)
}

export function getCtTodoPath(root: string = getCtProjectRoot()): string {
  return getCtTodoPathForRoot(root)
}

export function getCtFeedbackPath(root: string = getCtProjectRoot()): string {
  return getCtFeedbackPathForRoot(root)
}

export function getCtAttunementPath(root: string = getCtProjectRoot()): string {
  return getCtAttunementPathForRoot(root)
}

export function getCtStateDir(root: string = getCtProjectRoot()): string {
  return getCtStateDirForRoot(root)
}

export function getCtStateArchiveDir(
  root: string = getCtProjectRoot(),
): string {
  return getCtStateArchiveDirForRoot(root)
}

export function getCtArchivedWorkDir(
  workId: string,
  root: string = getCtProjectRoot(),
): string {
  return getCtArchivedWorkDirForRoot(workId, root)
}

export function getCtArchivesPath(root: string = getCtProjectRoot()): string {
  return getCtArchivesPathForRoot(root)
}

export function getCtGameStatePath(root: string = getCtProjectRoot()): string {
  return getCtGameStatePathForRoot(root)
}

export function getCtAutoworkStatePath(
  root: string = getCtProjectRoot(),
): string {
  return getCtAutoworkStatePathForRoot(root)
}

export function getCtWorkIndexPath(root: string = getCtProjectRoot()): string {
  return getCtWorkIndexPathForRoot(root)
}

export function getCtWorkIntentPath(root: string = getCtProjectRoot()): string {
  return getCtWorkIntentPathForRoot(root)
}

export function getCtWorkResearchPath(
  root: string = getCtProjectRoot(),
): string {
  return getCtWorkResearchPathForRoot(root)
}

export function getCtWorkPlanPath(root: string = getCtProjectRoot()): string {
  return getCtWorkPlanPathForRoot(root)
}

export function getCtWorkExecutionPath(
  root: string = getCtProjectRoot(),
): string {
  return getCtWorkExecutionPathForRoot(root)
}

export function getCtWorkVerificationPath(
  root: string = getCtProjectRoot(),
): string {
  return getCtWorkVerificationPathForRoot(root)
}

export function getCtWorkPhasePath(root: string = getCtProjectRoot()): string {
  return getCtWorkPhasePathForRoot(root)
}

export function getCtArchivedWorkIntentPath(
  workId: string,
  root: string = getCtProjectRoot(),
): string {
  return getCtArchivedWorkIntentPathForRoot(workId, root)
}

export function getCtArchivedWorkResearchPath(
  workId: string,
  root: string = getCtProjectRoot(),
): string {
  return getCtArchivedWorkResearchPathForRoot(workId, root)
}

export function getCtArchivedWorkPlanPath(
  workId: string,
  root: string = getCtProjectRoot(),
): string {
  return getCtArchivedWorkPlanPathForRoot(workId, root)
}

export function getCtArchivedWorkExecutionPath(
  workId: string,
  root: string = getCtProjectRoot(),
): string {
  return getCtArchivedWorkExecutionPathForRoot(workId, root)
}

export function getCtArchivedWorkVerificationPath(
  workId: string,
  root: string = getCtProjectRoot(),
): string {
  return getCtArchivedWorkVerificationPathForRoot(workId, root)
}

export function getCtArchivedWorkPhasePath(
  workId: string,
  root: string = getCtProjectRoot(),
): string {
  return getCtArchivedWorkPhasePathForRoot(workId, root)
}

export function getCtCompatBridgePath(root: string = getCtProjectRoot()): string {
  return getCtCompatBridgePathForRoot(root)
}

export function getCtGlobalDefaultsDir(): string {
  return join(homedir(), '.ct', 'defaults')
}

export function getCtGlobalIdentityOverridePath(): string {
  return join(getCtGlobalDefaultsDir(), CT_IDENTITY_FILENAME)
}

export function getCtGlobalSoulOverridePath(): string {
  return join(getCtGlobalDefaultsDir(), CT_SOUL_FILENAME)
}
