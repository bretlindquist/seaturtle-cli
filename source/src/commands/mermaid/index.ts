import type { Command } from '../../commands.js'

const mermaid = {
  type: 'local-jsx',
  name: 'mermaid',
  description:
    'Generate Mermaid architecture, flow, focused, and journey docs from repo evidence',
  immediate: true,
  load: () => import('./mermaid.js'),
} satisfies Command

export default mermaid
