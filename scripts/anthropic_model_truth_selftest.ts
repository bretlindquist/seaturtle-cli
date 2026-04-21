import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = join(import.meta.dir, '..')

const configs = readFileSync(
  join(repoRoot, 'source/src/utils/model/configs.ts'),
  'utf8',
)
const model = readFileSync(
  join(repoRoot, 'source/src/utils/model/model.ts'),
  'utf8',
)
const modelOptions = readFileSync(
  join(repoRoot, 'source/src/utils/model/modelOptions.ts'),
  'utf8',
)
const providerRegistry = readFileSync(
  join(repoRoot, 'source/src/services/models/providerModelRegistry.ts'),
  'utf8',
)

assert.match(
  configs,
  /CLAUDE_OPUS_4_7_CONFIG/,
  'Anthropic model configs should define an Opus 4.7 slot for first-party truth',
)
assert.match(
  configs,
  /firstParty: 'claude-opus-4-7'/,
  'Anthropic model configs should map the first-party Opus default to claude-opus-4-7',
)
assert.match(
  model,
  /return getModelStrings\(\)\.opus47/,
  'Anthropic first-party default Opus model should resolve to Opus 4.7',
)
assert.match(
  model,
  /Opus 4\.7 · Most capable for complex work/,
  'Anthropic default user-facing Opus copy should say Opus 4.7',
)
assert.match(
  modelOptions,
  /is3P \? 'Opus 4\.6' : 'Opus 4\.7'/,
  'Anthropic picker copy should keep third-party lag explicit while first-party defaults move to Opus 4.7',
)
assert.match(
  providerRegistry,
  /value: 'claude-opus-4-7'/,
  'Anthropic provider model registry should include Claude Opus 4.7',
)
assert.match(
  providerRegistry,
  /return 'claude-opus-4-7'/,
  'Anthropic provider model registry should recommend Claude Opus 4.7',
)

console.log('anthropic model truth self-test passed')
