// highlight.js's type defs carry `/// <reference lib="dom" />`. SSETransport,
// mcp/client, ssh, dumpPrompts use DOM types (TextDecodeOptions, RequestInfo)
// that only typecheck because this file's `typeof import('highlight.js')` pulls
// lib.dom in. tsconfig has lib: ["ESNext"] only — fixing the actual DOM-type
// deps is a separate sweep; this ref preserves the status quo.
/// <reference lib="dom" />

import chalk from 'chalk'
import { extname } from 'path'
import { logForDebugging } from './debug.js'

type Formatter = (codePart: string) => string
type Theme = Record<string, Formatter>

type HighlightOptions = {
  ignoreIllegals?: boolean
  language?: string
  languageSubset?: string[]
  theme?: Theme
}

type HighlightJs = typeof import('highlight.js')
type Parse5 = typeof import('parse5')
type Parse5TreeAdapter = typeof import('parse5-htmlparser2-tree-adapter')

type HtmlNode = {
  type: string
  data?: string
  attribs?: Record<string, string>
  childNodes?: HtmlNode[]
}

const plain: Formatter = codePart => codePart
const defaultTheme: Theme = {
  keyword: chalk.blue,
  built_in: chalk.cyan,
  type: chalk.cyan.dim,
  literal: chalk.blue,
  number: chalk.green,
  regexp: chalk.red,
  string: chalk.red,
  subst: plain,
  symbol: plain,
  class: chalk.blue,
  function: chalk.yellow,
  title: plain,
  params: plain,
  comment: chalk.green,
  doctag: chalk.green,
  meta: chalk.gray,
  'meta-keyword': plain,
  'meta-string': plain,
  section: plain,
  tag: chalk.gray,
  name: chalk.blue,
  'builtin-name': plain,
  attr: chalk.cyan,
  attribute: plain,
  variable: plain,
  bullet: plain,
  code: plain,
  emphasis: chalk.italic,
  strong: chalk.bold,
  formula: plain,
  link: chalk.underline,
  quote: plain,
  'selector-tag': plain,
  'selector-id': plain,
  'selector-class': plain,
  'selector-attr': plain,
  'selector-pseudo': plain,
  'template-tag': plain,
  'template-variable': plain,
  addition: chalk.green,
  deletion: chalk.red,
  default: plain,
}

export type CliHighlight = {
  highlight: (code: string, options?: HighlightOptions) => string
  supportsLanguage: (language: string) => boolean
}

type LoadedCliHighlight = CliHighlight & {
  getLanguageName: (language: string) => string | undefined
}

let cliHighlightPromise: Promise<LoadedCliHighlight | null> | undefined

function resolveModuleDefault<T extends object>(module: T): T {
  const maybeDefault = (module as { default?: T }).default
  return (maybeDefault ?? module) as T
}

function colorizeNode(node: HtmlNode, theme: Theme, context?: string): string {
  switch (node.type) {
    case 'text': {
      const text = node.data ?? ''
      if (context === undefined) {
        return (theme.default ?? defaultTheme.default ?? plain)(text)
      }
      return text
    }
    case 'tag': {
      const token = /hljs-([\w-]+)/.exec(node.attribs?.class ?? '')?.[1]
      const renderedChildren = (node.childNodes ?? [])
        .map(child => colorizeNode(child, theme, token))
        .join('')
      if (!token) {
        return renderedChildren
      }
      return (theme[token] ?? defaultTheme[token] ?? plain)(renderedChildren)
    }
    default:
      return (node.childNodes ?? [])
        .map(child => colorizeNode(child, theme, context))
        .join('')
  }
}

function buildCliHighlight(
  highlightJs: HighlightJs,
  parse5: Parse5,
  treeAdapterModule: Parse5TreeAdapter,
): LoadedCliHighlight {
  const treeAdapter = resolveModuleDefault(treeAdapterModule)

  return {
    highlight(code, options = {}) {
      const theme = options.theme ?? {}
      const html = options.language
        ? highlightJs.highlight(code, {
            language: options.language,
            ignoreIllegals: options.ignoreIllegals,
          }).value
        : highlightJs.highlightAuto(code, options.languageSubset).value

      const fragment = parse5.parseFragment(html, { treeAdapter }) as {
        childNodes?: HtmlNode[]
      }
      return (fragment.childNodes ?? [])
        .map(node => colorizeNode(node, theme))
        .join('')
    },
    supportsLanguage(language) {
      return !!highlightJs.getLanguage(language)
    },
    getLanguageName(language) {
      return highlightJs.getLanguage(language)?.name
    },
  }
}

async function loadCliHighlight(): Promise<LoadedCliHighlight | null> {
  try {
    const [highlightJsModule, parse5Module, treeAdapterModule] = await Promise.all([
      import('highlight.js'),
      import('parse5'),
      import('parse5-htmlparser2-tree-adapter'),
    ])

    return buildCliHighlight(
      resolveModuleDefault(highlightJsModule),
      resolveModuleDefault(parse5Module),
      treeAdapterModule,
    )
  } catch (error) {
    logForDebugging(
      `failed to initialize local CLI syntax highlighting: ${String(error)}`,
    )
    return null
  }
}

export function getCliHighlightPromise(): Promise<CliHighlight | null> {
  cliHighlightPromise ??= loadCliHighlight()
  return cliHighlightPromise
}

/**
 * eg. "foo/bar.ts" → "TypeScript". Awaits the shared highlight.js load,
 * then reads highlight.js's language registry. All callers are telemetry
 * (OTel counter attributes, permission-dialog unary events) — none block
 * on this, they fire-and-forget or the consumer already handles Promise<string>.
 */
export async function getLanguageName(file_path: string): Promise<string> {
  const loaded = await getCliHighlightPromise()
  const ext = extname(file_path).slice(1)
  if (!ext) return 'unknown'
  return loaded?.getLanguageName(ext) ?? 'unknown'
}
