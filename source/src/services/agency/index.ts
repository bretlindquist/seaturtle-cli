import { createHash } from 'crypto'
import { dirname, join, posix } from 'path'
import { getProjectRoot } from '../../bootstrap/state.js'
import { parseFrontmatter } from '../../utils/frontmatterParser.js'
import { getClaudeConfigHomeDir } from '../../utils/envUtils.js'
import { getFsImplementation } from '../../utils/fsOperations.js'
import { writeFileSyncAndFlush_DEPRECATED } from '../../utils/file.js'
import { safeParseJSON } from '../../utils/json.js'
import { jsonStringify } from '../../utils/slowOperations.js'
import { getClaudeCodeUserAgent } from '../../utils/userAgent.js'
import { formatAgentAsMarkdown } from '../../components/agents/agentFileUtils.js'
import { parseAgentToolsFromFrontmatter } from '../../utils/markdownConfigLoader.js'
import { findCanonicalGitRoot } from '../../utils/git.js'

const AGENCY_OWNER = 'msitarzewski'
const AGENCY_REPO = 'agency-agents'
const AGENCY_REPO_URL = `https://github.com/${AGENCY_OWNER}/${AGENCY_REPO}`
const AGENCY_DEFAULT_REF = 'main'
const AGENCY_MANIFEST_VERSION = 1
const AGENCY_STATE_DIR = 'agency'
const AGENCY_MANIFEST_FILE = 'agency-agents.json'
const AGENCY_PROJECTS_DIR = 'projects'

const SUPPORTED_TOOL_NAMES = new Set([
  'Bash',
  'Edit',
  'Glob',
  'Grep',
  'LSP',
  'NotebookEdit',
  'PowerShell',
  'Read',
  'REPL',
  'Skill',
  'TodoWrite',
  'ToolSearch',
  'WebFetch',
  'WebSearch',
  'Write',
])

type GitHubCommitResponse = {
  sha?: string
}

type GitHubTreeResponse = {
  tree?: Array<{
    path?: string
    type?: string
  }>
}

export type AgencyInstallScope = 'user' | 'project'

export type AgencySelectionKind = 'all' | 'division' | 'agent'

export type AgencyManifestEntry = {
  id: string
  title: string
  division: string
  upstreamPath: string
  sourceSha: string
  localFilename: string
  localPath: string
  toolNames: string[]
  contentHash: string
}

export type AgencyManifest = {
  version: 1
  repoUrl: string
  ref: string
  installedCommit: string
  scope: AgencyInstallScope
  projectRoot?: string
  installedAt: number
  updatedAt: number
  selections: {
    raw: string
    kind: AgencySelectionKind
    targets: string[]
  }
  entries: AgencyManifestEntry[]
}

export type AgencyCatalogEntry = {
  id: string
  title: string
  description: string
  division: string
  upstreamPath: string
  sourceSha: string
  localFilename: string
  body: string
  toolNames: string[] | undefined
}

export type AgencyCatalog = {
  repoUrl: string
  ref: string
  commit: string
  divisions: string[]
  entries: AgencyCatalogEntry[]
}

export type AgencyInstallResult = {
  manifest: AgencyManifest
  installed: AgencyManifestEntry[]
  skipped: Array<{ id: string; reason: string }>
  selection: {
    raw: string
    kind: AgencySelectionKind
    targets: string[]
  }
}

export type AgencyUpdateResult = {
  manifest: AgencyManifest
  updated: AgencyManifestEntry[]
  unchanged: AgencyManifestEntry[]
  skipped: Array<{ id: string; reason: string }>
  missingUpstream: AgencyManifestEntry[]
}

export type AgencyRemoveResult = {
  removed: AgencyManifestEntry[]
  skipped: Array<{ id: string; reason: string }>
  remaining: AgencyManifestEntry[]
}

export type AgencyResolvedRunTarget = {
  manifest: AgencyManifest
  entry: AgencyManifestEntry
}

