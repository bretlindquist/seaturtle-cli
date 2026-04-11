import type { Command } from '../../commands.js'

const queue = {
  type: 'local-jsx',
  name: 'queue',
  description: 'Review, edit, and remove queued messages',
  load: () => import('./queue.js'),
} satisfies Command

export default queue
