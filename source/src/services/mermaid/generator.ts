import { dirname, join } from 'path'
import { writeFileSyncAndFlush_DEPRECATED } from '../../utils/file.js'
import { getFsImplementation } from '../../utils/fsOperations.js'
import { getCtProjectRoot } from '../projectIdentity/paths.js'
import type { MermaidPlan } from './types.js'

function ensureParentDir(path: string): void {
  getFsImplementation().mkdirSync(dirname(path))
}

function renderPlanMarkdown(plan: MermaidPlan): string {
  const lines = [
    `# ${plan.title}`,
    '',
    plan.summary,
    '',
    '## Diagram',
    '',
    '```mermaid',
    plan.mermaid,
    '```',
  ]

  if (plan.evidenceLines.length > 0) {
    lines.push('', '## Evidence', '', ...plan.evidenceLines.map(line => `- ${line}`))
  }

  if (plan.notes.length > 0) {
    lines.push('', '## Notes', '', ...plan.notes.map(line => `- ${line}`))
  }

  lines.push('')
  return lines.join('\n')
}

export function writeMermaidPlan(
  plan: MermaidPlan,
  root: string = getCtProjectRoot(),
): string {
  if (!plan.outputPath) {
    throw new Error('Mermaid plan has no output path.')
  }

  const fullPath = join(root, plan.outputPath)
  ensureParentDir(fullPath)
  writeFileSyncAndFlush_DEPRECATED(fullPath, renderPlanMarkdown(plan), {
    encoding: 'utf-8',
  })
  return fullPath
}