function getAgencyStateDir(): string {
  return join(getClaudeConfigHomeDir(), AGENCY_STATE_DIR)
}

function getCanonicalAgencyProjectRoot(): string {
  return findCanonicalGitRoot(getProjectRoot()) ?? getProjectRoot()
}

function getProjectManifestId(projectRoot: string): string {
  return sha256(projectRoot).slice(0, 16)
}

export function getAgencyManifestPath(
  scope: AgencyInstallScope = 'user',
): string {
  if (scope === 'project') {
    return join(
      getAgencyStateDir(),
      AGENCY_PROJECTS_DIR,
      `${getProjectManifestId(getCanonicalAgencyProjectRoot())}.json`,
    )
  }

  return join(getAgencyStateDir(), AGENCY_MANIFEST_FILE)
}

function getAgencyAgentsDir(scope: AgencyInstallScope): string {
  if (scope === 'project') {
    return join(getCanonicalAgencyProjectRoot(), '.claude', 'agents')
  }

  return join(getClaudeConfigHomeDir(), 'agents')
}

function ensureParentDir(path: string): void {
  getFsImplementation().mkdirSync(dirname(path))
}

function readJsonFile<T>(path: string): T | null {
  const fs = getFsImplementation()
  if (!fs.existsSync(path)) {
    return null
  }

  const raw = fs.readFileSync(path, { encoding: 'utf-8' })
  return safeParseJSON(raw, false) as T | null
}

function writeJsonFile(path: string, value: unknown): void {
  ensureParentDir(path)
  writeFileSyncAndFlush_DEPRECATED(path, jsonStringify(value, null, 2) + '\n', {
    encoding: 'utf-8',
  })
}

function sanitizeStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return []
  }

  return input.filter((value): value is string => typeof value === 'string')
}

export function readAgencyManifest(
  scope: AgencyInstallScope = 'user',
): AgencyManifest | null {
  const raw = readJsonFile<Partial<AgencyManifest>>(getAgencyManifestPath(scope))
  if (!raw || raw.version !== AGENCY_MANIFEST_VERSION) {
    return null
  }

  if (
    typeof raw.repoUrl !== 'string' ||
    typeof raw.ref !== 'string' ||
    typeof raw.installedCommit !== 'string' ||
    (raw.scope !== 'user' && raw.scope !== 'project') ||
    !Array.isArray(raw.entries)
  ) {
    return null
  }

  const entries: AgencyManifestEntry[] = raw.entries
    .filter(
      (entry): entry is AgencyManifestEntry =>
        !!entry &&
        typeof entry === 'object' &&
        typeof entry.id === 'string' &&
        typeof entry.title === 'string' &&
        typeof entry.division === 'string' &&
        typeof entry.upstreamPath === 'string' &&
        typeof entry.sourceSha === 'string' &&
        typeof entry.localFilename === 'string' &&
        typeof entry.localPath === 'string' &&
        typeof entry.contentHash === 'string' &&
        Array.isArray(entry.toolNames),
    )
    .map(entry => ({
      ...entry,
      toolNames: sanitizeStringArray(entry.toolNames),
    }))

  return {
    version: AGENCY_MANIFEST_VERSION,
    repoUrl: raw.repoUrl,
    ref: raw.ref,
    installedCommit: raw.installedCommit,
    scope: raw.scope,
    ...(typeof raw.projectRoot === 'string'
      ? { projectRoot: raw.projectRoot }
      : {}),
    installedAt:
      typeof raw.installedAt === 'number' ? raw.installedAt : Date.now(),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
    selections: {
      raw:
        typeof raw.selections?.raw === 'string' ? raw.selections.raw : 'all',
      kind:
        raw.selections?.kind === 'all' ||
        raw.selections?.kind === 'division' ||
        raw.selections?.kind === 'agent'
          ? raw.selections.kind
          : 'all',
      targets: sanitizeStringArray(raw.selections?.targets),
    },
    entries,
  }
}

