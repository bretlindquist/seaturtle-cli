import assert from 'node:assert/strict'

import {
  addFeedbackEntryToMarkdown,
  buildDefaultProjectFeedbackMarkdown,
} from '../source/src/services/projectIdentity/projectFeedbackMarkdown.ts'

const created = buildDefaultProjectFeedbackMarkdown({
  timestamp: '2026-04-15T12:00:00.000Z',
  status: 'submitted',
  description: 'first report',
  version: '1.06',
  platform: 'darwin',
  terminal: 'iTerm',
  feedbackId: 'fb_123',
})

assert(created.includes('# CT Project Feedback'))
assert(created.includes('## Entries'))
assert(created.includes('### 2026-04-15T12:00:00.000Z'))
assert(created.includes('- Status: submitted'))
assert(created.includes('- Feedback ID: fb_123'))

const existing = `# CT Project Feedback

## Entries

### 2026-04-14T10:00:00.000Z
- Status: submitted

older report
`

const next = addFeedbackEntryToMarkdown(existing, {
  timestamp: '2026-04-15T12:00:00.000Z',
  status: 'local-only',
  description: 'new report',
  version: '1.06',
  platform: 'darwin',
  terminal: 'Warp',
})

assert.match(
  next,
  /## Entries\n\n### 2026-04-15T12:00:00.000Z[\s\S]*new report\n\n### 2026-04-14T10:00:00.000Z/,
  'new feedback entries should be inserted at the top of the Entries section',
)

console.log('project feedback self-test passed')
