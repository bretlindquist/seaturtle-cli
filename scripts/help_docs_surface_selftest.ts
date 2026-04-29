import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  PRODUCT_DOCS_URL,
  PRODUCT_OPENAI_DOCS_URL,
} from '../source/src/constants/product.js'

function run(): void {
  assert.match(
    PRODUCT_DOCS_URL,
    /docs\/FEATURES-ROUTER\.md$/,
    'expected PRODUCT_DOCS_URL to point at the feature router',
  )
  assert.match(
    PRODUCT_OPENAI_DOCS_URL,
    /docs\/OPENAI-CODEX\.md$/,
    'expected PRODUCT_OPENAI_DOCS_URL to point at the OpenAI runtime guide',
  )

  const repoRoot = join(import.meta.dir, '..')
  const help = readFileSync(
    join(repoRoot, 'source/src/components/HelpV2/HelpV2.tsx'),
    'utf8',
  )
  const general = readFileSync(
    join(repoRoot, 'source/src/components/HelpV2/General.tsx'),
    'utf8',
  )

  assert.match(
    help,
    /Docs: <Link url=\{PRODUCT_DOCS_URL\} \/>/,
    'expected /help to surface the feature-router docs link',
  )
  assert.match(
    help,
    /OpenAI runtime: <Link url=\{PRODUCT_OPENAI_DOCS_URL\} \/>/,
    'expected /help to surface the OpenAI runtime docs link',
  )
  assert.match(
    general,
    /Use \/status to inspect the live tool surface/,
    'expected the general help tab to point users to /status for runtime truth',
  )
  assert.match(
    general,
    /\/autowork for persistent orchestration/,
    'expected the general help tab to point users to /autowork for persistent orchestration',
  )
}

run()

console.log('help docs surface self-test passed')
