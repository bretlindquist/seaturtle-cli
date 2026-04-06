import { basename, extname, join, relative, resolve } from 'path'
import { getFsImplementation } from '../../utils/fsOperations.js'
import { getCtProjectRoot } from '../projectIdentity/paths.js'
import type {
  MermaidExistingDoc,
  MermaidRepoEvidence,
  MermaidRequest,
  MermaidSuggestions,
} from './types.js'

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.md'])
const TOP_COMMAND_NAMES = [
  'autowork',
  'game',
  'ct',
  'telegram',
  'mermaid',
  'haiku',
  'swim',
]
const TOP_SERVICE_NAMES = ['autowork', 'projectIdentity', 'mermaid']
const FLOW_TARGETS = ['startup', '/autowork', '/game', '/ct', '/mermaid', '/telegram']
const JOURNEY_TARGETS = ['autowork', 'game', 'ct', 'mermaid', 'telegram', 'haiku']

function normalizeTarget(target: string): string {
  return target.trim()
}

function isSourceLikeFile(path: string): boolean {
  return SOURCE_EXTENSIONS.has(extname(path))
}

function walkDir(root: string, path: string, results: string[], maxFiles = 80): void {
  if (results.length >= maxFiles) {
    return
  }

  const fs = getFsImplementation()
  if (!fs.existsSync(path)) {
    return
  }

  for (const entry of fs.readdirSync(path)) {
    if (results.length >= maxFiles) {
      return
    }

    const entryPath = join(path, entry.name)

    if (entry.isDirectory()) {
      if (
        entry.name === 'node_modules' ||
        entry.name === 'dist' ||
        entry.name === '.git' ||
        entry.name === '.ct'
      ) {
        continue
      }
      walkDir(root, entryPath, results, maxFiles)
      continue
    }

    if (isSourceLikeFile(entryPath)) {
      results.push(relative(root, entryPath))
    }
  }
}

function readMarkdownTitle(path: string): string {
  const fs = getFsImplementation()
  if (!fs.existsSync(path)) {
    return basename(path)
  }

  const lines = fs.readFileSync(path, { encoding: 'utf-8' }).split('\n')
  const heading = lines.find(line => line.startsWith('# '))
  return heading ? heading.slice(2).trim() : basename(path)
}

function listMermaidDocs(root: string): MermaidExistingDoc[] {
  const fs = getFsImplementation()
  const docsDirs = [join(root, 'docs'), join(root, 'docs', 'internal')]
  const matches: MermaidExistingDoc[] = []

  for (const docsDir of docsDirs) {
    if (!fs.existsSync(docsDir)) {
      continue
    }

    const files: string[] = []
    walkDir(root, docsDir, files, 200)

    for (const relPath of files) {
      if (!relPath.endsWith('.md')) {
        continue
      }

      const fullPath = join(root, relPath)
      const content = fs.readFileSync(fullPath, { encoding: 'utf-8' })
      if (!content.includes('```mermaid')) {
        continue
      }

      matches.push({
        path: relPath,
        title: readMarkdownTitle(fullPath),
      })
    }
  }

  return matches.sort((a, b) => a.path.localeCompare(b.path))
}

function listExistingChildNames(path: string): string[] {
  const fs = getFsImplementation()
  if (!fs.existsSync(path)) {
    return []
  }

  return fs
    .readdirSync(path)
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b))
}

function resolveFocusFiles(root: string, request: MermaidRequest): string[] {
  const fs = getFsImplementation()
  const target = request.target ? normalizeTarget(request.target) : ''
  if (!target) {
    return []
  }

  const candidates = new Set<string>()
  const withoutSlash = target.startsWith('/') ? target.slice(1) : target
  const possiblePaths = [
    resolve(root, target),
    join(root, target),
    join(root, 'source', 'src', 'commands', withoutSlash),
    join(root, 'source', 'src', 'commands', `${withoutSlash}.ts`),
    join(root, 'source', 'src', 'services', withoutSlash),
    join(root, 'source', 'src', 'services', `${withoutSlash}.ts`),
  ]

  for (const candidate of possiblePaths) {
    if (!fs.existsSync(candidate)) {
      continue
    }

    const stats = fs.statSync(candidate)
    if (stats.isDirectory()) {
      const collected: string[] = []
      walkDir(root, candidate, collected, 80)
      for (const item of collected) {
        candidates.add(item)
      }
      continue
    }

    if (stats.isFile() && isSourceLikeFile(candidate)) {
      candidates.add(relative(root, candidate))
    }
  }

  return [...candidates].sort((a, b) => a.localeCompare(b))
}

