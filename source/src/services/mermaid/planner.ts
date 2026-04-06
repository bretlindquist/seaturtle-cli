import { basename } from 'path'
import type { MermaidC4Level, MermaidPlan, MermaidRepoEvidence, MermaidRequest } from './types.js'

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

function buildC4ContextMermaid(evidence: MermaidRepoEvidence): string {
  const lines = [
    'C4Context',
    'title System Context for SeaTurtle CLI',
    'Person(user, "User", "Uses CT for work, exploration, and playful side modes")',
    'System(ct, "SeaTurtle CLI", "Interactive terminal runtime with slash commands, provider runtime, and project-aware context domains")',
    'System_Ext(openai, "OpenAI/Codex", "Main provider runtime when selected")',
    'System_Ext(git, "Git-backed project", "Repo, working tree, docs, and codebase context")',
    'Rel(user, ct, "Uses through ct")',
    'Rel(ct, openai, "Queries for model responses and tool turns")',
    'Rel(ct, git, "Reads and writes project state")',
  ]

  if (evidence.topCommands.includes('telegram')) {
    lines.push('System_Ext(telegram, "Telegram", "Project-bound pairing and stop/debt notices")')
    lines.push('Rel(ct, telegram, "Sends messages and alerts when configured")')
  }

  return lines.join('\n')
}

function buildC4ContainerMermaid(): string {
  const lines = [
    'C4Container',
    'title SeaTurtle CLI container view',
    'Person(user, "User", "Runs commands and works in the terminal")',
    'System_Ext(openai, "OpenAI/Codex", "Provider runtime")',
    'System_Ext(git, "Git-backed project", "Repo files, docs, and session state")',
    'System_Boundary(ct_boundary, "SeaTurtle CLI") {',
    '  Container(wrapper, "ct wrapper", "Shell wrapper", "Launches the branded CLI entrypoint")',
    '  Container(runtime, "Runtime + REPL", "TypeScript / Node", "Starts the interactive shell, main loop, and command routing")',
    '  Container(commands, "Slash command layer", "TypeScript", "User-facing commands such as /autowork, /game, /ct, /mermaid")',
    '  Container(services, "Service layer", "TypeScript", "Autowork, project identity, mermaid planning, telegram, and helper services")',
    '  ContainerDb(ctlayer, ".ct relationship stack", "Markdown/JSON", "Soul, identity, role, user, attunement, session, and archives")',
    '}',
    'Rel(user, wrapper, "Runs")',
    'Rel(wrapper, runtime, "Starts")',
    'Rel(runtime, commands, "Routes slash commands")',
    'Rel(runtime, services, "Uses")',
    'Rel(runtime, ctlayer, "Loads private CT context from")',
    'Rel(runtime, openai, "Queries")',
    'Rel(runtime, git, "Reads and writes project files in")',
  ]

  return lines.join('\n')
}

function buildC4ComponentMermaid(
  evidence: MermaidRepoEvidence,
  target: string,
): string {
  const focusLabel = target || 'Mermaid-focused slice'
  const lines = [
    'C4Component',
    `title Component view for ${focusLabel}`,
    `Container(target, "${quote(focusLabel)}", "TypeScript", "Focused repo slice")`,
    `Container(system, "SeaTurtle CLI", "Runtime", "Command shell and service orchestration")`,
    'Component(scanner, "Repo scan", "scan.ts", "Collects repo evidence, Mermaid docs, and focus files")',
    'Component(planner, "Diagram planner", "planner.ts", "Chooses Mermaid or C4 diagram structure from intent + evidence")',
    'Component(generator, "Markdown generator", "generator.ts", "Writes durable Mermaid markdown docs")',
    'Component(shell, "Command shell", "mermaid.tsx", "Parses fast paths and shows menus")',
    'Rel(system, shell, "Routes /mermaid requests to")',
    'Rel(shell, scanner, "Asks for repo evidence from")',
    'Rel(scanner, planner, "Supplies evidence to")',
    'Rel(planner, generator, "Supplies planned diagram to")',
    'Rel(generator, target, "Writes docs that describe")',
  ]

  const localImports = evidence.importEdges.slice(0, 8)
  for (const edge of localImports) {
    lines.push(
      `Rel(target, target, "contains ${quote(shortLabel(edge.from))} -> ${quote(shortLabel(edge.to))}")`,
    )
  }

  return lines.join('\n')
}

