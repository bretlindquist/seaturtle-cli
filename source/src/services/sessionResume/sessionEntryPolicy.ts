export type SessionEntryPolicyInput = {
  continueFlag?: boolean
  resumeValue?: boolean | string
  fromPrValue?: boolean | string
  teleportValue?: boolean | string | null
  remoteValue?: string[] | null
}

export function buildSessionEntryPolicyInput(input: SessionEntryPolicyInput): SessionEntryPolicyInput {
  return {
    continueFlag: input.continueFlag,
    resumeValue: input.resumeValue,
    fromPrValue: input.fromPrValue,
    teleportValue: input.teleportValue,
    remoteValue: input.remoteValue,
  }
}

export function hasExplicitSessionResumeRequest(
  input: SessionEntryPolicyInput,
): boolean {
  return (
    input.continueFlag === true ||
    Boolean(input.resumeValue) ||
    Boolean(input.fromPrValue) ||
    Boolean(input.teleportValue) ||
    input.remoteValue !== null
  )
}

export function shouldStartFreshSession(
  input: SessionEntryPolicyInput,
): boolean {
  return !hasExplicitSessionResumeRequest(input)
}