function readAllAgencyManifests(): AgencyManifest[] {
  const manifests: AgencyManifest[] = []
  const userManifest = readAgencyManifest('user')
  if (userManifest) {
    manifests.push(userManifest)
  }

  const projectManifest = readAgencyManifest('project')
  if (projectManifest) {
    manifests.push(projectManifest)
  }

  return manifests
}

export function writeAgencyManifest(manifest: AgencyManifest): void {
  writeJsonFile(getAgencyManifestPath(manifest.scope), manifest)
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function humanizeSlug(value: string): string {
  return value
    .split('-')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function normalizeAgentTitle(path: string, explicitName: unknown): string {
  if (typeof explicitName === 'string' && explicitName.trim()) {
    return explicitName.trim()
  }

  const base = posix.basename(path, '.md')
  return humanizeSlug(base)
}

function normalizeDescription(
  explicitDescription: unknown,
  body: string,
  title: string,
): string {
  if (typeof explicitDescription === 'string' && explicitDescription.trim()) {
    return explicitDescription.trim()
  }

  const firstMeaningfulLine = body
    .split('\n')
    .map(line => line.trim())
    .find(line => line && !line.startsWith('#'))

  return firstMeaningfulLine || `Use ${title} for specialist Agency tasks.`
}

function normalizeToolNames(value: unknown): string[] | undefined {
  const parsed = parseAgentToolsFromFrontmatter(value)
  if (parsed === undefined) {
    return undefined
  }

  const filtered = parsed.filter(tool => SUPPORTED_TOOL_NAMES.has(tool))
  return filtered.length > 0 ? filtered : undefined
}

function buildAgentId(division: string, upstreamPath: string): string {
  return `agency-${slugify(division)}-${slugify(posix.basename(upstreamPath, '.md'))}`
}

function buildLocalFilename(id: string): string {
  return `${id}.md`
}

function buildNormalizedMarkdown(entry: AgencyCatalogEntry): string {
  return formatAgentAsMarkdown(
    entry.id,
    entry.description,
    entry.toolNames,
    entry.body.trim() + '\n',
  )
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': getClaudeCodeUserAgent(),
    },
  })

  if (!response.ok) {
    throw new Error(`Agency fetch failed (${response.status}) for ${url}`)
  }

  return (await response.json()) as T
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': getClaudeCodeUserAgent(),
    },
  })

  if (!response.ok) {
    throw new Error(`Agency content fetch failed (${response.status}) for ${url}`)
  }

  return await response.text()
}

async function resolveCommitSha(ref: string): Promise<string> {
  const url = `https://api.github.com/repos/${AGENCY_OWNER}/${AGENCY_REPO}/commits/${encodeURIComponent(ref)}`
  const response = await fetchJson<GitHubCommitResponse>(url)
  if (!response.sha) {
    throw new Error(`Agency ref ${ref} did not resolve to a commit`)
  }
  return response.sha
}

async function fetchTree(commitSha: string): Promise<string[]> {
  const url = `https://api.github.com/repos/${AGENCY_OWNER}/${AGENCY_REPO}/git/trees/${commitSha}?recursive=1`
  const response = await fetchJson<GitHubTreeResponse>(url)
  const files =
    response.tree
      ?.filter(
        item =>
          item.type === 'blob' &&
          typeof item.path === 'string' &&
          /^[^/]+\/[^/]+\.md$/.test(item.path),
      )
      .map(item => item.path as string) ?? []

  return files.sort((a, b) => a.localeCompare(b))
}

