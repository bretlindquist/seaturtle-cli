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
import {
  getStatusPermissionHelpText,
  getStatusPropertyHelpText,
} from './statusHelpText.js'

type Props = {
  context: LocalJSXCommandContext
  diagnosticsPromise: Promise<Diagnostic[]>
}

type StatusSectionData = {
  title: string
  properties: Property[]
}

const STATUS_LABEL_WIDTH = 20

function pickProperties(
  properties: Property[],
  labels: string[],
): Property[] {
  const wanted = new Set(labels)
  return properties.filter(
    property => property.label !== undefined && wanted.has(property.label),
  )
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
}): StatusSectionData[] {
  const sessionId = getSessionId()
  const customTitle = getCurrentSessionTitle(sessionId)
  const nameValue = customTitle ?? <Text dimColor>/rename to add a name</Text>
  const runtimeProperties = buildAPIProviderProperties()
  const accountProperties = buildAccountProperties()

  return [
    {
      title: 'Session',
      properties: [
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
        { label: 'Session', value: sessionId },
        { label: 'Session name', value: nameValue },
        ...buildContextWindowProperties({
          mainLoopModel,
          messages,
        }),
      ],
    },
    {
      title: 'Runtime',
      properties: [
        ...pickProperties(runtimeProperties, [
          'Main model runtime',
          'Codex status',
          'Codex auth',
          'Account',
          'Collaboration mode',
          '5h limit',
          'Weekly limit',
        ]),
        ...pickProperties(accountProperties, ['Login method', 'Email']),
      ],
    },
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
}): StatusSectionData[] {
  return [
    {
      title: 'Integrations',
      properties: [
        ...buildIDEProperties(
          mcp.clients,
          context.options.ideInstallationStatus,
          theme,
        ),
        ...buildMcpProperties(mcp.clients, theme),
        ...buildTelegramProperties(theme),
      ],
    },
    {
      title: 'Environment',
      properties: [...buildSettingSourcesProperties(), ...buildSandboxProperties()],
    },
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
    return <Text wrap="wrap">{value}</Text>
  }

  return value
}

function PropertySection({
  title,
  properties,
}: StatusSectionData): React.ReactNode {
  if (properties.length === 0) {
    return null
  }

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="subtle"
        borderDimColor
        paddingX={1}
      >
        <Box>
          <Text bold color="permission">
            {title}
          </Text>
        </Box>
        {properties.map(({ label, value }, j) => (
          <Box key={j} flexDirection="row" gap={1} flexShrink={1}>
              {label !== undefined ? (
                <Box width={STATUS_LABEL_WIDTH} flexShrink={0}>
                  <Text bold dimColor>
                    {label}:
                  </Text>
                </Box>
              ) : (
                <Box width={STATUS_LABEL_WIDTH} flexShrink={0} />
              )}
              <Box flexDirection="row" flexWrap="wrap" columnGap={1} flexGrow={1} flexShrink={1}>
                <PropertyValue value={value} />
                {properties[j]?.description ? (
                  <Text dimColor color="inactive" wrap="wrap">
                    · {properties[j]?.description}
                  </Text>
                ) : null}
              </Box>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

function withDescription(
  property: Property,
  description: React.ReactNode | undefined,
): Property {
  if (!description) {
    return property
  }

  return {
    ...property,
    description,
  }
}

function describeProperties(
  properties: Property[],
  extras: Partial<Record<string, React.ReactNode>> = {},
): Property[] {
  return properties.map(property => {
    if (!property.label) {
      return property
    }

    const description =
      extras[property.label] ?? getStatusPropertyHelpText(property.label)
    return withDescription(property, description)
  })
}

function buildDescribedPrimarySection({
  mainLoopModel,
  effortValue,
  permissionMode,
  messages,
}: {
  mainLoopModel: string
  effortValue: AppState['effortValue']
  permissionMode: AppState['toolPermissionContext']['mode']
  messages: AppState['messages']
}): StatusSectionData[] {
  const sections = buildPrimarySection({
    mainLoopModel,
    effortValue,
    permissionMode,
    messages,
  })

  return sections.map(section => {
    if (section.title === 'Session') {
      return {
        ...section,
        properties: describeProperties(section.properties, {
          Permissions: getStatusPermissionHelpText(permissionMode),
        }),
      }
    }

    if (section.title === 'Runtime') {
      return {
        ...section,
        properties: describeProperties(section.properties),
      }
    }

    return section
  })
}

function buildDescribedSecondarySection({
  mcp,
  theme,
  context,
}: {
  mcp: AppState['mcp']
  theme: ThemeName
  context: LocalJSXCommandContext
}): StatusSectionData[] {
  return buildSecondarySection({
    mcp,
    theme,
    context,
  }).map(section => ({
    ...section,
    properties: describeProperties(section.properties),
  }))
}

function AsyncPropertySection({
  promise,
  title,
}: {
  promise: Promise<Property[]>
  title: string
}): React.ReactNode {
  const properties = use(promise)
  return (
    <PropertySection
      title={title}
      properties={describeProperties(properties)}
    />
  )
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
      ...buildDescribedPrimarySection({
        mainLoopModel,
        effortValue,
        permissionMode,
        messages,
      }),
      ...buildDescribedSecondarySection({
        mcp,
        theme,
        context,
      }),
    ],
    [context, effortValue, mainLoopModel, mcp, messages, permissionMode, theme],
  )

  return (
    <Box flexDirection="column" flexGrow={grow}>
      <Box flexDirection="column" flexGrow={grow}>
        {sections.map((properties, i) => (
          <PropertySection
            key={properties.title || i}
            title={properties.title}
            properties={properties.properties}
          />
        ))}

        <Suspense fallback={null}>
          <AsyncPropertySection
            title="Instructions"
            promise={instructionPropertiesPromise}
          />
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
    <Box flexDirection="column" gap={1} paddingBottom={1}>
      <Text bold color="permission">
        Diagnostics
      </Text>
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
