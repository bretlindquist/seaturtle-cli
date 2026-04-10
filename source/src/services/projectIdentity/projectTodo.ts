import { dirname } from 'path'
import { getDisplayPath, writeFileSyncAndFlush_DEPRECATED } from '../../utils/file.js'
import { getFsImplementation } from '../../utils/fsOperations.js'
import { getCtTodoPath } from './paths.js'
import {
  addTodoItemToMarkdown,
  buildDefaultProjectTodoMarkdown,
  toProjectTodoTaskLine,
} from './projectTodoMarkdown.js'

export function ensureProjectTodoFile(): { path: string; created: boolean } {
  const path = getCtTodoPath()
  const fs = getFsImplementation()
  const dir = dirname(path)
  fs.mkdirSync(dir)

  if (!fs.existsSync(path)) {
    writeFileSyncAndFlush_DEPRECATED(path, buildDefaultProjectTodoMarkdown(), {
      encoding: 'utf-8',
    })
    return { path, created: true }
  }

  return { path, created: false }
}

export function addProjectTodoItem(rawItem: string): {
  path: string
  displayPath: string
  added: boolean
  created: boolean
  taskLine: string
} {
  const item = rawItem.trim().replace(/\s+/g, ' ')
  const taskLine = toProjectTodoTaskLine(item)
  const { path, created } = ensureProjectTodoFile()
  const fs = getFsImplementation()
  const current = fs.readFileSync(path, { encoding: 'utf8' })
  const next = addTodoItemToMarkdown(current, item)

  if (next.added) {
    writeFileSyncAndFlush_DEPRECATED(path, next.content, {
      encoding: 'utf-8',
    })
  }

  return {
    path,
    displayPath: getDisplayPath(path),
    added: next.added,
    created,
    taskLine,
  }
}
