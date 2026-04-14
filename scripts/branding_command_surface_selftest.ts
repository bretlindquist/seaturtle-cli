import { readFileSync } from 'node:fs'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

const packageJson = JSON.parse(
  readFileSync(new URL('../source/package.json', import.meta.url), 'utf8'),
) as {
  bin?: Record<string, string>
}

assert(packageJson.bin?.ct === 'cli.js', 'expected npm bin to expose ct')
assert(
  packageJson.bin?.seaturtle === 'cli.js',
  'expected npm bin to expose seaturtle',
)
assert(
  !('claude' in (packageJson.bin ?? {})),
  'expected npm bin to stop exposing claude',
)

const updateSource = readFileSync(
  new URL('../source/src/cli/update.ts', import.meta.url),
  'utf8',
)
assert(
  !updateSource.includes('brew upgrade claude-code'),
  'expected update CLI copy to stop suggesting brew upgrade claude-code',
)
assert(
  !updateSource.includes('winget upgrade Anthropic.ClaudeCode'),
  'expected update CLI copy to stop suggesting winget upgrade Anthropic.ClaudeCode',
)
assert(
  !updateSource.includes('apk upgrade claude-code'),
  'expected update CLI copy to stop suggesting apk upgrade claude-code',
)

const installSource = readFileSync(
  new URL('../source/src/commands/install.tsx', import.meta.url),
  'utf8',
)
assert(
  installSource.includes("return '~/.local/bin/ct';"),
  'expected install command to display ~/.local/bin/ct',
)

console.log('branding-command-surface selftest passed')
