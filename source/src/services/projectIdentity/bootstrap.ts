import { dirname } from 'path'
import { writeFileSyncAndFlush_DEPRECATED } from '../../utils/file.js'
import { getFsImplementation } from '../../utils/fsOperations.js'
import { addFileGlobRuleToGitignore } from '../../utils/git/gitignore.js'
import { saveCurrentProjectConfig } from '../../utils/config.js'
import { ensureCtArchiveFiles } from './archives.js'
import {
  SHIPPED_DEFAULT_CT_ATTUNEMENT,
  SHIPPED_DEFAULT_CT_BOOTSTRAP,
  SHIPPED_DEFAULT_CT_IDENTITY,
  SHIPPED_DEFAULT_CT_ROLE,
  SHIPPED_DEFAULT_CT_SESSION,
  SHIPPED_DEFAULT_CT_SOUL,
  SHIPPED_DEFAULT_CT_USER,
} from './defaults.js'
import {
  getCtAttunementPath,
  getCtBootstrapPath,
  getCtCompatBridgePath,
  getCtGlobalIdentityOverridePath,
  getCtGlobalSoulOverridePath,
  getCtIdentityPath,
  getCtProjectDir,
  getCtProjectRoot,
  getCtRolePath,
  getCtRouterPath,
  getCtSessionPath,
  getCtSoulPath,
  getCtStateDir,
  getCtUserPath,
} from './paths.js'

const CT_ROUTER_CONTENT = `@./soul.md
@./identity.md
@./role.md
@./user.md
@./attunement.md
@./session.md
`

const CT_COMPAT_BRIDGE_CONTENT = `@.ct/router.md
`

type ActiveCtDefaults = {
  identity: string
  soul: string
  role: string
  user: string
  bootstrap: string
  attunement: string
  session: string
}

function readIfExists(path: string): string | null {
  const fs = getFsImplementation()
  if (!fs.existsSync(path)) {
    return null
  }
  return fs.readFileSync(path, { encoding: 'utf-8' })
}

function normalizeComparableContent(content: string): string {
  return content.trim().replace(/\r\n/g, '\n')
}

export function getActiveCtDefaults(): ActiveCtDefaults {
  return {
    identity:
      readIfExists(getCtGlobalIdentityOverridePath()) ??
      SHIPPED_DEFAULT_CT_IDENTITY,
    soul:
      readIfExists(getCtGlobalSoulOverridePath()) ?? SHIPPED_DEFAULT_CT_SOUL,
    role: SHIPPED_DEFAULT_CT_ROLE,
    user: SHIPPED_DEFAULT_CT_USER,
    bootstrap: SHIPPED_DEFAULT_CT_BOOTSTRAP,
    attunement: SHIPPED_DEFAULT_CT_ATTUNEMENT,
    session: SHIPPED_DEFAULT_CT_SESSION,
  }
}

function ensureParentDir(path: string): void {
  getFsImplementation().mkdirSync(dirname(path))
}

function writeFileIfMissing(path: string, content: string): boolean {
  const fs = getFsImplementation()
  if (fs.existsSync(path)) {
    return false
  }
  ensureParentDir(path)
  writeFileSyncAndFlush_DEPRECATED(path, content, { encoding: 'utf-8' })
  return true
}

function writeFile(path: string, content: string): void {
  ensureParentDir(path)
  writeFileSyncAndFlush_DEPRECATED(path, content, { encoding: 'utf-8' })
}

function ensureFileContent(path: string, content: string): boolean {
  const current = readIfExists(path)
  if (
    current === null ||
    normalizeComparableContent(current) === normalizeComparableContent(content)
  ) {
    return false
  }

  writeFile(path, content)
  return true
}

export type CtBootstrapResult = {
  projectRoot: string
  createdPaths: string[]
  createdCtFiles: boolean
}

