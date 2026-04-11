import type { Command } from '../../commands.js'

const lolcat = {
  type: 'local-jsx',
  name: 'lolcat',
  description: 'Turn the whole CT shell rainbow, with optional animation',
  immediate: true,
  load: () => import('./lolcat.js'),
} satisfies Command

export default lolcat
