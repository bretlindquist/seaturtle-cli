import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname } from 'path'
import {
  getCtArchivedWorkDir,
  getCtArchivedWorkExecutionPath,
  getCtArchivedWorkIntentPath,
  getCtArchivedWorkPhasePath,
  getCtArchivedWorkPlanPath,
  getCtArchivedWorkResearchPath,
  getCtArchivedWorkVerificationPath,
  getCtStateArchiveDir,
  getCtWorkExecutionPath,
  getCtWorkIndexPath,
  getCtWorkIntentPath,
  getCtWorkPhasePath,
  getCtWorkPlanPath,
  getCtWorkResearchPath,
  getCtWorkVerificationPath,
} from './pathLayout.js'

export type WorkPhase =
  | 'intent'
  | 'research'
  | 'plan'
  | 'implementation'
  | 'verification'
  | 'review'
  | 'idle'

export type WorkIndexEntryStatus = 'active' | 'archived' | 'abandoned'
export type WorkExecutionScope = 'none' | 'plan' | 'step'
export type WorkSwarmBackend = 'none' | 'local' | 'cloud'
export type WorkResearchStatus = 'missing' | 'in_progress' | 'complete'
export type WorkPlanStatus = 'missing' | 'draft' | 'approved' | 'in_progress'
export type WorkChunkStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'blocked'
export type WorkVerificationStatus =
  | 'pending'
  | 'in_progress'
  | 'verified'
  | 'failed'

export type WorkStandardsProfileRef = {
  version: 1
  id: string
}

export type WorkIntentPacket = {
  version: 1
  workId: string | null
  capturedAt: number | null
  updatedAt: number | null
  intentSummary: string | null
  goals: string[]
  constraints: string[]
  successCriteria: string[]
  openQuestions: string[]
  foundationDecisions: string[]
  workStandardsProfile: WorkStandardsProfileRef | null
  sourceConversationScope: string | null
}

export type WorkResearchPacket = {
  version: 1
  workId: string | null
  status: WorkResearchStatus
  capturedAt: number | null
  updatedAt: number | null
  researchQuestion: string | null
  findings: string[]
  assumptions: string[]
  validatedAssumptions: string[]
  rejectedPaths: string[]
  subsystemDecisions: string[]
  sourceRefs: string[]
  openRisks: string[]
  recommendation: string | null
}

export type WorkPlanChunk = {
  id: string
  title: string
  status: WorkChunkStatus
  purpose: string | null
  scope: string[]
  files: string[]
  dependencies: string[]
  risks: string[]
  validation: string[]
  done: string[]
  rollbackNotes: string[]
  reviewNotes: string[]
}

export type WorkPlanPacket = {
  version: 1
  workId: string | null
  status: WorkPlanStatus
  capturedAt: number | null
  updatedAt: number | null
  planSummary: string | null
  chunkOrder: string[]
  chunks: WorkPlanChunk[]
  globalConstraints: string[]
  validationPolicy: string[]
  rollbackPolicy: string[]
  promotedPlanDocs: string[]
}

export type WorkExecutionPacket = {
  version: 1
  workId: string | null
  phase: WorkPhase
  activeChunkId: string | null
  executionScope: WorkExecutionScope
  startedAt: number | null
  updatedAt: number | null
  timeBudgetMs: number | null
  heartbeatEnabled: boolean
  heartbeatIntervalMs: number | null
  checkpointPolicy: string | null
  currentActions: string[]
  blockedOn: string[]
  lastMeaningfulChange: string | null
  nextVerificationSteps: string[]
  continuationDebt: string[]
  stopReason: string | null
  swarmBackend: WorkSwarmBackend
  swarmActive: boolean
  swarmWorkerCount: number
  statusText: string | null
  lastActivityAt: number | null
}

export type WorkVerificationPacket = {
  version: 1
  workId: string | null
  capturedAt: number | null
  updatedAt: number | null
  status: WorkVerificationStatus
  verifiedChunkIds: string[]
  validationRuns: string[]
  runtimeChecks: string[]
  reviewFindings: string[]
  openDefects: string[]
  followups: string[]
  lastVerifiedCommit: string | null
  qualityGateStatus: string | null
}

export type WorkPhasePacket = {
  version: 1
  workId: string | null
  currentPhase: WorkPhase
  phaseReason: string | null
  updatedAt: number | null
  activePacketVersion: 1
}

export type WorkIndexEntry = {
  workId: string
  slug: string
  title: string
  status: WorkIndexEntryStatus
  createdAt: number
  updatedAt: number
  archivedAt: number | null
  phase: WorkPhase
  summary: string | null
  lastPhaseReason: string | null
  lastStopReason: string | null
  archivePath: string | null
}

export type WorkIndex = {
  version: 1
  activeWorkId: string | null
  tasks: WorkIndexEntry[]
}

export type WorkflowPackets = {
  intent: WorkIntentPacket
  research: WorkResearchPacket
  plan: WorkPlanPacket
  execution: WorkExecutionPacket
  verification: WorkVerificationPacket
  phase: WorkPhasePacket
}

export type WorkflowResolution = {
  ok: boolean
  workId: string | null
  phase: WorkPhase
  reason: string
  activeChunkId: string | null
  hasResearchArtifact: boolean
  hasExecutablePlan: boolean
  requiresBroadReview: boolean
  requiresVerification: boolean
  recommendedCompactionPayload:
    | 'none'
    | 'intent'
    | 'research'
    | 'plan'
    | 'execution'
    | 'verification'
  autoworkEligibilityHint:
    | 'no-active-workstream'
    | 'intent-needed'
    | 'research-needed'
    | 'plan-needed'
    | 'implementation-ready'
    | 'verification-needed'
    | 'review-needed'
    | 'state-conflict'
  issues: string[]
}

export type StartActiveWorkstreamInput = {
  workId: string
  title: string
  summary?: string | null
  currentPhase?: WorkPhase
  phaseReason?: string | null
  workStandardsProfileId?: string | null
  intentSummary?: string | null
}

export type EnsurePlanningWorkstreamInput = {
  titleHint?: string | null
  intentSummary?: string | null
  planFilePath?: string | null
  planContent?: string | null
  phaseReason?: string | null
  workStandardsProfileId?: string | null
}

export type ApproveActivePlanInput = {
  planFilePath?: string | null
  planContent?: string | null
  phaseReason?: string | null
}

export type SetActiveWorkstreamPhaseInput = {
  phase: WorkPhase
  phaseReason?: string | null
}

export type ArchivedWorkflowSnapshot = WorkflowPackets & {
  archiveDir: string
}