export async function fetchAgencyCatalog(
  ref: string = AGENCY_DEFAULT_REF,
): Promise<AgencyCatalog> {
  const commit = await resolveCommitSha(ref)
  const paths = await fetchTree(commit)
  const entries = await Promise.all(
    paths.map(async upstreamPath => {
      const bodyWithFrontmatter = await fetchText(
        `https://raw.githubusercontent.com/${AGENCY_OWNER}/${AGENCY_REPO}/${commit}/${upstreamPath}`,
      )
      const parsed = parseFrontmatter(bodyWithFrontmatter, upstreamPath)
      const division = upstreamPath.split('/')[0] || 'general'
      const title = normalizeAgentTitle(upstreamPath, parsed.frontmatter.name)
      const description = normalizeDescription(
        parsed.frontmatter.description,
        parsed.content,
        title,
      )
      const id = buildAgentId(division, upstreamPath)

      return {
        id,
        title,
        description,
        division,
        upstreamPath,
        sourceSha: commit,
        localFilename: buildLocalFilename(id),
        body: parsed.content,
        toolNames: normalizeToolNames(parsed.frontmatter.tools),
      } satisfies AgencyCatalogEntry
    }),
  )

  return {
    repoUrl: AGENCY_REPO_URL,
    ref,
    commit,
    divisions: Array.from(new Set(entries.map(entry => entry.division))).sort(
      (a, b) => a.localeCompare(b),
    ),
    entries,
  }
}

function findEntriesForTarget(
  catalog: AgencyCatalog,
  rawTarget: string | undefined,
): {
  kind: AgencySelectionKind
  targets: string[]
  entries: AgencyCatalogEntry[]
} {
  const target = rawTarget?.trim().toLowerCase()
  if (!target || target === 'all') {
    return {
      kind: 'all',
      targets: ['all'],
      entries: catalog.entries,
    }
  }

  const divisionMatches = catalog.entries.filter(
    entry => entry.division.toLowerCase() === target,
  )
  if (divisionMatches.length > 0) {
    return {
      kind: 'division',
      targets: [target],
      entries: divisionMatches,
    }
  }

  const strippedTarget = target.replace(/\.md$/, '')
  const directMatches = catalog.entries.filter(entry => {
    const upstreamNoExt = entry.upstreamPath.replace(/\.md$/, '').toLowerCase()
    const baseNoExt = posix.basename(entry.upstreamPath, '.md').toLowerCase()
    return (
      entry.id.toLowerCase() === strippedTarget ||
      upstreamNoExt === strippedTarget ||
      baseNoExt === strippedTarget
    )
  })

  if (directMatches.length === 1) {
    return {
      kind: 'agent',
      targets: [directMatches[0]!.id],
      entries: directMatches,
    }
  }

  if (directMatches.length > 1) {
    throw new Error(
      `Agency target "${rawTarget}" is ambiguous. Use one of: ${directMatches
        .map(entry => entry.id)
        .join(', ')}`,
    )
  }

  throw new Error(`Agency target "${rawTarget}" was not found upstream`)
}

