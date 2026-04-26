import type { GeminiFunctionDeclaration } from './geminiTypes.js'

type JsonSchemaRecord = Record<string, unknown>

const UNSUPPORTED_GEMINI_SCHEMA_KEYS = new Set([
  '$schema',
  '$defs',
  'definitions',
  'dependentRequired',
  'dependentSchemas',
  'exclusiveMaximum',
  'exclusiveMinimum',
  'allOf',
  'patternProperties',
  'propertyNames',
  'unevaluatedProperties',
  'additionalProperties',
  'strict',
])

const VALID_GEMINI_FUNCTION_NAME = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/

function isRecord(value: unknown): value is JsonSchemaRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeSchemaType(value: unknown): JsonSchemaRecord {
  if (Array.isArray(value)) {
    const nonNullTypes = value.filter(type => type !== 'null')
    return {
      ...(nonNullTypes.length > 0 ? { type: nonNullTypes[0] } : {}),
      ...(value.includes('null') ? { nullable: true } : {}),
    }
  }

  return typeof value === 'string' ? { type: value } : {}
}

function normalizeGeminiNestedSchema(schema: unknown): unknown {
  if (!isRecord(schema)) {
    return schema
  }

  const normalized: JsonSchemaRecord = {}
  for (const [key, value] of Object.entries(schema)) {
    if (UNSUPPORTED_GEMINI_SCHEMA_KEYS.has(key)) {
      continue
    }

    if (key === 'type') {
      Object.assign(normalized, normalizeSchemaType(value))
      continue
    }

    if (key === 'const') {
      normalized.enum = [value]
      continue
    }

    if (key === 'properties' && isRecord(value)) {
      normalized.properties = Object.fromEntries(
        Object.entries(value).map(([propertyName, propertySchema]) => [
          propertyName,
          normalizeGeminiNestedSchema(propertySchema),
        ]),
      )
      continue
    }

    if (key === 'items') {
      normalized.items = normalizeGeminiNestedSchema(value)
      continue
    }

    if ((key === 'anyOf' || key === 'oneOf') && Array.isArray(value)) {
      const variants = value.map(normalizeGeminiNestedSchema)
      const enumValues = variants.flatMap(variant =>
        isRecord(variant) && Array.isArray(variant.enum) ? variant.enum : [],
      )
      const isAllEnums = variants.every(
        variant => isRecord(variant) && Array.isArray(variant.enum)
      )
      if (enumValues.length > 0 && isAllEnums) {
        normalized.enum = Array.from(new Set(enumValues))
      } else {
        normalized.anyOf = variants
      }
      continue
    }

    if (key === 'required' && Array.isArray(value)) {
      const required = value.filter(
        (propertyName): propertyName is string =>
          typeof propertyName === 'string',
      )
      if (required.length > 0) {
        normalized.required = required
      }
      continue
    }

    normalized[key] = value
  }

  if (normalized.type === 'object' && !isRecord(normalized.properties)) {
    normalized.properties = {}
  }

  return normalized
}

export function normalizeGeminiToolParameterSchema(
  schema: unknown,
): Record<string, unknown> {
  const normalized = normalizeGeminiNestedSchema(schema)
  if (!isRecord(normalized)) {
    return { type: 'object', properties: {} }
  }

  if (
    normalized.type === 'object' ||
    isRecord(normalized.properties) ||
    Array.isArray(normalized.required)
  ) {
    return {
      ...normalized,
      type: 'object',
      properties: isRecord(normalized.properties)
        ? normalized.properties
        : {},
    }
  }

  return {
    type: 'object',
    properties: {},
  }
}

export function validateGeminiFunctionName(name: string): string | null {
  return VALID_GEMINI_FUNCTION_NAME.test(name)
    ? null
    : `Gemini function name "${name}" is invalid. Function names must start with a letter or underscore and contain only letters, numbers, and underscores.`
}

export function buildGeminiFunctionDeclaration(params: {
  name: string
  description?: string
  parameters: unknown
}): GeminiFunctionDeclaration {
  const nameError = validateGeminiFunctionName(params.name)
  if (nameError) {
    throw new Error(nameError)
  }

  return {
    name: params.name,
    description: params.description,
    parameters: normalizeGeminiToolParameterSchema(params.parameters),
  }
}
