import {
  getStatusPermissionHelpText,
  getStatusPropertyHelpText,
} from '../source/src/components/Settings/statusHelpText.js'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message)
  }
}

function run(): void {
  assert(
    getStatusPermissionHelpText('bypassPermissions').includes('Full access'),
    'expected status permission help to explain full access mode',
  )
  assert(
    getStatusPermissionHelpText('dontAsk').includes('denied'),
    'expected status permission help to explain dontAsk denial behavior',
  )
  assert(
    getStatusPropertyHelpText('Setting sources').includes('settings layers'),
    'expected status setting sources help to explain configuration ownership',
  )
  assert(
    getStatusPropertyHelpText('Telegram setup').includes('/telegram'),
    'expected Telegram setup help to point users to /telegram',
  )
  assert(
    getStatusPropertyHelpText('5h limit').includes('five-hour'),
    'expected 5h limit help to explain the OpenAI/Codex rolling window',
  )
}

run()
