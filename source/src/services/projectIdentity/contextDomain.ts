import { findGitRoot } from '../../utils/git.js'
import {
  classifyCtConversationPosture,
  looksLikeExplicitWorkInvitation,
  type CtConversationPosture,
} from './conversationPosture.js'

export type CtContextDomain =
  | 'general'
  | 'project_work'
  | 'project_explore'
  | 'companion_chat'

export type CtContextDomainResult = {
  domain: CtContextDomain
  posture: CtConversationPosture
  addendum: string
}

function getDomainForTurn(input: {
  cwd: string
  currentInput: string
  recentUserMessages?: readonly string[]
}): {
  domain: CtContextDomain
  posture: CtConversationPosture
} {
  const posture = classifyCtConversationPosture({
    currentInput: input.currentInput,
    recentUserMessages: input.recentUserMessages,
  })
  const explicitWorkInvitation = looksLikeExplicitWorkInvitation(
    input.currentInput,
  )

  if (findGitRoot(input.cwd) === null) {
    return {
      domain: 'general',
      posture,
    }
  }

  switch (posture) {
    case 'work':
      return {
        domain: 'project_work',
        posture,
      }
    case 'explore':
      return {
        domain: explicitWorkInvitation ? 'project_explore' : 'companion_chat',
        posture,
      }
    case 'open':
    case 'supportive':
      return {
        domain: 'companion_chat',
        posture,
      }
  }
}

function buildDomainAddendum(input: {
  domain: CtContextDomain
  posture: CtConversationPosture
}): string {
  switch (input.domain) {
    case 'general':
      return `Current context domain: general

This turn is not inside a git-backed project context.
Stay coherent, but there is no special project sanctity boundary to protect here.`
    case 'project_work':
      return `Current context domain: project_work

This is a git-backed project session and the current turn is explicit work.
Protect active project state, constraints, and implementation intent.
Do not let unrelated banter, gameplay, or side-channel residue steer the working context.`
    case 'project_explore':
      return `Current context domain: project_explore

This is a git-backed project session and the current turn is exploratory with an explicit project invitation.
Keep the discussion broad enough to think well, but do not let gameplay, casual chat, or side-question residue muddy project planning.
Research and ideation should stay discovery-shaped until the user clearly promotes them into execution.`
    case 'companion_chat':
      return `Current context domain: companion_chat

This turn is conversational inside a git-backed project.
Be present, thoughtful, or supportive as needed, but keep active project-working context separate unless the user explicitly promotes this back into the project thread.
Do not quietly convert this turn into new project assumptions or implementation state on its own.
Repo context is ambience here, not compulsory interpretation.`
  }
}

export function getCtContextDomainResult(input: {
  cwd: string
  currentInput: string
  recentUserMessages?: readonly string[]
}): CtContextDomainResult {
  const result = getDomainForTurn(input)

  return {
    ...result,
    addendum: buildDomainAddendum(result),
  }
}
