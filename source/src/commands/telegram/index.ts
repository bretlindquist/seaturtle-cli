import type { Command } from '../../commands.js'

const telegram = {
  type: 'local-jsx',
  name: 'telegram',
  description: 'Set up, bind, test, or troubleshoot Telegram for this project',
  immediate: true,
  load: () => import('./telegram.js'),
} satisfies Command

export default telegram
