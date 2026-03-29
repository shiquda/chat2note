import { AppConfig, ConfigValidationResult } from '../types/config'
import { DEFAULT_CONFIG } from './defaults'
import { CryptoUtils } from '../utils/crypto'
import {
  exportConfig as serializeConfig,
  importConfig as deserializeConfig,
  migrateConfig,
} from './serializer'
import t from '../i18n'

export const CONFIG_STORAGE_KEY = 'chat2note_config'
const STORAGE_KEY = CONFIG_STORAGE_KEY

class ConfigStorage {
  private isInitialized = false

  async init(): Promise<void> {
    if (this.isInitialized) return

    // 确保配置存在
    const config = await this.getConfig()
    if (!config) {
      await this.saveConfig(DEFAULT_CONFIG)
    }

    this.isInitialized = true
  }

  async getConfig(): Promise<AppConfig | null> {
    try {
      const storage = globalThis.browser?.runtime?.id ? globalThis.browser : globalThis.chrome
      const result = await storage.storage.sync.get(STORAGE_KEY)
      const stored = result[STORAGE_KEY]

      if (!stored) return null

      // 如果是旧版本配置，进行迁移
      return migrateConfig(stored)
    } catch (error) {
      console.error('Error getting config:', error)
      return null
    }
  }

  async saveConfig(config: AppConfig): Promise<void> {
    try {
      const storage = globalThis.browser?.runtime?.id ? globalThis.browser : globalThis.chrome
      const previousConfig = await this.getConfig()
      const configToPersist: AppConfig = {
        ...config,
        notion: { ...DEFAULT_CONFIG.notion, ...config.notion },
        export: {
          ...DEFAULT_CONFIG.export,
          ...config.export,
          markdownTemplate: config.export.markdownTemplate?.trim()
            ? config.export.markdownTemplate
            : DEFAULT_CONFIG.export.markdownTemplate,
          messageTemplate: config.export.messageTemplate?.trim()
            ? config.export.messageTemplate
            : DEFAULT_CONFIG.export.messageTemplate,
        },
        obsidian: { ...DEFAULT_CONFIG.obsidian, ...config.obsidian },
        siyuan: { ...DEFAULT_CONFIG.siyuan, ...config.siyuan },
        joplin: { ...DEFAULT_CONFIG.joplin, ...config.joplin },
        appearance: { ...DEFAULT_CONFIG.appearance, ...config.appearance },
        version: DEFAULT_CONFIG.version,
      }
      await storage.storage.sync.set({
        [STORAGE_KEY]: configToPersist,
      })
    } catch (error) {
      console.error('Error saving config:', error)
      throw error
    }
  }

  async updateConfig(updates: Partial<AppConfig>): Promise<AppConfig> {
    const current = (await this.getConfig()) || DEFAULT_CONFIG
    const updated: AppConfig = {
      ...current,
      ...updates,
      notion: { ...current.notion, ...(updates.notion ?? {}) },
      export: { ...current.export, ...(updates.export ?? {}) },
      obsidian: { ...current.obsidian, ...(updates.obsidian ?? {}) },
      siyuan: { ...current.siyuan, ...(updates.siyuan ?? {}) },
      joplin: { ...current.joplin, ...(updates.joplin ?? {}) },
      appearance: { ...current.appearance, ...(updates.appearance ?? {}) },
    }

    await this.saveConfig(updated)
    return updated
  }

  async resetConfig(): Promise<void> {
    await this.saveConfig(DEFAULT_CONFIG)
  }

