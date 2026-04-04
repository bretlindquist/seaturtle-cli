import type {
  Base64ImageSource,
  ContentBlockParam,
} from '@anthropic-ai/sdk/resources/messages.mjs'
import { mkdir, readFile, stat, writeFile } from 'fs/promises'
import { basename, extname, join } from 'path'
import { getSessionId } from '../../bootstrap/state.js'
import { extractAtMentionedFiles } from '../../utils/attachments.js'
import { getClaudeConfigHomeDir } from '../../utils/envUtils.js'
import type { TelegramConfig } from './config.js'
import type {
  TelegramDocument,
  TelegramPhotoSize,
  TelegramUpdate,
} from './client.js'
import { downloadTelegramFile, getTelegramFile } from './client.js'

type TelegramInboundPayload =
  | {
      kind: 'text'
      chatId: string
      text: string
    }
  | {
      kind: 'prompt'
      chatId: string
      content: string | Array<ContentBlockParam>
    }

const IMAGE_MEDIA_TYPES = new Set<Base64ImageSource['media_type']>([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
])

function telegramDownloadsDir(): string {
  return join(getClaudeConfigHomeDir(), 'telegram', 'uploads', getSessionId())
}

function sanitizeFileName(name: string): string {
  return basename(name).replace(/[^a-zA-Z0-9._-]/g, '_') || 'telegram-file'
}

function inferImageMediaType(pathOrName: string): Base64ImageSource['media_type'] {
  switch (extname(pathOrName).toLowerCase()) {
    case '.png':
      return 'image/png'
    case '.gif':
      return 'image/gif'
    case '.webp':
      return 'image/webp'
    case '.jpg':
    case '.jpeg':
    default:
      return 'image/jpeg'
  }
}

function maybeInferImageMediaType(
  pathOrName: string,
): Base64ImageSource['media_type'] | null {
  const ext = extname(pathOrName).toLowerCase()
  if (!ext) {
    return null
  }

  switch (ext) {
    case '.png':
      return 'image/png'
    case '.gif':
      return 'image/gif'
    case '.webp':
      return 'image/webp'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    default:
      return null
  }
}

function isSupportedImageMediaType(
  mimeType: string | undefined,
): mimeType is Base64ImageSource['media_type'] {
  return mimeType !== undefined && IMAGE_MEDIA_TYPES.has(mimeType as Base64ImageSource['media_type'])
}

function pickLargestPhoto(sizes: TelegramPhotoSize[]): TelegramPhotoSize | null {
  if (sizes.length === 0) {
    return null
  }

  return [...sizes].sort(
    (a, b) =>
      (b.file_size ?? b.width * b.height) - (a.file_size ?? a.width * a.height),
  )[0]!
}

async function persistTelegramFile(
  config: TelegramConfig,
  fileId: string,
  options?: {
    suggestedName?: string
  },
): Promise<{ path: string; fileName: string }> {
  const { filePath } = await getTelegramFile(config, fileId)
  const fileData = await downloadTelegramFile(config, filePath)
  const fileName = sanitizeFileName(
    options?.suggestedName ?? basename(filePath) ?? `${fileId.slice(0, 8)}.bin`,
  )
  const outDir = telegramDownloadsDir()
  const outPath = join(outDir, fileName)

  await mkdir(outDir, { recursive: true })
  await writeFile(outPath, fileData)

  return {
    path: outPath,
    fileName,
  }
}

async function createImageBlocksFromPath(
  filePath: string,
  mediaType: Base64ImageSource['media_type'],
  caption?: string,
): Promise<Array<ContentBlockParam>> {
  const bytes = await readFile(filePath)
  const blocks: Array<ContentBlockParam> = [
    {
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType,
        data: bytes.toString('base64'),
      },
    },
  ]
  if (caption) {
    blocks.push({
      type: 'text',
      text: caption,
    })
  }
  return blocks
}

function formatDocumentPrompt(filePath: string, caption?: string): string {
  const prefix = `@"${filePath}"`
  return caption ? `${prefix} ${caption}` : prefix
}

async function resolveDocumentPrompt(
  config: TelegramConfig,
  document: TelegramDocument,
  caption?: string,
): Promise<string | Array<ContentBlockParam>> {
  const { path: filePath, fileName } = await persistTelegramFile(
    config,
    document.file_id,
    { suggestedName: document.file_name },
  )

  if (isSupportedImageMediaType(document.mime_type)) {
    return createImageBlocksFromPath(filePath, document.mime_type, caption)
  }

  const fallbackImageType = maybeInferImageMediaType(fileName)
  if (document.mime_type === undefined && fallbackImageType) {
    return createImageBlocksFromPath(filePath, fallbackImageType, caption)
  }

  return formatDocumentPrompt(filePath, caption)
}

async function resolvePhotoPrompt(
  config: TelegramConfig,
  photos: TelegramPhotoSize[],
  caption?: string,
): Promise<Array<ContentBlockParam> | null> {
  const best = pickLargestPhoto(photos)
  if (!best) {
    return null
  }

  const { path: filePath, fileName } = await persistTelegramFile(
    config,
    best.file_id,
    {
      suggestedName: `${best.file_unique_id}.jpg`,
    },
  )

  return createImageBlocksFromPath(
    filePath,
    inferImageMediaType(fileName),
    caption,
  )
}

export async function resolveTelegramInboundPayload(
  config: TelegramConfig,
  update: TelegramUpdate,
): Promise<TelegramInboundPayload | null> {
  const message = update.message
  const chatId = message?.chat.id
  if (message === undefined || chatId === undefined) {
    return null
  }

  const text = message.text?.trim()
  if (text) {
    return {
      kind: 'text',
      chatId: String(chatId),
      text,
    }
  }

  const caption = message.caption?.trim() || undefined

  if (message.photo?.length) {
    const content = await resolvePhotoPrompt(config, message.photo, caption)
    if (content) {
      return {
        kind: 'prompt',
        chatId: String(chatId),
        content,
      }
    }
  }

  if (message.document) {
    return {
      kind: 'prompt',
      chatId: String(chatId),
      content: await resolveDocumentPrompt(config, message.document, caption),
    }
  }

  return null
}

function extractAbsolutePathLines(text: string): string[] {
  const results: string[] = []
  for (const rawLine of text.split('\n')) {
    let line = rawLine.trim()
    if (!line) {
      continue
    }
    if (line.startsWith('Path: ')) {
      line = line.slice('Path: '.length).trim()
    }
    if (
      (line.startsWith('"') && line.endsWith('"')) ||
      (line.startsWith("'") && line.endsWith("'"))
    ) {
      line = line.slice(1, -1)
    }
    if (line.startsWith('/') && !line.includes(' ')) {
      results.push(line)
    }
  }
  return results
}

export async function classifyTelegramOutboundAttachments(text: string): Promise<{
  photos: string[]
  documents: string[]
}> {
  const candidates = new Set<string>([
    ...extractAtMentionedFiles(text),
    ...extractAbsolutePathLines(text),
  ])

  const photos: string[] = []
  const documents: string[] = []

  for (const candidate of candidates) {
    try {
      const info = await stat(candidate)
      if (!info.isFile()) {
        continue
      }
      const mediaType = maybeInferImageMediaType(candidate)
      if (mediaType) {
        photos.push(candidate)
      } else {
        documents.push(candidate)
      }
    } catch {
      continue
    }
  }

  return {
    photos,
    documents,
  }
}
