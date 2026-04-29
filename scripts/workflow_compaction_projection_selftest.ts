import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  readActiveWorkflowCompactionProjection,
  startActiveWorkstream,
  updateWorkExecutionPacket,
  updateWorkPhasePacket,
  updateWorkPlanPacket,
  updateWorkResearchPacket,
  updateWorkVerificationPacket,
} from '../source/src/services/projectIdentity/workflowState.ts'

const repoRoot = join(import.meta.dir, '..')

function run(): void {
  const root = mkdtempSync(join(tmpdir(), 'seaturtle-workflow-compact-'))

  try {
    assert.equal(readActiveWorkflowCompactionProjection(root), null)

    startActiveWorkstream(
      {
        workId: '2026-04-29-workflow-compact',
        title: 'Phase-aware compaction payload',
        summary: 'Preserve workflow packets across compaction',
        currentPhase: 'implementation',
        phaseReason: 'Execution is active.',
        intentSummary: 'Keep workflow state authoritative through compaction.',
      },
      root,
    )

    updateWorkResearchPacket(
      current => ({
        ...current,
        workId: '2026-04-29-workflow-compact',
        status: 'complete',
        researchQuestion: 'What workflow state must survive compaction?',
        findings: ['Execution heartbeat details must survive compaction.'],
        recommendation: 'Project the workflow packet seam into compaction attachments.',
        updatedAt: Date.now(),
      }),
      root,
    )

    updateWorkPlanPacket(
      current => ({
        ...current,
        workId: '2026-04-29-workflow-compact',
        status: 'approved',
        planSummary: 'Attach a workflow compaction projection from workflowState.',
        chunkOrder: ['wave-5'],
        chunks: [
          {
            id: 'wave-5',
            title: 'Add workflow compaction projection',
            status: 'in_progress',
            purpose: 'Preserve workflow state after compaction.',
            scope: ['compact', 'workflowState'],
            files: ['source/src/services/compact/compact.ts'],
            dependencies: [],
            risks: ['state drift'],
            validation: ['bun scripts/workflow_compaction_projection_selftest.ts'],
            done: [],
            rollbackNotes: [],
            reviewNotes: [],
          },
        ],
        updatedAt: Date.now(),
      }),
      root,
    )

    updateWorkExecutionPacket(
      current => ({
        ...current,
        workId: '2026-04-29-workflow-compact',
        phase: 'implementation',
        activeChunkId: 'wave-5',
        currentActions: ['Project workflow state into compaction attachments'],
        nextVerificationSteps: ['Run workflow compaction selftest'],
        continuationDebt: ['Keep compaction payload aligned with workflow packets'],
        statusText: 'Preserving workflow state for compaction',
        updatedAt: Date.now(),
      }),
      root,
    )

    const implementationProjection = readActiveWorkflowCompactionProjection(root)
    assert(implementationProjection, 'expected active workflow compaction projection')
    assert.equal(
      implementationProjection.recommendedCompactionPayload,
      'execution',
    )
    assert.equal(implementationProjection.phase, 'implementation')
    assert(
      implementationProjection.summaryLines.some(line =>
        line.includes('Active chunk: wave-5'),
      ),
      'expected execution summary to include the active chunk',
    )
    assert(
      implementationProjection.summaryLines.some(line =>
        line.includes('Execution heartbeat details must survive compaction.'),
      ),
      'expected projection to include research findings',
    )

    updateWorkVerificationPacket(
      current => ({
        ...current,
        workId: '2026-04-29-workflow-compact',
        status: 'failed',
        openDefects: ['Verification still needs a workflow attachment assertion.'],
        updatedAt: Date.now(),
      }),
      root,
    )
    updateWorkPhasePacket(
      current => ({
        ...current,
        workId: '2026-04-29-workflow-compact',
        currentPhase: 'verification',
        phaseReason: 'Verification is blocked until compaction carries workflow state.',
        updatedAt: Date.now(),
      }),
      root,
    )

    const verificationProjection = readActiveWorkflowCompactionProjection(root)
    assert(verificationProjection, 'expected verification projection')
    assert.equal(
      verificationProjection.recommendedCompactionPayload,
      'verification',
    )
    assert.equal(verificationProjection.phase, 'verification')
    assert(
      verificationProjection.summaryLines.some(line =>
        line.includes(
          'Open defect: Verification still needs a workflow attachment assertion.',
        ),
      ),
      'expected verification summary to include open defects',
    )

    const compactSource = readFileSync(
      join(repoRoot, 'source/src/services/compact/compact.ts'),
      'utf8',
    )
    assert.match(
      compactSource,
      /createWorkflowStateAttachmentIfNeeded/,
      'expected compact service to preserve workflow-state attachments',
    )

    const sessionMemoryCompactSource = readFileSync(
      join(repoRoot, 'source/src/services/compact/sessionMemoryCompact.ts'),
      'utf8',
    )
    assert.match(
      sessionMemoryCompactSource,
      /createWorkflowStateAttachmentIfNeeded/,
      'expected session-memory compaction to preserve workflow-state attachments',
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

run()
