import { join, relative } from 'path'

export type ConfigHomeResolutionInput = {
  seaTurtleConfigDirEnv: string | undefined
  claudeConfigDirEnv: string | undefined
  homeDir: string
  seaTurtleDirExists: boolean
  claudeDirExists: boolean
}

export function resolveSeaTurtleConfigHomeDir(
  input: ConfigHomeResolutionInput,
): string {
  if (input.seaTurtleConfigDirEnv) {
    return input.seaTurtleConfigDirEnv.normalize('NFC')
  }
  if (input.claudeConfigDirEnv) {
    return input.claudeConfigDirEnv.normalize('NFC')
  }

  const seaTurtleHome = join(input.homeDir, '.seaturtle').normalize('NFC')
  if (input.seaTurtleDirExists) {
    return seaTurtleHome
  }

  const claudeHome = join(input.homeDir, '.claude').normalize('NFC')
  if (input.claudeDirExists) {
    return claudeHome
  }

  return seaTurtleHome
}

export function formatConfigHomeDisplayPath(
  configHomeDir: string,
  homeDir: string,
): string {
  const relativeToHome = relative(homeDir, configHomeDir)
  if (
    relativeToHome === '' ||
    (!relativeToHome.startsWith('..') && relativeToHome !== '.')
  ) {
    return relativeToHome ? `~/${relativeToHome}` : '~'
  }
  return configHomeDir
}

export function buildConfigHomePathDisplay(
  configHomeDisplayPath: string,
  ...segments: string[]
): string {
  return join(configHomeDisplayPath, ...segments)
}

export function buildConfigHomePermissionPattern(
  configHomeDisplayPath: string,
  ...segments: string[]
): string {
  return `${buildConfigHomePathDisplay(configHomeDisplayPath, ...segments)}/**`
}

export type GlobalConfigFileResolutionInput = {
  configHomeDir: string
  homeDir: string
  oauthFileSuffix: string
  preferredConfigHomeFileExists: boolean
  legacyConfigHomeHiddenFileExists: boolean
  legacyConfigHomeClaudeFileExists: boolean
  legacyHomeClaudeFileExists: boolean
}

export function resolveSeaTurtleGlobalConfigFilePath(
  input: GlobalConfigFileResolutionInput,
): string {
  const preferredConfigHomeFile = join(
    input.configHomeDir,
    `config${input.oauthFileSuffix}.json`,
  )
  if (input.preferredConfigHomeFileExists) {
    return preferredConfigHomeFile
  }

  const legacyConfigHomeHiddenFile = join(input.configHomeDir, '.config.json')
  if (input.legacyConfigHomeHiddenFileExists) {
    return legacyConfigHomeHiddenFile
  }

  const legacyConfigHomeClaudeFile = join(
    input.configHomeDir,
    `.claude${input.oauthFileSuffix}.json`,
  )
  if (input.legacyConfigHomeClaudeFileExists) {
    return legacyConfigHomeClaudeFile
  }

  const legacyHomeClaudeFile = join(
    input.homeDir,
    `.claude${input.oauthFileSuffix}.json`,
  )
  if (input.legacyHomeClaudeFileExists) {
    return legacyHomeClaudeFile
  }

  return preferredConfigHomeFile
}
