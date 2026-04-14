export const COMPUTER_USE_TOOL_NAME = 'ComputerUse'

export function getComputerUsePrompt(): string {
  return `
- Runs an OpenAI computer-use loop against the user's real local desktop
- Use this when the task genuinely requires UI interaction on the user's machine
- Prefer normal code/file/web tools when the task does not require clicking or typing into a GUI

Usage notes:
  - Always provide the concrete target apps up front so SeaTurtle can request access explicitly
  - Ask for clipboard or system shortcut grants only when the task needs them
  - This works only when the active runtime is OpenAI/Codex, the current model supports computer use, and local computer-use support is enabled
`
}