function createDefaultWorkStandardsProfile(): WorkStandardsProfileRef {
  return {
    version: 1,
    id: 'production-default',
  }
}

export function createDefaultWorkIntentPacket(): WorkIntentPacket {
  return {
    version: 1,
    workId: null,
    capturedAt: null,
    updatedAt: null,
    intentSummary: null,
    goals: [],
    constraints: [],
    successCriteria: [],
    openQuestions: [],
    foundationDecisions: [],
    workStandardsProfile: null,
    sourceConversationScope: null,
  }
}

export function createDefaultWorkResearchPacket(): WorkResearchPacket {
  return {
    version: 1,
    workId: null,
    status: 'missing',
    capturedAt: null,
    updatedAt: null,
    researchQuestion: null,
    findings: [],
    assumptions: [],
    validatedAssumptions: [],
    rejectedPaths: [],
    subsystemDecisions: [],
    sourceRefs: [],
    openRisks: [],
    recommendation: null,
  }
}

export function createDefaultWorkPlanPacket(): WorkPlanPacket {
  return {
    version: 1,
    workId: null,
    status: 'missing',
    capturedAt: null,
    updatedAt: null,
    planSummary: null,
    chunkOrder: [],
    chunks: [],
    globalConstraints: [],
    validationPolicy: [],
    rollbackPolicy: [],
    promotedPlanDocs: [],
  }
}

export function createDefaultWorkExecutionPacket(): WorkExecutionPacket {
  return {
    version: 1,
    workId: null,
    phase: 'idle',
    activeChunkId: null,
    executionScope: 'none',
    startedAt: null,
    updatedAt: null,
    timeBudgetMs: null,
    heartbeatEnabled: false,
    heartbeatIntervalMs: null,
    checkpointPolicy: null,
    currentActions: [],
    blockedOn: [],
    lastMeaningfulChange: null,
    nextVerificationSteps: [],
    continuationDebt: [],
    stopReason: null,
    swarmBackend: 'none',
    swarmActive: false,
    swarmWorkerCount: 0,
    statusText: null,
    lastActivityAt: null,
  }
}

export function createDefaultWorkVerificationPacket(): WorkVerificationPacket {
  return {
    version: 1,
    workId: null,
    capturedAt: null,
    updatedAt: null,
    status: 'pending',
    verifiedChunkIds: [],
    validationRuns: [],
    runtimeChecks: [],
    reviewFindings: [],
    openDefects: [],
    followups: [],
    lastVerifiedCommit: null,
    qualityGateStatus: null,
  }
}

export function createDefaultWorkPhasePacket(): WorkPhasePacket {
  return {
    version: 1,
    workId: null,
    currentPhase: 'idle',
    phaseReason: null,
    updatedAt: null,
    activePacketVersion: 1,
  }
}

export function createDefaultWorkIndex(): WorkIndex {
  return {
    version: 1,
    activeWorkId: null,
    tasks: [],
  }
}

function ensureParentDir(path: string): void {
  mkdirSync(dirname(path), { recursive: true })
}

function writeJsonFile(path: string, value: unknown): void {
  ensureParentDir(path)
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n', {
    encoding: 'utf-8',
    flush: true,
  })
}

function readJsonFile<T>(path: string): T | null {
  if (!existsSync(path)) {
    return null
  }

  const raw = readFileSync(path, { encoding: 'utf-8' })
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized || null
}

function normalizeOptionalTimestamp(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function formatWorkstreamDate(now: number): string {
  const date = new Date(now)
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function uniqueTextList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const seen = new Set<string>()
  const items: string[] = []
  for (const entry of value) {
    const normalized = normalizeText(entry)
    if (!normalized) {
      continue
    }
    const key = normalized.toLowerCase()
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    items.push(normalized)
  }
  return items
}

function sanitizePhase(value: unknown): WorkPhase {
  switch (value) {
    case 'intent':
    case 'research':
    case 'plan':
    case 'implementation':
    case 'verification':
    case 'review':
    case 'idle':
      return value
    default:
      return 'idle'
  }
}

function sanitizeResearchStatus(value: unknown): WorkResearchStatus {
  switch (value) {
    case 'missing':
    case 'in_progress':
    case 'complete':
      return value
    default:
      return 'missing'
  }
}

function sanitizePlanStatus(value: unknown): WorkPlanStatus {
  switch (value) {
    case 'missing':
    case 'draft':
    case 'approved':
    case 'in_progress':
      return value
    default:
      return 'missing'
  }
}

function sanitizeChunkStatus(value: unknown): WorkChunkStatus {
  switch (value) {
    case 'pending':
    case 'in_progress':
    case 'completed':
    case 'blocked':
      return value
    default:
      return 'pending'
  }
}

function sanitizeVerificationStatus(value: unknown): WorkVerificationStatus {
  switch (value) {
    case 'pending':
    case 'in_progress':
    case 'verified':
    case 'failed':
      return value
    default:
      return 'pending'
  }
}

function sanitizeExecutionScope(value: unknown): WorkExecutionScope {
  switch (value) {
    case 'none':
    case 'plan':
    case 'step':
      return value
    default:
      return 'none'
  }
}

function sanitizeSwarmBackend(value: unknown): WorkSwarmBackend {
  switch (value) {
    case 'none':
    case 'local':
    case 'cloud':
      return value
    default:
      return 'none'
  }
}

function sanitizeIndexEntryStatus(value: unknown): WorkIndexEntryStatus {
  switch (value) {
    case 'active':
    case 'archived':
    case 'abandoned':
      return value
    default:
      return 'archived'
  }
}

function sanitizeWorkStandardsProfileRef(
  value: unknown,
): WorkStandardsProfileRef | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const raw = value as Partial<WorkStandardsProfileRef>
  const id = normalizeText(raw.id)
  if (!id) {
    return null
  }

  return {
    version: 1,
    id,
  }
}

function appendUniqueTextValue(list: string[], value: string | null): string[] {
  if (!value) {
    return list
  }

  const normalized = normalizeText(value)
  if (!normalized) {
    return list
  }

  const key = normalized.toLowerCase()
  if (list.some(entry => entry.toLowerCase() === key)) {
    return list
  }

  return [...list, normalized]
}

