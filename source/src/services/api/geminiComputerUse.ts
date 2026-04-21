import { randomUUID } from 'crypto'
import { getGeminiApiKeyAuthTarget } from './gemini.js'
import { runGeminiGenerateContent } from './geminiClient.js'
import {
  getDefaultGeminiComputerUseModel,
  validateGeminiComputerUseModel,
} from './geminiCapabilityConfig.js'
import type {
  GeminiContent,
  GeminiFunctionDeclaration,
  GeminiFunctionResponse,
  GeminiGenerateContentRequest,
  GeminiGenerateContentResponse,
  GeminiPart,
} from './geminiTypes.js'
import { dispatchComputerUseMcpToolRaw } from '../../utils/computerUse/wrapper.js'
import { cleanupComputerUseAfterTurn } from '../../utils/computerUse/cleanup.js'
import type { ToolUseContext } from '../../Tool.js'

export type GeminiComputerUseResult = {
  outputText: string
  steps: number
  finalScreenshotBase64: string | null
  finalScreenshotMediaType: string | null
}

type GeminiComputerUseAction = {
  id: string
  name: string
  args: Record<string, unknown>
}

const SUPPORTED_GEMINI_COMPUTER_USE_ACTIONS = new Set([
  'click_at',
  'hover_at',
  'type_text_at',
  'key_combination',
  'scroll_document',
  'scroll_at',
  'drag_and_drop',
  'wait_5_seconds',
])

const EXCLUDED_PREDEFINED_FUNCTIONS = [
  'open_web_browser',
  'search',
  'navigate',
  'go_back',
  'go_forward',
] as const

function buildOpenApplicationFunctionDeclaration(): GeminiFunctionDeclaration {
  return {
    name: 'open_application',
    description:
      'Open one of the already approved local applications by display name or bundle id.',
    parameters: {
      type: 'object',
      properties: {
        app_name: {
          type: 'string',
          description:
            'The exact app display name or bundle id from the approved app list.',
        },
      },
      required: ['app_name'],
    },
  }
}

function extractComputerScreenshot(
  result: unknown,
): { base64: string; mediaType: string } | null {
  if (!result || typeof result !== 'object') {
    return null
  }

  const content = (result as { content?: unknown }).content
  if (!Array.isArray(content)) {
    return null
  }

  for (const item of content) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const record = item as Record<string, unknown>
    if (
      record.type === 'image' &&
      typeof record.data === 'string' &&
      record.data.length > 0
    ) {
      return {
        base64: record.data,
        mediaType:
          typeof record.mimeType === 'string' && record.mimeType.length > 0
            ? record.mimeType
            : 'image/jpeg',
      }
    }
  }

  return null
}

function extractText(parts: GeminiPart[] | undefined): string {
  return (parts ?? [])
    .flatMap(part =>
      typeof part.text === 'string' && part.text.trim().length > 0
        ? [part.text.trim()]
        : [],
    )
    .join('\n\n')
    .trim()
}

function denormalizeAxis(value: unknown, size: number): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    throw new Error('Gemini computer use action is missing normalized coordinates')
  }

  const clamped = Math.max(0, Math.min(999, Math.round(numeric)))
  return Math.round((clamped / 999) * Math.max(0, size - 1))
}

function denormalizeCoordinate(
  args: Record<string, unknown>,
  context: ToolUseContext,
): [number, number] {
  const dims = context.getAppState().computerUseMcpState?.lastScreenshotDims
  const width = dims?.width
  const height = dims?.height
  if (
    typeof width !== 'number' ||
    typeof height !== 'number' ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error(
      'Gemini computer use requires a captured screenshot before translating model coordinates.',
    )
  }

  return [
    denormalizeAxis(args.x, width),
    denormalizeAxis(args.y, height),
  ]
}

function collectRequestedApps(context: ToolUseContext): Array<{
  bundleId: string
  displayName: string
}> {
  return (context.getAppState().computerUseMcpState?.allowedApps ?? [])
    .flatMap(app => {
      if (
        typeof app?.bundleId === 'string' &&
        typeof app?.displayName === 'string'
      ) {
        return [{ bundleId: app.bundleId, displayName: app.displayName }]
      }
      return []
    })
}

async function captureScreenshot(context: ToolUseContext): Promise<{
  base64: string
  mediaType: string
}> {
  const screenshotResult = await dispatchComputerUseMcpToolRaw(
    'screenshot',
    {},
    context,
  )
  if (screenshotResult.isError) {
    throw new Error('Gemini computer use failed to capture a screenshot.')
  }

  const screenshot = extractComputerScreenshot(screenshotResult)
  if (!screenshot) {
    throw new Error(
      'Gemini computer use screenshot capture returned no image data.',
    )
  }

  return screenshot
}

