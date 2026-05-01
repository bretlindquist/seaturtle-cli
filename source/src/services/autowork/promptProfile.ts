import type { WorkflowRuntimeSnapshot } from '../projectIdentity/workflowRuntime.js'
import { resolveAutoworkExecutionPosture } from './executionPosture.js'

type UserContext = Record<string, unknown>
type SystemContext = Record<string, unknown>

export type AutoworkPromptProfile = {
  kind: 'default' | 'autowork-lean'
  active: boolean
}

const REMOVED_SYSTEM_PROMPT_HEADINGS = new Set([
  '# Tone and style',
  '# Internal voice invariants',
])

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/')
}

function stripCtIdentitySectionsFromClaudeMd(raw: string): string {
  const firstContentsIndex = raw.indexOf('Contents of ')
  if (firstContentsIndex === -1) {
    return raw
  }

  const prefix = raw.slice(0, firstContentsIndex).trimEnd()
  const body = raw.slice(firstContentsIndex)
  const sections = body.split(/\n\n(?=Contents of )/g)

  const kept = sections.filter(section => {
    const match = /^Contents of (.+?)(?: \([^)]*\))?:\n\n([\s\S]*)$/u.exec(
      section.trim(),
    )
    if (!match) {
      return true
    }

    const normalizedPath = normalizePath(match[1] ?? '')
    const content = (match[2] ?? '').trim()

    if (normalizedPath.includes('/.ct/')) {
      return false
    }

    if (
      (normalizedPath.endsWith('/CLAUDE.local.md') ||
        normalizedPath.endsWith('/SEATURTLE.local.md')) &&
      content === '@.ct/router.md'
    ) {
      return false
    }

    return true
  })

  if (kept.length === 0) {
    return ''
  }

  return `${prefix}\n\n${kept.join('\n\n')}`.trim()
}

export function resolveAutoworkPromptProfile(input: {
  currentInput: string
  workflowRuntime?: WorkflowRuntimeSnapshot | null
}): AutoworkPromptProfile {
  const posture = resolveAutoworkExecutionPosture({
    currentInput: input.currentInput,
    workflowRuntime: input.workflowRuntime,
  })

  if (posture.active) {
    return {
      kind: 'autowork-lean',
      active: true,
    }
  }

  return {
    kind: 'default',
    active: false,
  }
}

export function projectSystemPromptForAutoworkProfile(
  profile: AutoworkPromptProfile,
  defaultSystemPrompt: string[],
): string[] {
  if (profile.kind !== 'autowork-lean') {
    return defaultSystemPrompt
  }

  return defaultSystemPrompt.filter(section => {
    const heading = section.trim().split('\n', 1)[0] ?? ''
    return !REMOVED_SYSTEM_PROMPT_HEADINGS.has(heading)
  })
}

export function projectUserContextForAutoworkProfile(
  profile: AutoworkPromptProfile,
  userContext: UserContext,
): UserContext {
  if (profile.kind !== 'autowork-lean') {
    return userContext
  }

  const projected: UserContext = {
    ...userContext,
  }

  if (typeof projected.claudeMd === 'string') {
    const filtered = stripCtIdentitySectionsFromClaudeMd(projected.claudeMd)
    if (filtered) {
      projected.claudeMd = filtered
    } else {
      delete projected.claudeMd
    }
  }

  return projected
}

export function projectSystemContextForAutoworkProfile(
  profile: AutoworkPromptProfile,
  systemContext: SystemContext,
): SystemContext {
  if (profile.kind !== 'autowork-lean') {
    return systemContext
  }

  const { gitStatus: _omittedGitStatus, ...rest } = systemContext
  return rest
}
