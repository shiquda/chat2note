import { AppConfig, NotionPropertyMappings } from '../types/config'
import { DEFAULT_CONFIG, DEFAULT_NOTION_PROPERTY_MAPPINGS } from './defaults'
import { matchLanguagePreference } from '../i18n/supported-languages'
import { APP_VERSION } from '../utils/version'

export interface ConfigExportPackage {
  schemaVersion: number
  appVersion: string
  exportedAt: string
  data: AppConfig
}

export interface ConfigImportMetadata {
  schemaVersion: number
  appVersion: string
  exportedAt?: string
}

export interface ConfigImportResult {
  config: AppConfig
  metadata: ConfigImportMetadata
}

export const CURRENT_SCHEMA_VERSION = 1

const allowedFormats: AppConfig['export']['defaultFormat'][] = ['markdown', 'json', 'txt']
const allowedTargets: AppConfig['export']['defaultTarget'][] = [
  'local',
  'notion',
  'clipboard',
  'obsidian',
  'siyuan',
  'joplin',
]
const allowedObsidianOpenModes: AppConfig['obsidian']['openMode'][] = ['none', 'note', 'vault']
const allowedJoplinAuthMethods: AppConfig['joplin']['authMethod'][] = ['manual', 'programmatic']
const allowedScopes: AppConfig['export']['defaultScope'][] = ['all', 'selected']
const allowedThemes: AppConfig['appearance']['theme'][] = ['dark', 'light', 'system']
const allowedFloatingButtonPositions: AppConfig['appearance']['floatingButtonPosition'][] = [
  'top-right',
  'middle-right',
  'bottom-right',
  'bottom-left',
  'middle-left',
  'top-left',
  'hidden',
]

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function migratePropertyMappings(
  source: Record<string, unknown> | undefined
): NotionPropertyMappings {
  if (!source || typeof source !== 'object') {
    return DEFAULT_NOTION_PROPERTY_MAPPINGS
  }

  const result: NotionPropertyMappings = {
    url: DEFAULT_NOTION_PROPERTY_MAPPINGS.url,
    exportedAt: DEFAULT_NOTION_PROPERTY_MAPPINGS.exportedAt,
    platform: DEFAULT_NOTION_PROPERTY_MAPPINGS.platform,
    messageCount: DEFAULT_NOTION_PROPERTY_MAPPINGS.messageCount,
    tags: DEFAULT_NOTION_PROPERTY_MAPPINGS.tags,
  }

  // Migrate each property mapping
  for (const key of ['url', 'exportedAt', 'platform', 'messageCount', 'tags'] as const) {
    const sourceMapping = source[key]
    if (sourceMapping && typeof sourceMapping === 'object' && sourceMapping !== null) {
      const mapping = sourceMapping as Record<string, unknown>
      result[key] = {
        enabled: normalizeBoolean(mapping.enabled, DEFAULT_NOTION_PROPERTY_MAPPINGS[key].enabled),
        propertyName:
          normalizeString(mapping.propertyName) ||
          DEFAULT_NOTION_PROPERTY_MAPPINGS[key].propertyName,
        fallbackNames: Array.isArray(mapping.fallbackNames)
          ? (mapping.fallbackNames as unknown[]).filter(
              (name): name is string => typeof name === 'string'
            )
          : DEFAULT_NOTION_PROPERTY_MAPPINGS[key].fallbackNames,
      }
    }
  }

  return result
}

