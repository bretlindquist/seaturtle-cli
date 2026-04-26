import { extractGeminiStrictReviewContext } from '../source/src/services/api/geminiStrictReviewContext.js'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

const createTurn = [
  {
    type: 'user',
    isMeta: undefined,
    toolUseResult: undefined,
    message: { role: 'user', content: 'Build the settings panel.' },
  },
  {
    type: 'user',
    toolUseResult: {
      type: 'create',
      filePath: 'src/ui/Settings.tsx',
      content: 'export const Settings = () => <div>Hi</div>\n',
      structuredPatch: [],
    },
    message: {
      role: 'user',
      content: [{ type: 'tool_result', tool_use_id: 'tool_1', content: 'ok' }],
    },
  },
] as const

const createContext = extractGeminiStrictReviewContext(createTurn as never)
assert(createContext, 'expected create-turn review context to be extracted')
assert(
  createContext.stats.filesChanged === 1,
  'expected create-turn context to report one changed file',
)
assert(
  createContext.files[0]?.isNewFile === true,
  'expected create-turn context to mark created files as new',
)
assert(
  createContext.files[0]?.patchPreview.includes('+export const Settings'),
  'expected create-turn context to synthesize a patch preview for new files',
)

const readOnlyTurn = [
  {
    type: 'user',
    isMeta: undefined,
    toolUseResult: undefined,
    message: { role: 'user', content: 'What is in this repo?' },
  },
  {
    type: 'assistant',
    message: {
      role: 'assistant',
      content: [{ type: 'text', text: 'It is a CLI repo.' }],
    },
  },
] as const

assert(
  extractGeminiStrictReviewContext(readOnlyTurn as never) === null,
  'expected read-only turns to skip strict review context extraction',
)

console.log('gemini strict review context self-test passed')
