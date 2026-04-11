import type { Command } from '../../commands.js'

const caveman = {
  type: 'local-jsx',
  name: 'caveman',
  description: 'Toggle caveman response compression mode (off, lite, full, ultra)',
  immediate: true,
  load: () => import('./caveman.js'),
} satisfies Command

export default caveman