async function requestAccess(params: {
  task: string
  apps: string[]
  clipboardRead?: boolean
  clipboardWrite?: boolean
  systemKeyCombos?: boolean
  context: ToolUseContext
}): Promise<void> {
  const accessResult = await dispatchComputerUseMcpToolRaw(
    'request_access',
    {
      apps: params.apps,
      reason: params.task.slice(0, 240),
      ...(params.clipboardRead ? { clipboardRead: true } : {}),
      ...(params.clipboardWrite ? { clipboardWrite: true } : {}),
      ...(params.systemKeyCombos ? { systemKeyCombos: true } : {}),
    },
    params.context,
  )

  if (!accessResult.isError) {
    return
  }

  const text = Array.isArray(accessResult.content)
    ? accessResult.content
        .flatMap(item =>
          item && typeof item === 'object' && item.type === 'text' && typeof item.text === 'string'
            ? [item.text]
            : [],
        )
        .join('\n')
        .trim()
    : ''
  throw new Error(
    text || 'Gemini computer use could not acquire app access for this session.',
  )
}

function buildInitialContents(params: {
  task: string
  screenshot: { mediaType: string; base64: string }
  requestedApps: Array<{ bundleId: string; displayName: string }>
}): GeminiContent[] {
  const approvedApps = params.requestedApps
    .map(app => `- ${app.displayName} (${app.bundleId})`)
    .join('\n')

  return [
    {
      role: 'user',
      parts: [
        {
          text:
            `Complete this desktop task: ${params.task}\n\n` +
            'You are operating the local desktop through SeaTurtle.\n' +
            'Only use supported computer-use actions or the open_application custom function.\n' +
            'Approved apps for this session:\n' +
            `${approvedApps || '- none'}`,
        },
        {
          inlineData: {
            mimeType: params.screenshot.mediaType,
            data: params.screenshot.base64,
          },
        },
      ],
    },
  ]
}

function buildGeminiComputerUseRequest(
  contents: GeminiContent[],
): GeminiGenerateContentRequest {
  return {
    contents,
    tools: [
      {
        computerUse: {
          environment: 'ENVIRONMENT_BROWSER',
          excludedPredefinedFunctions: EXCLUDED_PREDEFINED_FUNCTIONS,
        },
      },
      {
        functionDeclarations: [buildOpenApplicationFunctionDeclaration()],
      },
    ],
    systemInstruction: {
      parts: [
        {
          text:
            'Operate carefully on the user desktop. ' +
            'Use open_application instead of browser-specific navigation functions that are unavailable in this environment. ' +
            'When a safety decision requires confirmation, wait for SeaTurtle to provide the acknowledgement result before continuing. ' +
            'When the task is complete, stop using tools and answer with a concise summary.',
        },
      ],
    },
  }
}

function collectModelActions(
  response: GeminiGenerateContentResponse,
): GeminiComputerUseAction[] {
  return (response.candidates?.[0]?.content?.parts ?? []).flatMap(part => {
    if (!part.functionCall?.name) {
      return []
    }
    return [
      {
        id: part.functionCall.id ?? randomUUID(),
        name: part.functionCall.name,
        args: part.functionCall.args ?? {},
      },
    ]
  })
}

async function confirmSafetyDecision(params: {
  action: GeminiComputerUseAction
  context: ToolUseContext
}): Promise<boolean> {
  const safetyDecision =
    typeof params.action.args.safety_decision === 'object' &&
    params.action.args.safety_decision !== null
      ? (params.action.args.safety_decision as Record<string, unknown>)
      : null
  if (safetyDecision?.decision !== 'require_confirmation') {
    return true
  }

  if (!params.context.requestPrompt) {
    throw new Error(
      'Gemini computer use requires interactive confirmation for this action, but no prompt UI is available in this session.',
    )
  }

  const explanation =
    typeof safetyDecision.explanation === 'string' &&
    safetyDecision.explanation.trim().length > 0
      ? safetyDecision.explanation.trim()
      : 'Gemini requested confirmation before executing the next desktop action.'

  const request = params.context.requestPrompt(
    'Gemini computer use',
    params.action.name,
  )
  const response = await request({
    prompt: randomUUID(),
    message: explanation,
    options: [
      {
        key: 'approve',
        label: 'Approve',
        description: 'Execute the suggested desktop action.',
      },
      {
        key: 'deny',
        label: 'Deny',
        description: 'Do not execute the suggested desktop action.',
      },
    ],
  })

  return response.selected === 'approve'
}