  async validateConfig(config: AppConfig): Promise<ConfigValidationResult> {
    const errors: string[] = []
    const obsidianConfig = config.obsidian ?? DEFAULT_CONFIG.obsidian
    const siyuanConfig = config.siyuan ?? DEFAULT_CONFIG.siyuan
    const joplinConfig = config.joplin ?? DEFAULT_CONFIG.joplin

    // 验证Notion配置
    if (config.notion.enabled) {
      if (!config.notion.apiToken) {
        errors.push('Notion API Token is required when Notion integration is enabled')
      }

      if (!config.notion.databaseId) {
        errors.push('Notion Database ID is required when Notion integration is enabled')
      } else if (!/^[a-f0-9]{32}$/.test(config.notion.databaseId.replace(/-/g, ''))) {
        errors.push('Notion Database ID format is invalid')
      }
    }

    // 验证导出配置
    if (!['markdown', 'json', 'txt'].includes(config.export.defaultFormat)) {
      errors.push('Invalid default export format')
    }

    if (
      !['local', 'notion', 'clipboard', 'obsidian', 'siyuan', 'joplin'].includes(
        config.export.defaultTarget
      )
    ) {
      errors.push('Invalid default export target')
    }

    if (config.export.defaultTarget === 'obsidian' && config.export.defaultFormat !== 'markdown') {
      errors.push('Obsidian export only supports Markdown format')
    }

    if (config.export.defaultTarget === 'siyuan' && config.export.defaultFormat !== 'markdown') {
      errors.push('SiYuan export only supports Markdown format')
    }

    if (config.export.defaultTarget === 'joplin' && config.export.defaultFormat !== 'markdown') {
      errors.push('Joplin export only supports Markdown format')
    }

    if (!['all', 'selected'].includes(config.export.defaultScope)) {
      errors.push('Invalid default export scope')
    }

    if (!['dark', 'light', 'system'].includes(config.appearance.theme)) {
      errors.push(t('error_invalid_theme_preference'))
    }

    const allowedFloatingButtonPositions: AppConfig['appearance']['floatingButtonPosition'][] = [
      'top-right',
      'middle-right',
      'bottom-right',
      'bottom-left',
      'middle-left',
      'top-left',
      'hidden',
    ]
    if (!allowedFloatingButtonPositions.includes(config.appearance.floatingButtonPosition)) {
      errors.push('Invalid floating button position')
    }

    if (!['none', 'note', 'vault'].includes(obsidianConfig.openMode)) {
      errors.push('Invalid Obsidian open mode')
    }

    if (obsidianConfig.enabled || config.export.defaultTarget === 'obsidian') {
      if (!obsidianConfig.vaultName || !obsidianConfig.vaultName.trim()) {
        errors.push('Obsidian vault name is required when Obsidian export is enabled')
      }
    }

    if (typeof obsidianConfig.strictMarkdown !== 'boolean') {
      errors.push('Obsidian strictMarkdown flag must be a boolean')
    }

    if (obsidianConfig.folderPath && /[\\:*?"<>|]/.test(obsidianConfig.folderPath)) {
      errors.push('Obsidian folder path contains invalid characters')
    }

    if (siyuanConfig.enabled || config.export.defaultTarget === 'siyuan') {
      if (!siyuanConfig.apiUrl || !siyuanConfig.apiUrl.trim()) {
        errors.push('SiYuan API URL is required when SiYuan export is enabled')
      }

      if (siyuanConfig.apiUrl) {
        try {
          new URL(siyuanConfig.apiUrl)
        } catch {
          errors.push('SiYuan API URL is invalid')
        }
      }

      if (!siyuanConfig.apiToken || !siyuanConfig.apiToken.trim()) {
        errors.push('SiYuan API token is required when SiYuan export is enabled')
      }

      if (!siyuanConfig.notebookId || !siyuanConfig.notebookId.trim()) {
        errors.push('SiYuan notebook ID is required when SiYuan export is enabled')
      }

      if (siyuanConfig.folderPath && /[\\:*?"<>|]/.test(siyuanConfig.folderPath)) {
        errors.push('SiYuan folder path contains invalid characters')
      }
    }

    // 验证 Joplin 配置
    if (joplinConfig.enabled || config.export.defaultTarget === 'joplin') {
      if (!joplinConfig.apiUrl || !joplinConfig.apiUrl.trim()) {
        errors.push('Joplin API URL is required when Joplin export is enabled')
      }

      if (joplinConfig.apiUrl) {
        try {
          new URL(joplinConfig.apiUrl)
        } catch {
          errors.push('Joplin API URL is invalid')
        }
      }

      // 注意：API token 检查在 isJoplinConfigured 中通过 CryptoUtils 处理
    }

    // 验证文件名模板
    if (!config.export.fileNameTemplate || config.export.fileNameTemplate.trim() === '') {
      errors.push('Filename template cannot be empty')
    }

    if (!config.export.markdownTemplate || config.export.markdownTemplate.trim() === '') {
      errors.push('Markdown template cannot be empty')
    }

    if (!config.export.messageTemplate || config.export.messageTemplate.trim() === '') {
      errors.push('Message template cannot be empty')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  async isNotionConfigured(): Promise<boolean> {
    const config = await this.getConfig()
    if (!config || !config.notion.enabled) return false

    // 检查数据库ID
    if (!config.notion.databaseId) return false

    // 检查API token - 如果配置中是加密占位符，则检查实际存储的加密token
    if (config.notion.apiToken) {
      return true
    }

    // 如果配置中的token为空，可能是加密存储的占位符，检查真实的加密token
    try {
      const realToken = await CryptoUtils.getApiToken()
      return !!realToken
    } catch {
      return false
    }
  }

  async isJoplinConfigured(): Promise<boolean> {
    const config = await this.getConfig()
    if (!config || !config.joplin.enabled) return false

    // 检查 API URL
    if (!config.joplin.apiUrl) return false

    // 检查 API token
    try {
      const realToken = await CryptoUtils.getJoplinApiToken()
      return !!realToken
    } catch {
      return false
    }
  }

  async exportConfig(
    options: { as?: 'blob' | 'string'; includeSensitive?: boolean } = {}
  ): Promise<Blob | string> {
    const { as = 'blob', includeSensitive = false } = options
    let config = (await this.getConfig()) ?? DEFAULT_CONFIG

    // 如果用户选择包含敏感信息，需要获取真实的token
    if (includeSensitive) {
      try {
        const realToken = await CryptoUtils.getApiToken()
        if (realToken && config.notion.enabled) {
          config = {
            ...config,
            notion: {
              ...config.notion,
              apiToken: realToken,
            },
          }
        }
      } catch (error) {
        console.warn('Failed to get sensitive token for export:', error)
      }

      try {
        const joplinToken = await CryptoUtils.getJoplinApiToken()
        if (joplinToken && config.joplin?.enabled) {
          config = {
            ...config,
            joplin: {
              ...config.joplin,
              apiToken: joplinToken,
            },
          }
        }
      } catch (error) {
        console.warn('Failed to get Joplin token for export:', error)
      }
    }

    const serialized = serializeConfig(config)

    if (as === 'string') {
      return serialized
    }

    return new Blob([serialized], { type: 'application/json' })
  }

  async importConfig(raw: string | Blob): Promise<AppConfig> {
    const content = typeof raw === 'string' ? raw : await raw.text()
    const { config } = deserializeConfig(content)

    const validation = await this.validateConfig(config)
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '))
    }

    // 检查配置中是否包含敏感信息
    const hasSensitiveToken = config.notion.apiToken && config.notion.apiToken !== '***encrypted***'
    const hasSensitiveJoplinToken = config.joplin?.apiToken

    if (hasSensitiveToken && config.notion.enabled) {
      // 如果导入的配置包含真实的token，需要加密存储
      try {
        await CryptoUtils.storeApiToken(config.notion.apiToken)
        // 清除配置中的明文token，替换为加密占位符
        config.notion.apiToken = '***encrypted***'
      } catch (error) {
        console.warn('Failed to encrypt imported token:', error)
        // 如果加密失败，保持明文（但这种情况很少见）
      }
    } else {
      // 如果导入的配置没有敏感信息，清除现有的加密token
      await CryptoUtils.clearApiToken()
    }

    if (config.joplin?.enabled && hasSensitiveJoplinToken) {
      try {
        await CryptoUtils.storeJoplinApiToken(config.joplin.apiToken)
        config.joplin.apiToken = ''
      } catch (error) {
        console.warn('Failed to encrypt imported Joplin token:', error)
        // 如果加密失败，保持明文以便用户可以手动处理
      }
    } else {
      await CryptoUtils.clearJoplinApiToken()
      if (config.joplin) {
        config.joplin.apiToken = ''
      }
    }

    await this.saveConfig(config)

    return config
  }
}

export const configStorage = new ConfigStorage()
