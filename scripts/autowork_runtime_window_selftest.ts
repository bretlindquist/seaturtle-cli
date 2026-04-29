import assert from 'node:assert/strict'

import {
  DEFAULT_AUTOWORK_CHECKPOINT_POLICY,
  DEFAULT_AUTOWORK_HEARTBEAT_INTERVAL_MS,
  formatAutoworkRuntimeWindowLabel,
  parseAutoworkBudgetInput,
  resolveAutoworkRuntimeWindow,
} from '../source/src/services/autowork/runtimeWindow.ts'

function run(): void {
  const eightHours = parseAutoworkBudgetInput('8h')
  assert.equal(eightHours.ok, true)
  if (eightHours.ok) {
    assert.equal(eightHours.timeBudgetMs, 8 * 60 * 60 * 1000)
  }

  const ninetyMinutes = parseAutoworkBudgetInput('for 90 minutes')
  assert.equal(ninetyMinutes.ok, true)
  if (ninetyMinutes.ok) {
    assert.equal(ninetyMinutes.timeBudgetMs, 90 * 60 * 1000)
  }

  const invalid = parseAutoworkBudgetInput('tomorrow afternoon')
  assert.equal(invalid.ok, false)

  const started = resolveAutoworkRuntimeWindow(null, {
    requestedTimeBudgetMs: 2 * 60 * 60 * 1000,
    now: 1_000,
  })
  assert.equal(started.timeBudgetMs, 2 * 60 * 60 * 1000)
  assert.equal(started.deadlineAt, 1_000 + 2 * 60 * 60 * 1000)
  assert.equal(started.heartbeatEnabled, true)
  assert.equal(
    started.heartbeatIntervalMs,
    DEFAULT_AUTOWORK_HEARTBEAT_INTERVAL_MS,
  )
  assert.equal(started.checkpointPolicy, DEFAULT_AUTOWORK_CHECKPOINT_POLICY)
  assert.equal(started.source, 'new-budget')

  const continued = resolveAutoworkRuntimeWindow(
    {
      timeBudgetMs: 2 * 60 * 60 * 1000,
      deadlineAt: 9_000,
      heartbeatEnabled: true,
      heartbeatIntervalMs: 120_000,
      checkpointPolicy: 'verify-every-chunk',
    },
    { now: 8_000 },
  )
  assert.equal(continued.source, 'continued')
  assert.equal(continued.expired, false)
  assert.equal(continued.remainingMs, 1_000)
  assert.equal(continued.heartbeatIntervalMs, 120_000)

  const expired = resolveAutoworkRuntimeWindow(
    {
      timeBudgetMs: 60 * 60 * 1000,
      deadlineAt: 5_000,
      heartbeatEnabled: true,
      heartbeatIntervalMs: 300_000,
      checkpointPolicy: 'verify-every-chunk',
    },
    { now: 5_500 },
  )
  assert.equal(expired.expired, true)
  assert.equal(expired.remainingMs, 0)

  assert.equal(
    formatAutoworkRuntimeWindowLabel({
      timeBudgetMs: null,
      deadlineAt: null,
      heartbeatEnabled: true,
    }),
    'open-ended',
  )
  assert.match(
    formatAutoworkRuntimeWindowLabel({
      timeBudgetMs: 60 * 60 * 1000,
      deadlineAt: 2 * 60 * 60 * 1000,
      heartbeatEnabled: true,
    }, 60 * 60 * 1000),
    /remaining of/,
  )
}

run()