function resolveImportTarget(root: string, fromPath: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) {
    return null
  }

  const basePath = resolve(root, fromPath, '..', specifier)
  const candidates = [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.jsx`,
    join(basePath, 'index.ts'),
    join(basePath, 'index.tsx'),
    join(basePath, 'index.js'),
    join(basePath, 'index.jsx'),
  ]

  const fs = getFsImplementation()
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return relative(root, candidate)
    }
  }

  return null
}

function collectImportEdges(
  root: string,
  focusFiles: string[],
): Array<{
  from: string
  to: string
}> {
  const fs = getFsImplementation()
  const edges = new Map<string, { from: string; to: string }>()

  for (const relPath of focusFiles) {
    const fullPath = join(root, relPath)
    if (!fs.existsSync(fullPath)) {
      continue
    }

    const content = fs.readFileSync(fullPath, { encoding: 'utf-8' })
    const matches = content.matchAll(/from\s+['"]([^'"]+)['"]/g)
    for (const match of matches) {
      const specifier = match[1]
      if (!specifier) {
        continue
      }
      const target = resolveImportTarget(root, fullPath, specifier)
      if (!target) {
        continue
      }
      const key = `${relPath}->${target}`
      edges.set(key, { from: relPath, to: target })
    }
  }

  return [...edges.values()].sort((a, b) =>
    `${a.from}->${a.to}`.localeCompare(`${b.from}->${b.to}`),
  )
}

export function getMermaidSuggestions(root: string = getCtProjectRoot()): MermaidSuggestions {
  const commandNames = listExistingChildNames(join(root, 'source', 'src', 'commands'))
  const serviceNames = listExistingChildNames(join(root, 'source', 'src', 'services'))

  const focusTargets = [
    ...TOP_COMMAND_NAMES.filter(name => commandNames.includes(name)).map(name => `/${name}`),
    ...TOP_SERVICE_NAMES.filter(name => serviceNames.includes(name)).map(
      name => `source/src/services/${name}`,
    ),
  ]

  return {
    focusTargets,
    flowTargets: FLOW_TARGETS.filter(target => {
      if (target === 'startup') return true
      return commandNames.includes(target.replace(/^\//, ''))
    }),
    journeyTargets: JOURNEY_TARGETS.filter(target => commandNames.includes(target)),
    updateTargets: listMermaidDocs(root).map(doc => doc.path),
  }
}

export function scanMermaidRepo(
  request: MermaidRequest,
  root: string = getCtProjectRoot(),
): MermaidRepoEvidence {
  const fs = getFsImplementation()
  const entrypoints = [
    'source/src/entrypoints/cli.tsx',
    'source/src/main.tsx',
    'source/src/screens/REPL.tsx',
  ].filter(path => fs.existsSync(join(root, path)))

  const commandNames = listExistingChildNames(join(root, 'source', 'src', 'commands'))
  const serviceNames = listExistingChildNames(join(root, 'source', 'src', 'services'))
  const focusFiles = resolveFocusFiles(root, request)

  return {
    root,
    hasGitProject: fs.existsSync(join(root, '.git')),
    entrypoints,
    topCommands: TOP_COMMAND_NAMES.filter(name => commandNames.includes(name)),
    topServices: TOP_SERVICE_NAMES.filter(name => serviceNames.includes(name)),
    existingDocs: listMermaidDocs(root),
    focusFiles,
    importEdges: collectImportEdges(root, focusFiles),
  }
}
