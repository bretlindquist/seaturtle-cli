import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod/v4'
import { buildTool, type ToolDef } from '../../Tool.js'
import { getCtProjectRoot } from '../../services/projectIdentity/paths.js'
import {
  peekActiveWorkstream,
  projectAutoworkPlanPacketState,
  setActiveWorkstreamPhase,
  type WorkChunkStatus,
  type WorkExecutionScope,
  type WorkPhase,
  type WorkPlanStatus,
  type WorkResearchStatus,
  type WorkSwarmBackend,
  type WorkVerificationStatus,
  updateWorkExecutionPacket,
  updateWorkIntentPacket,
  updateWorkPlanPacket,
  updateWorkResearchPacket,
  updateWorkVerificationPacket,
} from '../../services/projectIdentity/workflowState.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { WORKFLOW_STATE_TOOL_NAME } from './constants.js'
import { DESCRIPTION, PROMPT } from './prompt.js'

const WorkPhaseSchema = z.enum([
  'intent',
  'research',
  'plan',
  'implementation',
  'verification',
  'review',
  'idle',
])

const WorkResearchStatusSchema = z.enum(['missing', 'in_progress', 'complete'])
const WorkPlanStatusSchema = z.enum(['missing', 'draft', 'approved', 'in_progress'])
const WorkChunkStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'blocked',
])
const WorkExecutionScopeSchema = z.enum(['none', 'plan', 'step'])
const WorkSwarmBackendSchema = z.enum(['none', 'local', 'cloud'])
const WorkVerificationStatusSchema = z.enum([
  'pending',
  'in_progress',
  'verified',
  'failed',
])

const WorkPlanChunkSchema = z.strictObject({
  id: z.string(),
  title: z.string(),
  status: WorkChunkStatusSchema,
  purpose: z.string().nullable().optional(),
  scope: z.array(z.string()).optional(),
  files: z.array(z.string()).optional(),
  dependencies: z.array(z.string()).optional(),
  risks: z.array(z.string()).optional(),
  validation: z.array(z.string()).optional(),
  done: z.array(z.string()).optional(),
  rollbackNotes: z.array(z.string()).optional(),
  reviewNotes: z.array(z.string()).optional(),
})

const inputSchema = lazySchema(() =>
  z
    .strictObject({
      intent: z
        .strictObject({
          intentSummary: z.string().nullable().optional(),
          goals: z.array(z.string()).optional(),
          constraints: z.array(z.string()).optional(),
          successCriteria: z.array(z.string()).optional(),
          openQuestions: z.array(z.string()).optional(),
          foundationDecisions: z.array(z.string()).optional(),
          workStandardsProfileId: z.string().nullable().optional(),
          sourceConversationScope: z.string().nullable().optional(),
        })
        .optional(),
      research: z
        .strictObject({
          status: WorkResearchStatusSchema.optional(),
          researchQuestion: z.string().nullable().optional(),
          findings: z.array(z.string()).optional(),
          assumptions: z.array(z.string()).optional(),
          validatedAssumptions: z.array(z.string()).optional(),
          rejectedPaths: z.array(z.string()).optional(),
          subsystemDecisions: z.array(z.string()).optional(),
          sourceRefs: z.array(z.string()).optional(),
          openRisks: z.array(z.string()).optional(),
          recommendation: z.string().nullable().optional(),
        })
        .optional(),
      plan: z
        .strictObject({
          status: WorkPlanStatusSchema.optional(),
          planSummary: z.string().nullable().optional(),
          globalConstraints: z.array(z.string()).optional(),
          validationPolicy: z.array(z.string()).optional(),
          rollbackPolicy: z.array(z.string()).optional(),
          promotedPlanDocs: z.array(z.string()).optional(),
          chunkOrder: z.array(z.string()).optional(),
          chunks: z.array(WorkPlanChunkSchema).optional(),
          syncPlanFromFilePath: z.string().optional(),
        })
        .optional(),
      execution: z
        .strictObject({
          activeChunkId: z.string().nullable().optional(),
          executionScope: WorkExecutionScopeSchema.optional(),
          timeBudgetMs: z.number().int().nonnegative().nullable().optional(),
          deadlineAt: z.number().int().nullable().optional(),
          heartbeatEnabled: z.boolean().optional(),
          heartbeatIntervalMs: z.number().int().positive().nullable().optional(),
          checkpointPolicy: z.string().nullable().optional(),
          currentActions: z.array(z.string()).optional(),
          blockedOn: z.array(z.string()).optional(),
          lastMeaningfulChange: z.string().nullable().optional(),
          nextVerificationSteps: z.array(z.string()).optional(),
          continuationDebt: z.array(z.string()).optional(),
          stopReason: z.string().nullable().optional(),
          swarmBackend: WorkSwarmBackendSchema.optional(),
          swarmActive: z.boolean().optional(),
          swarmWorkerCount: z.number().int().nonnegative().optional(),
          statusText: z.string().nullable().optional(),
          lastActivityAt: z.number().int().nullable().optional(),
        })
        .optional(),
      verification: z
        .strictObject({
          status: WorkVerificationStatusSchema.optional(),
          verifiedChunkIds: z.array(z.string()).optional(),
          validationRuns: z.array(z.string()).optional(),
          runtimeChecks: z.array(z.string()).optional(),
          reviewFindings: z.array(z.string()).optional(),
          openDefects: z.array(z.string()).optional(),
          followups: z.array(z.string()).optional(),
          lastVerifiedCommit: z.string().nullable().optional(),
          qualityGateStatus: z.string().nullable().optional(),
        })
        .optional(),
      phase: z
        .strictObject({
          phase: WorkPhaseSchema,
          phaseReason: z.string().nullable().optional(),
        })
        .optional(),
    })
    .refine(
      value =>
        !!(
          value.intent ||
          value.research ||
          value.plan ||
          value.execution ||
          value.verification ||
          value.phase
        ),
      {
        message: 'At least one workflow packet update must be provided.',
      },
    ),
)
type InputSchema = ReturnType<typeof inputSchema>

