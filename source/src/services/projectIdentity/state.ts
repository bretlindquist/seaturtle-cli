import memoize from 'lodash-es/memoize.js'
import {
  getCurrentProjectConfig,
  saveCurrentProjectConfig,
} from '../../utils/config.js'
import { getFsImplementation } from '../../utils/fsOperations.js'
import {
  getCtIdentityPath,
  getCtProjectDir,
  getCtProjectRoot,
  getCtRouterPath,
  getCtSoulPath,
} from './paths.js'
import {
  getCtIdentityBootstrapPromptKind,
  shouldAdvanceCtIdentityBootstrapSeenCount,
  shouldPromptCtIdentityBootstrap,
  type CtIdentityBootstrapFileState,
  type CtIdentityBootstrapPromptKind,
} from './bootstrapPromptCore.js'

export function getProjectCtIdentityBootstrapState() {
  return getCurrentProjectConfig().ctIdentityBootstrap
}

export function getProjectCtIdentityBootstrapFileState(
  root: string = getCtProjectRoot(),
): CtIdentityBootstrapFileState {
  const fs = getFsImplementation()
  return {
    projectDirExists: fs.existsSync(getCtProjectDir(root)),
    routerExists: fs.existsSync(getCtRouterPath(root)),
    identityExists: fs.existsSync(getCtIdentityPath(root)),
    soulExists: fs.existsSync(getCtSoulPath(root)),
  }
}

export function getProjectCtIdentityBootstrapPromptKind(): CtIdentityBootstrapPromptKind {
  return getCtIdentityBootstrapPromptKind(
    getProjectCtIdentityBootstrapFileState(),
  )
}

export const shouldAdvanceCtIdentitySeenCount = memoize((): boolean => {
  return shouldAdvanceCtIdentityBootstrapSeenCount({
    bootstrap: getProjectCtIdentityBootstrapState(),
    files: getProjectCtIdentityBootstrapFileState(),
    isInteractive: true,
  })
})

export const shouldShowCtIdentityBootstrapDialog = memoize((): boolean => {
  return shouldPromptCtIdentityBootstrap({
    bootstrap: getProjectCtIdentityBootstrapState(),
    files: getProjectCtIdentityBootstrapFileState(),
    isInteractive: true,
  })
})

export function shouldUseSeaTurtleFallbackIntro(): boolean {
  const bootstrap = getProjectCtIdentityBootstrapState()
  return !bootstrap?.hasCompletedSetup && (bootstrap?.seenCount ?? 0) >= 3
}

export function incrementCtIdentitySeenCount(): void {
  saveCurrentProjectConfig(current => ({
    ...current,
    ctIdentityBootstrap: {
      ...current.ctIdentityBootstrap,
      hasCompletedSetup: current.ctIdentityBootstrap?.hasCompletedSetup ?? false,
      seenCount: (current.ctIdentityBootstrap?.seenCount ?? 0) + 1,
      mode: current.ctIdentityBootstrap?.mode ?? 'defaulted',
      lastPromptedAt: Date.now(),
    },
  }))
}

export function markCtIdentityBootstrapComplete(
  mode: 'guided' | 'defaulted' | 'customized',
): void {
  saveCurrentProjectConfig(current => ({
    ...current,
    ctIdentityBootstrap: {
      ...current.ctIdentityBootstrap,
      hasCompletedSetup: true,
      seenCount: current.ctIdentityBootstrap?.seenCount ?? 0,
      mode,
      lastPromptedAt: Date.now(),
    },
  }))
}

export function markCtIdentityBootstrapSkipped(): void {
  saveCurrentProjectConfig(current => ({
    ...current,
    ctIdentityBootstrap: {
      ...current.ctIdentityBootstrap,
      hasCompletedSetup: false,
      seenCount: current.ctIdentityBootstrap?.seenCount ?? 0,
      mode: 'skipped',
      lastPromptedAt: Date.now(),
    },
  }))
}
