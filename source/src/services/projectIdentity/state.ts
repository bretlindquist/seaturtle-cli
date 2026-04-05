import memoize from 'lodash-es/memoize.js'
import {
  getCurrentProjectConfig,
  saveCurrentProjectConfig,
} from '../../utils/config.js'

export function getProjectCtIdentityBootstrapState() {
  return getCurrentProjectConfig().ctIdentityBootstrap
}

export const shouldShowCtIdentityBootstrap = memoize((): boolean => {
  const bootstrap = getProjectCtIdentityBootstrapState()
  return !bootstrap?.hasCompletedSetup && (bootstrap?.seenCount ?? 0) < 4
})

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
