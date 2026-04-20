export const HOSTED_SHELL_TOOL_NAME = 'HostedShell'

export function getHostedShellPrompt(): string {
  return `
- Runs a task inside the active provider's hosted execution sandbox
- Use this when the user wants disposable remote execution that does not need to run on the local machine
- Prefer local Bash when the task must inspect or modify the current repository directly

Usage notes:
  - This only works when the active SeaTurtle runtime reports routed hosted execution support
  - The hosted environment is separate from the user's local working directory
  - OpenAI/Codex supports allowed domain restrictions; Gemini code execution currently ignores allowed_domains
`
}
