import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const feedbackSource = readFileSync(
  new URL('../source/src/components/Feedback.tsx', import.meta.url),
  'utf8',
)
const pathsSource = readFileSync(
  new URL('../source/src/services/projectIdentity/paths.ts', import.meta.url),
  'utf8',
)

assert(
  feedbackSource.includes("addProjectFeedbackEntry({"),
  'expected /feedback submission flow to append to the project feedback file',
)
assert(
  !feedbackSource.includes('api.anthropic.com/api/claude_cli_feedback'),
  'expected /feedback to stop posting to the Anthropic feedback endpoint',
)
assert(
  feedbackSource.includes('https://github.com/bretlindquist/seaturtle-cli/issues'),
  'expected /feedback to draft issues against the SeaTurtle repo',
)
assert(
  feedbackSource.includes("template=${encodeURIComponent(GITHUB_ISSUE_TEMPLATE)}"),
  'expected /feedback issue drafts to target the bug report template',
)
assert(
  feedbackSource.includes('Saved locally to {localFeedbackPath}'),
  'expected /feedback completion UI to surface the saved local feedback path',
)
assert(
  pathsSource.includes("export const CT_FEEDBACK_FILENAME = 'feedback.md'"),
  'expected canonical project feedback filename to be feedback.md',
)

console.log('feedback local sink self-test passed')