async function runOpenApplicationAction(
  action: GeminiComputerUseAction,
  context: ToolUseContext,
): Promise<unknown> {
  const requestedAppName =
    typeof action.args.app_name === 'string' ? action.args.app_name.trim() : ''
  if (!requestedAppName) {
    throw new Error('Gemini open_application action is missing app_name.')
  }

  const requestedApps = collectRequestedApps(context)
  const selectedApp =
    requestedApps.find(
      app =>
        app.displayName.toLowerCase() === requestedAppName.toLowerCase() ||
        app.bundleId.toLowerCase() === requestedAppName.toLowerCase(),
    ) ?? null

  if (!selectedApp) {
    throw new Error(
      `Gemini requested app \`${requestedAppName}\`, but it is not in the approved app list for this session.`,
    )
  }

  return dispatchComputerUseMcpToolRaw(
    'open_application',
    { bundle_id: selectedApp.bundleId },
    context,
  )
}

async function runGeminiComputerAction(
  action: GeminiComputerUseAction,
  context: ToolUseContext,
): Promise<unknown> {
  if (action.name === 'open_application') {
    return runOpenApplicationAction(action, context)
  }

  if (!SUPPORTED_GEMINI_COMPUTER_USE_ACTIONS.has(action.name)) {
    throw new Error(`Unsupported Gemini computer action: ${action.name}`)
  }

  switch (action.name) {
    case 'click_at': {
      const coordinate = denormalizeCoordinate(action.args, context)
      return dispatchComputerUseMcpToolRaw('left_click', { coordinate }, context)
    }
    case 'hover_at': {
      const coordinate = denormalizeCoordinate(action.args, context)
      return dispatchComputerUseMcpToolRaw('mouse_move', { coordinate }, context)
    }
    case 'type_text_at': {
      const coordinate = denormalizeCoordinate(action.args, context)
      const text =
        typeof action.args.text === 'string' ? action.args.text : ''
      if (!text) {
        throw new Error('Gemini type_text_at action is missing text.')
      }
      const clearBeforeTyping = action.args.clear_before_typing !== false
      const pressEnter = action.args.press_enter !== false
      await dispatchComputerUseMcpToolRaw('left_click', { coordinate }, context)
      if (clearBeforeTyping) {
        await dispatchComputerUseMcpToolRaw(
          'key',
          { text: 'Meta+A' },
          context,
        ).catch(() =>
          dispatchComputerUseMcpToolRaw('key', { text: 'Control+A' }, context),
        )
      }
      await dispatchComputerUseMcpToolRaw('type', { text }, context)
      if (pressEnter) {
        return dispatchComputerUseMcpToolRaw('key', { text: 'Enter' }, context)
      }
      return null
    }
    case 'key_combination': {
      const text =
        typeof action.args.keys === 'string' ? action.args.keys.trim() : ''
      if (!text) {
        throw new Error('Gemini key_combination action is missing keys.')
      }
      return dispatchComputerUseMcpToolRaw('key', { text }, context)
    }
    case 'scroll_document': {
      const dims = context.getAppState().computerUseMcpState?.lastScreenshotDims
      const coordinate: [number, number] = [
        Math.round((dims?.width ?? 1000) / 2),
        Math.round((dims?.height ?? 1000) / 2),
      ]
      const direction =
        typeof action.args.direction === 'string' ? action.args.direction : 'down'
      return dispatchComputerUseMcpToolRaw(
        'scroll',
        {
          coordinate,
          scroll_direction: direction,
          scroll_amount: 8,
        },
        context,
      )
    }
    case 'scroll_at': {
      const coordinate = denormalizeCoordinate(action.args, context)
      const direction =
        typeof action.args.direction === 'string' ? action.args.direction : 'down'
      const magnitude = Number(action.args.magnitude)
      return dispatchComputerUseMcpToolRaw(
        'scroll',
        {
          coordinate,
          scroll_direction: direction,
          scroll_amount:
            Number.isFinite(magnitude) && magnitude > 0
              ? Math.max(1, Math.round(magnitude / 100))
              : 8,
        },
        context,
      )
    }
    case 'drag_and_drop': {
      const dims = context.getAppState().computerUseMcpState?.lastScreenshotDims
      const start = denormalizeCoordinate(action.args, context)
      const destination = [
        denormalizeAxis(action.args.destination_x, dims?.width ?? 1000),
        denormalizeAxis(action.args.destination_y, dims?.height ?? 1000),
      ] as [number, number]
      return dispatchComputerUseMcpToolRaw(
        'left_click_drag',
        {
          start_coordinate: start,
          coordinate: destination,
        },
        context,
      )
    }
    case 'wait_5_seconds':
      return dispatchComputerUseMcpToolRaw(
        'wait',
        { duration: 5 },
        context,
      )
  }
}

