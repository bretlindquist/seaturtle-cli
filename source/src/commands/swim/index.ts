import type { Command } from '../../commands.js'

const swim = {
  type: 'local-jsx',
  name: 'swim',
  description:
    'Run the whimsical alias for persistent tracked-plan orchestration with the same bounded windows, cloud offload launch, and verification gates',
  argumentHint:
    '[run|step|status|doctor|safe|dangerous|verify|use <plan>|run 8h|cloud run 8h|cloud local run 8h|cloud <host> run 8h]',
  immediate: true,
  supportsNonInteractive: true,
  disableModelInvocation: true,
  userInvocable: true,
  load: () => import('./swim.js'),
} satisfies Command

export default swim
