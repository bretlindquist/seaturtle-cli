import type { Command } from '../../commands.js'

const gemini = {
  aliases: ['gem'],
  type: 'local-jsx',
  name: 'gemini',
  description: 'Manage Gemini strict mode and Gemini-only guardrails',
  load: () => import('./gemini.js'),
} satisfies Command

export default gemini
