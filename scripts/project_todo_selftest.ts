import assert from 'node:assert/strict'

import {
  addTodoItemToMarkdown,
  buildDefaultProjectTodoMarkdown,
} from '../source/src/services/projectIdentity/projectTodoMarkdown.ts'

const created = buildDefaultProjectTodoMarkdown('finish auth pass')
assert(created.includes('# CT Project Todo'))
assert(created.includes('## Active'))
assert(created.includes('- [ ] finish auth pass'))

const existing = `# CT Project Todo

## Active
- [ ] existing task

## Later
- [ ] later task
`

const withInsert = addTodoItemToMarkdown(existing, 'new task')
assert.equal(withInsert.added, true)
assert.match(
  withInsert.content,
  /## Active\n- \[ \] new task\n- \[ \] existing task/,
  'new items should be inserted at the top of the Active section',
)

const duplicate = addTodoItemToMarkdown(withInsert.content, 'new task')
assert.equal(duplicate.added, false)

const withoutSection = addTodoItemToMarkdown('# Notes\n\nmisc', 'fresh task')
assert.equal(withoutSection.added, true)
assert.match(
  withoutSection.content,
  /## Active\n- \[ \] fresh task/,
  'missing Active section should be created deterministically',
)

console.log('project todo self-test passed')
