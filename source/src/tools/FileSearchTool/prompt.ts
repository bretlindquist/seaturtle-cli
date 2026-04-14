export const FILE_SEARCH_TOOL_NAME = 'FileSearch'

export function getFileSearchPrompt(): string {
  return `
- Searches configured OpenAI vector stores using the hosted file_search tool
- Use this when the answer is likely to be in indexed project docs, notes, specs, or other uploaded reference files
- Prefer this over web search when the relevant source material is already in the configured vector stores

CRITICAL REQUIREMENT:
  - After answering with information from file search, include a "Sources:" section
  - In that section, cite the filenames returned by the tool

Usage notes:
  - This only works when OpenAI hosted file search is configured for the current SeaTurtle runtime
  - If vector stores are not configured, use other local or web tools instead
`
}
