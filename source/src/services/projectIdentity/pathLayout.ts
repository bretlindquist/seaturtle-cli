import { join } from 'path'

export const CT_DIRNAME = '.ct'
export const CT_ROUTER_FILENAME = 'router.md'
export const CT_IDENTITY_FILENAME = 'identity.md'
export const CT_SOUL_FILENAME = 'soul.md'
export const CT_ROLE_FILENAME = 'role.md'
export const CT_USER_FILENAME = 'user.md'
export const CT_BOOTSTRAP_FILENAME = 'bootstrap.md'
export const CT_ATTUNEMENT_FILENAME = 'attunement.md'
export const CT_SESSION_FILENAME = 'session.md'
export const CT_TODO_FILENAME = 'todo.md'
export const CT_FEEDBACK_FILENAME = 'feedback.md'
export const CT_STATE_DIRNAME = 'state'
export const CT_STATE_ARCHIVE_DIRNAME = 'archive'
export const CT_ARCHIVES_FILENAME = 'archives.json'
export const CT_GAME_STATE_FILENAME = 'game-state.json'
export const CT_AUTOWORK_STATE_FILENAME = 'autowork-state.json'
export const CT_WORK_INDEX_FILENAME = 'work-index.json'
export const CT_WORK_INTENT_FILENAME = 'work-intent.json'
export const CT_WORK_RESEARCH_FILENAME = 'work-research.json'
export const CT_WORK_PLAN_FILENAME = 'work-plan.json'
export const CT_WORK_EXECUTION_FILENAME = 'work-execution.json'
export const CT_WORK_VERIFICATION_FILENAME = 'work-verification.json'
export const CT_WORK_PHASE_FILENAME = 'work-phase.json'

export function getCtProjectDir(root: string): string {
  return join(root, CT_DIRNAME)
}

export function getCtRouterPath(root: string): string {
  return join(getCtProjectDir(root), CT_ROUTER_FILENAME)
}

export function getCtIdentityPath(root: string): string {
  return join(getCtProjectDir(root), CT_IDENTITY_FILENAME)
}

export function getCtSoulPath(root: string): string {
  return join(getCtProjectDir(root), CT_SOUL_FILENAME)
}

export function getCtRolePath(root: string): string {
  return join(getCtProjectDir(root), CT_ROLE_FILENAME)
}

export function getCtUserPath(root: string): string {
  return join(getCtProjectDir(root), CT_USER_FILENAME)
}

export function getCtBootstrapPath(root: string): string {
  return join(getCtProjectDir(root), CT_BOOTSTRAP_FILENAME)
}

export function getCtSessionPath(root: string): string {
  return join(getCtProjectDir(root), CT_SESSION_FILENAME)
}

export function getCtTodoPath(root: string): string {
  return join(getCtProjectDir(root), CT_TODO_FILENAME)
}

export function getCtFeedbackPath(root: string): string {
  return join(getCtProjectDir(root), CT_FEEDBACK_FILENAME)
}

export function getCtAttunementPath(root: string): string {
  return join(getCtProjectDir(root), CT_ATTUNEMENT_FILENAME)
}

export function getCtStateDir(root: string): string {
  return join(getCtProjectDir(root), CT_STATE_DIRNAME)
}

export function getCtStateArchiveDir(root: string): string {
  return join(getCtStateDir(root), CT_STATE_ARCHIVE_DIRNAME)
}

export function getCtArchivedWorkDir(workId: string, root: string): string {
  return join(getCtStateArchiveDir(root), workId)
}

export function getCtArchivesPath(root: string): string {
  return join(getCtProjectDir(root), CT_ARCHIVES_FILENAME)
}

export function getCtGameStatePath(root: string): string {
  return join(getCtProjectDir(root), CT_GAME_STATE_FILENAME)
}

export function getCtAutoworkStatePath(root: string): string {
  return join(getCtProjectDir(root), CT_AUTOWORK_STATE_FILENAME)
}

export function getCtWorkIndexPath(root: string): string {
  return join(getCtStateDir(root), CT_WORK_INDEX_FILENAME)
}

export function getCtWorkIntentPath(root: string): string {
  return join(getCtStateDir(root), CT_WORK_INTENT_FILENAME)
}

export function getCtWorkResearchPath(root: string): string {
  return join(getCtStateDir(root), CT_WORK_RESEARCH_FILENAME)
}

export function getCtWorkPlanPath(root: string): string {
  return join(getCtStateDir(root), CT_WORK_PLAN_FILENAME)
}

export function getCtWorkExecutionPath(root: string): string {
  return join(getCtStateDir(root), CT_WORK_EXECUTION_FILENAME)
}

export function getCtWorkVerificationPath(root: string): string {
  return join(getCtStateDir(root), CT_WORK_VERIFICATION_FILENAME)
}

export function getCtWorkPhasePath(root: string): string {
  return join(getCtStateDir(root), CT_WORK_PHASE_FILENAME)
}

export function getCtArchivedWorkIntentPath(
  workId: string,
  root: string,
): string {
  return join(getCtArchivedWorkDir(workId, root), CT_WORK_INTENT_FILENAME)
}

export function getCtArchivedWorkResearchPath(
  workId: string,
  root: string,
): string {
  return join(getCtArchivedWorkDir(workId, root), CT_WORK_RESEARCH_FILENAME)
}

export function getCtArchivedWorkPlanPath(workId: string, root: string): string {
  return join(getCtArchivedWorkDir(workId, root), CT_WORK_PLAN_FILENAME)
}

export function getCtArchivedWorkExecutionPath(
  workId: string,
  root: string,
): string {
  return join(getCtArchivedWorkDir(workId, root), CT_WORK_EXECUTION_FILENAME)
}

export function getCtArchivedWorkVerificationPath(
  workId: string,
  root: string,
): string {
  return join(getCtArchivedWorkDir(workId, root), CT_WORK_VERIFICATION_FILENAME)
}

export function getCtArchivedWorkPhasePath(workId: string, root: string): string {
  return join(getCtArchivedWorkDir(workId, root), CT_WORK_PHASE_FILENAME)
}

export function getCtCompatBridgePath(root: string): string {
  return join(root, 'CLAUDE.local.md')
}
