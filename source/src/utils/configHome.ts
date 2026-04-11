import { join } from 'path'

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
