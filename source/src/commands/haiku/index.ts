import type { Command } from '../../commands.js'

const haiku = {
  type: 'local-jsx',
  name: 'haiku',
  description: 'Recite a SeaTurtle haiku and control rare startup haiku',
  immediate: true,
  load: () => import('./haiku.js'),
} satisfies Command

export default haiku
