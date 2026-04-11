export type CtIdentityBootstrapMode =
  | 'defaulted'
  | 'guided'
  | 'skipped'
  | 'customized'

export type CtIdentityBootstrapConfigState = {
  hasCompletedSetup?: boolean
  seenCount?: number
  mode?: CtIdentityBootstrapMode
}

export type CtIdentityBootstrapFileState = {
  projectDirExists: boolean
  routerExists: boolean
  identityExists: boolean
  soulExists: boolean
}

export type CtIdentityBootstrapPromptKind = 'first-run' | 'existing-layer'

export function hasCtIdentityLayer(
  files: CtIdentityBootstrapFileState,
): boolean {
  return (
    files.projectDirExists ||
    files.routerExists ||
    files.identityExists ||
    files.soulExists
  )
}

export function getCtIdentityBootstrapPromptKind(
  files: CtIdentityBootstrapFileState,
): CtIdentityBootstrapPromptKind {
  return hasCtIdentityLayer(files) ? 'existing-layer' : 'first-run'
}

export function shouldPromptCtIdentityBootstrap(input: {
  bootstrap?: CtIdentityBootstrapConfigState
  files: CtIdentityBootstrapFileState
  isInteractive: boolean
  maxPromptCount?: number
}): boolean {
  if (!input.isInteractive) {
    return false
  }

  const bootstrap = input.bootstrap
  if (bootstrap?.hasCompletedSetup || bootstrap?.mode === 'skipped') {
    return false
  }

  return (bootstrap?.seenCount ?? 0) <= (input.maxPromptCount ?? 3)
}

export function shouldAdvanceCtIdentityBootstrapSeenCount(input: {
  bootstrap?: CtIdentityBootstrapConfigState
  files: CtIdentityBootstrapFileState
  isInteractive: boolean
  maxPromptCount?: number
}): boolean {
  if (
    !shouldPromptCtIdentityBootstrap({
      ...input,
      maxPromptCount: input.maxPromptCount,
    })
  ) {
    return false
  }

  return (input.bootstrap?.seenCount ?? 0) < (input.maxPromptCount ?? 3)
}