function summarizePlanContent(planContent: string | null): string | null {
  if (!planContent) {
    return null
  }

  const lines = planContent
    .split(/\r?\n/)
    .map(line => normalizeText(line))
    .filter((line): line is string => !!line)

  for (const line of lines) {
    const trimmed = line
      .replace(/^#+\s*/, '')
      .replace(/^[-*]\s*/, '')
      .replace(/^\d+\.\s*/, '')
      .trim()
    if (trimmed) {
      return trimmed.slice(0, 200)
    }
  }

  return null
}

export function sanitizeWorkIntentPacket(input: unknown): WorkIntentPacket {
  const defaults = createDefaultWorkIntentPacket()
  if (!input || typeof input !== 'object') {
    return defaults
  }

  const value = input as Partial<WorkIntentPacket>
  return {
    version: 1,
    workId: normalizeText(value.workId),
    capturedAt: normalizeOptionalTimestamp(value.capturedAt),
    updatedAt: normalizeOptionalTimestamp(value.updatedAt),
    intentSummary: normalizeText(value.intentSummary),
    goals: uniqueTextList(value.goals),
    constraints: uniqueTextList(value.constraints),
    successCriteria: uniqueTextList(value.successCriteria),
    openQuestions: uniqueTextList(value.openQuestions),
    foundationDecisions: uniqueTextList(value.foundationDecisions),
    workStandardsProfile:
      sanitizeWorkStandardsProfileRef(value.workStandardsProfile),
    sourceConversationScope: normalizeText(value.sourceConversationScope),
  }
}

export function sanitizeWorkResearchPacket(input: unknown): WorkResearchPacket {
  const defaults = createDefaultWorkResearchPacket()
  if (!input || typeof input !== 'object') {
    return defaults
  }

  const value = input as Partial<WorkResearchPacket>
  return {
    version: 1,
    workId: normalizeText(value.workId),
    status: sanitizeResearchStatus(value.status),
    capturedAt: normalizeOptionalTimestamp(value.capturedAt),
    updatedAt: normalizeOptionalTimestamp(value.updatedAt),
    researchQuestion: normalizeText(value.researchQuestion),
    findings: uniqueTextList(value.findings),
    assumptions: uniqueTextList(value.assumptions),
    validatedAssumptions: uniqueTextList(value.validatedAssumptions),
    rejectedPaths: uniqueTextList(value.rejectedPaths),
    subsystemDecisions: uniqueTextList(value.subsystemDecisions),
    sourceRefs: uniqueTextList(value.sourceRefs),
    openRisks: uniqueTextList(value.openRisks),
    recommendation: normalizeText(value.recommendation),
  }
}

function sanitizeWorkPlanChunk(input: unknown): WorkPlanChunk | null {
  if (!input || typeof input !== 'object') {
    return null
  }

  const value = input as Partial<WorkPlanChunk>
  const id = normalizeText(value.id)
  const title = normalizeText(value.title)
  if (!id || !title) {
    return null
  }

  return {
    id,
    title,
    status: sanitizeChunkStatus(value.status),
    purpose: normalizeText(value.purpose),
    scope: uniqueTextList(value.scope),
    files: uniqueTextList(value.files),
    dependencies: uniqueTextList(value.dependencies),
    risks: uniqueTextList(value.risks),
    validation: uniqueTextList(value.validation),
    done: uniqueTextList(value.done),
    rollbackNotes: uniqueTextList(value.rollbackNotes),
    reviewNotes: uniqueTextList(value.reviewNotes),
  }
}

export function sanitizeWorkPlanPacket(input: unknown): WorkPlanPacket {
  const defaults = createDefaultWorkPlanPacket()
  if (!input || typeof input !== 'object') {
    return defaults
  }

  const value = input as Partial<WorkPlanPacket>
  const chunks = Array.isArray(value.chunks)
    ? value.chunks
        .map(chunk => sanitizeWorkPlanChunk(chunk))
        .filter((chunk): chunk is WorkPlanChunk => chunk !== null)
    : []
  const validChunkIds = new Set(chunks.map(chunk => chunk.id))
  const chunkOrder = uniqueTextList(value.chunkOrder).filter(id =>
    validChunkIds.has(id),
  )

  return {
    version: 1,
    workId: normalizeText(value.workId),
    status: sanitizePlanStatus(value.status),
    capturedAt: normalizeOptionalTimestamp(value.capturedAt),
    updatedAt: normalizeOptionalTimestamp(value.updatedAt),
    planSummary: normalizeText(value.planSummary),
    chunkOrder: chunkOrder.length > 0 ? chunkOrder : chunks.map(chunk => chunk.id),
    chunks,
    globalConstraints: uniqueTextList(value.globalConstraints),
    validationPolicy: uniqueTextList(value.validationPolicy),
    rollbackPolicy: uniqueTextList(value.rollbackPolicy),
    promotedPlanDocs: uniqueTextList(value.promotedPlanDocs),
  }
}

export function sanitizeWorkExecutionPacket(
  input: unknown,
): WorkExecutionPacket {
  const defaults = createDefaultWorkExecutionPacket()
  if (!input || typeof input !== 'object') {
    return defaults
  }

  const value = input as Partial<WorkExecutionPacket>
  return {
    version: 1,
    workId: normalizeText(value.workId),
    phase: sanitizePhase(value.phase),
    activeChunkId: normalizeText(value.activeChunkId),
    executionScope: sanitizeExecutionScope(value.executionScope),
    startedAt: normalizeOptionalTimestamp(value.startedAt),
    updatedAt: normalizeOptionalTimestamp(value.updatedAt),
    timeBudgetMs:
      typeof value.timeBudgetMs === 'number' && value.timeBudgetMs >= 0
        ? value.timeBudgetMs
        : null,
    heartbeatEnabled: !!value.heartbeatEnabled,
    heartbeatIntervalMs:
      typeof value.heartbeatIntervalMs === 'number' &&
      value.heartbeatIntervalMs > 0
        ? value.heartbeatIntervalMs
        : null,
    checkpointPolicy: normalizeText(value.checkpointPolicy),
    currentActions: uniqueTextList(value.currentActions),
    blockedOn: uniqueTextList(value.blockedOn),
    lastMeaningfulChange: normalizeText(value.lastMeaningfulChange),
    nextVerificationSteps: uniqueTextList(value.nextVerificationSteps),
    continuationDebt: uniqueTextList(value.continuationDebt),
    stopReason: normalizeText(value.stopReason),
    swarmBackend: sanitizeSwarmBackend(value.swarmBackend),
    swarmActive: !!value.swarmActive,
    swarmWorkerCount:
      typeof value.swarmWorkerCount === 'number' && value.swarmWorkerCount >= 0
        ? value.swarmWorkerCount
        : defaults.swarmWorkerCount,
    statusText: normalizeText(value.statusText),
    lastActivityAt: normalizeOptionalTimestamp(value.lastActivityAt),
  }
}

export function sanitizeWorkVerificationPacket(
  input: unknown,
): WorkVerificationPacket {
  const defaults = createDefaultWorkVerificationPacket()
  if (!input || typeof input !== 'object') {
    return defaults
  }

  const value = input as Partial<WorkVerificationPacket>
  return {
    version: 1,
    workId: normalizeText(value.workId),
    capturedAt: normalizeOptionalTimestamp(value.capturedAt),
    updatedAt: normalizeOptionalTimestamp(value.updatedAt),
    status: sanitizeVerificationStatus(value.status),
    verifiedChunkIds: uniqueTextList(value.verifiedChunkIds),
    validationRuns: uniqueTextList(value.validationRuns),
    runtimeChecks: uniqueTextList(value.runtimeChecks),
    reviewFindings: uniqueTextList(value.reviewFindings),
    openDefects: uniqueTextList(value.openDefects),
    followups: uniqueTextList(value.followups),
    lastVerifiedCommit: normalizeText(value.lastVerifiedCommit),
    qualityGateStatus: normalizeText(value.qualityGateStatus),
  }
}

export function sanitizeWorkPhasePacket(input: unknown): WorkPhasePacket {
  const defaults = createDefaultWorkPhasePacket()
  if (!input || typeof input !== 'object') {
    return defaults
  }

  const value = input as Partial<WorkPhasePacket>
  return {
    version: 1,
    workId: normalizeText(value.workId),
    currentPhase: sanitizePhase(value.currentPhase),
    phaseReason: normalizeText(value.phaseReason),
    updatedAt: normalizeOptionalTimestamp(value.updatedAt),
    activePacketVersion: 1,
  }
}

function sanitizeWorkIndexEntry(input: unknown): WorkIndexEntry | null {
  if (!input || typeof input !== 'object') {
    return null
  }

  const value = input as Partial<WorkIndexEntry>
  const workId = normalizeText(value.workId)
  const slug = normalizeText(value.slug)
  const title = normalizeText(value.title)
  if (!workId || !slug || !title) {
    return null
  }

  const createdAt = normalizeOptionalTimestamp(value.createdAt) ?? Date.now()
  const updatedAt = normalizeOptionalTimestamp(value.updatedAt) ?? createdAt
  return {
    workId,
    slug,
    title,
    status: sanitizeIndexEntryStatus(value.status),
    createdAt,
    updatedAt,
    archivedAt: normalizeOptionalTimestamp(value.archivedAt),
    phase: sanitizePhase(value.phase),
    summary: normalizeText(value.summary),
    lastPhaseReason: normalizeText(value.lastPhaseReason),
    lastStopReason: normalizeText(value.lastStopReason),
    archivePath: normalizeText(value.archivePath),
  }
}

export function sanitizeWorkIndex(input: unknown): WorkIndex {
  const defaults = createDefaultWorkIndex()
  if (!input || typeof input !== 'object') {
    return defaults
  }

  const value = input as Partial<WorkIndex>
  const tasks = Array.isArray(value.tasks)
    ? value.tasks
        .map(entry => sanitizeWorkIndexEntry(entry))
        .filter((entry): entry is WorkIndexEntry => entry !== null)
    : []

  return {
    version: 1,
    activeWorkId: normalizeText(value.activeWorkId),
    tasks,
  }
}

function getActiveWorkflowPacketPaths(root: string) {
  return {
    intent: getCtWorkIntentPath(root),
    research: getCtWorkResearchPath(root),
    plan: getCtWorkPlanPath(root),
    execution: getCtWorkExecutionPath(root),
    verification: getCtWorkVerificationPath(root),
    phase: getCtWorkPhasePath(root),
  }
}

function getArchivedWorkflowPacketPaths(
  workId: string,
  root: string,
) {
  return {
    archiveDir: getCtArchivedWorkDir(workId, root),
    intent: getCtArchivedWorkIntentPath(workId, root),
    research: getCtArchivedWorkResearchPath(workId, root),
    plan: getCtArchivedWorkPlanPath(workId, root),
    execution: getCtArchivedWorkExecutionPath(workId, root),
    verification: getCtArchivedWorkVerificationPath(workId, root),
    phase: getCtArchivedWorkPhasePath(workId, root),
  }
}

export function ensureWorkIndexFile(
  root: string,
): { path: string; created: boolean } {
  const path = getCtWorkIndexPath(root)
  if (!existsSync(path)) {
    writeJsonFile(path, createDefaultWorkIndex())
    return { path, created: true }
  }

  return { path, created: false }
}

export function ensureActiveWorkflowPacketFiles(
  root: string,
): { createdPaths: string[] } {
  const createdPaths: string[] = []
  const packetPaths = getActiveWorkflowPacketPaths(root)
  const defaults: Record<keyof typeof packetPaths, unknown> = {
    intent: createDefaultWorkIntentPacket(),
    research: createDefaultWorkResearchPacket(),
    plan: createDefaultWorkPlanPacket(),
    execution: createDefaultWorkExecutionPacket(),
    verification: createDefaultWorkVerificationPacket(),
    phase: createDefaultWorkPhasePacket(),
  }

  for (const key of Object.keys(packetPaths) as Array<keyof typeof packetPaths>) {
    const path = packetPaths[key]
    if (!existsSync(path)) {
      writeJsonFile(path, defaults[key])
      createdPaths.push(path)
    }
  }

  return { createdPaths }
}

export function ensureWorkflowStateFiles(
  root: string,
): { createdPaths: string[] } {
  const createdPaths = [...ensureActiveWorkflowPacketFiles(root).createdPaths]
  const index = ensureWorkIndexFile(root)
  if (index.created) {
    createdPaths.push(index.path)
  }
  return { createdPaths }
}

export function readWorkIndex(root: string): WorkIndex {
  ensureWorkIndexFile(root)
  return sanitizeWorkIndex(readJsonFile<WorkIndex>(getCtWorkIndexPath(root)))
}

export function updateWorkIndex(
  updater: (current: WorkIndex) => WorkIndex,
  root: string,
): WorkIndex {
  const next = sanitizeWorkIndex(updater(readWorkIndex(root)))
  writeJsonFile(getCtWorkIndexPath(root), next)
  return next
}

export function readWorkflowPackets(
  root: string,
): WorkflowPackets {
  ensureActiveWorkflowPacketFiles(root)
  const paths = getActiveWorkflowPacketPaths(root)
  return {
    intent: sanitizeWorkIntentPacket(
      readJsonFile<WorkIntentPacket>(paths.intent),
    ),
    research: sanitizeWorkResearchPacket(
      readJsonFile<WorkResearchPacket>(paths.research),
    ),
    plan: sanitizeWorkPlanPacket(readJsonFile<WorkPlanPacket>(paths.plan)),
    execution: sanitizeWorkExecutionPacket(
      readJsonFile<WorkExecutionPacket>(paths.execution),
    ),
    verification: sanitizeWorkVerificationPacket(
      readJsonFile<WorkVerificationPacket>(paths.verification),
    ),
    phase: sanitizeWorkPhasePacket(readJsonFile<WorkPhasePacket>(paths.phase)),
  }
}

export function updateWorkIntentPacket(
  updater: (current: WorkIntentPacket) => WorkIntentPacket,
  root: string,
): WorkIntentPacket {
  const current = readWorkflowPackets(root).intent
  const next = sanitizeWorkIntentPacket(updater(current))
  writeJsonFile(getCtWorkIntentPath(root), next)
  return next
}

export function updateWorkResearchPacket(
  updater: (current: WorkResearchPacket) => WorkResearchPacket,
  root: string,
): WorkResearchPacket {
  const current = readWorkflowPackets(root).research
  const next = sanitizeWorkResearchPacket(updater(current))
  writeJsonFile(getCtWorkResearchPath(root), next)
  return next
}

export function updateWorkPlanPacket(
  updater: (current: WorkPlanPacket) => WorkPlanPacket,
  root: string,
): WorkPlanPacket {
  const current = readWorkflowPackets(root).plan
  const next = sanitizeWorkPlanPacket(updater(current))
  writeJsonFile(getCtWorkPlanPath(root), next)
  return next
}

export function updateWorkExecutionPacket(
  updater: (current: WorkExecutionPacket) => WorkExecutionPacket,
  root: string,
): WorkExecutionPacket {
  const current = readWorkflowPackets(root).execution
  const next = sanitizeWorkExecutionPacket(updater(current))
  writeJsonFile(getCtWorkExecutionPath(root), next)
  return next
}

export function updateWorkVerificationPacket(
  updater: (current: WorkVerificationPacket) => WorkVerificationPacket,
  root: string,
): WorkVerificationPacket {
  const current = readWorkflowPackets(root).verification
  const next = sanitizeWorkVerificationPacket(updater(current))
  writeJsonFile(getCtWorkVerificationPath(root), next)
  return next
}

export function updateWorkPhasePacket(
  updater: (current: WorkPhasePacket) => WorkPhasePacket,
  root: string,
): WorkPhasePacket {
  const current = readWorkflowPackets(root).phase
  const next = sanitizeWorkPhasePacket(updater(current))
  writeJsonFile(getCtWorkPhasePath(root), next)
  return next
}

export function validateWorkIndexInvariants(index: WorkIndex): string[] {
  const issues: string[] = []
  const activeEntries = index.tasks.filter(entry => entry.status === 'active')

  if (activeEntries.length > 1) {
    issues.push('work-index has multiple active entries')
  }

  if (!index.activeWorkId && activeEntries.length > 0) {
    issues.push('work-index has active entries but no activeWorkId')
  }

  if (
    index.activeWorkId &&
    !activeEntries.some(entry => entry.workId === index.activeWorkId)
  ) {
    issues.push('work-index activeWorkId does not point to an active entry')
  }

  for (const entry of index.tasks) {
    if (entry.status === 'active' && entry.archivedAt !== null) {
      issues.push(`active workstream ${entry.workId} should not have archivedAt`)
    }
    if (entry.status !== 'active' && index.activeWorkId === entry.workId) {
      issues.push(`work-index points activeWorkId at non-active entry ${entry.workId}`)
    }
  }

  return issues
}

function collectWorkflowPacketConsistencyIssues(
  packets: WorkflowPackets,
  index: WorkIndex,
): string[] {
  const issues = [...validateWorkIndexInvariants(index)]
  const packetWorkIds = [
    packets.intent.workId,
    packets.research.workId,
    packets.plan.workId,
    packets.execution.workId,
    packets.verification.workId,
    packets.phase.workId,
  ].filter((value): value is string => !!value)
  const distinctPacketWorkIds = Array.from(new Set(packetWorkIds))

  if (distinctPacketWorkIds.length > 1) {
    issues.push(
      `workflow packets disagree on active workId: ${distinctPacketWorkIds.join(', ')}`,
    )
  }

  const packetWorkId = distinctPacketWorkIds[0] ?? null
  if (index.activeWorkId && packetWorkId && index.activeWorkId !== packetWorkId) {
    issues.push(
      `work-index activeWorkId ${index.activeWorkId} does not match packet workId ${packetWorkId}`,
    )
  }

  if (packets.phase.currentPhase === 'idle' && packetWorkId) {
    issues.push('workflow packets have a workId while phase is idle')
  }

  if (
    packets.execution.activeChunkId &&
    !packets.plan.chunks.some(chunk => chunk.id === packets.execution.activeChunkId)
  ) {
    issues.push(
      `execution active chunk ${packets.execution.activeChunkId} is not present in work-plan chunks`,
    )
  }

  return issues
}

export function resolveWorkflowPhase(
  packets: WorkflowPackets,
  index: WorkIndex,
): WorkflowResolution {
  const issues = collectWorkflowPacketConsistencyIssues(packets, index)
  const workId =
    index.activeWorkId ??
    packets.phase.workId ??
    packets.intent.workId ??
    packets.plan.workId ??
    packets.execution.workId

  if (!workId) {
    return {
      ok: issues.length === 0,
      workId: null,
      phase: 'idle',
      reason: 'No active workstream is registered.',
      activeChunkId: null,
      hasResearchArtifact: false,
      hasExecutablePlan: false,
      requiresBroadReview: false,
      requiresVerification: false,
      recommendedCompactionPayload: 'none',
      autoworkEligibilityHint: issues.length > 0 ? 'state-conflict' : 'no-active-workstream',
      issues,
    }
  }

  const hasResearchArtifact =
    packets.research.status === 'complete' || packets.research.findings.length > 0
  const hasExecutablePlan =
    packets.plan.status === 'approved' && packets.plan.chunks.length > 0
  const activeChunkId = packets.execution.activeChunkId
  const requiresVerification =
    packets.phase.currentPhase === 'verification' ||
    packets.verification.status === 'in_progress' ||
    packets.verification.status === 'failed' ||
    (packets.execution.phase === 'implementation' &&
      packets.execution.nextVerificationSteps.length > 0)
  const requiresBroadReview = packets.phase.currentPhase === 'review'

  let recommendedCompactionPayload: WorkflowResolution['recommendedCompactionPayload']
  switch (packets.phase.currentPhase) {
    case 'intent':
      recommendedCompactionPayload = 'intent'
      break
    case 'research':
      recommendedCompactionPayload = 'research'
      break
    case 'plan':
      recommendedCompactionPayload = 'plan'
      break
    case 'implementation':
      recommendedCompactionPayload = 'execution'
      break
    case 'verification':
    case 'review':
      recommendedCompactionPayload = 'verification'
      break
    case 'idle':
      recommendedCompactionPayload = 'none'
      break
  }

  let autoworkEligibilityHint: WorkflowResolution['autoworkEligibilityHint']
  if (issues.length > 0) {
    autoworkEligibilityHint = 'state-conflict'
  } else if (!packets.intent.intentSummary && packets.intent.goals.length === 0) {
    autoworkEligibilityHint = 'intent-needed'
  } else if (!hasResearchArtifact) {
    autoworkEligibilityHint = 'research-needed'
  } else if (!hasExecutablePlan) {
    autoworkEligibilityHint = 'plan-needed'
  } else if (requiresVerification) {
    autoworkEligibilityHint = 'verification-needed'
  } else if (requiresBroadReview) {
    autoworkEligibilityHint = 'review-needed'
  } else {
    autoworkEligibilityHint = 'implementation-ready'
  }

  return {
    ok: issues.length === 0,
    workId,
    phase: packets.phase.currentPhase,
    reason: packets.phase.phaseReason ?? 'Phase resolved from workflow packets.',
    activeChunkId,
    hasResearchArtifact,
    hasExecutablePlan,
    requiresBroadReview,
    requiresVerification,
    recommendedCompactionPayload,
    autoworkEligibilityHint,
    issues,
  }
}

function resetActiveWorkflowPackets(
  input: StartActiveWorkstreamInput | null,
  root: string,
): WorkflowPackets {
  const now = Date.now()
  const standardsProfileId = normalizeText(input?.workStandardsProfileId)
  const currentPhase = input?.currentPhase ?? 'intent'
  const workId = input?.workId ?? null
  const intentSummary = normalizeText(input?.intentSummary)
  const summary = normalizeText(input?.summary)
  const phaseReason = normalizeText(input?.phaseReason)

  const packets: WorkflowPackets = {
    intent: createDefaultWorkIntentPacket(),
    research: createDefaultWorkResearchPacket(),
    plan: createDefaultWorkPlanPacket(),
    execution: createDefaultWorkExecutionPacket(),
    verification: createDefaultWorkVerificationPacket(),
    phase: createDefaultWorkPhasePacket(),
  }

  if (workId) {
    packets.intent = {
      ...packets.intent,
      workId,
      capturedAt: now,
      updatedAt: now,
      intentSummary: intentSummary ?? summary ?? input?.title ?? null,
      goals: input?.title ? [input.title] : [],
      workStandardsProfile: {
        version: 1,
        id: standardsProfileId ?? createDefaultWorkStandardsProfile().id,
      },
    }
    packets.research = {
      ...packets.research,
      workId,
    }
    packets.plan = {
      ...packets.plan,
      workId,
    }
    packets.execution = {
      ...packets.execution,
      workId,
      phase: currentPhase,
    }
    packets.verification = {
      ...packets.verification,
      workId,
    }
    packets.phase = {
      ...packets.phase,
      workId,
      currentPhase,
      phaseReason:
        phaseReason ?? `Active workstream ${workId} initialized in ${currentPhase} phase.`,
      updatedAt: now,
    }
  }

  const paths = getActiveWorkflowPacketPaths(root)
  writeJsonFile(paths.intent, packets.intent)
  writeJsonFile(paths.research, packets.research)
  writeJsonFile(paths.plan, packets.plan)
  writeJsonFile(paths.execution, packets.execution)
  writeJsonFile(paths.verification, packets.verification)
  writeJsonFile(paths.phase, packets.phase)
  return packets
}

function writeArchivedWorkflowSnapshot(
  workId: string,
  packets: WorkflowPackets,
  root: string,
): ArchivedWorkflowSnapshot {
  const paths = getArchivedWorkflowPacketPaths(workId, root)
  writeJsonFile(paths.intent, packets.intent)
  writeJsonFile(paths.research, packets.research)
  writeJsonFile(paths.plan, packets.plan)
  writeJsonFile(paths.execution, packets.execution)
  writeJsonFile(paths.verification, packets.verification)
  writeJsonFile(paths.phase, packets.phase)
  return {
    ...packets,
    archiveDir: paths.archiveDir,
  }
}

function buildWorkSlug(title: string, workId: string): string {
  const fromTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (fromTitle) {
    return fromTitle
  }

  return workId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function createWorkstreamId(
  titleHint: string | null = null,
  now: number = Date.now(),
): string {
  const datePrefix = formatWorkstreamDate(now)
  const normalizedTitle = normalizeText(titleHint)
  const slug = buildWorkSlug(normalizedTitle ?? 'workstream', normalizedTitle ?? 'workstream')
  return `${datePrefix}-${slug}`
}

function syncActiveWorkstreamIndexEntry(
  entry: WorkIndexEntry,
  phase: WorkPhase,
  summary: string | null,
  phaseReason: string | null,
  now: number,
): WorkIndexEntry {
  return {
    ...entry,
    updatedAt: now,
    phase,
    summary: summary ?? entry.summary,
    lastPhaseReason: phaseReason ?? entry.lastPhaseReason,
  }
}

function updatePlanLifecyclePackets(
  current: WorkflowPackets,
  {
    phase,
    phaseReason,
    planStatus,
    planFilePath,
    planContent,
    titleHint,
    intentSummary,
  }: {
    phase: Extract<WorkPhase, 'plan' | 'implementation'>
    phaseReason: string | null
    planStatus: WorkPlanStatus
    planFilePath?: string | null
    planContent?: string | null
    titleHint?: string | null
    intentSummary?: string | null
  },
): WorkflowPackets {
  const now = Date.now()
  const activeWorkId = current.phase.workId ?? current.intent.workId ?? current.plan.workId
  if (!activeWorkId) {
    return current
  }

  const normalizedPlanPath = normalizeText(planFilePath)
  const normalizedIntentSummary = normalizeText(intentSummary)
  const normalizedTitleHint = normalizeText(titleHint)
  const nextPlanSummary =
    summarizePlanContent(planContent ?? current.plan.planSummary) ??
    normalizeText(current.plan.planSummary) ??
    normalizedIntentSummary ??
    normalizedTitleHint

  return {
    intent: sanitizeWorkIntentPacket({
      ...current.intent,
      workId: activeWorkId,
      updatedAt: now,
      intentSummary:
        current.intent.intentSummary ??
        normalizedIntentSummary ??
        normalizedTitleHint ??
        nextPlanSummary,
      goals:
        current.intent.goals.length > 0
          ? current.intent.goals
          : normalizedTitleHint
            ? [normalizedTitleHint]
            : current.intent.goals,
    }),
    research: current.research,
    plan: sanitizeWorkPlanPacket({
      ...current.plan,
      workId: activeWorkId,
      status: planStatus,
      capturedAt: current.plan.capturedAt ?? now,
      updatedAt: now,
      planSummary: nextPlanSummary,
      promotedPlanDocs: normalizedPlanPath
        ? appendUniqueTextValue(current.plan.promotedPlanDocs, normalizedPlanPath)
        : current.plan.promotedPlanDocs,
    }),
    execution: sanitizeWorkExecutionPacket({
      ...current.execution,
      workId: activeWorkId,
      phase,
      executionScope: phase === 'plan' ? 'plan' : current.execution.executionScope,
      updatedAt: now,
    }),
    verification:
      phase === 'implementation'
        ? sanitizeWorkVerificationPacket({
            ...current.verification,
            workId: activeWorkId,
            status:
              current.verification.status === 'verified'
                ? current.verification.status
                : 'pending',
            updatedAt: now,
          })
        : current.verification,
    phase: sanitizeWorkPhasePacket({
      ...current.phase,
      workId: activeWorkId,
      currentPhase: phase,
      phaseReason,
      updatedAt: now,
    }),
  }
}

function writeWorkflowPackets(
  packets: WorkflowPackets,
  root: string,
): WorkflowPackets {
  const paths = getActiveWorkflowPacketPaths(root)
  writeJsonFile(paths.intent, packets.intent)
  writeJsonFile(paths.research, packets.research)
  writeJsonFile(paths.plan, packets.plan)
  writeJsonFile(paths.execution, packets.execution)
  writeJsonFile(paths.verification, packets.verification)
  writeJsonFile(paths.phase, packets.phase)
  return packets
}

export function getActiveWorkflowPlanProjection(
  packets: WorkflowPackets,
  index: WorkIndex,
): {
  workId: string | null
  phase: WorkPhase
  planStatus: WorkPlanStatus
  planFilePath: string | null
  hasPlanArtifact: boolean
  planSummary: string | null
} {
  const workId =
    index.activeWorkId ??
    packets.phase.workId ??
    packets.intent.workId ??
    packets.plan.workId
  const planFilePath =
    packets.plan.promotedPlanDocs.length > 0 ? packets.plan.promotedPlanDocs[0] : null
  return {
    workId,
    phase: packets.phase.currentPhase,
    planStatus: packets.plan.status,
    planFilePath,
    hasPlanArtifact:
      packets.plan.status !== 'missing' ||
      packets.plan.promotedPlanDocs.length > 0 ||
      !!packets.plan.planSummary,
    planSummary: packets.plan.planSummary,
  }
}

export function readActiveWorkflowPlanProjection(root: string): {
  workId: string | null
  phase: WorkPhase
  planStatus: WorkPlanStatus
  planFilePath: string | null
  hasPlanArtifact: boolean
  planSummary: string | null
} {
  return getActiveWorkflowPlanProjection(
    readWorkflowPackets(root),
    readWorkIndex(root),
  )
}

export function startActiveWorkstream(
  input: StartActiveWorkstreamInput,
  root: string,
): { index: WorkIndex; packets: WorkflowPackets } {
  ensureWorkflowStateFiles(root)
  const now = Date.now()
  const packets = resetActiveWorkflowPackets(input, root)
  const slug = buildWorkSlug(input.title, input.workId)
  const summary = normalizeText(input.summary)

  const index = updateWorkIndex(
    current => ({
      version: 1,
      activeWorkId: input.workId,
      tasks: [
        ...current.tasks.filter(entry => entry.workId !== input.workId),
        {
          workId: input.workId,
          slug,
          title: input.title.trim(),
          status: 'active',
          createdAt: now,
          updatedAt: now,
          archivedAt: null,
          phase: packets.phase.currentPhase,
          summary,
          lastPhaseReason: packets.phase.phaseReason,
          lastStopReason: null,
          archivePath: null,
        },
      ],
    }),
    root,
  )

  return { index, packets }
}

export function ensureActivePlanningWorkstream(
  input: EnsurePlanningWorkstreamInput,
  root: string,
): {
  created: boolean
  index: WorkIndex
  packets: WorkflowPackets
  resolution: WorkflowResolution
} {
  ensureWorkflowStateFiles(root)
  const currentIndex = readWorkIndex(root)
  const currentPackets = readWorkflowPackets(root)
  const now = Date.now()
  const phaseReason =
    normalizeText(input.phaseReason) ??
    'Plan mode is active for the current workstream.'

  if (!currentIndex.activeWorkId) {
    const titleHint =
      normalizeText(input.titleHint) ??
      summarizePlanContent(input.planContent ?? null) ??
      normalizeText(input.intentSummary) ??
      'Active plan mode workstream'
    const workId = createWorkstreamId(titleHint, now)
    const started = startActiveWorkstream(
      {
        workId,
        title: titleHint,
        summary:
          normalizeText(input.intentSummary) ??
          summarizePlanContent(input.planContent ?? null) ??
          titleHint,
        currentPhase: 'plan',
        phaseReason,
        workStandardsProfileId: input.workStandardsProfileId ?? null,
        intentSummary:
          normalizeText(input.intentSummary) ??
          summarizePlanContent(input.planContent ?? null) ??
          titleHint,
      },
      root,
    )
    const packets = writeWorkflowPackets(
      updatePlanLifecyclePackets(started.packets, {
        phase: 'plan',
        phaseReason,
        planStatus: 'draft',
        planFilePath: input.planFilePath,
        planContent: input.planContent,
        titleHint,
        intentSummary: input.intentSummary,
      }),
      root,
    )
    const index = updateWorkIndex(
      current => ({
        version: 1,
        activeWorkId: workId,
        tasks: current.tasks.map(entry =>
          entry.workId === workId
            ? syncActiveWorkstreamIndexEntry(
                entry,
                'plan',
                packets.plan.planSummary,
                phaseReason,
                now,
              )
            : entry,
        ),
      }),
      root,
    )
    return {
      created: true,
      index,
      packets,
      resolution: resolveWorkflowPhase(packets, index),
    }
  }

  const packets = writeWorkflowPackets(
    updatePlanLifecyclePackets(currentPackets, {
      phase: 'plan',
      phaseReason,
      planStatus:
        currentPackets.plan.status === 'approved' ? 'approved' : 'draft',
      planFilePath: input.planFilePath,
      planContent: input.planContent,
      titleHint: input.titleHint,
      intentSummary: input.intentSummary,
    }),
    root,
  )
  const index = updateWorkIndex(
    current => ({
      version: 1,
      activeWorkId: current.activeWorkId,
      tasks: current.tasks.map(entry =>
        entry.workId === current.activeWorkId
          ? syncActiveWorkstreamIndexEntry(
              entry,
              'plan',
              packets.plan.planSummary,
              phaseReason,
              now,
            )
          : entry,
      ),
    }),
    root,
  )
  return {
    created: false,
    index,
    packets,
    resolution: resolveWorkflowPhase(packets, index),
  }
}

export function markActivePlanApproved(
  input: ApproveActivePlanInput,
  root: string,
): {
  created: boolean
  index: WorkIndex
  packets: WorkflowPackets
  resolution: WorkflowResolution
} {
  const ensured = ensureActivePlanningWorkstream(
    {
      titleHint: summarizePlanContent(input.planContent ?? null),
      intentSummary: summarizePlanContent(input.planContent ?? null),
      planFilePath: input.planFilePath,
      planContent: input.planContent,
      phaseReason:
        normalizeText(input.phaseReason) ??
        'Plan approved and implementation is now active.',
    },
    root,
  )
  const now = Date.now()
  const phaseReason =
    normalizeText(input.phaseReason) ??
    'Plan approved and implementation is now active.'
  const packets = writeWorkflowPackets(
    updatePlanLifecyclePackets(ensured.packets, {
      phase: 'implementation',
      phaseReason,
      planStatus: 'approved',
      planFilePath: input.planFilePath,
      planContent: input.planContent,
      titleHint: summarizePlanContent(input.planContent ?? null),
      intentSummary: summarizePlanContent(input.planContent ?? null),
    }),
    root,
  )
  const index = updateWorkIndex(
    current => ({
      version: 1,
      activeWorkId: current.activeWorkId,
      tasks: current.tasks.map(entry =>
        entry.workId === current.activeWorkId
          ? syncActiveWorkstreamIndexEntry(
              entry,
              'implementation',
              packets.plan.planSummary,
              phaseReason,
              now,
            )
          : entry,
      ),
    }),
    root,
  )
  return {
    created: ensured.created,
    index,
    packets,
    resolution: resolveWorkflowPhase(packets, index),
  }
}

export function setActiveWorkstreamPhase(
  input: SetActiveWorkstreamPhaseInput,
  root: string,
): {
  index: WorkIndex
  packets: WorkflowPackets
  resolution: WorkflowResolution
} {
  ensureWorkflowStateFiles(root)
  const index = readWorkIndex(root)
  const packets = readWorkflowPackets(root)
  if (!index.activeWorkId) {
    return {
      index,
      packets,
      resolution: resolveWorkflowPhase(packets, index),
    }
  }

  const now = Date.now()
  const phaseReason = normalizeText(input.phaseReason)
  const nextPackets = writeWorkflowPackets(
    {
      ...packets,
      execution: sanitizeWorkExecutionPacket({
        ...packets.execution,
        workId: index.activeWorkId,
        phase: input.phase,
        updatedAt: now,
      }),
      verification:
        input.phase === 'implementation'
          ? sanitizeWorkVerificationPacket({
              ...packets.verification,
              workId: index.activeWorkId,
              status:
                packets.verification.status === 'verified'
                  ? packets.verification.status
                  : 'pending',
              updatedAt: now,
            })
          : packets.verification,
      phase: sanitizeWorkPhasePacket({
        ...packets.phase,
        workId: index.activeWorkId,
        currentPhase: input.phase,
        phaseReason,
        updatedAt: now,
      }),
    },
    root,
  )
  const nextIndex = updateWorkIndex(
    current => ({
      version: 1,
      activeWorkId: current.activeWorkId,
      tasks: current.tasks.map(entry =>
        entry.workId === current.activeWorkId
          ? syncActiveWorkstreamIndexEntry(
              entry,
              input.phase,
              nextPackets.plan.planSummary,
              phaseReason,
              now,
            )
          : entry,
      ),
    }),
    root,
  )
  return {
    index: nextIndex,
    packets: nextPackets,
    resolution: resolveWorkflowPhase(nextPackets, nextIndex),
  }
}

export function resumeActiveWorkstream(
  root: string,
): { index: WorkIndex; packets: WorkflowPackets; resolution: WorkflowResolution } {
  const index = readWorkIndex(root)
  const packets = readWorkflowPackets(root)
  return {
    index,
    packets,
    resolution: resolveWorkflowPhase(packets, index),
  }
}

function finalizeActiveWorkstream(
  status: Extract<WorkIndexEntryStatus, 'archived' | 'abandoned'>,
  stopReason: string | null,
  root: string,
): { index: WorkIndex; archived: ArchivedWorkflowSnapshot | null } {
  const index = readWorkIndex(root)
  const packets = readWorkflowPackets(root)
  const activeWorkId = index.activeWorkId
  if (!activeWorkId) {
    return { index, archived: null }
  }

  const archived = writeArchivedWorkflowSnapshot(activeWorkId, packets, root)
  const now = Date.now()
  const archiveDir = getCtArchivedWorkDir(activeWorkId, root)
  const nextIndex = updateWorkIndex(
    current => ({
      version: 1,
      activeWorkId: null,
      tasks: current.tasks.map(entry =>
        entry.workId === activeWorkId
          ? {
              ...entry,
              status,
              updatedAt: now,
              archivedAt: now,
              phase: packets.phase.currentPhase,
              lastPhaseReason: packets.phase.phaseReason,
              lastStopReason: stopReason,
              archivePath: archiveDir,
            }
          : entry,
      ),
    }),
    root,
  )

  resetActiveWorkflowPackets(null, root)
  return { index: nextIndex, archived }
}

export function archiveActiveWorkstream(
  stopReason: string | null = null,
  root: string,
): { index: WorkIndex; archived: ArchivedWorkflowSnapshot | null } {
  return finalizeActiveWorkstream('archived', normalizeText(stopReason), root)
}

export function abandonActiveWorkstream(
  stopReason: string | null = null,
  root: string,
): { index: WorkIndex; archived: ArchivedWorkflowSnapshot | null } {
  return finalizeActiveWorkstream('abandoned', normalizeText(stopReason), root)
}

export function replaceActiveWorkstream(
  input: StartActiveWorkstreamInput,
  root: string,
): {
  previous: ArchivedWorkflowSnapshot | null
  index: WorkIndex
  packets: WorkflowPackets
} {
  const previous = archiveActiveWorkstream(
    `Replaced by ${input.workId}`,
    root,
  ).archived
  const next = startActiveWorkstream(input, root)
  return {
    previous,
    index: next.index,
    packets: next.packets,
  }
}

export function getWorkflowStateArchiveDir(
  root: string,
): string {
  return getCtStateArchiveDir(root)
}