export function migrateConfig(
  stored: (Partial<AppConfig> & Record<string, unknown>) | undefined
): AppConfig {
  const base: AppConfig = {
    version: DEFAULT_CONFIG.version,
    notion: { ...DEFAULT_CONFIG.notion },
    export: { ...DEFAULT_CONFIG.export },
    obsidian: { ...DEFAULT_CONFIG.obsidian },
    siyuan: { ...DEFAULT_CONFIG.siyuan },
    joplin: { ...DEFAULT_CONFIG.joplin },
    appearance: { ...DEFAULT_CONFIG.appearance },
  }

  if (!stored || typeof stored !== 'object') {
    return base
  }

  const notionSource = (stored.notion ?? stored.notionConfig ?? {}) as Record<string, unknown>
  const exportSource = (stored.export ?? stored.exportConfig ?? {}) as Record<string, unknown>
  const obsidianSource = (stored.obsidian ?? stored.obsidianConfig ?? {}) as Record<string, unknown>
  const siyuanSource = (stored.siyuan ?? stored.siyuanConfig ?? {}) as Record<string, unknown>
  const joplinSource = (stored.joplin ?? stored.joplinConfig ?? {}) as Record<string, unknown>
  const appearanceSource = (stored.appearance ?? stored.appearanceConfig ?? {}) as Record<
    string,
    unknown
  >

  const notionApiToken = normalizeString(
    notionSource.apiToken ?? stored.notionToken ?? stored.apiToken
  )
  const notionDatabaseId = normalizeString(
    notionSource.databaseId ?? stored.databaseId ?? stored.notionDatabaseId
  )
  const notionEnabled = normalizeBoolean(
    notionSource.enabled ?? stored.notionEnabled,
    DEFAULT_CONFIG.notion.enabled
  )
  const notionPropertyMappings = migratePropertyMappings(
    notionSource.propertyMappings as Record<string, unknown> | undefined
  )
  const notionIncludeProperties = normalizeBoolean(
    notionSource.includeProperties,
    DEFAULT_CONFIG.notion.includeProperties
  )

  const formatCandidate = normalizeString(
    exportSource.defaultFormat ?? stored.defaultExportFormat
  ).toLowerCase()
  const targetCandidate = normalizeString(
    exportSource.defaultTarget ?? stored.defaultExportTarget
  ).toLowerCase()
  const scopeCandidate = normalizeString(
    exportSource.defaultScope ?? stored.defaultScope ?? stored.exportScope
  ).toLowerCase()

  const themeCandidate = normalizeString(
    appearanceSource.theme ?? stored.themePreference ?? stored.theme
  ).toLowerCase()

  const languageCandidate = normalizeString(
    appearanceSource.language ?? stored.languagePreference ?? stored.language
  )
  const floatingButtonCandidate = normalizeString(
    appearanceSource.floatingButtonPosition ?? stored.floatingButtonPosition
  ).toLowerCase()
  const matchedLanguage = matchLanguagePreference(languageCandidate)

  const obsidianVaultName = normalizeString(
    obsidianSource.vaultName ?? stored.obsidianVault ?? stored.vaultName
  )
  const obsidianFolderPath = normalizeString(
    obsidianSource.folderPath ?? stored.obsidianFolder ?? stored.folderPath
  )
  const obsidianOpenModeCandidate = normalizeString(
    obsidianSource.openMode ?? stored.obsidianOpenMode ?? stored.openMode
  ).toLowerCase() as AppConfig['obsidian']['openMode']
  const obsidianEnabled = normalizeBoolean(
    obsidianSource.enabled ?? stored.obsidianEnabled,
    DEFAULT_CONFIG.obsidian.enabled
  )
  const obsidianStrictMarkdown = normalizeBoolean(
    obsidianSource.strictMarkdown ?? stored.obsidianStrictMarkdown,
    DEFAULT_CONFIG.obsidian.strictMarkdown
  )
  const obsidianIncludeYamlFrontmatter = normalizeBoolean(
    obsidianSource.includeYamlFrontmatter ?? stored.obsidianIncludeYamlFrontmatter,
    DEFAULT_CONFIG.obsidian.includeYamlFrontmatter
  )

  const siyuanApiUrl = normalizeString(siyuanSource.apiUrl ?? stored.siyuanApiUrl ?? stored.apiUrl)
  const siyuanApiToken = normalizeString(
    siyuanSource.apiToken ?? stored.siyuanApiToken ?? stored.siyuanToken
  )
  const siyuanNotebookId = normalizeString(
    siyuanSource.notebookId ?? stored.siyuanNotebookId ?? stored.notebookId
  )
  const siyuanFolderPath = normalizeString(
    siyuanSource.folderPath ?? stored.siyuanFolderPath ?? stored.folderPath
  )
  const siyuanEnabled = normalizeBoolean(
    siyuanSource.enabled ?? stored.siyuanEnabled,
    DEFAULT_CONFIG.siyuan.enabled
  )
  const siyuanSetBlockAttributes = normalizeBoolean(
    siyuanSource.setBlockAttributes ?? stored.siyuanSetBlockAttributes,
    DEFAULT_CONFIG.siyuan.setBlockAttributes
  )

  // Joplin configuration migration
  const joplinApiUrl = normalizeString(joplinSource.apiUrl ?? stored.joplinApiUrl)
  const joplinApiToken = normalizeString(joplinSource.apiToken ?? stored.joplinApiToken)
  const joplinDefaultNotebookId = normalizeString(
    joplinSource.defaultNotebookId ?? stored.joplinDefaultNotebookId
  )
  const joplinDefaultTags = Array.isArray(joplinSource.defaultTags)
    ? (joplinSource.defaultTags as unknown[]).filter(
        (tag): tag is string => typeof tag === 'string'
      )
    : DEFAULT_CONFIG.joplin.defaultTags
  const joplinIncludeMetadata = normalizeBoolean(
    joplinSource.includeMetadata ?? stored.joplinIncludeMetadata,
    DEFAULT_CONFIG.joplin.includeMetadata
  )
  const joplinAuthMethod = normalizeString(joplinSource.authMethod ?? stored.joplinAuthMethod)
  const joplinEnabled = normalizeBoolean(
    joplinSource.enabled ?? stored.joplinEnabled,
    DEFAULT_CONFIG.joplin.enabled
  )

  const migratedConfig: AppConfig = {
    version: DEFAULT_CONFIG.version,
    notion: {
      apiToken: notionApiToken === '***encrypted***' ? '' : notionApiToken,
      databaseId: notionDatabaseId,
      enabled: notionEnabled,
      propertyMappings: notionPropertyMappings,
      includeProperties: notionIncludeProperties,
    },
    export: {
      defaultFormat: allowedFormats.includes(
        formatCandidate as AppConfig['export']['defaultFormat']
      )
        ? (formatCandidate as AppConfig['export']['defaultFormat'])
        : DEFAULT_CONFIG.export.defaultFormat,
      defaultTarget: allowedTargets.includes(
        targetCandidate as AppConfig['export']['defaultTarget']
      )
        ? (targetCandidate as AppConfig['export']['defaultTarget'])
        : DEFAULT_CONFIG.export.defaultTarget,
      includeMetadata: normalizeBoolean(
        exportSource.includeMetadata ?? stored.includeMetadata,
        DEFAULT_CONFIG.export.includeMetadata
      ),
      defaultScope: allowedScopes.includes(scopeCandidate as AppConfig['export']['defaultScope'])
        ? (scopeCandidate as AppConfig['export']['defaultScope'])
        : DEFAULT_CONFIG.export.defaultScope,
      fileNameTemplate:
        normalizeString(
          exportSource.fileNameTemplate ?? stored.fileNameTemplate ?? stored.exportFileNameTemplate
        ) || DEFAULT_CONFIG.export.fileNameTemplate,
      markdownTemplate:
        normalizeString(
          exportSource.markdownTemplate ?? stored.markdownTemplate ?? stored.exportMarkdownTemplate
        ) || DEFAULT_CONFIG.export.markdownTemplate,
      messageTemplate:
        normalizeString(
          exportSource.messageTemplate ?? stored.messageTemplate ?? stored.exportMessageTemplate
        ) || DEFAULT_CONFIG.export.messageTemplate,
      visibleTargets: Array.isArray(exportSource.visibleTargets)
        ? (exportSource.visibleTargets as unknown[]).filter(
            (target): target is AppConfig['export']['defaultTarget'] =>
              ['local', 'notion', 'clipboard', 'obsidian', 'siyuan', 'joplin'].includes(
                target as string
              )
          )
        : DEFAULT_CONFIG.export.visibleTargets,
    },
    obsidian: {
      enabled: obsidianEnabled,
      vaultName: obsidianVaultName,
      folderPath: obsidianFolderPath,
      openMode: allowedObsidianOpenModes.includes(obsidianOpenModeCandidate)
        ? obsidianOpenModeCandidate
        : DEFAULT_CONFIG.obsidian.openMode,
      strictMarkdown: obsidianStrictMarkdown,
      includeYamlFrontmatter: obsidianIncludeYamlFrontmatter,
    },
    siyuan: {
      enabled: siyuanEnabled,
      apiUrl: siyuanApiUrl,
      apiToken: siyuanApiToken,
      notebookId: siyuanNotebookId,
      folderPath: siyuanFolderPath,
      setBlockAttributes: siyuanSetBlockAttributes,
    },
    joplin: {
      enabled: joplinEnabled,
      apiUrl: joplinApiUrl,
      apiToken: joplinApiToken,
      defaultNotebookId: joplinDefaultNotebookId,
      defaultTags: joplinDefaultTags,
      includeMetadata: joplinIncludeMetadata,
      authMethod: allowedJoplinAuthMethods.includes(
        joplinAuthMethod as AppConfig['joplin']['authMethod']
      )
        ? (joplinAuthMethod as AppConfig['joplin']['authMethod'])
        : DEFAULT_CONFIG.joplin.authMethod,
    },
    appearance: {
      theme: allowedThemes.includes(themeCandidate as AppConfig['appearance']['theme'])
        ? (themeCandidate as AppConfig['appearance']['theme'])
        : DEFAULT_CONFIG.appearance.theme,
      language: matchedLanguage ?? DEFAULT_CONFIG.appearance.language,
      floatingButtonPosition: allowedFloatingButtonPositions.includes(
        floatingButtonCandidate as any
      )
        ? (floatingButtonCandidate as AppConfig['appearance']['floatingButtonPosition'])
        : DEFAULT_CONFIG.appearance.floatingButtonPosition,
    },
  }

  if (typeof stored.version === 'string' && stored.version) {
    migratedConfig.version = DEFAULT_CONFIG.version
  }

  return {
    ...base,
    ...migratedConfig,
    notion: { ...base.notion, ...migratedConfig.notion },
    export: { ...base.export, ...migratedConfig.export },
    obsidian: { ...base.obsidian, ...migratedConfig.obsidian },
    siyuan: { ...base.siyuan, ...migratedConfig.siyuan },
    joplin: { ...base.joplin, ...migratedConfig.joplin },
    appearance: { ...base.appearance, ...migratedConfig.appearance },
  }
}

