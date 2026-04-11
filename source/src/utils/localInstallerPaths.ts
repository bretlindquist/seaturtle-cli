export function isLocalInstallationExecPath(
  execPath: string,
  localInstallDir: string,
): boolean {
  const normalizedExecPath = execPath.replaceAll('\\', '/')
  const normalizedLocalInstallDir = localInstallDir.replaceAll('\\', '/')

  return normalizedExecPath.includes(
    `${normalizedLocalInstallDir}/node_modules/`,
  )
}