const outputSchema = lazySchema(() =>
  z.object({
    success: z.boolean(),
    workId: z.string().nullable(),
    currentPhase: WorkPhaseSchema.nullable(),
    updatedPackets: z.array(z.string()),
    error: z.string().optional(),
  }),
)
type OutputSchema = ReturnType<typeof outputSchema>

export type Output = z.infer<OutputSchema>
type ProjectedPlanState = NonNullable<
  ReturnType<typeof projectAutoworkPlanPacketState>
>

function normalizeList(values: string[] | undefined): string[] | undefined {
  return values?.map(value => value.trim()).filter(Boolean)
}

function normalizeNullableText(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined
  }
  if (value === null) {
    return null
  }
  const trimmed = value.trim()
  return trimmed || null
}

function normalizePlanChunks(
  chunks: z.infer<typeof WorkPlanChunkSchema>[] | undefined,
): {
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
}[] | undefined {
  if (!chunks) {
    return undefined
  }
  return chunks.map(chunk => ({
    id: chunk.id.trim(),
    title: chunk.title.trim(),
    status: chunk.status as WorkChunkStatus,
    purpose: normalizeNullableText(chunk.purpose) ?? null,
    scope: normalizeList(chunk.scope) ?? [],
    files: normalizeList(chunk.files) ?? [],
    dependencies: normalizeList(chunk.dependencies) ?? [],
    risks: normalizeList(chunk.risks) ?? [],
    validation: normalizeList(chunk.validation) ?? [],
    done: normalizeList(chunk.done) ?? [],
    rollbackNotes: normalizeList(chunk.rollbackNotes) ?? [],
    reviewNotes: normalizeList(chunk.reviewNotes) ?? [],
  }))
}

function appendUnique(values: string[], additions: string[]): string[] {
  return Array.from(new Set([...values, ...additions]))
}

