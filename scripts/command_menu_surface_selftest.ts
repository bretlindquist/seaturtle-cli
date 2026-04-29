#!/usr/bin/env bun

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const repoRoot = join(import.meta.dir, '..')

const commandSuggestionsSource = readFileSync(
  join(repoRoot, 'source/src/utils/suggestions/commandSuggestions.ts'),
  'utf8',
)
const autoworkIndexSource = readFileSync(
  join(repoRoot, 'source/src/commands/autowork/index.ts'),
  'utf8',
)
const permissionsIndexSource = readFileSync(
  join(repoRoot, 'source/src/commands/permissions/index.ts'),
  'utf8',
)
const permissionsCommandSource = readFileSync(
  join(repoRoot, 'source/src/commands/permissions/permissions.tsx'),
  'utf8',
)

assert.match(
  commandSuggestionsSource,
  /if \(cmd\.argumentHint\) \{\s*descriptionParts\.push\(`Usage: \/\$\{commandName\} \$\{cmd\.argumentHint\}`\)/,
  'command suggestions should advertise argument-hint usage in their description tooltip',
)

assert.match(
  autoworkIndexSource,
  /argumentHint:\s*'\[run\|step\|status\|doctor\|safe\|dangerous\|verify\|use <plan>\|run 8h\]'/,
  '/autowork should advertise its operator actions in slash-command hints',
)

assert.match(
  permissionsIndexSource,
  /argumentHint:\s*'\[recent\|allow\|ask\|deny\|workspace\]'/,
  '/permissions should advertise its tab/menu options in slash-command hints',
)

assert.match(
  permissionsCommandSource,
  /function parsePermissionsTab\(args: string\): PermissionsTab \| null/,
  '/permissions should support explicit tab/menu arguments',
)

assert.match(
  permissionsCommandSource,
  /label: 'Recent denials'[\s\S]*label: 'Allow rules'[\s\S]*label: 'Ask rules'[\s\S]*label: 'Deny rules'[\s\S]*label: 'Workspace directories'/,
  '/permissions should expose a front-door menu with documented operator choices',
)

console.log('command menu surface self-test passed')
