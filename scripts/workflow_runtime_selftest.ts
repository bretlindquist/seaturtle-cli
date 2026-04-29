import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { updateAutoworkState } from '../source/src/services/autowork/state.ts'
import { readWorkflowRuntimeSnapshot } from '../source/src/services/projectIdentity/workflowRuntime.ts'
import {
  startActiveWorkstream,
  updateWorkExecutionPacket,
} from '../source/src/services/projectIdentity/workflowState.ts'

function run(): void {
  const root = mkdtempSync(join(tmpdir(), 'seaturtle-workflow-runtime-'))

  try {
    const empty = readWorkflowRuntimeSnapshot(root)
    assert.equal(empty.workId, null)
    assert.equal(empty.workflowPhase, 'idle')
    assert.equal(empty.autoworkMode, 'idle')
    assert.equal(empty.autoworkActive, false)
    assert.equal(empty.swarmBackend, 'none')

    startActiveWorkstream(
      {
        workId: '2026-04-29-footer-runtime',
        title: 'Footer runtime projection',
        summary: 'Drive footer state from workflow runtime',
        currentPhase: 'implementation',
        phaseReason: 'Implementation is active.',
        intentSummary: 'Project workflow runtime into AppState for the footer.',
      },
      root,
    )

    updateWorkExecutionPacket(
      current => ({
        ...current,
        workId: '2026-04-29-footer-runtime',
        phase: 'implementation',
        activeChunkId: 'wave-2',
        executionScope: 'plan',
        heartbeatEnabled: true,
        heartbeatIntervalMs: 300000,
        swarmBackend: 'cloud',
        swarmActive: true,
        swarmWorkerCount: 3,
        statusText: 'Executing wave-2',
        lastActivityAt: 2222,
      }),
      root,
    )

    updateAutoworkState(
      current => ({
        ...current,
        currentMode: 'execution',
        currentChunkId: 'wave-2',
        implementedButUnverified: true,
        lastStartedAt: 1111,
        lastFinishedAt: null,
      }),
      root,
    )

    const active = readWorkflowRuntimeSnapshot(root)
    assert.equal(active.workId, '2026-04-29-footer-runtime')
    assert.equal(active.workflowPhase, 'implementation')
    assert.equal(active.autoworkMode, 'execution')
    assert.equal(active.autoworkActive, true)
    assert.equal(active.activeChunkId, 'wave-2')
    assert.equal(active.executionScope, 'plan')
    assert.equal(active.heartbeatEnabled, true)
    assert.equal(active.heartbeatIntervalMs, 300000)
    assert.equal(active.swarmBackend, 'cloud')
    assert.equal(active.swarmActive, true)
    assert.equal(active.swarmWorkerCount, 3)
    assert.equal(active.statusText, 'Executing wave-2')
    assert.equal(active.lastActivityAt, 2222)

    updateAutoworkState(
      current => ({
        ...current,
        currentMode: 'execution',
        currentChunkId: null,
        implementedButUnverified: false,
        lastStartedAt: 1111,
        lastFinishedAt: 3333,
      }),
      root,
    )

    const inactive = readWorkflowRuntimeSnapshot(root)
    assert.equal(inactive.autoworkActive, false)
    assert.equal(inactive.autoworkMode, 'execution')
    assert.equal(inactive.workflowPhase, 'implementation')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

run()
