export type MermaidIntent =
  | 'project'
  | 'focus'
  | 'flow'
  | 'journey'
  | 'update'
  | 'explain'

export type MermaidRequest = {
  intent: MermaidIntent
  target?: string
}

export type MermaidExistingDoc = {
  path: string
  title: string
}

export type MermaidRepoEvidence = {
  root: string
  hasGitProject: boolean
  entrypoints: string[]
  topCommands: string[]
  topServices: string[]
  existingDocs: MermaidExistingDoc[]
  focusFiles: string[]
  importEdges: Array<{
    from: string
    to: string
  }>
}

export type MermaidPlan = {
  intent: MermaidIntent
  title: string
  summary: string
  diagramType: 'flowchart TD' | 'sequenceDiagram' | 'journey'
  mermaid: string
  outputPath?: string
  evidenceLines: string[]
  notes: string[]
}

export type MermaidSuggestions = {
  focusTargets: string[]
  flowTargets: string[]
  journeyTargets: string[]
  updateTargets: string[]
}
