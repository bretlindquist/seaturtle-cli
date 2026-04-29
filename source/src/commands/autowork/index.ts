import type { Command } from '../../commands.js'

const autowork = {
  type: 'local-jsx',
  name: 'autowork',
  description:
    'Run persistent tracked-plan orchestration with run, step, status, doctor, verify, and runtime-window controls',
  argumentHint:
    '[run|step|status|doctor|safe|dangerous|verify|use <plan>|run 8h]',
  immediate: true,
  disableModelInvocation: true,
  userInvocable: true,
  load: () => import('./autowork.js'),
} satisfies Command

export default autowork
