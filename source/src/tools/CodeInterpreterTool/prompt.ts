export const CODE_INTERPRETER_TOOL_NAME = 'CodeInterpreter'

export function getCodeInterpreterPrompt(): string {
  return `
- Runs Python inside OpenAI's hosted code interpreter sandbox
- Use this when the task is naturally a Python/data-analysis job and does not need the local repository or shell
- Prefer local Bash when the task must inspect or modify the current machine or checkout directly

Usage notes:
  - This only works when the active SeaTurtle runtime reports routed code interpreter support
  - The execution environment is OpenAI-hosted, not the user's local machine
  - Generated files come back as hosted container file citations, not local filesystem writes
`
}
