import packageJson from '../../package.json' assert { type: 'json' }

function resolveFallbackVersion(): string {
  const version = packageJson?.version
  return typeof version === 'string' && version ? version : '0.0.0'
}

function resolveManifestVersion(): string | null {
  try {
    const runtime = globalThis.browser?.runtime ?? globalThis.chrome?.runtime
    const manifest = runtime?.getManifest?.()
    if (manifest && typeof manifest.version === 'string' && manifest.version) {
      return manifest.version
    }
  } catch (error) {
    console.warn('Failed to read manifest version:', error)
  }
  return null
}

export function getAppVersion(): string {
  return resolveManifestVersion() ?? resolveFallbackVersion()
}

export const APP_VERSION = getAppVersion()
