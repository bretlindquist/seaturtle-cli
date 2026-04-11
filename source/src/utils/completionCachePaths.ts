import { join } from 'path'

export type SupportedCompletionShell = 'zsh' | 'bash' | 'fish'

export type CompletionShellInfo = {
  name: SupportedCompletionShell
  rcFile: string
  cacheFile: string
  completionLine: string
  shellFlag: SupportedCompletionShell
}

type CompletionShellInputs = {
  shellPath: string
  homeDir: string
  xdgConfigHome?: string
  configHomeDir: string
}

export function resolveCompletionShellInfo(
  inputs: CompletionShellInputs,
): CompletionShellInfo | null {
  const { homeDir, xdgConfigHome, configHomeDir } = inputs
  const shellPath = inputs.shellPath.replaceAll('\\', '/')

  if (shellPath.endsWith('/zsh') || shellPath.endsWith('/zsh.exe')) {
    const cacheFile = join(configHomeDir, 'completion.zsh')
    return {
      name: 'zsh',
      rcFile: join(homeDir, '.zshrc'),
      cacheFile,
      completionLine: `[[ -f "${cacheFile}" ]] && source "${cacheFile}"`,
      shellFlag: 'zsh',
    }
  }

  if (shellPath.endsWith('/bash') || shellPath.endsWith('/bash.exe')) {
    const cacheFile = join(configHomeDir, 'completion.bash')
    return {
      name: 'bash',
      rcFile: join(homeDir, '.bashrc'),
      cacheFile,
      completionLine: `[ -f "${cacheFile}" ] && source "${cacheFile}"`,
      shellFlag: 'bash',
    }
  }

  if (shellPath.endsWith('/fish') || shellPath.endsWith('/fish.exe')) {
    const cacheFile = join(configHomeDir, 'completion.fish')
    return {
      name: 'fish',
      rcFile: join(xdgConfigHome ?? join(homeDir, '.config'), 'fish', 'config.fish'),
      cacheFile,
      completionLine: `[ -f "${cacheFile}" ] && source "${cacheFile}"`,
      shellFlag: 'fish',
    }
  }

  return null
}
