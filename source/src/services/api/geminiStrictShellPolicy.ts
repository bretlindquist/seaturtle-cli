import type { GeminiBehaviorMode } from '../../utils/geminiBehaviorMode.js'
import type { MainRuntimeProvider } from '../../utils/model/providers.js'
import { shouldApplyGeminiStrictMode } from './geminiStrictMode.js'

export type GeminiStrictShellPolicyDecision =
  | { behavior: 'allow' }
  | {
      behavior: 'deny'
      reason: string
      saferAlternatives: string[]
    }

const ALLOW_RESULT: GeminiStrictShellPolicyDecision = { behavior: 'allow' }

const BROAD_SOURCE_TREE_FIND_RE = /\bfind\s+(?:\.\/)?(?:src|source|source\/src)\b/
const BROAD_SOURCE_TREE_GLOB_RE =
  /\b(?:src|source|source\/src)\/\*\*\/\*\.[A-Za-z0-9]+\b/
const MASS_FILE_FANOUT_RE = /\b(?:xargs|-exec)\b|\*\.[A-Za-z0-9]+/
const IN_PLACE_MUTATOR_RE = /(?:^|\s)(?:sed\s+-i|perl\s+-pi)(?:\s|$)/

function normalizeCommand(command: string): string {
  return command.trim().replace(/\s+/g, ' ')
}

function isBroadSourceRewrite(command: string): boolean {
  if (!IN_PLACE_MUTATOR_RE.test(command)) {
    return false
  }

  const touchesSourceTree =
    BROAD_SOURCE_TREE_FIND_RE.test(command) ||
    BROAD_SOURCE_TREE_GLOB_RE.test(command)

  if (!touchesSourceTree) {
    return false
  }

  return MASS_FILE_FANOUT_RE.test(command)
}

function isBroadGitRestore(command: string): boolean {
  return (
    /^git restore(?:\s+--[^\s]+)*\s+\.$/.test(command) ||
    /^git checkout -- \.$/.test(command) ||
    /^git restore(?:\s+--[^\s]+)*\s+(?:\.\/)?(?:src|source|source\/src)\/?$/.test(
      command,
    ) ||
    /^git checkout -- (?:\.\/)?(?:src|source|source\/src)\/?$/.test(command)
  )
}

function isBlockedRmRf(command: string): boolean {
  return /\brm\s+-[A-Za-z-]*r[A-Za-z-]*f[A-Za-z-]*(?:\s|$)/.test(command)
}

function isBlockedFindDelete(command: string): boolean {
  return /^find\s+\.\s+-delete(?:\s|$)/.test(command)
}

function isBlockedCargoFix(command: string): boolean {
  return /^cargo fix\b/.test(command) &&
    (command.includes('--allow-dirty') || command.includes('--allow-staged'))
}

export function buildGeminiStrictShellPolicyMessage(
  decision: Extract<GeminiStrictShellPolicyDecision, { behavior: 'deny' }>,
): string {
  return [
    `Gemini strict mode blocked this command: ${decision.reason}`,
    `Safer options: ${decision.saferAlternatives.join('; ')}`,
  ].join('\n')
}

export function getGeminiStrictShellPolicyDecision(
  command: string,
  {
    provider,
    mode,
  }: {
    provider?: MainRuntimeProvider | null
    mode?: GeminiBehaviorMode
  } = {},
): GeminiStrictShellPolicyDecision {
  if (!shouldApplyGeminiStrictMode({ provider, mode })) {
    return ALLOW_RESULT
  }

  const normalizedCommand = normalizeCommand(command)

  if (isBroadGitRestore(normalizedCommand)) {
    return {
      behavior: 'deny',
      reason: 'broad git restore can discard large parts of the working tree',
      saferAlternatives: [
        'inspect git diff first',
        'restore only a specific file you intentionally changed',
        'ask the operator before any directory-wide restore',
      ],
    }
  }

  if (/^git reset --hard(?:\s|$)/.test(normalizedCommand)) {
    return {
      behavior: 'deny',
      reason: 'git reset --hard can discard tracked changes without review',
      saferAlternatives: [
        'inspect git status and git diff',
        'revert only a specific change with a reviewed patch',
        'ask the operator before destructive history resets',
      ],
    }
  }

  if (/^git clean\b/.test(normalizedCommand)) {
    return {
      behavior: 'deny',
      reason: 'git clean can delete untracked files and local work',
      saferAlternatives: [
        'list candidate files explicitly before deletion',
        'remove one known disposable path at a time',
        'ask the operator before broad cleanup commands',
      ],
    }
  }

  if (isBlockedRmRf(normalizedCommand)) {
    return {
      behavior: 'deny',
      reason: 'rm -rf is a destructive recursive delete',
      saferAlternatives: [
        'delete only a single reviewed path',
        'inspect the target path first',
        'ask the operator before recursive deletes',
      ],
    }
  }

  if (isBlockedFindDelete(normalizedCommand)) {
    return {
      behavior: 'deny',
      reason: 'find . -delete is a broad recursive delete',
      saferAlternatives: [
        'list matching paths first',
        'delete one reviewed path at a time',
        'ask the operator before repo-wide deletes',
      ],
    }
  }

  if (isBlockedCargoFix(normalizedCommand)) {
    return {
      behavior: 'deny',
      reason: 'cargo fix with dirty or staged state can hide unsafe mass rewrites',
      saferAlternatives: [
        'inspect the failing files directly',
        'apply reviewed file-specific edits',
        'run cargo check or cargo clippy to gather diagnostics first',
      ],
    }
  }

  if (isBroadSourceRewrite(normalizedCommand)) {
    return {
      behavior: 'deny',
      reason:
        'broad in-place source rewrites are blocked in Gemini strict mode',
      saferAlternatives: [
        'read the affected files and edit them directly',
        'apply a reviewed file-specific patch',
        'use targeted diagnostics before changing many files',
      ],
    }
  }

  return ALLOW_RESULT
}
