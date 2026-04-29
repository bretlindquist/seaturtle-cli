import { dirname, relative, resolve, sep } from 'path'
import { execFileNoThrowWithCwd } from '../../utils/execFileNoThrow.js'
import { getFsImplementation } from '../../utils/fsOperations.js'
import { findCanonicalGitRoot, gitExe } from '../../utils/git.js'
import {
  parseAutoworkPlanContent,
  type AutoworkPlanChunk,
  type AutoworkPlanParseFailure,
} from './planChunkParser.js'

const EXECUTABLE_PLAN_FILENAME_REGEX = /^\d{4}-\d{2}-\d{2}-.+-state\.md$/u

export type AutoworkPlanParseSuccess = {
  ok: true
  path: string
  repoRoot: string
  chunks: AutoworkPlanChunk[]
}

export type AutoworkPlanParseResult =
  | AutoworkPlanParseFailure
  | AutoworkPlanParseSuccess

function fail(
  path: string,
  code: string,
  message: string,
  options?: { chunkId?: string; line?: number },
): AutoworkPlanParseFailure {
  return {
    ok: false,
    path,
    code,
    message,
    chunkId: options?.chunkId,
    line: options?.line,
  }
}

async function isTrackedPlanFile(path: string, repoRoot: string): Promise<boolean> {
  const gitPath = relative(repoRoot, path).split(sep).join('/')
  const { code } = await execFileNoThrowWithCwd(
    gitExe(),
    ['--no-optional-locks', 'ls-files', '--error-unmatch', gitPath],
    { cwd: repoRoot },
  )
  return code === 0
}

export async function parseAutoworkPlanFile(
  path: string,
): Promise<AutoworkPlanParseResult> {
  const resolvedPath = resolve(path)
  const filename = resolvedPath.split(sep).pop() ?? ''
  if (!EXECUTABLE_PLAN_FILENAME_REGEX.test(filename)) {
    return fail(
      resolvedPath,
      'invalid_plan_filename',
      'Autowork requires a tracked dated plan file ending in -state.md.',
    )
  }

  const fs = getFsImplementation()
  if (!fs.existsSync(resolvedPath)) {
    return fail(
      resolvedPath,
      'missing_plan_file',
      'Autowork plan file does not exist.',
    )
  }

  const repoRoot = findCanonicalGitRoot(dirname(resolvedPath))
  if (!repoRoot) {
    return fail(
      resolvedPath,
      'plan_not_in_git_repo',
      'Autowork plan file must live inside a git repository.',
    )
  }

  if (!(await isTrackedPlanFile(resolvedPath, repoRoot))) {
    return fail(
      resolvedPath,
      'plan_not_tracked',
      'Autowork plan file must be tracked by git before execution can begin.',
    )
  }

  const content = fs.readFileSync(resolvedPath, { encoding: 'utf-8' })
  const parsedChunks = parseAutoworkPlanContent(resolvedPath, content)
  if (!Array.isArray(parsedChunks)) {
    return parsedChunks
  }

  return {
    ok: true,
    path: resolvedPath,
    repoRoot,
    chunks: parsedChunks,
  }
}
