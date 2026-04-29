import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

function run(): void {
  const repoRoot = join(import.meta.dir, '..')
  const providerRuntimeSource = readFileSync(
    join(repoRoot, 'source/src/services/api/providerRuntime.ts'),
    'utf8',
  )
  const oauthSource = readFileSync(
    join(repoRoot, 'source/src/services/authProfiles/openaiCodexOAuth.ts'),
    'utf8',
  )

  assert.match(
    oauthSource,
    /const emailAddress =\s*[\s\S]*getEmailFromJwt\(profile\?\.accessToken\)[\s\S]*trimOptionalString\(profile\?\.emailAddress\)/,
    'shared OpenAI profile identity should derive display email from token claims before stored profile email',
  )
  assert.match(
    oauthSource,
    /https:\/\/api\.openai\.com\/profile/,
    'OpenAI JWT email resolution should inspect the provider profile claim as well as top-level email',
  )
  assert.match(
    oauthSource,
    /const planType =\s*[\s\S]*getPlanTypeFromJwt\(profile\?\.accessToken\)[\s\S]*storedPlanType/,
    'shared OpenAI profile identity should derive plan type from token claims before stored plan metadata',
  )
  assert.match(
    providerRuntimeSource,
    /resolveOpenAiCodexOAuthProfileIdentity\(/,
    'provider runtime snapshot should use the shared OpenAI profile identity resolver',
  )
  assert.match(
    oauthSource,
    /getEmailFromJwt\(refreshed\.access\) \?\? storedIdentity\.emailAddress/,
    'refresh path should prefer the new access token email over stale stored email',
  )
  assert.match(
    oauthSource,
    /getPlanTypeFromJwt\(refreshed\.access\) \?\? storedIdentity\.planType/,
    'refresh path should prefer the new access token plan over stale stored plan metadata',
  )
  assert.match(
    oauthSource,
    /refreshedProfile\.profileId = profile\.profileId/,
    'refresh path should preserve the existing profile id when reconciling stale account identity',
  )
}

run()

console.log('openai status account identity self-test passed')