export async function ensureProjectCtIdentityBootstrap(): Promise<CtBootstrapResult> {
  const root = getCtProjectRoot()
  const defaults = getActiveCtDefaults()

  const projectDir = getCtProjectDir(root)
  const routerPath = getCtRouterPath(root)
  const identityPath = getCtIdentityPath(root)
  const soulPath = getCtSoulPath(root)
  const rolePath = getCtRolePath(root)
  const userPath = getCtUserPath(root)
  const bootstrapPath = getCtBootstrapPath(root)
  const attunementPath = getCtAttunementPath(root)
  const sessionPath = getCtSessionPath(root)
  const stateDir = getCtStateDir(root)
  const compatBridgePath = getCtCompatBridgePath(root)

  const fs = getFsImplementation()
  fs.mkdirSync(projectDir)
  fs.mkdirSync(stateDir)

  const createdPaths: string[] = []
  const archiveBootstrap = ensureCtArchiveFiles(root)
  createdPaths.push(...archiveBootstrap.createdPaths)
  if (writeFileIfMissing(routerPath, CT_ROUTER_CONTENT)) {
    createdPaths.push(routerPath)
  }
  if (writeFileIfMissing(identityPath, defaults.identity)) {
    createdPaths.push(identityPath)
  }
  if (writeFileIfMissing(soulPath, defaults.soul)) {
    createdPaths.push(soulPath)
  }
  if (writeFileIfMissing(rolePath, defaults.role)) {
    createdPaths.push(rolePath)
  }
  if (writeFileIfMissing(userPath, defaults.user)) {
    createdPaths.push(userPath)
  }
  if (writeFileIfMissing(bootstrapPath, defaults.bootstrap)) {
    createdPaths.push(bootstrapPath)
  }
  if (writeFileIfMissing(attunementPath, defaults.attunement)) {
    createdPaths.push(attunementPath)
  }
  if (writeFileIfMissing(sessionPath, defaults.session)) {
    createdPaths.push(sessionPath)
  }
  if (writeFileIfMissing(compatBridgePath, CT_COMPAT_BRIDGE_CONTENT)) {
    createdPaths.push(compatBridgePath)
  }
  if (ensureFileContent(routerPath, CT_ROUTER_CONTENT)) {
    createdPaths.push(routerPath)
  }

  await Promise.all([
    addFileGlobRuleToGitignore('.ct/', root),
    addFileGlobRuleToGitignore('CLAUDE.local.md', root),
  ])

  const currentIdentity = readIfExists(identityPath)
  const currentSoul = readIfExists(soulPath)
  const isCustomized =
    currentIdentity !== null &&
    currentSoul !== null &&
    (normalizeComparableContent(currentIdentity) !==
      normalizeComparableContent(defaults.identity) ||
      normalizeComparableContent(currentSoul) !==
        normalizeComparableContent(defaults.soul))

  saveCurrentProjectConfig(current => ({
    ...current,
    ctIdentityBootstrap: {
      hasCompletedSetup: isCustomized,
      seenCount: current.ctIdentityBootstrap?.seenCount ?? 0,
      mode: isCustomized ? 'customized' : 'defaulted',
      lastPromptedAt: Date.now(),
    },
  }))

  return {
    projectRoot: root,
    createdPaths,
    createdCtFiles: createdPaths.length > 0,
  }
}

export function overwriteProjectCtIdentityFiles(input: {
  identity?: string
  soul?: string
  role?: string
  user?: string
  bootstrap?: string
  attunement?: string
  session?: string
}): void {
  const root = getCtProjectRoot()

  if (input.identity !== undefined) {
    writeFile(getCtIdentityPath(root), input.identity)
  }

  if (input.soul !== undefined) {
    writeFile(getCtSoulPath(root), input.soul)
  }

  if (input.role !== undefined) {
    writeFile(getCtRolePath(root), input.role)
  }

  if (input.user !== undefined) {
    writeFile(getCtUserPath(root), input.user)
  }

  if (input.bootstrap !== undefined) {
    writeFile(getCtBootstrapPath(root), input.bootstrap)
  }

  if (input.attunement !== undefined) {
    writeFile(getCtAttunementPath(root), input.attunement)
  }

  if (input.session !== undefined) {
    writeFile(getCtSessionPath(root), input.session)
  }
}

export function resetProjectCtIdentityToActiveDefaults(): void {
  const defaults = getActiveCtDefaults()
  overwriteProjectCtIdentityFiles({
    identity: defaults.identity,
    soul: defaults.soul,
    role: defaults.role,
    user: defaults.user,
    bootstrap: defaults.bootstrap,
    attunement: defaults.attunement,
  })
}

export function ensureCtGlobalDefaultsPaths(): {
  identityPath: string
  soulPath: string
} {
  const fs = getFsImplementation()
  const identityPath = getCtGlobalIdentityOverridePath()
  const soulPath = getCtGlobalSoulOverridePath()
  fs.mkdirSync(dirname(identityPath))
  return {
    identityPath,
    soulPath,
  }
}

export function ensureCtGlobalDefaultFile(
  kind: 'identity' | 'soul',
): string {
  const defaults = getActiveCtDefaults()
  const { identityPath, soulPath } = ensureCtGlobalDefaultsPaths()
  const path = kind === 'identity' ? identityPath : soulPath
  const content = kind === 'identity' ? defaults.identity : defaults.soul
  writeFileIfMissing(path, content)
  return path
}

export function resetCtGlobalDefaultsToShipped(): {
  removedPaths: string[]
} {
  const fs = getFsImplementation()
  const removedPaths: string[] = []
  for (const path of [
    getCtGlobalIdentityOverridePath(),
    getCtGlobalSoulOverridePath(),
  ]) {
    if (!fs.existsSync(path)) {
      continue
    }
    fs.unlinkSync(path)
    removedPaths.push(path)
  }
  return { removedPaths }
}
