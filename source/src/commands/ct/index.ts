import type { Command } from '../../commands.js'

const ct = {
  type: 'local-jsx',
  name: 'ct',
  description:
    'Manage CT private project identity, soul, session notes, and defaults',
  immediate: true,
  load: () => import('./ct.js'),
} satisfies Command

export default ct
