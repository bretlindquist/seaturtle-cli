import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { parseAutoworkNaturalLanguageDirective } from '../source/src/services/autowork/naturalLanguageDirective.js'

const repoRoot = join(import.meta.dir, '..')

assert.deepEqual(parseAutoworkNaturalLanguageDirective('autowork'), {
  entryPoint: 'autowork',
  slashCommand: '/autowork run',
})

assert.deepEqual(
  parseAutoworkNaturalLanguageDirective('autowork for 8 hours'),
  {
    entryPoint: 'autowork',
    slashCommand: '/autowork run 8 hours',
  },
)

assert.deepEqual(
  parseAutoworkNaturalLanguageDirective('switch into autowork'),
  {
    entryPoint: 'autowork',
    slashCommand: '/autowork run',
  },
)

assert.deepEqual(parseAutoworkNaturalLanguageDirective('swim status'), {
  entryPoint: 'swim',
  slashCommand: '/swim status',
})

assert.deepEqual(parseAutoworkNaturalLanguageDirective('autowork off'), {
  entryPoint: 'autowork',
  slashCommand: '/autowork stop',
})

assert.deepEqual(
  parseAutoworkNaturalLanguageDirective(
    'autowork the production-grade cmux wave',
  ),
  {
    entryPoint: 'autowork',
    slashCommand: '/autowork run',
  },
)

assert.equal(
  parseAutoworkNaturalLanguageDirective('autowork mode in the footer is wrong'),
  null,
)

const processUserInputSource = readFileSync(
  join(repoRoot, 'source/src/utils/processUserInput/processUserInput.ts'),
  'utf8',
)

assert.match(
  processUserInputSource,
  /parseAutoworkNaturalLanguageDirective\(inputString\)/,
  'expected prompt processing to consult the shared natural-language autowork directive seam',
)

assert.match(
  processUserInputSource,
  /autoworkDirective\.slashCommand/,
  'expected prompt processing to route the parsed directive through the real slash-command runtime',
)

console.log('autowork natural-language directive selftest passed')
