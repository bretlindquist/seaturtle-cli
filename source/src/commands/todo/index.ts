import type { Command } from '../../commands.js'

const todo = {
  type: 'local',
  name: 'todo',
  description: 'Add a task to this project’s CT todo file',
  argumentHint: '<task>',
  supportsNonInteractive: true,
  immediate: true,
  load: () => import('./todo.js'),
} satisfies Command

export default todo
