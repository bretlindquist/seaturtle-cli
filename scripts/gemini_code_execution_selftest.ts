import { readFileSync } from 'node:fs'

function assertMatch(source: string, pattern: RegExp, message: string): void {
  if (!pattern.test(source)) {
    throw new Error(message)
  }
}

const codeExecutionSource = readFileSync(
  'source/src/services/api/geminiCodeExecution.ts',
  'utf8',
)
const hostedShellToolSource = readFileSync(
  'source/src/tools/HostedShellTool/HostedShellTool.ts',
  'utf8',
)
const capabilitySource = readFileSync(
  'source/src/services/api/geminiCapabilityConfig.ts',
  'utf8',
)

assertMatch(
  codeExecutionSource,
  /tools:\s*\[\{\s*codeExecution:\s*\{\s*\}\s*\}\]/,
  'Gemini code execution request should route codeExecution tool',
)
assertMatch(
  codeExecutionSource,
  /Gemini code execution returned no output/,
  'Gemini code execution should fail clearly on empty output',
)
assertMatch(
  codeExecutionSource,
  /part\.inlineData\?\.mimeType\.startsWith\('image\/'\)/,
  'Gemini code execution should capture inline image outputs',
)
assertMatch(
  hostedShellToolSource,
  /runtime\.family === 'gemini'/,
  'HostedShellTool should route Gemini code execution',
)
assertMatch(
  hostedShellToolSource,
  /routedGeminiModelCapabilities\.includes\('code execution'\)/,
  'HostedShellTool should enable only when Gemini code execution is routed',
)
assertMatch(
  capabilitySource,
  /supportsCodeExecution:\s*true/,
  'Gemini routed capabilities should include code execution',
)

console.log('gemini-code-execution self-test passed')
