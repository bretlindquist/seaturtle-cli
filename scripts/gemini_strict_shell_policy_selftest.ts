import { readFileSync } from 'fs'
import { join } from 'path'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

const repoRoot = process.cwd()

function read(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), 'utf8')
}

const shellPolicySource = read(
  'source/src/services/api/geminiStrictShellPolicy.ts',
)
assert(
  shellPolicySource.includes('shouldApplyGeminiStrictMode'),
  'expected Gemini strict shell policy to stay gated behind Gemini strict mode',
)
assert(
  shellPolicySource.includes('git restore') &&
    shellPolicySource.includes('git reset --hard') &&
    shellPolicySource.includes('git clean'),
  'expected Gemini strict shell policy to block broad destructive git commands',
)
assert(
  shellPolicySource.includes('rm -rf') &&
    shellPolicySource.includes('find . -delete'),
  'expected Gemini strict shell policy to block broad destructive delete commands',
)
assert(
  shellPolicySource.includes('cargo fix') &&
    shellPolicySource.includes('--allow-dirty') &&
    shellPolicySource.includes('--allow-staged'),
  'expected Gemini strict shell policy to block unsafe cargo fix modes',
)
assert(
  shellPolicySource.includes('sed\\s+-i') &&
    shellPolicySource.includes('perl\\s+-pi') &&
    shellPolicySource.includes('source rewrites'),
  'expected Gemini strict shell policy to block broad in-place source rewrites',
)
assert(
  shellPolicySource.includes('Safer options:'),
  'expected Gemini strict shell policy messages to include safer alternatives',
)

const bashPermissionsSource = read('source/src/tools/BashTool/bashPermissions.ts')
assert(
  bashPermissionsSource.includes('getGeminiStrictShellPolicyDecision'),
  'expected bash permissions to call the Gemini strict shell policy helper',
)
assert(
  bashPermissionsSource.includes('buildGeminiStrictShellPolicyMessage'),
  'expected bash permissions to surface Gemini strict shell denial messaging',
)

const strictModeSource = read('source/src/services/api/geminiStrictMode.ts')
assert(
  strictModeSource.includes('broad in-place source rewrites'),
  'expected Gemini strict prompt copy to warn against broad shell rewrites',
)

const docsSource = read('docs/GEMINI.md')
assert(
  docsSource.includes('broad destructive Bash mutations'),
  'expected Gemini docs to describe the new strict shell guardrails',
)

const geminiCommandSource = read('source/src/commands/gemini/gemini.tsx')
assert(
  geminiCommandSource.includes('shell-safety') &&
    geminiCommandSource.includes('reviewer-and-repair'),
  'expected /gemini copy to mention shell-safety and reviewer-and-repair guardrails',
)

console.log('gemini strict shell policy self-test passed')