export const WorkflowStateTool = buildTool({
  name: WORKFLOW_STATE_TOOL_NAME,
  searchHint: 'update the active workstream workflow packets',
  maxResultSizeChars: 100_000,
  strict: true,
  async description() {
    return DESCRIPTION
  },
  async prompt() {
    return PROMPT
  },
  get inputSchema(): InputSchema {
    return inputSchema()
  },
  get outputSchema(): OutputSchema {
    return outputSchema()
  },
  userFacingName() {
    return 'WorkflowState'
  },
  shouldDefer: true,
  toAutoClassifierInput(input) {
    return Object.keys(input).join(' ')
  },
  renderToolUseMessage() {
    return null
  },
  async checkPermissions(input) {
    return { behavior: 'allow', updatedInput: input }
  },
  async call(input) {
    const root = getCtProjectRoot()
    const active = peekActiveWorkstream(root)
    const workId = active?.index.activeWorkId ?? active?.packets.phase.workId ?? null
    if (!active || !workId) {
      return {
        data: {
          success: false,
          workId: null,
          currentPhase: null,
          updatedPackets: [],
          error: 'No active workstream is available to update.',
        },
      }
    }

    const now = Date.now()
    const updatedPackets: string[] = []

    if (input.intent) {
      updateWorkIntentPacket(
        current => ({
          ...current,
          workId,
          capturedAt: current.capturedAt ?? now,
          updatedAt: now,
          intentSummary:
            input.intent.intentSummary !== undefined
              ? normalizeNullableText(input.intent.intentSummary) ?? null
              : current.intentSummary,
          goals:
            input.intent.goals !== undefined
              ? normalizeList(input.intent.goals) ?? []
              : current.goals,
          constraints:
            input.intent.constraints !== undefined
              ? normalizeList(input.intent.constraints) ?? []
              : current.constraints,
          successCriteria:
            input.intent.successCriteria !== undefined
              ? normalizeList(input.intent.successCriteria) ?? []
              : current.successCriteria,
          openQuestions:
            input.intent.openQuestions !== undefined
              ? normalizeList(input.intent.openQuestions) ?? []
              : current.openQuestions,
          foundationDecisions:
            input.intent.foundationDecisions !== undefined
              ? normalizeList(input.intent.foundationDecisions) ?? []
              : current.foundationDecisions,
          sourceConversationScope:
            input.intent.sourceConversationScope !== undefined
              ? normalizeNullableText(input.intent.sourceConversationScope) ?? null
              : current.sourceConversationScope,
          workStandardsProfile:
            input.intent.workStandardsProfileId !== undefined
              ? normalizeNullableText(input.intent.workStandardsProfileId)
                ? {
                    version: 1 as const,
                    id: normalizeNullableText(input.intent.workStandardsProfileId)!,
                  }
                : null
              : current.workStandardsProfile,
        }),
        root,
      )
      updatedPackets.push('intent')
    }

    if (input.research) {
      updateWorkResearchPacket(
        current => ({
          ...current,
          workId,
          capturedAt: current.capturedAt ?? now,
          updatedAt: now,
          status:
            input.research.status !== undefined
              ? (input.research.status as WorkResearchStatus)
              : current.status,
          researchQuestion:
            input.research.researchQuestion !== undefined
              ? normalizeNullableText(input.research.researchQuestion) ?? null
              : current.researchQuestion,
          findings:
            input.research.findings !== undefined
              ? normalizeList(input.research.findings) ?? []
              : current.findings,
          assumptions:
            input.research.assumptions !== undefined
              ? normalizeList(input.research.assumptions) ?? []
              : current.assumptions,
          validatedAssumptions:
            input.research.validatedAssumptions !== undefined
              ? normalizeList(input.research.validatedAssumptions) ?? []
              : current.validatedAssumptions,
          rejectedPaths:
            input.research.rejectedPaths !== undefined
              ? normalizeList(input.research.rejectedPaths) ?? []
              : current.rejectedPaths,
          subsystemDecisions:
            input.research.subsystemDecisions !== undefined
              ? normalizeList(input.research.subsystemDecisions) ?? []
              : current.subsystemDecisions,
          sourceRefs:
            input.research.sourceRefs !== undefined
              ? normalizeList(input.research.sourceRefs) ?? []
              : current.sourceRefs,
          openRisks:
            input.research.openRisks !== undefined
              ? normalizeList(input.research.openRisks) ?? []
              : current.openRisks,
          recommendation:
            input.research.recommendation !== undefined
              ? normalizeNullableText(input.research.recommendation) ?? null
              : current.recommendation,
        }),
        root,
      )
      updatedPackets.push('research')
    }

    if (input.plan) {
      let syncedPlanProjection: ProjectedPlanState | null = null
      let syncedPlanPath: string | null = null

      if (input.plan.syncPlanFromFilePath) {
        syncedPlanPath = resolve(root, input.plan.syncPlanFromFilePath)
        syncedPlanProjection = projectAutoworkPlanPacketState(
          syncedPlanPath,
          readFileSync(syncedPlanPath, 'utf8'),
        )
        if (!syncedPlanProjection) {
          return {
            data: {
              success: false,
              workId,
              currentPhase: active.resolution.phase,
              updatedPackets,
              error: `Could not sync workflow plan packet from ${syncedPlanPath}.`,
            },
          }
        }
      }

      updateWorkPlanPacket(
        current => ({
          ...current,
          workId,
          capturedAt: current.capturedAt ?? now,
          updatedAt: now,
          status:
            input.plan!.status !== undefined
              ? (input.plan!.status as WorkPlanStatus)
              : current.status,
          planSummary:
            input.plan!.planSummary !== undefined
              ? normalizeNullableText(input.plan!.planSummary) ?? null
              : current.planSummary,
          globalConstraints:
            input.plan!.globalConstraints !== undefined
              ? normalizeList(input.plan!.globalConstraints) ?? []
              : current.globalConstraints,
          validationPolicy:
            input.plan!.validationPolicy !== undefined
              ? normalizeList(input.plan!.validationPolicy) ?? []
              : current.validationPolicy,
          rollbackPolicy:
            input.plan!.rollbackPolicy !== undefined
              ? normalizeList(input.plan!.rollbackPolicy) ?? []
              : current.rollbackPolicy,
          promotedPlanDocs:
            input.plan!.promotedPlanDocs !== undefined || syncedPlanPath
              ? appendUnique(
                  input.plan!.promotedPlanDocs !== undefined
                    ? normalizeList(input.plan!.promotedPlanDocs) ?? []
                    : current.promotedPlanDocs,
                  syncedPlanPath ? [syncedPlanPath] : [],
                )
              : current.promotedPlanDocs,
          chunkOrder:
            input.plan!.chunkOrder !== undefined
              ? normalizeList(input.plan!.chunkOrder) ?? []
              : syncedPlanProjection?.chunkOrder ?? current.chunkOrder,
          chunks:
            input.plan!.chunks !== undefined
              ? normalizePlanChunks(input.plan!.chunks) ?? []
              : syncedPlanProjection?.chunks ?? current.chunks,
        }),
        root,
      )
      updatedPackets.push('plan')
    }

    if (input.execution) {
      updateWorkExecutionPacket(
        current => ({
          ...current,
          workId,
          updatedAt: now,
          activeChunkId:
            input.execution!.activeChunkId !== undefined
              ? normalizeNullableText(input.execution!.activeChunkId) ?? null
              : current.activeChunkId,
          executionScope:
            input.execution!.executionScope !== undefined
              ? (input.execution!.executionScope as WorkExecutionScope)
              : current.executionScope,
          timeBudgetMs:
            input.execution!.timeBudgetMs !== undefined
              ? input.execution!.timeBudgetMs
              : current.timeBudgetMs,
          deadlineAt:
            input.execution!.deadlineAt !== undefined
              ? input.execution!.deadlineAt
              : current.deadlineAt,
          heartbeatEnabled:
            input.execution!.heartbeatEnabled !== undefined
              ? input.execution!.heartbeatEnabled
              : current.heartbeatEnabled,
          heartbeatIntervalMs:
            input.execution!.heartbeatIntervalMs !== undefined
              ? input.execution!.heartbeatIntervalMs
              : current.heartbeatIntervalMs,
          checkpointPolicy:
            input.execution!.checkpointPolicy !== undefined
              ? normalizeNullableText(input.execution!.checkpointPolicy) ?? null
              : current.checkpointPolicy,
          currentActions:
            input.execution!.currentActions !== undefined
              ? normalizeList(input.execution!.currentActions) ?? []
              : current.currentActions,
          blockedOn:
            input.execution!.blockedOn !== undefined
              ? normalizeList(input.execution!.blockedOn) ?? []
              : current.blockedOn,
          lastMeaningfulChange:
            input.execution!.lastMeaningfulChange !== undefined
              ? normalizeNullableText(input.execution!.lastMeaningfulChange) ?? null
              : current.lastMeaningfulChange,
          nextVerificationSteps:
            input.execution!.nextVerificationSteps !== undefined
              ? normalizeList(input.execution!.nextVerificationSteps) ?? []
              : current.nextVerificationSteps,
          continuationDebt:
            input.execution!.continuationDebt !== undefined
              ? normalizeList(input.execution!.continuationDebt) ?? []
              : current.continuationDebt,
          stopReason:
            input.execution!.stopReason !== undefined
              ? normalizeNullableText(input.execution!.stopReason) ?? null
              : current.stopReason,
          swarmBackend:
            input.execution!.swarmBackend !== undefined
              ? (input.execution!.swarmBackend as WorkSwarmBackend)
              : current.swarmBackend,
          swarmActive:
            input.execution!.swarmActive !== undefined
              ? input.execution!.swarmActive
              : current.swarmActive,
          swarmWorkerCount:
            input.execution!.swarmWorkerCount !== undefined
              ? input.execution!.swarmWorkerCount
              : current.swarmWorkerCount,
          statusText:
            input.execution!.statusText !== undefined
              ? normalizeNullableText(input.execution!.statusText) ?? null
              : current.statusText,
          lastActivityAt:
            input.execution!.lastActivityAt !== undefined
              ? input.execution!.lastActivityAt
              : current.lastActivityAt,
        }),
        root,
      )
      updatedPackets.push('execution')
    }

    if (input.verification) {
      updateWorkVerificationPacket(
        current => ({
          ...current,
          workId,
          capturedAt: current.capturedAt ?? now,
          updatedAt: now,
          status:
            input.verification!.status !== undefined
              ? (input.verification!.status as WorkVerificationStatus)
              : current.status,
          verifiedChunkIds:
            input.verification!.verifiedChunkIds !== undefined
              ? normalizeList(input.verification!.verifiedChunkIds) ?? []
              : current.verifiedChunkIds,
          validationRuns:
            input.verification!.validationRuns !== undefined
              ? normalizeList(input.verification!.validationRuns) ?? []
              : current.validationRuns,
          runtimeChecks:
            input.verification!.runtimeChecks !== undefined
              ? normalizeList(input.verification!.runtimeChecks) ?? []
              : current.runtimeChecks,
          reviewFindings:
            input.verification!.reviewFindings !== undefined
              ? normalizeList(input.verification!.reviewFindings) ?? []
              : current.reviewFindings,
          openDefects:
            input.verification!.openDefects !== undefined
              ? normalizeList(input.verification!.openDefects) ?? []
              : current.openDefects,
          followups:
            input.verification!.followups !== undefined
              ? normalizeList(input.verification!.followups) ?? []
              : current.followups,
          lastVerifiedCommit:
            input.verification!.lastVerifiedCommit !== undefined
              ? normalizeNullableText(input.verification!.lastVerifiedCommit) ?? null
              : current.lastVerifiedCommit,
          qualityGateStatus:
            input.verification!.qualityGateStatus !== undefined
              ? normalizeNullableText(input.verification!.qualityGateStatus) ?? null
              : current.qualityGateStatus,
        }),
        root,
      )
      updatedPackets.push('verification')
    }

    if (input.phase) {
      setActiveWorkstreamPhase(
        {
          phase: input.phase.phase as WorkPhase,
          phaseReason: normalizeNullableText(input.phase.phaseReason) ?? null,
        },
        root,
      )
      updatedPackets.push('phase')
    }

    const next = peekActiveWorkstream(root)

    return {
      data: {
        success: true,
        workId,
        currentPhase: next?.resolution.phase ?? active.resolution.phase,
        updatedPackets,
      },
    }
  },
  mapToolResultToToolResultBlockParam(content, toolUseID) {
    const result = content as Output
    return {
      tool_use_id: toolUseID,
      type: 'tool_result',
      content: result.success
        ? `Workflow state updated for ${result.workId ?? 'the active workstream'}: ${result.updatedPackets.join(', ') || 'no packets'}. Current phase: ${result.currentPhase ?? 'unknown'}.`
        : `Workflow state update failed: ${result.error ?? 'unknown error'}`,
    }
  },
} satisfies ToolDef<InputSchema, Output>)