export async function installAgencySelection(
  rawTarget: string | undefined,
  scope: AgencyInstallScope = 'user',
  ref: string = AGENCY_DEFAULT_REF,
): Promise<AgencyInstallResult> {
  const catalog = await fetchAgencyCatalog(ref)
  const selection = findEntriesForTarget(catalog, rawTarget)
  const existingManifest = readAgencyManifest(scope)
  const existingManagedIds = new Set(
    existingManifest?.entries.map(entry => entry.id) ?? [],
  )
  const existingById = new Map(
    existingManifest?.entries.map(entry => [entry.id, entry]) ?? [],
  )
  const installed: AgencyManifestEntry[] = []
  const skipped: Array<{ id: string; reason: string }> = []
  const fs = getFsImplementation()

  for (const entry of selection.entries) {
    const localPath = join(getAgencyAgentsDir(scope), entry.localFilename)
    const normalizedMarkdown = buildNormalizedMarkdown(entry)
    const nextHash = sha256(normalizedMarkdown)
    const managedEntry = existingById.get(entry.id)

    if (fs.existsSync(localPath) && !managedEntry && !existingManagedIds.has(entry.id)) {
      skipped.push({
        id: entry.id,
        reason: `Unmanaged agent file already exists at ${localPath}`,
      })
      continue
    }

    ensureParentDir(localPath)
    writeFileSyncAndFlush_DEPRECATED(localPath, normalizedMarkdown, {
      encoding: 'utf-8',
    })

    installed.push({
      id: entry.id,
      title: entry.title,
      division: entry.division,
      upstreamPath: entry.upstreamPath,
      sourceSha: entry.sourceSha,
      localFilename: entry.localFilename,
      localPath,
      toolNames: entry.toolNames ?? [],
      contentHash: nextHash,
    })
  }

  const now = Date.now()
  const mergedEntries = new Map<string, AgencyManifestEntry>(
    existingManifest?.entries.map(entry => [entry.id, entry]) ?? [],
  )

  for (const entry of installed) {
    mergedEntries.set(entry.id, entry)
  }

  const manifest: AgencyManifest = {
    version: AGENCY_MANIFEST_VERSION,
    repoUrl: catalog.repoUrl,
    ref: catalog.ref,
    installedCommit: catalog.commit,
    scope,
    ...(scope === 'project'
      ? { projectRoot: getCanonicalAgencyProjectRoot() }
      : {}),
    installedAt: existingManifest?.installedAt ?? now,
    updatedAt: now,
    selections: {
      raw: rawTarget?.trim() || 'all',
      kind: selection.kind,
      targets: selection.targets,
    },
    entries: Array.from(mergedEntries.values()).sort((a, b) =>
      a.id.localeCompare(b.id),
    ),
  }

  writeAgencyManifest(manifest)

  return {
    manifest,
    installed,
    skipped,
    selection: {
      raw: rawTarget?.trim() || 'all',
      kind: selection.kind,
      targets: selection.targets,
    },
  }
}

export async function updateAgencyInstall(
  scope: AgencyInstallScope = 'user',
): Promise<AgencyUpdateResult> {
  const manifest = readAgencyManifest(scope)
  if (!manifest) {
    throw new Error('Agency is not installed. Run /agency install first.')
  }

  const catalog = await fetchAgencyCatalog(manifest.ref)
  const catalogById = new Map(catalog.entries.map(entry => [entry.id, entry]))
  const fs = getFsImplementation()
  const updated: AgencyManifestEntry[] = []
  const unchanged: AgencyManifestEntry[] = []
  const skipped: Array<{ id: string; reason: string }> = []
  const missingUpstream: AgencyManifestEntry[] = []
  const nextEntries: AgencyManifestEntry[] = []

  for (const currentEntry of manifest.entries) {
    const upstreamEntry = catalogById.get(currentEntry.id)
    if (!upstreamEntry) {
      missingUpstream.push(currentEntry)
      nextEntries.push(currentEntry)
      continue
    }

    const localPath = currentEntry.localPath
    const normalizedMarkdown = buildNormalizedMarkdown(upstreamEntry)
    const nextHash = sha256(normalizedMarkdown)

    if (fs.existsSync(localPath)) {
      const currentContent = fs.readFileSync(localPath, { encoding: 'utf-8' })
      const currentHash = sha256(currentContent)
      if (currentHash !== currentEntry.contentHash) {
        skipped.push({
          id: currentEntry.id,
          reason: `Local managed agent has drifted at ${localPath}`,
        })
        nextEntries.push(currentEntry)
        continue
      }
    }

    ensureParentDir(localPath)
    writeFileSyncAndFlush_DEPRECATED(localPath, normalizedMarkdown, {
      encoding: 'utf-8',
    })

    const nextEntry: AgencyManifestEntry = {
      id: upstreamEntry.id,
      title: upstreamEntry.title,
      division: upstreamEntry.division,
      upstreamPath: upstreamEntry.upstreamPath,
      sourceSha: upstreamEntry.sourceSha,
      localFilename: upstreamEntry.localFilename,
      localPath,
      toolNames: upstreamEntry.toolNames ?? [],
      contentHash: nextHash,
    }

    nextEntries.push(nextEntry)
    if (nextHash === currentEntry.contentHash) {
      unchanged.push(nextEntry)
    } else {
      updated.push(nextEntry)
    }
  }

  const nextManifest: AgencyManifest = {
    ...manifest,
    installedCommit: catalog.commit,
    updatedAt: Date.now(),
    entries: nextEntries.sort((a, b) => a.id.localeCompare(b.id)),
  }
  writeAgencyManifest(nextManifest)

  return {
    manifest: nextManifest,
    updated,
    unchanged,
    skipped,
    missingUpstream,
  }
}

