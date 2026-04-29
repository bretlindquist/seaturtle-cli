import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  archiveActiveWorkstream,
  ensureActivePlanningWorkstream,
  markActivePlanApproved,
  peekActiveWorkstream,
  readActiveWorkflowPlanProjection,
  createDefaultWorkPlanPacket,
  createDefaultWorkResearchPacket,
  createDefaultWorkVerificationPacket,
  ensureWorkflowStateFiles,
  readWorkflowPackets,
  readWorkIndex,
  replaceActiveWorkstream,
  resolveWorkflowPhase,
  resumeActiveWorkstream,
  startActiveWorkstream,
  setActiveWorkstreamPhase,
  updateWorkExecutionPacket,
  updateWorkPhasePacket,
  updateWorkPlanPacket,
  updateWorkResearchPacket,
  updateWorkVerificationPacket,
  validateWorkIndexInvariants,
} from '../source/src/services/projectIdentity/workflowState.ts'
import {
  getCtArchivedWorkExecutionPath,
  getCtArchivedWorkIntentPath,
  getCtArchivedWorkPhasePath,
  getCtArchivedWorkPlanPath,
  getCtArchivedWorkResearchPath,
  getCtArchivedWorkVerificationPath,
  getCtStateDir,
  getCtWorkExecutionPath,
  getCtWorkIndexPath,
  getCtWorkIntentPath,
  getCtWorkPhasePath,
  getCtWorkPlanPath,
  getCtWorkResearchPath,
  getCtWorkVerificationPath,
} from '../source/src/services/projectIdentity/pathLayout.ts'

