import {
  classifyCtConversationPosture,
  looksLikeExplicitWorkInvitation,
} from '../source/src/services/projectIdentity/conversationPosture.ts'
import { execSync } from 'node:child_process'

const cwd = process.cwd()

function isGitBackedProject(currentCwd) {
  try {
    execSync('git rev-parse --show-toplevel', {
      cwd: currentCwd,
      stdio: 'ignore',
    })
    return true
  } catch {
    return false
  }
}

function getDomainForProbe({
  cwd,
  input,
  recentUserMessages,
}) {
  const posture = classifyCtConversationPosture({
    currentInput: input,
    recentUserMessages,
  })
  const explicitWorkInvitation = looksLikeExplicitWorkInvitation(input)

  if (!isGitBackedProject(cwd)) {
    return {
      posture,
      explicitWorkInvitation,
      domain: 'general',
    }
  }

  switch (posture) {
    case 'work':
      return {
        posture,
        explicitWorkInvitation,
        domain: 'project_work',
      }
    case 'explore':
      return {
        posture,
        explicitWorkInvitation,
        domain: explicitWorkInvitation ? 'project_explore' : 'companion_chat',
      }
    case 'open':
    case 'supportive':
      return {
        posture,
        explicitWorkInvitation,
        domain: 'companion_chat',
      }
  }
}

const SCENARIOS = [
  {
    label: 'light-banter',
    input: "good question. where shouldn't we begin.",
    recentUserMessages: [],
  },
  {
    label: 'open-ended-exploration',
    input: "i wonder what this project should become",
    recentUserMessages: [],
  },
  {
    label: 'repo-exploration-without-work-invite',
    input: "let's explore this auth shape a bit before we narrow it down",
    recentUserMessages: [],
  },
  {
    label: 'explicit-project-exploration',
    input: 'how should we structure the auth callback flow?',
    recentUserMessages: [],
  },
  {
    label: 'explicit-execution',
    input: 'fix the auth callback flow in the repo',
    recentUserMessages: [],
  },
  {
    label: 'supportive-turn',
    input: 'i am exhausted and a little overwhelmed today',
    recentUserMessages: [],
  },
]

console.log('=== Intent Probe ===')
for (const scenario of SCENARIOS) {
  const result = getDomainForProbe({
    cwd,
    input: scenario.input,
    recentUserMessages: scenario.recentUserMessages,
  })

  console.log(
    JSON.stringify(
      {
        label: scenario.label,
        input: scenario.input,
        posture: result.posture,
        explicitWorkInvitation: result.explicitWorkInvitation,
        domain: result.domain,
      },
      null,
      2,
    ),
  )
}
