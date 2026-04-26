import { querySmallFastViaProviderRuntime } from './providerHelpers.js'
import { asSystemPrompt } from '../../utils/systemPromptType.js'
import { safeParseJSON } from '../../utils/json.js'
import { getMainLoopProviderRuntime } from './providerRuntime.js'
import { shouldApplyGeminiStrictMode } from './geminiStrictMode.js'
import type { GeminiStrictReviewContext } from './geminiStrictReviewContext.js'

export type GeminiStrictReviewDecision = {
  status: 'approve' | 'needs_changes' | 'blocked'
  summary: string
  findings: string[]
  requiredChanges: string[]
}

export const GEMINI_STRICT_MAX_REPAIR_ATTEMPTS = 1

const GEMINI_STRICT_REVIEW_SYSTEM_PROMPT = `You are the Gemini strict code reviewer for SeaTurtle.

Review only the supplied latest-turn code mutation summary.

Rules:
- Approve only when the change looks production-safe, scoped, and consistent with the user's request.
- If the supplied evidence is incomplete or too ambiguous to justify approval, return blocked.
- Prefer blocked over approve when uncertain.
- Call out concrete correctness, UI/UX, regression, or validation gaps.
- Do not ask the operator for more information. Decide using only the supplied context.

Return JSON only.`

function blockedDecision(summary: string): GeminiStrictReviewDecision {
  return {
    status: 'blocked',
    summary,
    findings: [summary],
    requiredChanges: [],
  }
}

export function formatGeminiStrictReviewFailureMessage(
  review: GeminiStrictReviewDecision,
): string {
  const heading =
    review.status === 'blocked'
      ? 'Gemini strict reviewer blocked completion.'
      : 'Gemini strict reviewer rejected completion.'
  const findings =
    review.findings.length > 0
      ? `Findings:\n- ${review.findings.join('\n- ')}`
      : 'Findings:\n- No additional detail provided.'
  const requiredChanges =
    review.requiredChanges.length > 0
      ? `Required changes:\n- ${review.requiredChanges.join('\n- ')}`
      : ''

  return [heading, `Summary: ${review.summary}`, findings, requiredChanges]
    .filter(Boolean)
    .join('\n\n')
}

export function buildGeminiStrictRepairPrompt({
  review,
  attemptNumber,
  maxAttempts,
  originalUserPrompt,
}: {
  review: GeminiStrictReviewDecision
  attemptNumber: number
  maxAttempts: number
  originalUserPrompt: string
}): string {
  const findings =
    review.findings.length > 0
      ? `Findings:\n- ${review.findings.join('\n- ')}`
      : 'Findings:\n- No additional detail provided.'
  const requiredChanges =
    review.requiredChanges.length > 0
      ? `Required changes:\n- ${review.requiredChanges.join('\n- ')}`
      : ''

  return `<system-reminder>
Gemini strict review did not approve your latest code changes.

Original user request:
${originalUserPrompt || '(not available)'}

Review status: ${review.status}
Summary: ${review.summary}

${findings}

${requiredChanges}

This is automatic repair attempt ${attemptNumber} of ${maxAttempts}. Make the smallest correct changes needed to satisfy the review. Do not broaden scope. Re-validate before concluding.
</system-reminder>`
}

export async function runGeminiStrictReview({
  reviewContext,
  signal,
}: {
  reviewContext: GeminiStrictReviewContext
  signal: AbortSignal
}): Promise<GeminiStrictReviewDecision> {
  const runtime = getMainLoopProviderRuntime()
  if (runtime.family !== 'gemini' || !shouldApplyGeminiStrictMode()) {
    return blockedDecision(
      'Gemini strict review was invoked while Gemini strict mode was inactive.',
    )
  }

  try {
    const response = await querySmallFastViaProviderRuntime({
      systemPrompt: asSystemPrompt([GEMINI_STRICT_REVIEW_SYSTEM_PROMPT]),
      userPrompt: JSON.stringify(reviewContext, null, 2),
      outputFormat: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['approve', 'needs_changes', 'blocked'],
            },
            summary: { type: 'string' },
            findings: {
              type: 'array',
              items: { type: 'string' },
            },
            requiredChanges: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          required: ['status', 'summary', 'findings', 'requiredChanges'],
          additionalProperties: false,
        },
      },
      signal,
      options: {
        querySource: 'sdk',
        agents: [],
        isNonInteractiveSession: true,
        hasAppendSystemPrompt: false,
        mcpTools: [],
      },
    })

    const parsed = safeParseJSON(
      response.message.content
        .filter(
          block => block.type === 'text' && typeof block.text === 'string',
        )
        .map(block => block.text)
        .join('\n'),
    ) as Partial<GeminiStrictReviewDecision> | null

    if (
      !parsed ||
      (parsed.status !== 'approve' &&
        parsed.status !== 'needs_changes' &&
        parsed.status !== 'blocked') ||
      typeof parsed.summary !== 'string' ||
      !Array.isArray(parsed.findings) ||
      !Array.isArray(parsed.requiredChanges)
    ) {
      return blockedDecision(
        'Gemini strict reviewer returned an invalid response shape.',
      )
    }

    return {
      status: parsed.status,
      summary: parsed.summary,
      findings: parsed.findings.filter(
        (value): value is string => typeof value === 'string',
      ),
      requiredChanges: parsed.requiredChanges.filter(
        (value): value is string => typeof value === 'string',
      ),
    }
  } catch (error) {
    return blockedDecision(
      `Gemini strict reviewer failed: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}
