import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = join(import.meta.dir, '..')

const modelOptions = readFileSync(
  join(repoRoot, 'source/src/utils/model/modelOptions.ts'),
  'utf8',
)
const modelPicker = readFileSync(
  join(repoRoot, 'source/src/components/ModelPicker.tsx'),
  'utf8',
)
const startupAuthFlow = readFileSync(
  join(repoRoot, 'source/src/components/StartupAuthFlow.tsx'),
  'utf8',
)

assert.match(
  modelOptions,
  /provider\?: MainRuntimeProvider/,
  'model options should accept an explicit provider override',
)
assert.match(
  modelOptions,
  /resolveMainRuntimeProvider/,
  'model options should resolve an explicit provider before falling back to ambient runtime state',
)
assert.match(
  modelPicker,
  /provider\?: MainRuntimeProvider/,
  'ModelPicker should accept an explicit provider override',
)
assert.match(
  modelPicker,
  /getModelOptions\(t2, provider\)/,
  'ModelPicker should request model options for the explicit provider when supplied',
)
assert.match(
  startupAuthFlow,
  /provider=\{screen\.provider\}/,
  'Startup auth flow should pass the explicit provider into the model picker',
)

console.log('provider model picker self-test passed')
