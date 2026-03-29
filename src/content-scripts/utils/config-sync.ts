import type { ExportOptions } from '../../types/export'

type DefaultOptionsResponse = {
  success: boolean
  result?: Partial<ExportOptions>
}

const FALLBACK_EXPORT_OPTIONS: ExportOptions = {
  format: 'markdown',
  target: 'local',
  includeMetadata: false,
  scope: 'all',
}

/**
 * Fetch default export options from background script
 * @returns Promise resolving to ExportOptions
 */
export async function fetchDefaultExportOptions(): Promise<ExportOptions> {
  try {
    const response = (await chrome.runtime.sendMessage({
      type: 'GET_DEFAULT_EXPORT_OPTIONS',
    })) as DefaultOptionsResponse | undefined

    if (response?.success && response.result) {
      const format = response.result.format ?? FALLBACK_EXPORT_OPTIONS.format
      const target = response.result.target ?? FALLBACK_EXPORT_OPTIONS.target
      const includeMetadata =
        typeof response.result.includeMetadata === 'boolean'
          ? response.result.includeMetadata
          : FALLBACK_EXPORT_OPTIONS.includeMetadata

      const scope =
        (response.result.scope as ExportOptions['scope'] | undefined) ??
        FALLBACK_EXPORT_OPTIONS.scope

      return {
        format,
        target,
        includeMetadata,
        scope,
      }
    }
  } catch (error) {
    console.error('Chat2Note: Failed to fetch default export options', error)
  }

  return { ...FALLBACK_EXPORT_OPTIONS }
}
