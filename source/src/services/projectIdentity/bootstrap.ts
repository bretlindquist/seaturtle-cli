import { dirname } from 'path'
import { writeFileSyncAndFlush_DEPRECATED } from '../../utils/file.js'
import { getFsImplementation } from '../../utils/fsOperations.js'
import { addFileGlobRuleToGitignore } from '../../utils/git/gitignore.js'
import { saveCurrentProjectConfig } from '../../utils/config.js'
import {
  SHIPPED_DEFAULT_CT_IDENTITY,
  SHIPPED_DEFAULT_CT_SESSION,
  SHIPPED_DEFAULT_CT_SOUL,
} from './defaults.js'
import {
  getCtCompatBridgePath,
  getCtGlobalIdentityOverridePath,
  getCtGlobalSoulOverridePath,
  getCtIdentityPath,
  getCtProjectDir,
  getCtProjectRoot,
  getCtRouterPath,
  getCtSessionPath,
  getCtSoulPath,
  getCtStateDir,
} from './paths.js'

const CT_ROUTER_CONTENT = `@./identity.md
@./soul.md
@./session.md
`

const CT_COMPAT_BRIDGE_CONTENT = `@.ct/router.md
`

type ActiveCtDefaults = {
  identity: string
  soul: string
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
  const sessionPath = getCtSessionPath(root)
  const stateDir = getCtStateDir(root)
  const compatBridgePath = getCtCompatBridgePath(root)

  const fs = getFsImplementation()
  fs.mkdirSync(projectDir)
  fs.mkdirSync(stateDir)

  const createdPaths: string[] = []
  if (writeFileIfMissing(routerPath, CT_ROUTER_CONTENT)) {
    createdPaths.push(routerPath)
  }
  if (writeFileIfMissing(identityPath, defaults.identity)) {
    createdPaths.push(identityPath)
  }
  if (writeFileIfMissing(soulPath, defaults.soul)) {
    createdPaths.push(soulPath)
  }
  if (writeFileIfMissing(sessionPath, defaults.session)) {
    createdPaths.push(sessionPath)
  }
  if (writeFileIfMissing(compatBridgePath, CT_COMPAT_BRIDGE_CONTENT)) {
    createdPaths.push(compatBridgePath)
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
