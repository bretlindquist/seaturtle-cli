import { randomUUID } from 'crypto'
import { inspectAutoworkHeadless } from '../services/autowork/inspectionSummary.js'
import { EMPTY_USAGE } from '../services/api/logging.js'
import { getSessionId } from '../bootstrap/state.js'
import { jsonStringify } from '../utils/slowOperations.js'

async function writeAndExit(
  stream: NodeJS.WriteStream,
  payload: string,
  code: number,
): Promise<never> {
  await new Promise<void>(resolve => {
    stream.write(payload, () => resolve())
  })
  // eslint-disable-next-line custom-rules/no-process-exit
  process.exit(code)
}

function buildSuccessResult(result: string) {
  return {
    type: 'result' as const,
    subtype: 'success' as const,
    is_error: false,
    duration_ms: 0,
    duration_api_ms: 0,
    num_turns: 0,
    result,
    stop_reason: null,
    session_id: getSessionId(),
    total_cost_usd: 0,
    usage: EMPTY_USAGE,
    modelUsage: {},
    permission_denials: [],
    uuid: randomUUID(),
  }
}

function buildErrorResult(message: string) {
  return {
    type: 'result' as const,
    subtype: 'error_during_execution' as const,
    duration_ms: 0,
    duration_api_ms: 0,
    is_error: true,
    num_turns: 0,
    stop_reason: null,
    session_id: getSessionId(),
    total_cost_usd: 0,
    usage: EMPTY_USAGE,
    modelUsage: {},
    permission_denials: [],
    uuid: randomUUID(),
    errors: [message],
  }
}

export async function runHeadlessAutoworkInspection(
  action: 'status' | 'doctor',
  outputFormat: string | undefined,
): Promise<never> {
  const inspection = await inspectAutoworkHeadless('autowork', action, {
    policyMode: 'early-startup',
  })
  if (!inspection.ok) {
    if (outputFormat === 'stream-json') {
      return writeAndExit(
        process.stdout,
        jsonStringify(buildErrorResult(inspection.message)) + '\n',
        1,
      )
    }

    return writeAndExit(process.stderr, inspection.message + '\n', 1)
  }

  if (outputFormat === 'stream-json' || outputFormat === 'json') {
    return writeAndExit(
      process.stdout,
      jsonStringify(buildSuccessResult(inspection.message)) + '\n',
      0,
    )
  }

  return writeAndExit(
    process.stdout,
    inspection.message.endsWith('\n')
      ? inspection.message
      : `${inspection.message}\n`,
    0,
  )
}
