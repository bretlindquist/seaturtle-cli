import { dirname } from 'path'
import { getDisplayPath, writeFileSyncAndFlush_DEPRECATED } from '../../utils/file.js'
import { getFsImplementation } from '../../utils/fsOperations.js'
import { getCtFeedbackPath } from './paths.js'
import {
  addFeedbackEntryToMarkdown,
  buildDefaultProjectFeedbackMarkdown,
  type ProjectFeedbackEntry,
} from './projectFeedbackMarkdown.js'

export function ensureProjectFeedbackFile(): { path: string; created: boolean } {
  const path = getCtFeedbackPath()
  const fs = getFsImplementation()
  const dir = dirname(path)
  fs.mkdirSync(dir)

  if (!fs.existsSync(path)) {
    writeFileSyncAndFlush_DEPRECATED(path, buildDefaultProjectFeedbackMarkdown(), {
      encoding: 'utf-8',
    })
    return { path, created: true }
  }

  return { path, created: false }
}

export function addProjectFeedbackEntry(entry: ProjectFeedbackEntry): {
  path: string
  displayPath: string
  created: boolean
} {
  const { path, created } = ensureProjectFeedbackFile()
  const fs = getFsImplementation()
  const current = fs.readFileSync(path, { encoding: 'utf8' })
  const next = addFeedbackEntryToMarkdown(current, entry)

  writeFileSyncAndFlush_DEPRECATED(path, next, {
    encoding: 'utf-8',
  })

  return {
    path,
    displayPath: getDisplayPath(path),
    created,
  }
}