function resolveInstalledEntriesForTarget(
  manifest: AgencyManifest,
  rawTarget: string | undefined,
): AgencyManifestEntry[] {
  const target = rawTarget?.trim().toLowerCase()
  if (!target || target === 'all') {
    return manifest.entries
  }

  const divisionMatches = manifest.entries.filter(
    entry => entry.division.toLowerCase() === target,
  )
  if (divisionMatches.length > 0) {
    return divisionMatches
  }

  const strippedTarget = target.replace(/\.md$/, '')
  const directMatches = manifest.entries.filter(entry => {
    const upstreamNoExt = entry.upstreamPath.replace(/\.md$/, '').toLowerCase()
    const baseNoExt = posix.basename(entry.upstreamPath, '.md').toLowerCase()
    return (
      entry.id.toLowerCase() === strippedTarget ||
      upstreamNoExt === strippedTarget ||
      baseNoExt === strippedTarget
    )
  })

  if (directMatches.length === 0) {
    throw new Error(`Agency target "${rawTarget}" is not currently installed`)
  }

  if (directMatches.length > 1) {
    throw new Error(
      `Agency target "${rawTarget}" is ambiguous. Use one of: ${directMatches
        .map(entry => entry.id)
        .join(', ')}`,
    )
  }

  return directMatches
}

function findInstalledEntriesForTarget(
  manifest: AgencyManifest,
  rawTarget: string | undefined,
): AgencyManifestEntry[] {
  try {
    return resolveInstalledEntriesForTarget(manifest, rawTarget)
  } catch {
    return []
  }
}

export function resolveAgencyRunTarget(
  rawTarget: string | undefined,
  preferredScope?: AgencyInstallScope,
): AgencyResolvedRunTarget {
  const manifests =
    preferredScope !== undefined
      ? [readAgencyManifest(preferredScope)].filter(
          (manifest): manifest is AgencyManifest => manifest !== null,
        )
      : readAllAgencyManifests()

  if (manifests.length === 0) {
    throw new Error('Agency is not installed. Run /agency install first.')
  }

  const matches = manifests.flatMap(manifest =>
    findInstalledEntriesForTarget(manifest, rawTarget).map(entry => ({
      manifest,
      entry,
    })),
  )

  if (matches.length === 0) {
    throw new Error(`Agency target "${rawTarget}" is not currently installed`)
  }

  if (matches.length > 1) {
    throw new Error(
      `Agency target "${rawTarget}" is ambiguous across installed scopes. Use one of: ${matches
        .map(match => `${match.entry.id} [${match.manifest.scope}]`)
        .join(', ')}`,
    )
  }

  return matches[0]!
}

export function buildAgencyRunPrompt(
  target: AgencyResolvedRunTarget,
  task: string,
): string {
  const trimmedTask = task.trim()
  if (!trimmedTask) {
    throw new Error('Agency run requires a task after the agent target.')
  }

  return [
    `Use the custom agent "${target.entry.id}" for this task in a clean separate agent session.`,
    'Keep the work bounded to that agent session and return only the result summary here unless more detail is needed.',
    '',
    trimmedTask,
  ].join('\n')
}

