import type { AgencyInstallScope } from '../../services/agency/index.js'

export type ParsedAgencyCommand =
  | { type: 'help' }
  | { type: 'status' }
  | { type: 'list' }
  | { type: 'update'; scope: AgencyInstallScope }
  | { type: 'remove'; target?: string; scope: AgencyInstallScope }
  | { type: 'install'; target?: string; ref?: string; scope: AgencyInstallScope }

function parseScopeFlag(parts: string[]): AgencyInstallScope {
  if (parts.includes('--project')) {
    return 'project'
  }
  return 'user'
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
    return { type: 'status' }
  }

  if (command === 'list' || command === 'ls') {
    return { type: 'list' }
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
