import type { AgencyInstallScope } from '../../services/agency/index.js'

export type ParsedAgencyCommand =
  | { type: 'help' }
  | { type: 'status'; scope?: AgencyInstallScope }
  | { type: 'list'; scope?: AgencyInstallScope }
  | { type: 'browse'; query?: string; ref?: string }
  | { type: 'run'; target?: string; task?: string; scope?: AgencyInstallScope }
  | { type: 'update'; scope: AgencyInstallScope }
  | { type: 'remove'; target?: string; scope: AgencyInstallScope }
  | { type: 'install'; target?: string; ref?: string; scope: AgencyInstallScope }

function parseScopeFlag(parts: string[]): AgencyInstallScope {
  if (parts.includes('--project')) {
    return 'project'
  }
  return 'user'
}

function parseOptionalScopeFlag(
  parts: string[],
): AgencyInstallScope | undefined {
  if (parts.includes('--project')) {
    return 'project'
  }
  if (parts.includes('--user')) {
    return 'user'
  }
  return undefined
}

export function parseAgencyArgs(args?: string): ParsedAgencyCommand {
  const trimmed = args?.trim()
  if (!trimmed) {
    return { type: 'help' }
  }

  const parts = trimmed.split(/\s+/)
  const command = parts[0]?.toLowerCase()

  if (command === 'help' || command === '--help' || command === '-h') {
    return { type: 'help' }
  }

  if (command === 'status') {
    return { type: 'status', scope: parseOptionalScopeFlag(parts) }
  }

  if (command === 'list' || command === 'ls') {
    return { type: 'list', scope: parseOptionalScopeFlag(parts) }
  }

  if (command === 'browse' || command === 'search') {
    let query: string | undefined
    let ref: string | undefined

    for (let index = 1; index < parts.length; index++) {
      const part = parts[index]
      if (!part) {
        continue
      }
      if (part === '--ref') {
        ref = parts[index + 1]
        index += 1
        continue
      }
      if (!query) {
        query = part
      }
    }

    return { type: 'browse', query, ref }
  }

  if (command === 'run') {
    const scope = parts.includes('--project')
      ? 'project'
      : parts.includes('--user')
        ? 'user'
        : undefined
    const filtered = parts.filter(
      (part, index) =>
        index > 0 && part !== '--project' && part !== '--user',
    )
    const [target, ...taskParts] = filtered
    return {
      type: 'run',
      target,
      task: taskParts.join(' ').trim() || undefined,
      scope,
    }
  }

  if (command === 'update' || command === 'upgrade') {
    return { type: 'update', scope: parseScopeFlag(parts) }
  }

  if (command === 'remove' || command === 'rm' || command === 'uninstall') {
    const scope = parseScopeFlag(parts)
    const target = parts.find(
      (part, index) =>
        index > 0 &&
        part !== '--project' &&
        part !== '--user' &&
        part !== '--ref',
    )
    return { type: 'remove', target, scope }
  }

  if (command === 'install' || command === 'i') {
    let target: string | undefined
    let ref: string | undefined
    const scope = parseScopeFlag(parts)

    for (let index = 1; index < parts.length; index++) {
      const part = parts[index]
      if (!part) {
        continue
      }
      if (part === '--project' || part === '--user') {
        continue
      }
      if (part === '--ref') {
        ref = parts[index + 1]
        index += 1
        continue
      }
      if (!target) {
        target = part
      }
    }

    return { type: 'install', target, ref, scope }
  }

  return { type: 'help' }
}
