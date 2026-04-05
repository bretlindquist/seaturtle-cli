import memoize from 'lodash-es/memoize.js'
import {
  getCurrentProjectConfig,
  saveCurrentProjectConfig,
} from '../../utils/config.js'

export function getProjectCtIdentityBootstrapState() {
  return getCurrentProjectConfig().ctIdentityBootstrap
}

export const shouldAdvanceCtIdentitySeenCount = memoize((): boolean => {
  const bootstrap = getProjectCtIdentityBootstrapState()
  return !bootstrap?.hasCompletedSetup && (bootstrap?.seenCount ?? 0) < 3
})

export const shouldShowCtIdentityBootstrapDialog = memoize((): boolean => {
  const bootstrap = getProjectCtIdentityBootstrapState()
  return !bootstrap?.hasCompletedSetup && (bootstrap?.seenCount ?? 0) <= 3
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
