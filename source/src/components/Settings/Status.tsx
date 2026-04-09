import figures from 'figures'
import * as React from 'react'
import { Suspense, use } from 'react'
import { getSessionId } from '../../bootstrap/state.js'
import type { LocalJSXCommandContext } from '../../commands.js'
import { useIsInsideModal } from '../../context/modalContext.js'
import { useMainLoopModel } from '../../hooks/useMainLoopModel.js'
import { Box, Text, useTheme } from '../../ink.js'
import { type AppState, useAppState } from '../../state/AppState.js'
import { getCwd } from '../../utils/cwd.js'
import { getCurrentSessionTitle } from '../../utils/sessionStorage.js'
import {
  buildAccountProperties,
  buildAPIProviderProperties,
  buildContextWindowProperties,
  buildIDEProperties,
  buildInstallationDiagnostics,
  buildInstallationHealthDiagnostics,
  buildInstructionProperties,
  buildMcpProperties,
  buildMemoryDiagnostics,
  buildSandboxProperties,
  buildSettingSourcesProperties,
  buildTelegramProperties,
  type Diagnostic,
  getStatusModelDisplayLabel,
  getStatusPermissionLabel,
  type Property,
} from '../../utils/status.js'
import type { ThemeName } from '../../utils/theme.js'
import { ConfigurableShortcutHint } from '../ConfigurableShortcutHint.js'

type Props = {
  context: LocalJSXCommandContext
  diagnosticsPromise: Promise<Diagnostic[]>
}

function buildPrimarySection({
  mainLoopModel,
  effortValue,
  permissionMode,
  messages,
}: {
  mainLoopModel: string
  effortValue: AppState['effortValue']
  permissionMode: AppState['toolPermissionContext']['mode']
  messages: AppState['messages']
}): Property[] {
  const sessionId = getSessionId()
  const customTitle = getCurrentSessionTitle(sessionId)
  const nameValue = customTitle ?? <Text dimColor>/rename to add a name</Text>

  return [
    { label: 'Version', value: MACRO.VERSION },
    {
      label: 'Model',
      value: getStatusModelDisplayLabel(mainLoopModel, effortValue),
    },
    { label: 'Directory', value: getCwd() },
    {
      label: 'Permissions',
      value: getStatusPermissionLabel(permissionMode),
    },
    ...buildContextWindowProperties({
      mainLoopModel,
      messages,
    }),
    { label: 'Session', value: sessionId },
    { label: 'Session name', value: nameValue },
    ...buildAccountProperties(),
    ...buildAPIProviderProperties(),
  ]
}

function buildSecondarySection({
  mcp,
  theme,
  context,
}: {
  mcp: AppState['mcp']
  theme: ThemeName
  context: LocalJSXCommandContext
}): Property[] {
  return [
    ...buildIDEProperties(
      mcp.clients,
      context.options.ideInstallationStatus,
      theme,
    ),
    ...buildMcpProperties(mcp.clients, theme),
    ...buildTelegramProperties(theme),
    ...buildSandboxProperties(),
    ...buildSettingSourcesProperties(),
  ]
}

export async function buildDiagnostics(): Promise<Diagnostic[]> {
  return [
    ...(await buildInstallationDiagnostics()),
    ...(await buildInstallationHealthDiagnostics()),
    ...(await buildMemoryDiagnostics()),
  ]
}

function PropertyValue({
  value,
}: {
  value: Property['value']
}): React.ReactNode {
  if (Array.isArray(value)) {
    return (
      <Box flexWrap="wrap" columnGap={1} flexShrink={99}>
        {value.map((item, i) => (
          <Text key={i}>
            {item}
            {i < value.length - 1 ? ',' : ''}
          </Text>
        ))}
      </Box>
    )
  }

  if (typeof value === 'string') {
    return <Text>{value}</Text>
  }

  return value
}

function PropertySection({ properties }: { properties: Property[] }): React.ReactNode {
  if (properties.length === 0) {
    return null
  }

  return (
    <Box flexDirection="column">
      {properties.map(({ label, value }, j) => (
        <Box key={j} flexDirection="row" gap={1} flexShrink={0}>
          {label !== undefined && <Text bold>{label}:</Text>}
          <PropertyValue value={value} />
        </Box>
      ))}
    </Box>
  )
}

function AsyncPropertySection({
  promise,
}: {
  promise: Promise<Property[]>
}): React.ReactNode {
  const properties = use(promise)
  return <PropertySection properties={properties} />
}

export function Status({
  context,
  diagnosticsPromise,
}: Props): React.ReactNode {
  const mainLoopModel = useMainLoopModel()
  const effortValue = useAppState(s => s.effortValue)
  const permissionMode = useAppState(s => s.toolPermissionContext.mode)
  const messages = useAppState(s => s.messages)
  const mcp = useAppState(s => s.mcp)
  const [theme] = useTheme()
  const grow = useIsInsideModal() ? 1 : undefined
  const [instructionPropertiesPromise] = React.useState(() =>
    buildInstructionProperties().catch(() => []),
  )

  const sections = React.useMemo(
    () => [
      buildPrimarySection({
        mainLoopModel,
        effortValue,
        permissionMode,
        messages,
      }),
      buildSecondarySection({
        mcp,
        theme,
        context,
      }),
    ],
    [context, effortValue, mainLoopModel, mcp, messages, permissionMode, theme],
  )

  return (
    <Box flexDirection="column" flexGrow={grow}>
      <Box flexDirection="column" gap={1} flexGrow={grow}>
        {sections.map((properties, i) => (
          <PropertySection key={i} properties={properties} />
        ))}

        <Suspense fallback={null}>
          <AsyncPropertySection promise={instructionPropertiesPromise} />
        </Suspense>

        <Suspense fallback={null}>
          <Diagnostics promise={diagnosticsPromise} />
        </Suspense>
      </Box>

      <Text dimColor>
        <ConfigurableShortcutHint
          action="confirm:no"
          context="Settings"
          fallback="Esc"
          description="cancel"
        />
      </Text>
    </Box>
  )
}

function Diagnostics({
  promise,
}: {
  promise: Promise<Diagnostic[]>
}): React.ReactNode {
  const diagnostics = use(promise)
  if (diagnostics.length === 0) return null

  return (
    <Box flexDirection="column" paddingBottom={1}>
      <Text bold>System Diagnostics</Text>
      {diagnostics.map((diagnostic, i) => (
        <Box key={i} flexDirection="row" gap={1} paddingX={1}>
          <Text color="error">{figures.warning}</Text>
          {typeof diagnostic === 'string' ? (
            <Text wrap="wrap">{diagnostic}</Text>
          ) : (
            diagnostic
          )}
        </Box>
      ))}
    </Box>
  )
}
