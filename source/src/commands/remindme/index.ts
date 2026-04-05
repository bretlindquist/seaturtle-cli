import type { Command } from '../../commands.js'

const remindme = {
  type: 'local-jsx',
  name: 'remindme',
  aliases: ['rm'],
  description: 'Set, review, or clear a short end-of-response reminder',
  immediate: true,
  load: () => import('./remindme.js'),
} satisfies Command

export default remindme
