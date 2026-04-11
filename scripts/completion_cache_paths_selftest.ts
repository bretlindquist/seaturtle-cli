import { resolveCompletionShellInfo } from '../source/src/utils/completionCachePaths.ts'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

const zshInfo = resolveCompletionShellInfo({
  shellPath: '/bin/zsh',
  homeDir: '/Users/tester',
  configHomeDir: '/Users/tester/.seaturtle',
})

assert(zshInfo?.cacheFile === '/Users/tester/.seaturtle/completion.zsh', 'expected zsh completions to live under the active SeaTurtle config home')
assert(zshInfo?.rcFile === '/Users/tester/.zshrc', 'expected zsh rc file to remain user-home scoped')

const fishInfo = resolveCompletionShellInfo({
  shellPath: 'C:\\Program Files\\fish.exe',
  homeDir: 'C:\\Users\\tester',
  xdgConfigHome: 'C:\\Users\\tester\\AppData\\Roaming',
  configHomeDir: 'C:\\Users\\tester\\.seaturtle',
})

assert(fishInfo?.cacheFile === 'C:\\Users\\tester\\.seaturtle/completion.fish', 'expected fish completions to live under the active SeaTurtle config home on Windows')
assert(fishInfo?.rcFile === 'C:\\Users\\tester\\AppData\\Roaming/fish/config.fish', 'expected fish rc file to follow XDG config home overrides')

assert(
  resolveCompletionShellInfo({
    shellPath: '/bin/tcsh',
    homeDir: '/Users/tester',
    configHomeDir: '/Users/tester/.seaturtle',
  }) === null,
  'expected unsupported shells to return null',
)

console.log('completion-cache-paths selftest passed')
