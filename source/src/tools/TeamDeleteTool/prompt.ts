import { getTeamsDirDisplayPath } from '../../utils/envUtils.js'
import { getTasksDirDisplayPath } from '../../utils/tasks.js'

export function getPrompt(): string {
  const teamDirPath = `${getTeamsDirDisplayPath()}/{team-name}/`
  const taskDirPath = `${getTasksDirDisplayPath('{team-name}')}/`

  return `
# TeamDelete

Remove team and task directories when the swarm work is complete.

This operation:
- Removes the team directory (\`${teamDirPath}\`)
- Removes the task directory (\`${taskDirPath}\`)
- Clears team context from the current session

**IMPORTANT**: TeamDelete will fail if the team still has active members. Gracefully terminate teammates first, then call TeamDelete after all teammates have shut down.

Use this when all teammates have finished their work and you want to clean up the team resources. The team name is automatically determined from the current session's team context.
`.trim()
}
