type JsonSchemaRecord = Record<string, unknown>

const STRICT_SAFE_OPENAI_TOOL_NAMES = new Set(['TodoWrite', 'Write'])

function extractEnumValues(schema: unknown): unknown[] | undefined {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return undefined
  }

  const record = schema as JsonSchemaRecord
  if (Array.isArray(record.enum)) {
    return record.enum
  }

  if ('const' in record) {
    return [record.const]
  }

  const variants = Array.isArray(record.anyOf)
    ? record.anyOf
    : Array.isArray(record.oneOf)
      ? record.oneOf
      : null

  if (!variants) {
    return undefined
  }

  const values = variants.flatMap(variant => extractEnumValues(variant) ?? [])
  return values.length > 0 ? values : undefined
}

function mergePropertySchemas(existing: unknown, incoming: unknown): unknown {
  if (!existing) {
    return incoming
  }

  if (!incoming) {
    return existing
  }

  const existingEnum = extractEnumValues(existing)
  const incomingEnum = extractEnumValues(incoming)
  if (!existingEnum && !incomingEnum) {
    return existing
  }

  const values = Array.from(
    new Set([...(existingEnum ?? []), ...(incomingEnum ?? [])]),
  )
  const merged: JsonSchemaRecord = {}

  for (const source of [existing, incoming]) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      continue
    }

    const record = source as JsonSchemaRecord
    for (const key of ['title', 'description', 'default']) {
      if (!(key in merged) && key in record) {
        merged[key] = record[key]
      }
    }
  }

  const valueTypes = new Set(values.map(value => typeof value))
  if (valueTypes.size === 1) {
    merged.type = Array.from(valueTypes)[0]
  }

  merged.enum = values
  return merged
}

function normalizeNestedOpenAiToolSchema(schema: unknown): unknown {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return schema
  }

  const normalized: JsonSchemaRecord = { ...(schema as JsonSchemaRecord) }

  if (Array.isArray(normalized.anyOf)) {
    normalized.anyOf = normalized.anyOf.map(normalizeNestedOpenAiToolSchema)
  }
  if (Array.isArray(normalized.oneOf)) {
    normalized.oneOf = normalized.oneOf.map(normalizeNestedOpenAiToolSchema)
  }
  if (Array.isArray(normalized.allOf)) {
    normalized.allOf = normalized.allOf.map(normalizeNestedOpenAiToolSchema)
  }
  if (normalized.items !== undefined) {
    normalized.items = normalizeNestedOpenAiToolSchema(normalized.items)
  }

  if (
    normalized.properties &&
    typeof normalized.properties === 'object' &&
    !Array.isArray(normalized.properties)
  ) {
    normalized.properties = Object.fromEntries(
      Object.entries(normalized.properties as JsonSchemaRecord).map(
        ([key, value]) => [key, normalizeNestedOpenAiToolSchema(value)],
      ),
    )
  }

  if (normalized.type === 'object' && !('properties' in normalized)) {
    normalized.properties = {}
  }

  return normalized
}

