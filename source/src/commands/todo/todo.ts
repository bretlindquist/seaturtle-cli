import type { LocalCommandCall } from '../../types/command.js'
import {
  addProjectTodoItem,
  ensureProjectTodoFile,
} from '../../services/projectIdentity/projectTodo.js'

const TODO_USAGE =
  'Usage: /todo <task>\nExample: /todo finish claude rebrand once auth is done'

export const call: LocalCommandCall = async args => {
  const task = args.trim()

  if (task.length === 0) {
    const ensured = ensureProjectTodoFile()
    return {
      type: 'text',
      value: `${ensured.created ? 'Created' : 'Using'} ${ensured.path.replace(process.cwd(), '.')} for project todos.\n\n${TODO_USAGE}`,
    }
  }

  const result = addProjectTodoItem(task)
  const prefix = result.added
    ? `Added project todo to ${result.displayPath}`
    : `Project todo already exists in ${result.displayPath}`

  return {
    type: 'text',
    value: `${prefix}\n${result.taskLine}`,
  }
}
