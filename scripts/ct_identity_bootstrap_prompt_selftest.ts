import {
  getCtIdentityBootstrapPromptKind,
  hasCtIdentityLayer,
  shouldAdvanceCtIdentityBootstrapSeenCount,
  shouldPromptCtIdentityBootstrap,
  type CtIdentityBootstrapFileState,
} from '../source/src/services/projectIdentity/bootstrapPromptCore.js'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

const noFiles: CtIdentityBootstrapFileState = {
  projectDirExists: false,
  routerExists: false,
  identityExists: false,
  soulExists: false,
}

const existingLayer: CtIdentityBootstrapFileState = {
  projectDirExists: true,
  routerExists: true,
  identityExists: true,
  soulExists: true,
}

function run(): void {
  assert(!hasCtIdentityLayer(noFiles), 'empty project must not look bootstrapped')
  assert(
    hasCtIdentityLayer(existingLayer),
    'existing .ct files must be detected as a project identity layer',
  )
  assert(
    getCtIdentityBootstrapPromptKind(noFiles) === 'first-run',
    'missing .ct should use first-run consent copy',
  )
  assert(
    getCtIdentityBootstrapPromptKind(existingLayer) === 'existing-layer',
    'existing .ct should use retune/keep copy',
  )
  assert(
    shouldPromptCtIdentityBootstrap({
      bootstrap: { hasCompletedSetup: false, seenCount: 0 },
      files: noFiles,
      isInteractive: true,
    }),
    'interactive first run should prompt before creating .ct',
  )
  assert(
    shouldAdvanceCtIdentityBootstrapSeenCount({
      bootstrap: { hasCompletedSetup: false, seenCount: 0 },
      files: noFiles,
      isInteractive: true,
    }),
    'interactive first run should advance prompt bookkeeping',
  )
  assert(
    !shouldPromptCtIdentityBootstrap({
      bootstrap: { hasCompletedSetup: false, seenCount: 0 },
      files: noFiles,
      isInteractive: false,
    }),
    'non-interactive startup must not prompt or create .ct',
  )
  assert(
    !shouldPromptCtIdentityBootstrap({
      bootstrap: { hasCompletedSetup: true, seenCount: 1, mode: 'guided' },
      files: existingLayer,
      isInteractive: true,
    }),
    'completed setup must not prompt again',
  )
  assert(
    !shouldPromptCtIdentityBootstrap({
      bootstrap: { hasCompletedSetup: false, seenCount: 1, mode: 'skipped' },
      files: noFiles,
      isInteractive: true,
    }),
    'skipping setup must suppress repeat prompts',
  )
}

run()
