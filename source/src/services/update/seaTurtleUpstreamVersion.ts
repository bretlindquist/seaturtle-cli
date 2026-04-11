import { PRODUCT_URL } from '../../constants/product.js'

export const DEFAULT_SEATURTLE_UPSTREAM_PACKAGE_JSON_URL = `${PRODUCT_URL}/raw/HEAD/source/package.json`

function isTruthyEnvValue(value: string | undefined): boolean {
  return ['1', 'true', 'yes', 'on'].includes(value?.toLowerCase().trim() ?? '')
}

export function resolveSeaTurtleUpstreamPackageJsonUrl(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  if (isTruthyEnvValue(env.SEATURTLE_DISABLE_UPSTREAM_UPDATE_CHECK)) {
    return null
  }

  const override = env.SEATURTLE_UPDATE_PACKAGE_JSON_URL?.trim()
  return override || DEFAULT_SEATURTLE_UPSTREAM_PACKAGE_JSON_URL
}

export function extractSeaTurtleUpstreamVersion(
  packageJsonSource: string,
): string | null {
  try {
    const parsed = JSON.parse(packageJsonSource) as Record<string, unknown>
    const version = parsed.version
    return typeof version === 'string' && version.trim()
      ? version.trim()
      : null
  } catch {
    return null
  }
}

export async function getLatestSeaTurtleUpstreamVersion(): Promise<
  string | null
> {
  const packageJsonUrl = resolveSeaTurtleUpstreamPackageJsonUrl()
  if (!packageJsonUrl) {
    return null
  }

  try {
    const response = await fetch(packageJsonUrl, {
      signal: AbortSignal.timeout(5000),
      headers: {
        accept: 'application/json,text/plain;q=0.9,*/*;q=0.8',
      },
    })
    if (!response.ok) {
      return null
    }
    const packageJsonSource = await response.text()
    const version = extractSeaTurtleUpstreamVersion(packageJsonSource)
    return version
  } catch {
    return null
  }
}
