import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  migrateConfig,
  exportConfig,
  importConfig,
  createExportPackage,
  CURRENT_SCHEMA_VERSION,
} from '../../src/config/serializer'
import type { AppConfig } from '../../src/types/config'

// Mock the version utility
vi.mock('../../src/utils/version', () => ({
  APP_VERSION: '1.0.0-test',
}))

// Mock the language preference utility
vi.mock('../../src/i18n/supported-languages', () => ({
  matchLanguagePreference: (lang: string) => {
    const supported = ['en', 'zh_CN', 'fr', 'de']
    return supported.includes(lang) ? lang : 'en'
  },
}))

describe('Configuration Serializer', () => {
  let fullConfig: AppConfig

  beforeEach(() => {
    fullConfig = {
      version: '1.0.0',
      notion: {
        apiToken: 'test-token',
        databaseId: 'test-db-id',
        enabled: true,
        propertyMappings: {
          url: { enabled: true, propertyName: 'URL', fallbackNames: ['Source'] },
          exportedAt: { enabled: true, propertyName: 'Exported At', fallbackNames: ['Date'] },
          platform: { enabled: true, propertyName: 'Platform', fallbackNames: ['AI'] },
          messageCount: { enabled: true, propertyName: 'Message Count', fallbackNames: ['Count'] },
          tags: { enabled: true, propertyName: 'Tags', fallbackNames: ['Label'] },
        },
        includeProperties: true,
      },
      export: {
        defaultFormat: 'markdown',
        defaultTarget: 'local',
        includeMetadata: true,
        defaultScope: 'all',
        fileNameTemplate: '{{title}}-{{date}}',
        markdownTemplate: '# {{title}}\n\n{{content}}',
        messageTemplate: '## {{role}}\n\n{{content}}',
        visibleTargets: ['local', 'notion', 'clipboard'],
      },
      obsidian: {
        enabled: true,
        vaultName: 'Test Vault',
        folderPath: 'AI Chats',
        openMode: 'note',
        strictMarkdown: true,
        includeYamlFrontmatter: true,
      },
      siyuan: {
        enabled: false,
        apiUrl: 'http://localhost:6806',
        apiToken: 'siyuan-token',
        notebookId: '20240101000000',
        folderPath: 'AI Chats',
        setBlockAttributes: true,
      },
      joplin: {
        enabled: false,
        apiUrl: 'http://localhost:41184',
        apiToken: 'joplin-token',
        defaultNotebookId: 'notebook-id',
        defaultTags: ['AI', 'Chat'],
        includeMetadata: true,
        authMethod: 'manual',
      },
      appearance: {
        theme: 'dark',
        language: 'en',
        floatingButtonPosition: 'top-right',
      },
    }
  })

  describe('migrateConfig', () => {
    it('should return default config when input is undefined', () => {
      const result = migrateConfig(undefined)

      expect(result).toHaveProperty('version')
      expect(result).toHaveProperty('notion')
      expect(result).toHaveProperty('export')
      expect(result).toHaveProperty('obsidian')
      expect(result).toHaveProperty('siyuan')
      expect(result).toHaveProperty('joplin')
      expect(result).toHaveProperty('appearance')
    })

    it('should return default config when input is not an object', () => {
      const result = migrateConfig(null as any)

      expect(result).toHaveProperty('version')
      expect(result).toHaveProperty('notion')
    })

    it('should preserve valid configuration values', () => {
      const result = migrateConfig(fullConfig as Partial<AppConfig> & Record<string, unknown>)

      expect(result.notion.apiToken).toBe('test-token')
      expect(result.notion.databaseId).toBe('test-db-id')
      expect(result.notion.enabled).toBe(true)
      expect(result.export.defaultFormat).toBe('markdown')
      expect(result.export.defaultTarget).toBe('local')
      expect(result.obsidian.vaultName).toBe('Test Vault')
    })

    it('should migrate old field names to new structure', () => {
      const oldConfig = {
        notionToken: 'old-token',
        databaseId: 'old-db-id',
        notionEnabled: true,
        defaultExportFormat: 'json',
        defaultExportTarget: 'notion',
        includeMetadata: false,
        themePreference: 'light',
        languagePreference: 'zh_CN',
        obsidianVault: 'Old Vault',
        obsidianFolder: 'Old Folder',
      }

      const result = migrateConfig(oldConfig as Partial<AppConfig> & Record<string, unknown>)

      expect(result.notion.apiToken).toBe('old-token')
      expect(result.notion.databaseId).toBe('old-db-id')
      expect(result.notion.enabled).toBe(true)
      expect(result.export.defaultFormat).toBe('json')
      expect(result.export.defaultTarget).toBe('notion')
      expect(result.export.includeMetadata).toBe(false)
      expect(result.appearance.theme).toBe('light')
      expect(result.appearance.language).toBe('zh_CN')
      expect(result.obsidian.vaultName).toBe('Old Vault')
      expect(result.obsidian.folderPath).toBe('Old Folder')
    })

    it('should handle invalid values by falling back to defaults', () => {
      const invalidConfig = {
        export: {
          defaultFormat: 'invalid-format',
          defaultTarget: 'invalid-target',
          defaultScope: 'invalid-scope',
        },
        appearance: {
          theme: 'invalid-theme',
          floatingButtonPosition: 'invalid-position',
        },
        obsidian: {
          openMode: 'invalid-mode' as 'invalid',
        },
        joplin: {
          authMethod: 'invalid-method' as 'invalid',
        },
      }

      const result = migrateConfig(
        invalidConfig as unknown as Partial<AppConfig> & Record<string, unknown>
      )

      expect(result.export.defaultFormat).toBe('markdown') // fallback to default
      expect(result.export.defaultTarget).toBe('local') // fallback to default
      expect(result.export.defaultScope).toBe('selected') // fallback to default
      expect(result.appearance.theme).toBe('system') // fallback to default
      expect(result.appearance.floatingButtonPosition).toBe('top-right') // fallback to default
      expect(result.obsidian.openMode).toBe('note') // fallback to default (from defaults.ts)
      expect(result.joplin.authMethod).toBe('manual') // fallback to default
    })

    it('should sanitize encrypted tokens', () => {
      const configWithEncrypted = {
        notionToken: '***encrypted***',
        apiToken: '***encrypted***',
      }

      const result = migrateConfig(
        configWithEncrypted as Partial<AppConfig> & Record<string, unknown>
      )

      expect(result.notion.apiToken).toBe('')
    })

    it('should handle array properties correctly', () => {
      const configWithArrays = {
        export: {
          visibleTargets: ['local', 'notion', 'invalid-target'],
        },
        joplin: {
          defaultTags: ['tag1', 123, 'tag2', null, 'tag3'],
        },
      }

      const result = migrateConfig(configWithArrays as Partial<AppConfig> & Record<string, unknown>)

      expect(result.export.visibleTargets).toEqual(['local', 'notion'])
      expect(result.joplin.defaultTags).toEqual(['tag1', 'tag2', 'tag3'])
    })

    it('should migrate property mappings correctly', () => {
      const configWithMappings = {
        notion: {
          propertyMappings: {
            url: { enabled: true, propertyName: 'Custom URL', fallbackNames: ['Source', 'Link'] },
            exportedAt: { enabled: false, propertyName: 'Date', fallbackNames: ['Time'] },
            tags: { enabled: true, propertyName: 'Tags', fallbackNames: ['Label'] },
          },
        },
      }

      const result = migrateConfig(
        configWithMappings as Partial<AppConfig> & Record<string, unknown>
      )

      expect(result.notion.propertyMappings?.url.enabled).toBe(true)
      expect(result.notion.propertyMappings?.url.propertyName).toBe('Custom URL')
      expect(result.notion.propertyMappings?.url.fallbackNames).toEqual(['Source', 'Link'])
      expect(result.notion.propertyMappings?.exportedAt.enabled).toBe(false)
      expect(result.notion.propertyMappings?.tags.propertyName).toBe('Tags')
      expect(result.notion.propertyMappings?.platform).toBeDefined() // should have defaults
    })
  })

  describe('createExportPackage', () => {
    it('should create a proper export package', () => {
      const result = createExportPackage(fullConfig)

      expect(result).toHaveProperty('schemaVersion', CURRENT_SCHEMA_VERSION)
      expect(result).toHaveProperty('appVersion', '1.0.0-test')
      expect(result).toHaveProperty('exportedAt')
      expect(result).toHaveProperty('data')
      expect(result.data).toHaveProperty('version', '1.0.0-test')
    })

    it('should validate exported date format', () => {
      const result = createExportPackage(fullConfig)

      expect(() => new Date(result.exportedAt)).not.toThrow()
      expect(result.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    })
  })

  describe('exportConfig', () => {
    it('should export config as formatted JSON string', () => {
      const result = exportConfig(fullConfig)

      expect(typeof result).toBe('string')
      expect(() => JSON.parse(result)).not.toThrow()

      const parsed = JSON.parse(result)
      expect(parsed).toHaveProperty('schemaVersion')
      expect(parsed).toHaveProperty('appVersion')
      expect(parsed).toHaveProperty('data')
    })

    it('should create pretty-printed JSON', () => {
      const result = exportConfig(fullConfig)

      expect(result).toContain('\n')
      expect(result).toContain('  ')
    })
  })

  describe('importConfig', () => {
    it('should import config from valid export string', () => {
      const exported = exportConfig(fullConfig)
      const result = importConfig(exported)

      expect(result).toHaveProperty('config')
      expect(result).toHaveProperty('metadata')
      expect(result.metadata).toHaveProperty('schemaVersion')
      expect(result.metadata).toHaveProperty('appVersion')
      expect(result.config).toHaveProperty('notion')
      expect(result.config).toHaveProperty('export')
    })

    it('should handle invalid JSON gracefully', () => {
      expect(() => importConfig('invalid json')).toThrow(
        'Invalid configuration file: not valid JSON'
      )
    })

    it('should handle missing schema version', () => {
      const invalidJson = JSON.stringify({
        schemaVersion: null,
        appVersion: '1.0.0',
        data: { version: '1.0.0' },
      })

      expect(() => importConfig(invalidJson)).toThrow('schemaVersion is missing or invalid')
    })

    it('should handle invalid schema version', () => {
      const invalidJson = JSON.stringify({
        schemaVersion: 'invalid',
        appVersion: '1.0.0',
        data: { version: '1.0.0' },
      })

      expect(() => importConfig(invalidJson)).toThrow('schemaVersion is missing or invalid')
    })

    it('should handle unsupported schema version', () => {
      const unsupportedJson = JSON.stringify({
        schemaVersion: CURRENT_SCHEMA_VERSION + 100,
        appVersion: '1.0.0',
        data: { version: '1.0.0' },
      })

      expect(() => importConfig(unsupportedJson)).toThrow(
        'Unsupported configuration schema version'
      )
    })

    it('should handle legacy format without schema version', () => {
      const legacyJson = JSON.stringify({
        version: '1.0.0',
        notion: { enabled: true },
        export: { defaultFormat: 'markdown' },
      })

      const result = importConfig(legacyJson)

      expect(result.metadata.schemaVersion).toBe(0)
      expect(result.metadata.appVersion).toBe('unknown')
      expect(result.config).toHaveProperty('notion')
      expect(result.config).toHaveProperty('export')
    })

    it('should preserve metadata from export', () => {
      const exported = exportConfig(fullConfig)
      const result = importConfig(exported)

      expect(result.metadata.appVersion).toBe('1.0.0-test')
      expect(result.metadata.exportedAt).toBeDefined()
    })
  })
})