function buildC4DynamicMermaid(target: string): string {
  const normalized = target.replace(/^\//, '') || 'mermaid'
  const lines = [
    'C4Dynamic',
    `title Dynamic view for ${target || '/mermaid'}`,
    'Person(user, "User", "Runs the command")',
    'Container(wrapper, "ct wrapper", "Shell wrapper", "Branded CLI launcher")',
    'Container(runtime, "Runtime + REPL", "TypeScript", "Main shell and command routing")',
    'Container(command, "Slash command layer", "TypeScript", "Resolves local-jsx commands")',
    'Container(scanner, "Repo scan", "TypeScript", "Collects repo evidence")',
    'Container(planner, "Diagram planner", "TypeScript", "Builds Mermaid/C4 plan")',
    'Container(generator, "Markdown generator", "TypeScript", "Writes durable markdown docs")',
    'Rel(user, wrapper, "1. run command")',
    'Rel(wrapper, runtime, "2. start interactive runtime")',
    `Rel(runtime, command, "3. route /${quote(normalized)}")`,
    'Rel(command, scanner, "4. collect repo evidence")',
    'Rel(scanner, planner, "5. plan the diagram")',
    'Rel(planner, generator, "6. hand off Mermaid/C4 plan")',
    'Rel(generator, user, "7. return path to written markdown doc")',
  ]
  return lines.join('\n')
}

export function planMermaid(
  request: MermaidRequest,
  evidence: MermaidRepoEvidence,
): MermaidPlan {
  const target = request.target?.trim() || ''
  const targetSlug = toSlug(target || request.intent)

  switch (request.intent) {
    case 'c4': {
      const level: MermaidC4Level = request.c4Level ?? 'context'

      switch (level) {
        case 'context':
          return {
            intent: request.intent,
            title: 'C4 System Context',
            summary: 'System-context view of SeaTurtle CLI and its primary external relationships.',
            diagramType: 'C4Context',
            mermaid: buildC4ContextMermaid(evidence),
            outputPath: 'docs/C4-CONTEXT.md',
            evidenceLines: [
              ...evidence.entrypoints.map(path => `entrypoint: ${path}`),
              ...evidence.topCommands.map(name => `command: /${name}`),
            ],
            notes: [
              'C4 context focuses on the user, SeaTurtle CLI, and major external systems.',
              'Mermaid C4 support is experimental.',
            ],
          }
        case 'container':
          return {
            intent: request.intent,
            title: 'C4 Container View',
            summary: 'Container-level view of the main SeaTurtle runtime layers.',
            diagramType: 'C4Container',
            mermaid: buildC4ContainerMermaid(),
            outputPath: 'docs/C4-CONTAINERS.md',
            evidenceLines: [
              ...evidence.entrypoints.map(path => `entrypoint: ${path}`),
              ...evidence.topServices.map(name => `service: ${name}`),
            ],
            notes: [
              'This focuses on top-level runtime pieces rather than every file.',
              'Mermaid C4 support is experimental.',
            ],
          }
        case 'component':
          return {
            intent: request.intent,
            title: `C4 Component View: ${target || 'mermaid'}`,
            summary: 'Component-level view of one focused slice of the system.',
            diagramType: 'C4Component',
            mermaid: buildC4ComponentMermaid(evidence, target || 'mermaid'),
            outputPath: `docs/internal/${targetSlug}-c4-component.md`,
            evidenceLines: evidence.focusFiles.length
              ? evidence.focusFiles.map(path => `focus file: ${path}`)
              : ['No specific focus files were resolved from the target.'],
            notes: [
              'Component views stay focused on one slice instead of the whole repo.',
              'Mermaid C4 support is experimental.',
            ],
          }
        case 'dynamic':
          return {
            intent: request.intent,
            title: `C4 Dynamic View: ${target || '/mermaid'}`,
            summary: 'Dynamic interaction view for one concrete runtime or command path.',
            diagramType: 'C4Dynamic',
            mermaid: buildC4DynamicMermaid(target || '/mermaid'),
            outputPath: `docs/internal/${targetSlug}-c4-dynamic.md`,
            evidenceLines: target
              ? [`dynamic target: ${target}`]
              : ['Dynamic view generated from the selected C4 mode.'],
            notes: [
              'Dynamic views show one concrete interaction path.',
              'Mermaid C4 support is experimental.',
            ],
          }
      }
    }
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
