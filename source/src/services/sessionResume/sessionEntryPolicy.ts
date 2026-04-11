export type SessionEntryPolicyInput = {
  continueFlag?: boolean
  resumeValue?: boolean | string
  fromPrValue?: boolean | string
  teleportValue?: boolean | string | null
  remoteValue?: string[] | null
}

export function buildSessionEntryPolicyInput(input: SessionEntryPolicyInput): SessionEntryPolicyInput {
  return {
    continueFlag: input.continueFlag === true,
    resumeValue: input.resumeValue,
    fromPrValue: input.fromPrValue,
    teleportValue: input.teleportValue ?? null,
    remoteValue: input.remoteValue ?? null,
  }
}

function hasOptionalFlagValue<T>(value: T | null | undefined): boolean {
  return value !== null && value !== undefined
}

export function hasExplicitSessionResumeRequest(
  input: SessionEntryPolicyInput,
): boolean {
  return (
    input.continueFlag === true ||
    hasOptionalFlagValue(input.resumeValue) ||
    hasOptionalFlagValue(input.fromPrValue) ||
    hasOptionalFlagValue(input.teleportValue) ||
    hasOptionalFlagValue(input.remoteValue)
  )
}

export function shouldStartFreshSession(
  input: SessionEntryPolicyInput,
): boolean {
  return !hasExplicitSessionResumeRequest(input)
}
