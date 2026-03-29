import type { LanguagePreference } from '../i18n/supported-languages'

export interface NotionPropertyConfig {
  enabled: boolean // 是否启用该属性
  propertyName: string // Notion数据库中的列名
  fallbackNames?: string[] // 备选列名（用于自动匹配）
}

export interface NotionPropertyMappings {
  url: NotionPropertyConfig
  exportedAt: NotionPropertyConfig
  platform: NotionPropertyConfig
  messageCount: NotionPropertyConfig
  tags: NotionPropertyConfig
}

export interface NotionConfig {
  apiToken: string
  databaseId: string
  enabled: boolean
  propertyMappings?: NotionPropertyMappings
  includeProperties: boolean // 是否在数据库属性中导出元信息
}

export interface ObsidianConfig {
  enabled: boolean
  vaultName: string
  folderPath: string
  openMode: 'none' | 'note' | 'vault'
  strictMarkdown: boolean
  includeYamlFrontmatter: boolean
}

export interface SiyuanConfig {
  enabled: boolean
  apiUrl: string
  apiToken: string
  notebookId: string
  folderPath: string
  setBlockAttributes: boolean
}

export interface JoplinConfig {
  enabled: boolean
  apiUrl: string
  apiToken: string
  defaultNotebookId: string
  defaultTags: string[]
  includeMetadata: boolean
  authMethod: 'manual' | 'programmatic'
}

// Base interface for notebook software configurations
export interface BaseNotebookConfig {
  enabled: boolean
}

export interface ExportConfig {
  defaultFormat: 'markdown' | 'json' | 'txt'
  defaultTarget: 'local' | 'notion' | 'clipboard' | 'obsidian' | 'siyuan' | 'joplin'
  includeMetadata: boolean
  defaultScope: 'all' | 'selected'
  fileNameTemplate: string
  markdownTemplate: string
  messageTemplate: string
  visibleTargets: ('local' | 'notion' | 'clipboard' | 'obsidian' | 'siyuan' | 'joplin')[]
}

export type FloatingButtonPosition =
  | 'top-right'
  | 'middle-right'
  | 'bottom-right'
  | 'bottom-left'
  | 'middle-left'
  | 'top-left'
  | 'hidden'

export interface AppearanceConfig {
  theme: 'dark' | 'light' | 'system'
  language: LanguagePreference
  floatingButtonPosition: FloatingButtonPosition
}

export interface AppConfig {
  notion: NotionConfig
  obsidian: ObsidianConfig
  siyuan: SiyuanConfig
  joplin: JoplinConfig
  export: ExportConfig
  appearance: AppearanceConfig
  version: string
}

export interface ConfigValidationResult {
  isValid: boolean
  errors: string[]
}

export interface ExportTarget {
  type: 'local' | 'notion' | 'clipboard' | 'obsidian' | 'siyuan' | 'joplin'
  label: string
  icon?: string
}

export interface ExportFormat {
  type: 'markdown' | 'json' | 'txt'
  label: string
  extension: string
  mimeType: string
}

export interface NotebookSoftware {
  id: string
  name: string
  enabled: boolean
  configKey: keyof AppConfig
  icon?: string
  supportedFormats?: ('markdown' | 'json' | 'txt')[]
  description?: string
}