export function createExportPackage(config: AppConfig): ConfigExportPackage {
  const migrated = migrateConfig(config as Partial<AppConfig> & Record<string, unknown>)

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      ...migrated,
      version: APP_VERSION,
    },
  }
}

export function exportConfig(config: AppConfig): string {
  const payload = createExportPackage(config)
  return JSON.stringify(payload, null, 2)
}

export function importConfig(raw: string): ConfigImportResult {
  let parsed: any

  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Invalid configuration file: not valid JSON')
  }

  if (parsed && typeof parsed === 'object' && 'schemaVersion' in parsed && 'data' in parsed) {
    const schemaVersion = typeof parsed.schemaVersion === 'number' ? parsed.schemaVersion : NaN

    if (!Number.isFinite(schemaVersion)) {
      throw new Error('Invalid configuration file: schemaVersion is missing or invalid')
    }

    if (schemaVersion > CURRENT_SCHEMA_VERSION) {
      throw new Error(`Unsupported configuration schema version: ${schemaVersion}`)
    }

    const config = migrateConfig(parsed.data)

    return {
      config,
      metadata: {
        schemaVersion,
        appVersion: normalizeString(parsed.appVersion) || 'unknown',
        exportedAt: normalizeString(parsed.exportedAt) || undefined,
      },
    }
  }

  const config = migrateConfig(parsed)

  return {
    config,
    metadata: {
      schemaVersion: 0,
      appVersion: 'unknown',
    },
  }
}
