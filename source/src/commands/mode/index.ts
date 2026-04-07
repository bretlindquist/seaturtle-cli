import type { Command } from '../../commands.js'

const mode = {
  type: 'local-jsx',
  name: 'mode',
  description: 'Choose a CT input lane (convo, discovery, planning, etc)',
  load: () => import('./mode.js'),
} satisfies Command

export default mode
