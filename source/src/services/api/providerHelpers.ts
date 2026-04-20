import type { BetaJSONOutputFormat } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import { getEmptyToolPermissionContext } from '../../Tool.js'
import type { AssistantMessage, Message } from '../../types/message.js'
import {
  createUserMessage,
  getAssistantMessageText,
} from '../../utils/messages.js'
import {
  getMainLoopModel,
  getSmallFastModel,
} from '../../utils/model/model.js'
import {
  asSystemPrompt,
  type SystemPrompt,
} from '../../utils/systemPromptType.js'
import { withVCR } from '../vcr.js'
import type { Options } from './claude.js'
import {
  getMainLoopProviderRuntime,
  queryModelWithoutStreamingViaProviderRuntime,
} from './providerRuntime.js'

export type SmallFastHelperOptions = Omit<
  Options,
  'model' | 'getToolPermissionContext'
>

export type TextQueryHelperOptions = Pick<
  Options,
  'querySource' | 'isNonInteractiveSession' | 'hasAppendSystemPrompt'
> & {
  model: string
  maxOutputTokensOverride?: number
}

function getProviderAwareSmallFastModel(): string {
  const runtime = getMainLoopProviderRuntime()
  return runtime.family === 'anthropic' ? getSmallFastModel() : getMainLoopModel()
}

export async function querySmallFastViaProviderRuntime({
  systemPrompt = asSystemPrompt([]),
  userPrompt,
  outputFormat,
  signal,
  options,
}: {
  systemPrompt: SystemPrompt
  userPrompt: string
  outputFormat?: BetaJSONOutputFormat
  signal: AbortSignal
  options: SmallFastHelperOptions
}): Promise<AssistantMessage> {
  const result = await withVCR(
    [
      createUserMessage({
        content: systemPrompt.map(text => ({ type: 'text', text })),
      }),
      createUserMessage({
        content: userPrompt,
      }),
    ],
    async () => {
      const messages = [
        createUserMessage({
          content: userPrompt,
        }),
      ]

      const result = await queryModelWithoutStreamingViaProviderRuntime({
        messages,
        systemPrompt,
        thinkingConfig: { type: 'disabled' },
        tools: [],
        signal,
        options: {
          ...options,
          model: getProviderAwareSmallFastModel(),
          enablePromptCaching: options.enablePromptCaching ?? false,
          outputFormat,
          async getToolPermissionContext() {
            return getEmptyToolPermissionContext()
          },
        },
      })
      return [result]
    },
  )

  return result[0]! as AssistantMessage
}

export async function queryTextViaProviderRuntime({
  systemPrompt = asSystemPrompt([]),
  promptMessages,
  signal,
  options,
}: {
  systemPrompt?: SystemPrompt
  promptMessages: Message[]
  signal: AbortSignal
  options: TextQueryHelperOptions
}): Promise<{ response: AssistantMessage; text: string | null }> {
  const result = await withVCR(promptMessages, async () => {
    const response = await queryModelWithoutStreamingViaProviderRuntime({
      messages: promptMessages,
      systemPrompt,
      thinkingConfig: { type: 'disabled' },
      tools: [],
      signal,
      options: {
        getToolPermissionContext: async () => getEmptyToolPermissionContext(),
        model: options.model,
        agents: [],
        isNonInteractiveSession: options.isNonInteractiveSession,
        hasAppendSystemPrompt: options.hasAppendSystemPrompt,
        querySource: options.querySource,
        maxOutputTokensOverride: options.maxOutputTokensOverride,
        mcpTools: [],
      },
    })
    return [response]
  })

  const response = result[0]! as AssistantMessage
  return {
    response,
    text: getAssistantMessageText(response),
  }
}
