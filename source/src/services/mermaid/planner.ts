import { basename } from 'path'
import type { MermaidPlan, MermaidRepoEvidence, MermaidRequest } from './types.js'

function toSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'mermaid'
}

function quote(label: string): string {
  return label.replace(/"/g, "'")
}

function shortLabel(path: string): string {
  return basename(path)
}

function buildProjectMermaid(evidence: MermaidRepoEvidence): string {
  const lines = [
    'flowchart TD',
    '    A["ct wrapper"] --> B["dist/cli.js"]',
    '    B --> C["entrypoints/cli.tsx"]',
    '    C --> D["main.tsx"]',
    '    D --> E["screens/REPL.tsx"]',
    '    E --> F["project instruction loading"]',
    '    F --> G["SEATURTLE.md / AGENTS.md compatibility"]',
    '    E --> H["private .ct relationship stack"]',
    '    H --> H1["soul → identity → role → user → attunement → session"]',
    '    E --> I["posture + context domain classification"]',
    '    I --> I1["open / explore / work / supportive"]',
    '    I --> I2["project_work / project_explore / companion_chat / gameplay / side_question"]',
  ]

  if (evidence.topCommands.length > 0) {
    lines.push('    E --> J["user-facing commands"]')
    for (const command of evidence.topCommands) {
      lines.push(`    J --> J_${toSlug(command)}["/${quote(command)}"]`)
    }
  }

  if (evidence.topServices.length > 0) {
    lines.push('    D --> K["service layers"]')
    for (const service of evidence.topServices) {
      lines.push(`    K --> K_${toSlug(service)}["services/${quote(service)}"]`)
    }
  }

  return lines.join('\n')
}

function buildFocusedMermaid(evidence: MermaidRepoEvidence, target: string): string {
  const lines = ['flowchart TD', `    A["${quote(target)}"]`]

  if (evidence.focusFiles.length === 0) {
    lines.push('    A --> B["No matching focus files found"]')
    return lines.join('\n')
  }

  for (const file of evidence.focusFiles.slice(0, 16)) {
    lines.push(`    A --> F_${toSlug(file)}["${quote(shortLabel(file))}"]`)
  }

  for (const edge of evidence.importEdges.slice(0, 24)) {
    lines.push(
      `    F_${toSlug(edge.from)} --> F_${toSlug(edge.to)}["imports"]`,
    )
  }

  return lines.join('\n')
}

function buildFlowMermaid(evidence: MermaidRepoEvidence, target: string): string {
  const normalized = target.replace(/^\//, '')
  const lines = ['sequenceDiagram', '    actor User']

  if (normalized === 'startup') {
    lines.push(
      '    User->>CT: run ct',
      '    CT->>Wrapper: launch bin/ct',
      '    Wrapper->>Runtime: exec dist/cli.js',
      '    Runtime->>REPL: start interactive shell',
      '    REPL->>Memory: load SEATURTLE.md and .ct stack',
      '    REPL->>Classifier: apply posture and context domain',
      '    Classifier-->>User: ready for conversation or work',
    )
    return lines.join('\n')
  }

  const commandFile = evidence.focusFiles.find(path => path.includes(`/commands/${normalized}/`))
  lines.push(`    User->>CT: /${normalized}`)
  if (commandFile) {
    lines.push(`    CT->>Command: ${shortLabel(commandFile)}`)
  } else {
    lines.push('    CT->>Command: resolve command shell')
  }

  const services = evidence.importEdges
    .map(edge => edge.to)
    .filter(path => path.includes('/services/'))
    .slice(0, 5)

  if (services.length === 0) {
    lines.push('    Command->>Repo: inspect relevant project files')
  } else {
    for (const service of services) {
      lines.push(`    Command->>Service: ${shortLabel(service)}`)
    }
  }

  lines.push('    Service-->>CT: planned diagram + evidence')
  lines.push('    CT-->>User: write Mermaid markdown doc')
  return lines.join('\n')
}

function buildJourneyMermaid(target: string): string {
  const normalized = target.replace(/^\//, '')
  const lines = ['journey', `    title ${target} user journey`]

  switch (normalized) {
    case 'autowork':
      lines.push(
        '    section Prepare',
        '      Open /autowork: 4: User',
        '      Inspect status and doctor: 5: User, CT',
        '    section Choose policy',
        '      Stay safe or arm dangerous mode: 4: User, CT',
        '    section Execute',
        '      Run or step through chunks: 5: User, CT',
        '      Verify checkpoints and stops: 4: CT',
      )
      break
    case 'game':
      lines.push(
        '    section Enter play',
        '      Open /game: 5: User',
        '      Choose a strange path: 5: User, CT',
        '    section Resolve',
        '      Gain archive outcome or item: 4: CT',
        '      Replay for surprise: 5: User',
      )
      break
    case 'ct':
      lines.push(
        '    section Orient',
        '      Open /ct: 5: User',
        '      Choose what to retune: 4: User',
        '    section Tune',
        '      Edit soul or identity layers: 4: User, CT',
        '      Return to the project with a better fit: 5: User',
      )
      break
    case 'telegram':
      lines.push(
        '    section Connect',
        '      Open /telegram: 4: User',
        '      Pair and bind bot: 4: User, CT',
        '    section Confirm',
        '      Test and doctor the project binding: 5: User, CT',
      )
      break
    case 'mermaid':
      lines.push(
        '    section Choose',
        '      Open /mermaid: 5: User',
        '      Pick map type: 5: User',
        '    section Generate',
        '      Inspect repo evidence: 4: CT',
        '      Write durable Mermaid doc: 5: CT',
        '    section Iterate',
        '      Review and update later: 4: User, CT',
      )
      break
    default:
      lines.push(
        '    section Start',
        '      Open the feature: 4: User',
        '      Pick a path: 4: User',
        '    section Finish',
        '      CT responds with a durable result: 4: User, CT',
      )
  }

  return lines.join('\n')
}

export function planMermaid(
  request: MermaidRequest,
  evidence: MermaidRepoEvidence,
): MermaidPlan {
  const target = request.target?.trim() || ''
  const targetSlug = toSlug(target || request.intent)

  switch (request.intent) {
    case 'project':
      return {
        intent: request.intent,
        title: 'Project Mermaid Map',
        summary: 'High-level runtime and context architecture for the current repo.',
        diagramType: 'flowchart TD',
        mermaid: buildProjectMermaid(evidence),
        outputPath: 'docs/ARCHITECTURE-PROJECT.md',
        evidenceLines: [
          ...evidence.entrypoints.map(path => `entrypoint: ${path}`),
          ...evidence.topCommands.map(name => `command: /${name}`),
          ...evidence.topServices.map(name => `service: ${name}`),
        ],
        notes: ['Built from repo structure and current CT architectural layers.'],
      }
    case 'focus':
      return {
        intent: request.intent,
        title: `Focused Mermaid Map: ${target || 'current project slice'}`,
        summary: 'Narrow map of a feature, path, or service slice from repo evidence.',
        diagramType: 'flowchart TD',
        mermaid: buildFocusedMermaid(evidence, target || 'current project slice'),
        outputPath: `docs/internal/${targetSlug}-architecture.md`,
        evidenceLines: evidence.focusFiles.length
          ? evidence.focusFiles.map(path => `focus file: ${path}`)
          : ['No specific focus files were resolved from the target.'],
        notes: ['Import edges are explicit when they come from local relative imports.'],
      }
    case 'flow':
      return {
        intent: request.intent,
        title: `Flow Mermaid Map: ${target || 'startup'}`,
        summary: 'Ordered flow of a command, runtime path, or startup path.',
        diagramType: 'sequenceDiagram',
        mermaid: buildFlowMermaid(evidence, target || 'startup'),
        outputPath: `docs/internal/${targetSlug}-flow.md`,
        evidenceLines: evidence.importEdges.length
          ? evidence.importEdges.map(edge => `flow edge: ${edge.from} -> ${edge.to}`)
          : ['Flow uses repo structure plus limited inferred sequencing.'],
        notes: ['Sequence steps may include light inference to stay readable.'],
      }
    case 'journey':
      return {
        intent: request.intent,
        title: `User Journey Mermaid Map: ${target || 'feature'}`,
        summary: 'User path through a feature or experience, not just system internals.',
        diagramType: 'journey',
        mermaid: buildJourneyMermaid(target || 'feature'),
        outputPath: `docs/${targetSlug}-journey.md`,
        evidenceLines: [
          target
            ? `journey target: ${target}`
            : 'Journey generated from the selected feature mode.',
        ],
        notes: ['Journey maps are task- or feature-specific rather than universal.'],
      }
    case 'update':
      return {
        intent: request.intent,
        title: `Updated Mermaid Doc: ${target || 'docs/ARCHITECTURE.md'}`,
        summary: 'Regenerated Mermaid markdown doc from current repo evidence.',
        diagramType: 'flowchart TD',
        mermaid: buildProjectMermaid(evidence),
        outputPath: target || 'docs/ARCHITECTURE.md',
        evidenceLines: evidence.existingDocs.map(doc => `existing doc: ${doc.path}`),
        notes: ['Update mode currently regenerates the selected doc as a project map.'],
      }
    case 'explain':
      return {
        intent: request.intent,
        title: 'Existing Mermaid Docs',
        summary: 'List and explain Mermaid docs already present in the repo.',
        diagramType: 'flowchart TD',
        mermaid: 'flowchart TD\n    A["Mermaid docs explainer"]',
        evidenceLines: evidence.existingDocs.map(doc => `${doc.path} — ${doc.title}`),
        notes: ['Explain mode reports docs instead of writing a new one.'],
      }
  }
}
