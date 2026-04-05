import type { Command } from '../../commands.js'

const telegram = {
  type: 'local-jsx',
  name: 'telegram',
  description: 'View Telegram setup and status',
  immediate: true,
  load: () => import('./telegram.js'),
} satisfies Command

export default telegram
