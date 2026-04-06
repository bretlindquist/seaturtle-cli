export type MermaidIntent =
  | 'project'
  | 'focus'
  | 'flow'
  | 'journey'
  | 'c4'
  | 'update'
  | 'explain'

export type MermaidC4Level =
  | 'context'
  | 'container'
  | 'component'
  | 'dynamic'

export type MermaidRequest = {
  intent: MermaidIntent
  c4Level?: MermaidC4Level
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
  diagramType:
    | 'flowchart TD'
    | 'sequenceDiagram'
    | 'journey'
    | 'C4Context'
    | 'C4Container'
    | 'C4Component'
    | 'C4Dynamic'
  mermaid: string
  outputPath?: string
  evidenceLines: string[]
  notes: string[]
}

export type MermaidSuggestions = {
  focusTargets: string[]
  flowTargets: string[]
  journeyTargets: string[]
  c4ComponentTargets: string[]
  c4DynamicTargets: string[]
  updateTargets: string[]
}