function run(): void {
  const root = mkdtempSync(join(tmpdir(), 'seaturtle-workflow-state-'))

  try {
    assert.equal(
      peekActiveWorkstream(root),
      null,
      'peekActiveWorkstream should not invent workflow state for a fresh root',
    )
    assert.equal(
      existsSync(getCtStateDir(root)),
      false,
      'peeking workflow state should not create the .ct/state directory',
    )

    const ensured = ensureWorkflowStateFiles(root)
    assert(existsSync(getCtStateDir(root)), 'workflow state dir should be created')
    assert(existsSync(getCtWorkIndexPath(root)), 'work index should be created')
    assert(existsSync(getCtWorkIntentPath(root)), 'intent packet should be created')
    assert(existsSync(getCtWorkResearchPath(root)), 'research packet should be created')
    assert(existsSync(getCtWorkPlanPath(root)), 'plan packet should be created')
    assert(existsSync(getCtWorkExecutionPath(root)), 'execution packet should be created')
    assert(existsSync(getCtWorkVerificationPath(root)), 'verification packet should be created')
    assert(existsSync(getCtWorkPhasePath(root)), 'phase packet should be created')
    assert(ensured.createdPaths.length >= 7, 'initial workflow setup should create packet files and index')

    const defaultResearch = createDefaultWorkResearchPacket()
    const sanitizedResearch = updateWorkResearchPacket(
      () => ({
        ...defaultResearch,
        workId: '  demo-work  ',
        findings: ['Docs review', 'docs review', '  '],
      }),
      root,
    )
    assert.equal(sanitizedResearch.workId, 'demo-work')
    assert.deepEqual(sanitizedResearch.findings, ['Docs review'])

    const defaultPlan = createDefaultWorkPlanPacket()
    const sanitizedPlan = updateWorkPlanPacket(
      () => ({
        ...defaultPlan,
        workId: 'demo-work',
        status: 'approved',
        chunkOrder: ['missing', 'chunk-1'],
        chunks: [
          {
            id: 'chunk-1',
            title: 'Build runtime seam',
            status: 'pending',
            purpose: 'Wire the provider runtime',
            scope: ['runtime'],
            files: ['source/src/runtime.ts'],
            dependencies: [],
            risks: [],
            validation: ['npm run build'],
            done: [],
            rollbackNotes: [],
            reviewNotes: [],
          },
        ],
      }),
      root,
    )
    assert.deepEqual(
      sanitizedPlan.chunkOrder,
      ['chunk-1'],
      'invalid chunk ids should be removed from chunk order',
    )

    const defaultVerification = createDefaultWorkVerificationPacket()
    const sanitizedVerification = updateWorkVerificationPacket(
      () => ({
        ...defaultVerification,
        workId: 'demo-work',
        reviewFindings: ['Needs tests', 'needs tests'],
      }),
      root,
    )
    assert.deepEqual(
      sanitizedVerification.reviewFindings,
      ['Needs tests'],
      'verification packet should dedupe repeated text entries',
    )

    const started = startActiveWorkstream(
      {
        workId: '2026-04-29-work-contract',
        title: 'Implement workflow state foundation',
        summary: 'Foundational workflow packet layer',
        currentPhase: 'intent',
        phaseReason: 'Intent captured from exploratory design wave.',
        intentSummary: 'Build a deterministic workstream contract for autowork.',
      },
      root,
    )
    assert.equal(started.index.activeWorkId, '2026-04-29-work-contract')
    assert.equal(started.packets.phase.currentPhase, 'intent')
    assert.equal(
      started.packets.intent.workStandardsProfile?.id,
      'production-default',
      'new workstreams should inherit the default production standards profile',
    )
    assert.deepEqual(validateWorkIndexInvariants(started.index), [])

    let resumed = resumeActiveWorkstream(root)
    assert.equal(resumed.resolution.phase, 'intent')
    assert.equal(resumed.resolution.autoworkEligibilityHint, 'research-needed')

    updateWorkResearchPacket(
      current => ({
        ...current,
        workId: '2026-04-29-work-contract',
        status: 'complete',
        capturedAt: Date.now(),
        updatedAt: Date.now(),
        researchQuestion: 'What should the workflow-state source of truth be?',
        findings: ['Use .ct/state packet files as the active control plane.'],
      }),
      root,
    )
    updateWorkPlanPacket(
      current => ({
        ...current,
        workId: '2026-04-29-work-contract',
        status: 'approved',
        capturedAt: Date.now(),
        updatedAt: Date.now(),
        planSummary: 'Land packet/index/resolver foundation.',
        chunkOrder: ['wave-1'],
        chunks: [
          {
            id: 'wave-1',
            title: 'Add workflow packet state service',
            status: 'pending',
            purpose: 'Create packet and resolver foundation.',
            scope: ['projectIdentity'],
            files: ['source/src/services/projectIdentity/workflowState.ts'],
            dependencies: [],
            risks: ['state drift'],
            validation: ['bun scripts/workflow_state_selftest.ts'],
            done: [],
            rollbackNotes: ['revert packet service'],
            reviewNotes: ['confirm single source of truth'],
          },
        ],
      }),
      root,
    )
    updateWorkExecutionPacket(
      current => ({
        ...current,
        workId: '2026-04-29-work-contract',
        phase: 'implementation',
        executionScope: 'step',
        activeChunkId: 'wave-1',
        startedAt: Date.now(),
        updatedAt: Date.now(),
        timeBudgetMs: 8 * 60 * 60 * 1000,
        deadlineAt: Date.now() + 8 * 60 * 60 * 1000,
        heartbeatEnabled: true,
        heartbeatIntervalMs: 300000,
        swarmBackend: 'cloud',
        swarmActive: true,
        swarmWorkerCount: 3,
        statusText: 'Running surgical implementation wave.',
      }),
      root,
    )
    updateWorkPhasePacket(
      current => ({
        ...current,
        workId: '2026-04-29-work-contract',
        currentPhase: 'implementation',
        phaseReason: 'Research and plan are complete; implementation is active.',
        updatedAt: Date.now(),
      }),
      root,
    )
    updateWorkVerificationPacket(
      current => ({
        ...current,
        workId: '2026-04-29-work-contract',
        status: 'pending',
        updatedAt: Date.now(),
      }),
      root,
    )

    resumed = resumeActiveWorkstream(root)
    assert.equal(resumed.resolution.phase, 'implementation')
    assert.equal(resumed.resolution.hasResearchArtifact, true)
    assert.equal(resumed.resolution.hasExecutablePlan, true)
    assert.equal(resumed.resolution.activeChunkId, 'wave-1')
    assert.equal(
      resumed.resolution.autoworkEligibilityHint,
      'implementation-ready',
      'approved plans should stay implementation-ready until verification is explicitly active',
    )
    assert.equal(resumed.resolution.recommendedCompactionPayload, 'execution')

    updateWorkExecutionPacket(
      current => ({
        ...current,
        workId: '2026-04-29-work-contract',
        phase: 'implementation',
        nextVerificationSteps: ['Run targeted selftest', 'Run npm run build'],
        updatedAt: Date.now(),
      }),
      root,
    )
    const verificationReady = resolveWorkflowPhase(
      readWorkflowPackets(root),
      readWorkIndex(root),
    )
    assert.equal(verificationReady.autoworkEligibilityHint, 'verification-needed')

    const archived = archiveActiveWorkstream('Wave completed cleanly.', root)
    assert.equal(archived.index.activeWorkId, null)
    assert(archived.archived, 'archiving an active workstream should produce a snapshot')
    assert(existsSync(getCtArchivedWorkIntentPath('2026-04-29-work-contract', root)))
    assert(existsSync(getCtArchivedWorkResearchPath('2026-04-29-work-contract', root)))
    assert(existsSync(getCtArchivedWorkPlanPath('2026-04-29-work-contract', root)))
    assert(existsSync(getCtArchivedWorkExecutionPath('2026-04-29-work-contract', root)))
    assert(existsSync(getCtArchivedWorkVerificationPath('2026-04-29-work-contract', root)))
    assert(existsSync(getCtArchivedWorkPhasePath('2026-04-29-work-contract', root)))

    const afterArchive = resumeActiveWorkstream(root)
    assert.equal(afterArchive.resolution.phase, 'idle')
    assert.equal(afterArchive.resolution.autoworkEligibilityHint, 'no-active-workstream')

    const planning = ensureActivePlanningWorkstream(
      {
        titleHint: 'Wire plan mode to workflow state',
        intentSummary: 'Make plan mode consume the workflow-state source of truth.',
        planFilePath: '/tmp/work-contract-plan.md',
        planContent: '# Final Plan\n\n- Wire plan mode to workflow state',
        phaseReason: 'Plan mode entered for the next consumer wave.',
      },
      root,
    )
    assert.equal(planning.created, true)
    assert.equal(planning.resolution.phase, 'plan')
    assert.equal(planning.packets.plan.status, 'draft')
    assert.equal(
      planning.packets.plan.promotedPlanDocs[0],
      '/tmp/work-contract-plan.md',
      'planning lifecycle should persist the promoted plan artifact path',
    )

    const planProjection = readActiveWorkflowPlanProjection(root)
    assert.equal(planProjection.planFilePath, '/tmp/work-contract-plan.md')
    assert.equal(planProjection.hasPlanArtifact, true)

    const approvedPlan = markActivePlanApproved(
      {
        planFilePath: '/tmp/work-contract-plan.md',
        planContent: '# Final Plan\n\n- Wire plan mode to workflow state',
        phaseReason: 'Plan approved and implementation can begin.',
      },
      root,
    )
    assert.equal(approvedPlan.packets.plan.status, 'approved')
    assert.equal(approvedPlan.resolution.phase, 'implementation')
    assert.equal(
      approvedPlan.resolution.autoworkEligibilityHint,
      'research-needed',
      'approved promoted plans do not bypass the research gate before the plan compiler wave exists',
    )

    const reviewPhase = setActiveWorkstreamPhase(
      {
        phase: 'review',
        phaseReason: 'Broad review is pending after implementation.',
      },
      root,
    )
    assert.equal(reviewPhase.resolution.phase, 'review')
    assert.equal(reviewPhase.resolution.requiresBroadReview, true)

    const replaced = replaceActiveWorkstream(
      {
        workId: '2026-04-29-footer-runtime',
        title: 'Add footer runtime snapshot',
        currentPhase: 'research',
        phaseReason: 'Start next wave with research.',
      },
      root,
    )
    assert.equal(replaced.index.activeWorkId, '2026-04-29-footer-runtime')
    assert.equal(replaced.packets.phase.currentPhase, 'research')
    assert(replaced.previous, 'replace should archive the previous active workstream before starting the next one')

    console.log('workflow state self-test passed')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

run()
