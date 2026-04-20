import { readFileSync } from 'node:fs'

function assertMatch(source: string, pattern: RegExp, message: string): void {
  if (!pattern.test(source)) {
    throw new Error(message)
  }
}

const geminiComputerUseSource = readFileSync(
  'source/src/services/api/geminiComputerUse.ts',
  'utf8',
)
const providerRuntimeSource = readFileSync(
  'source/src/services/api/providerRuntime.ts',
  'utf8',
)
const computerUseToolSource = readFileSync(
  'source/src/tools/ComputerUseTool/ComputerUseTool.ts',
  'utf8',
)
const capabilitySource = readFileSync(
  'source/src/services/api/geminiCapabilityConfig.ts',
  'utf8',
)

assertMatch(
  capabilitySource,
  /DEFAULT_GEMINI_COMPUTER_USE_MODEL/,
  'Gemini capability config should define the default computer-use model.',
)
assertMatch(
  capabilitySource,
  /SEATURTLE_GEMINI_COMPUTER_USE_MODEL/,
  'Gemini computer use should support the SeaTurtle computer-use model override.',
)
assertMatch(
  geminiComputerUseSource,
  /excludedPredefinedFunctions:\s*EXCLUDED_PREDEFINED_FUNCTIONS/,
  'Gemini computer use should exclude unsupported predefined browser actions.',
)
assertMatch(
  geminiComputerUseSource,
  /safety_acknowledgement:\s*true/,
  'Gemini computer use should acknowledge confirmation-gated actions in function responses.',
)
assertMatch(
  geminiComputerUseSource,
  /dispatchComputerUseMcpToolRaw\(\s*'open_application'/,
  'Gemini computer use should route custom app opening through the local desktop executor.',
)
assertMatch(
  providerRuntimeSource,
  /const supportsComputerUse =\s*\n\s*!!auth && supportsLocalComputerUse && computerUseModelReady/,
  'Gemini provider runtime should only claim computer use when auth, local executor, and the routed model are ready.',
)
assertMatch(
  computerUseToolSource,
  /runtime\.family === 'gemini'/,
  'ComputerUseTool should branch to the Gemini computer-use runner.',
)

console.log('gemini-computer-use self-test passed')
