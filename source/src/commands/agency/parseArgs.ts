export type ParsedAgencyCommand =
  | { type: 'help' }
  | { type: 'status' }
  | { type: 'list' }
  | { type: 'update' }
  | { type: 'remove'; target?: string }
  | { type: 'install'; target?: string; ref?: string }

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
    return { type: 'update' }
  }

  if (command === 'remove' || command === 'rm' || command === 'uninstall') {
    return { type: 'remove', target: parts[1] }
  }

  if (command === 'install' || command === 'i') {
    let target: string | undefined
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
      if (!target) {
        target = part
      }
    }

    return { type: 'install', target, ref }
  }

  return { type: 'help' }
}
