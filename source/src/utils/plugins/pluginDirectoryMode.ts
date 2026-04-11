export function resolvePluginsDirectoryName(input: {
  useCoworkSessionState: boolean
  useCoworkEnv: string | undefined
}): string {
  if (input.useCoworkSessionState) {
    return 'cowork_plugins'
  }

  const normalizedEnv = input.useCoworkEnv?.toLowerCase().trim()
  if (
    normalizedEnv === '1' ||
    normalizedEnv === 'true' ||
    normalizedEnv === 'yes' ||
    normalizedEnv === 'on'
  ) {
    return 'cowork_plugins'
  }

  return 'plugins'
}
