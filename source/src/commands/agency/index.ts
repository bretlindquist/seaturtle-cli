import type { Command } from '../../commands.js'

const agency = {
  type: 'local-jsx',
  name: 'agency',
  description: 'Install and manage optional Agency agent packs',
  immediate: true,
  load: () => import('./agency.js'),
} satisfies Command

export default agency