export function normalizeOpenAiToolParameterSchema(
  schema: unknown,
): Record<string, unknown> {
  const normalizedSchema = normalizeNestedOpenAiToolSchema(schema)
  const schemaRecord =
    normalizedSchema &&
    typeof normalizedSchema === 'object' &&
    !Array.isArray(normalizedSchema)
      ? (normalizedSchema as JsonSchemaRecord)
      : undefined

  if (!schemaRecord) {
    return { type: 'object', properties: {} }
  }

  if (
    'type' in schemaRecord &&
    'properties' in schemaRecord &&
    !Array.isArray(schemaRecord.anyOf) &&
    !Array.isArray(schemaRecord.oneOf)
  ) {
    return schemaRecord as Record<string, unknown>
  }

  if (
    !('type' in schemaRecord) &&
    (typeof schemaRecord.properties === 'object' ||
      Array.isArray(schemaRecord.required)) &&
    !Array.isArray(schemaRecord.anyOf) &&
    !Array.isArray(schemaRecord.oneOf)
  ) {
    return {
      ...schemaRecord,
      type: 'object',
    }
  }

  if (
    'type' in schemaRecord &&
    !('properties' in schemaRecord) &&
    !Array.isArray(schemaRecord.anyOf) &&
    !Array.isArray(schemaRecord.oneOf)
  ) {
    return {
      ...schemaRecord,
      properties: {},
    }
  }

  const variantKey = Array.isArray(schemaRecord.anyOf)
    ? 'anyOf'
    : Array.isArray(schemaRecord.oneOf)
      ? 'oneOf'
      : null

  if (!variantKey) {
    return schemaRecord as Record<string, unknown>
  }

  const variants = schemaRecord[variantKey] as unknown[]
  const mergedProperties: JsonSchemaRecord = {}
  const requiredCounts = new Map<string, number>()
  let objectVariants = 0

  for (const variant of variants) {
    if (!variant || typeof variant !== 'object' || Array.isArray(variant)) {
      continue
    }

    const props = (variant as { properties?: unknown }).properties
    if (!props || typeof props !== 'object' || Array.isArray(props)) {
      continue
    }

    objectVariants += 1
    for (const [key, value] of Object.entries(props as JsonSchemaRecord)) {
      if (!(key in mergedProperties)) {
        mergedProperties[key] = value
        continue
      }

      mergedProperties[key] = mergePropertySchemas(
        mergedProperties[key],
        value,
      )
    }

    const required = Array.isArray((variant as { required?: unknown }).required)
      ? ((variant as { required: unknown[] }).required as unknown[])
      : []
    for (const key of required) {
      if (typeof key === 'string') {
        requiredCounts.set(key, (requiredCounts.get(key) ?? 0) + 1)
      }
    }
  }

  const baseRequired = Array.isArray(schemaRecord.required)
    ? schemaRecord.required.filter(
        (key): key is string => typeof key === 'string',
      )
    : undefined
  const mergedRequired =
    baseRequired && baseRequired.length > 0
      ? baseRequired
      : objectVariants > 0
        ? Array.from(requiredCounts.entries())
            .filter(([, count]) => count === objectVariants)
            .map(([key]) => key)
        : undefined

  return {
    type: 'object',
    ...(typeof schemaRecord.title === 'string'
      ? { title: schemaRecord.title }
      : {}),
    ...(typeof schemaRecord.description === 'string'
      ? { description: schemaRecord.description }
      : {}),
    properties:
      Object.keys(mergedProperties).length > 0
        ? mergedProperties
        : typeof schemaRecord.properties === 'object' &&
            schemaRecord.properties &&
            !Array.isArray(schemaRecord.properties)
          ? schemaRecord.properties
          : {},
    ...(mergedRequired && mergedRequired.length > 0
      ? { required: mergedRequired }
      : {}),
    additionalProperties:
      'additionalProperties' in schemaRecord
        ? schemaRecord.additionalProperties
        : true,
  }
}

function hasStrictCompatibleTopLevelSchema(schema: Record<string, unknown>): boolean {
  if (schema.type !== 'object') {
    return false
  }

  const properties =
    schema.properties &&
    typeof schema.properties === 'object' &&
    !Array.isArray(schema.properties)
      ? Object.keys(schema.properties as JsonSchemaRecord)
      : []
  const required = Array.isArray(schema.required)
    ? schema.required.filter((key): key is string => typeof key === 'string')
    : []

  if (properties.length === 0) {
    return true
  }

  return (
    required.length === properties.length &&
    properties.every(property => required.includes(property))
  )
}

export function shouldUseStrictOpenAiToolSchema(params: {
  toolName: string
  strict?: boolean
  parameters: Record<string, unknown>
}): boolean {
  return (
    params.strict === true &&
    STRICT_SAFE_OPENAI_TOOL_NAMES.has(params.toolName) &&
    hasStrictCompatibleTopLevelSchema(params.parameters)
  )
}