export function removeAgencyInstall(
  rawTarget: string | undefined,
  scope: AgencyInstallScope = 'user',
): AgencyRemoveResult {
  const manifest = readAgencyManifest(scope)
  if (!manifest) {
    throw new Error('Agency is not installed. Run /agency install first.')
  }

  const selectedEntries = resolveInstalledEntriesForTarget(manifest, rawTarget)
  const selectedIds = new Set(selectedEntries.map(entry => entry.id))
  const fs = getFsImplementation()
  const removed: AgencyManifestEntry[] = []
  const skipped: Array<{ id: string; reason: string }> = []

  for (const entry of selectedEntries) {
    if (fs.existsSync(entry.localPath)) {
      const currentContent = fs.readFileSync(entry.localPath, { encoding: 'utf-8' })
      const currentHash = sha256(currentContent)
      if (currentHash !== entry.contentHash) {
        skipped.push({
          id: entry.id,
          reason: `Local managed agent has drifted at ${entry.localPath}`,
        })
        continue
      }

      fs.unlinkSync(entry.localPath)
    }

    removed.push(entry)
  }

  const skippedIds = new Set(skipped.map(entry => entry.id))
  const remaining = manifest.entries.filter(
    entry => !selectedIds.has(entry.id) || skippedIds.has(entry.id),
  )

  if (remaining.length === 0) {
    const manifestPath = getAgencyManifestPath(scope)
    if (fs.existsSync(manifestPath)) {
      fs.unlinkSync(manifestPath)
    }
  } else {
    writeAgencyManifest({
      ...manifest,
      updatedAt: Date.now(),
      entries: remaining,
    })
  }

  return {
    removed,
    skipped,
    remaining,
  }
}

export function getAgencyStatusSummary(): {
  installed: boolean
  manifests: AgencyManifest[]
} {
  const manifests = readAllAgencyManifests()
  return {
    installed: manifests.length > 0,
    manifests,
  }
}

export function getAgencyHelpText(): string {
  return [
    'Use /agency install <all|division|agent> to install optional Agency agents.',
    '',
    'Commands:',
    '/agency install [target] [--project]',
    '/agency run <agent> <task>',
    '/agency update [--project]',
    '/agency list',
    '/agency remove <target|all> [--project]',
    '/agency status',
    '/agency help',
    '',
    'Examples:',
    '/agency install marketing',
    '/agency install marketing --project',
    '/agency run agency-marketing-social-media-strategist Draft a launch-channel plan for our next release.',
    '/agency install engineering/engineering-frontend-developer',
    '/agency update',
    '/agency update --project',
    '/agency remove marketing',
    '/agency install all',
  ].join('\n')
}

export function formatAgencyStatus(): string {
  const { manifests } = getAgencyStatusSummary()
  if (manifests.length === 0) {
    return [
      'Agency is not installed.',
      '',
      'Run /agency install marketing or /agency install all.',
      'Use --project to install into this project instead of the user agent directory.',
    ].join('\n')
  }

  const lines: string[] = []
  for (const manifest of manifests) {
    if (lines.length > 0) {
      lines.push('')
    }
    lines.push(`Agency is installed for ${manifest.scope}.`)
    lines.push(`Repo: ${manifest.repoUrl}`)
    lines.push(`Ref: ${manifest.ref}`)
    lines.push(`Commit: ${manifest.installedCommit}`)
    lines.push(`Managed agents: ${manifest.entries.length}`)
    if (manifest.projectRoot) {
      lines.push(`Project root: ${manifest.projectRoot}`)
    }
    lines.push(`Manifest: ${getAgencyManifestPath(manifest.scope)}`)
  }

  return lines.join('\n')
}

export function formatAgencyList(): string {
  const manifests = readAllAgencyManifests()
  if (manifests.length === 0) {
    return 'Agency has no installed agents.'
  }

  const lines: string[] = []
  for (const manifest of manifests) {
    if (lines.length > 0) {
      lines.push('')
    }
    lines.push(`Agency agents (${manifest.scope}, ${manifest.entries.length})`)
    lines.push(`Commit: ${manifest.installedCommit}`)
    if (manifest.projectRoot) {
      lines.push(`Project root: ${manifest.projectRoot}`)
    }
    lines.push('')
    for (const entry of manifest.entries) {
      lines.push(`${entry.id}  ${entry.title} [${entry.division}]`)
    }
  }

  return lines.join('\n')
}
