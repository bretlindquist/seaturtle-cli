import { homedir } from 'os'
import { join, resolve } from 'path'
import { getOriginalCwd } from '../../bootstrap/state.js'
import { findCanonicalGitRoot } from '../../utils/git.js'

export const CT_DIRNAME = '.ct'
export const CT_ROUTER_FILENAME = 'router.md'
export const CT_IDENTITY_FILENAME = 'identity.md'
export const CT_SOUL_FILENAME = 'soul.md'
export const CT_ATTUNEMENT_FILENAME = 'attunement.md'
export const CT_SESSION_FILENAME = 'session.md'
export const CT_STATE_DIRNAME = 'state'
export const CT_ARCHIVES_FILENAME = 'archives.json'
export const CT_GAME_STATE_FILENAME = 'game-state.json'
export const CT_AUTOWORK_STATE_FILENAME = 'autowork-state.json'

export function getCtProjectRoot(): string {
  return findCanonicalGitRoot(getOriginalCwd()) ?? resolve(getOriginalCwd())
}

export function getCtProjectDir(root: string = getCtProjectRoot()): string {
  return join(root, CT_DIRNAME)
}

export function getCtRouterPath(root: string = getCtProjectRoot()): string {
  return join(getCtProjectDir(root), CT_ROUTER_FILENAME)
}

export function getCtIdentityPath(root: string = getCtProjectRoot()): string {
  return join(getCtProjectDir(root), CT_IDENTITY_FILENAME)
}

export function getCtSoulPath(root: string = getCtProjectRoot()): string {
  return join(getCtProjectDir(root), CT_SOUL_FILENAME)
}

export function getCtSessionPath(root: string = getCtProjectRoot()): string {
  return join(getCtProjectDir(root), CT_SESSION_FILENAME)
}

export function getCtAttunementPath(root: string = getCtProjectRoot()): string {
  return join(getCtProjectDir(root), CT_ATTUNEMENT_FILENAME)
}

export function getCtStateDir(root: string = getCtProjectRoot()): string {
  return join(getCtProjectDir(root), CT_STATE_DIRNAME)
}

export function getCtArchivesPath(root: string = getCtProjectRoot()): string {
  return join(getCtProjectDir(root), CT_ARCHIVES_FILENAME)
}

export function getCtGameStatePath(root: string = getCtProjectRoot()): string {
  return join(getCtProjectDir(root), CT_GAME_STATE_FILENAME)
}

export function getCtAutoworkStatePath(
  root: string = getCtProjectRoot(),
): string {
  return join(getCtProjectDir(root), CT_AUTOWORK_STATE_FILENAME)
}

export function getCtCompatBridgePath(root: string = getCtProjectRoot()): string {
  return join(root, 'CLAUDE.local.md')
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