function buildFunctionResponsePart(params: {
  action: GeminiComputerUseAction
  screenshot: { mediaType: string; base64: string }
  acknowledgedSafetyDecision?: boolean
  denied?: boolean
  error?: string
}): GeminiPart {
  const response: GeminiFunctionResponse = {
    id: params.action.id,
    name: params.action.name,
    response: {
      ok: !params.error && !params.denied,
      ...(params.error ? { error: params.error } : {}),
      ...(params.denied ? { denied: true } : {}),
      ...(params.acknowledgedSafetyDecision
        ? { safety_acknowledgement: true }
        : {}),
    },
    parts: [
      {
        inlineData: {
          mimeType: params.screenshot.mediaType,
          data: params.screenshot.base64,
        },
      },
    ],
  }

  return {
    functionResponse: response,
  }
}

export async function runGeminiComputerUse(params: {
  task: string
  apps: string[]
  clipboardRead?: boolean
  clipboardWrite?: boolean
  systemKeyCombos?: boolean
  maxSteps?: number
  signal: AbortSignal
  toolUseContext: ToolUseContext
  model?: string
}): Promise<GeminiComputerUseResult> {
  const auth = getGeminiApiKeyAuthTarget()
  if (!auth) {
    throw new Error(
      'Gemini auth is not configured. Use /login to link Gemini in CT, or set GEMINI_API_KEY for an explicit env-driven setup, then retry with `SEATURTLE_MAIN_PROVIDER=gemini`.',
    )
  }

  const model = params.model ?? getDefaultGeminiComputerUseModel()
  const modelError = validateGeminiComputerUseModel(model)
  if (modelError) {
    throw new Error(modelError)
  }

  const requestedApps = params.apps
    .map(app => app.trim())
    .filter(app => app.length > 0)
  if (requestedApps.length === 0) {
    throw new Error(
      'Gemini computer use requires at least one target app so SeaTurtle can request access explicitly.',
    )
  }

  let steps = 0
  let outputText = ''
  let finalScreenshotBase64: string | null = null
  let finalScreenshotMediaType: string | null = null
  const maxSteps = Math.max(1, params.maxSteps ?? 25)

  try {
    await requestAccess({
      task: params.task,
      apps: requestedApps,
      clipboardRead: params.clipboardRead,
      clipboardWrite: params.clipboardWrite,
      systemKeyCombos: params.systemKeyCombos,
      context: params.toolUseContext,
    })

    const initialScreenshot = await captureScreenshot(params.toolUseContext)
    finalScreenshotBase64 = initialScreenshot.base64
    finalScreenshotMediaType = initialScreenshot.mediaType

    const contents = buildInitialContents({
      task: params.task,
      screenshot: initialScreenshot,
      requestedApps: collectRequestedApps(params.toolUseContext),
    })

    while (steps < maxSteps) {
      const response = await runGeminiGenerateContent({
        auth,
        model,
        request: buildGeminiComputerUseRequest(contents),
        signal: params.signal,
      })
      const candidateContent = response.candidates?.[0]?.content
      if (candidateContent) {
        contents.push(candidateContent)
      }

      const actions = collectModelActions(response)
      const responseText = extractText(candidateContent?.parts)
      if (responseText) {
        outputText = responseText
      }

      if (actions.length === 0) {
        return {
          outputText: outputText || 'Gemini computer use completed.',
          steps,
          finalScreenshotBase64,
          finalScreenshotMediaType,
        }
      }

      const functionResponseParts: GeminiPart[] = []
      for (const action of actions) {
        const approved = await confirmSafetyDecision({
          action,
          context: params.toolUseContext,
        })

        if (!approved) {
          const deniedScreenshot = await captureScreenshot(params.toolUseContext)
          finalScreenshotBase64 = deniedScreenshot.base64
          finalScreenshotMediaType = deniedScreenshot.mediaType
          functionResponseParts.push(
            buildFunctionResponsePart({
              action,
              screenshot: deniedScreenshot,
              denied: true,
            }),
          )
          contents.push({
            role: 'user',
            parts: functionResponseParts,
          })
          outputText =
            outputText ||
            'Gemini computer use stopped because the user denied a confirmation request.'
          return {
            outputText,
            steps,
            finalScreenshotBase64,
            finalScreenshotMediaType,
          }
        }

        await runGeminiComputerAction(action, params.toolUseContext)
        const screenshot = await captureScreenshot(params.toolUseContext)
        finalScreenshotBase64 = screenshot.base64
        finalScreenshotMediaType = screenshot.mediaType
        functionResponseParts.push(
          buildFunctionResponsePart({
            action,
            screenshot,
            acknowledgedSafetyDecision:
              typeof action.args.safety_decision === 'object' &&
              action.args.safety_decision !== null,
          }),
        )
      }

      contents.push({
        role: 'user',
        parts: functionResponseParts,
      })
      steps += 1
    }
  } finally {
    await cleanupComputerUseAfterTurn(params.toolUseContext).catch(() => {})
  }

  return {
    outputText:
      outputText ||
      'Gemini computer use stopped after reaching the maximum step limit.',
    steps,
    finalScreenshotBase64,
    finalScreenshotMediaType,
  }
}
