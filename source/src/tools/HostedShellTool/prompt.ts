export const HOSTED_SHELL_TOOL_NAME = 'HostedShell'

export function getHostedShellPrompt(): string {
  return `
- Runs a task inside OpenAI's hosted shell tool in an isolated container environment
- Use this when the user wants disposable shell work that does not need to run on the local machine
- Prefer local Bash when the task must inspect or modify the current repository directly

Usage notes:
  - This only works when the active SeaTurtle runtime is OpenAI/Codex and the current model supports hosted shell
  - The hosted environment is separate from the user's local working directory
  - You can optionally restrict outbound network access with allowed domains
`
}
