import { ChatConversation } from '../types/chat'
import type { AppConfig } from '../types/config'
import {
  ExportOptions,
  ExportResult,
  LocalExportResult,
  ClipboardExportResult,
  ObsidianExportResult,
  SiyuanExportResult,
  JoplinExportResult,
} from '../types/export'
import { NotionService } from './notion'
import { configStorage } from '../config/storage'
import t from '../i18n'
import { resolvePlatformLabel } from '../utils/platform'
import { ObsidianService } from './obsidian'
import { SiyuanService } from './siyuan'
import { JoplinService } from './joplin'
import { DEFAULT_CONFIG } from '../config/defaults'
import { convertMathFormula, generateConversationMarkdown } from '../utils/markdown'

export class ExportService {
  async exportConversation(
    conversation: ChatConversation,
    options: ExportOptions
  ): Promise<ExportResult> {
    try {
      const config = await configStorage.getConfig()
      const exportConfig = {
        ...DEFAULT_CONFIG.export,
        ...(config?.export ?? {}),
      }

      const normalizedOptions: ExportOptions = {
        includeMetadata: options.includeMetadata ?? exportConfig.includeMetadata,
        format: options.format ?? exportConfig.defaultFormat,
        target: options.target ?? exportConfig.defaultTarget,
        scope: options.scope ?? exportConfig.defaultScope,
      }

      if (normalizedOptions.target === 'obsidian' && config?.obsidian?.strictMarkdown !== false) {
        normalizedOptions.format = 'markdown'
      }

      if (normalizedOptions.target === 'siyuan' || normalizedOptions.target === 'joplin') {
        normalizedOptions.format = 'markdown'
      }

      switch (normalizedOptions.target) {
        case 'local':
          return this.exportToLocalFile(conversation, normalizedOptions, exportConfig)
        case 'notion':
          return this.exportToNotion(conversation, normalizedOptions, exportConfig)
        case 'clipboard':
          return this.exportToClipboard(conversation, normalizedOptions, exportConfig)
        case 'obsidian':
          return this.exportToObsidian(conversation, normalizedOptions, exportConfig)
        case 'siyuan':
          return this.exportToSiyuan(conversation, normalizedOptions, exportConfig)
        case 'joplin':
          return this.exportToJoplin(conversation, normalizedOptions, exportConfig)
        default:
          throw new Error(`Unsupported export target: ${normalizedOptions.target}`)
      }
    } catch (error) {
      console.error('Export failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : t('error_unknown_error_occurred'),
      }
    }
  }

  async exportToLocalFile(
    conversation: ChatConversation,
    options: ExportOptions,
    exportConfig: AppConfig['export']
  ): Promise<LocalExportResult> {
    try {
      const content = this.generateContent(conversation, options, exportConfig)
      const filename = this.generateFilename(conversation, options.format)
      const mimeType = this.getMimeType(options.format)

      await this.downloadFile(filename, content, mimeType)

      return {
        success: true,
        message: 'Conversation exported to local file successfully',
        filename,
        fileSize: content.length,
        data: { filename, contentLength: content.length },
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export to local file',
      }
    }
  }

  async exportToNotion(
    conversation: ChatConversation,
    options: ExportOptions,
    exportConfig: AppConfig['export']
  ): Promise<ObsidianExportResult> {
    try {
      const isConfigured = await configStorage.isNotionConfigured()
      if (!isConfigured) {
        throw new Error(
          'Notion integration is not configured. Please configure it in the options page.'
        )
      }

      const notion = await NotionService.createFromStorage()
      if (!notion) {
        throw new Error('Failed to initialize Notion service')
      }

      return await notion.exportConversation(conversation, {
        includeMetadata: options.includeMetadata,
        format: options.format === 'txt' ? 'plain' : 'markdown',
        templates: {
          markdownTemplate: exportConfig.markdownTemplate,
          messageTemplate: exportConfig.messageTemplate,
        },
      })
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export to Notion',
      }
    }
  }

  async exportToClipboard(
    conversation: ChatConversation,
    options: ExportOptions,
    exportConfig: AppConfig['export']
  ): Promise<ClipboardExportResult> {
    try {
      const content = this.generateContent(conversation, options, exportConfig)

      return {
        success: true,
        message: 'Clipboard content ready for content script processing',
        contentLength: content.length,
        data: {
          contentLength: content.length,
          content,
          requiresContentScript: true,
        },
      }
    } catch (error) {
      console.error('Clipboard export error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to prepare clipboard content',
      }
    }
  }

  async exportToObsidian(
    conversation: ChatConversation,
    options: ExportOptions,
    exportConfig: AppConfig['export']
  ): Promise<ObsidianExportResult> {
    const service = await ObsidianService.createFromStorage()
    if (!service) {
      return {
        success: false,
        error:
          'Obsidian export is not configured. Please enable it in the settings before exporting.',
      }
    }

    return service.exportConversation(conversation, {
      includeMetadata: options.includeMetadata ?? true,
      format: options.format,
      templates: {
        markdownTemplate: exportConfig.markdownTemplate,
        messageTemplate: exportConfig.messageTemplate,
      },
    })
  }

  async exportToSiyuan(
    conversation: ChatConversation,
    options: ExportOptions,
    exportConfig: AppConfig['export']
  ): Promise<SiyuanExportResult> {
    const service = await SiyuanService.createFromStorage()
    if (!service) {
      return {
        success: false,
        error: t('notification_siyuan_not_configured'),
      }
    }

    return service.exportConversation(
      conversation,
      {
        includeMetadata: options.includeMetadata,
        format: 'markdown',
      },
      {
        markdownTemplate: exportConfig.markdownTemplate,
        messageTemplate: exportConfig.messageTemplate,
      }
    )
  }

  async exportToJoplin(
    conversation: ChatConversation,
    options: ExportOptions,
    exportConfig: AppConfig['export']
  ): Promise<JoplinExportResult> {
    const service = await JoplinService.createFromStorage()
    if (!service) {
      return {
        success: false,
        error: t('notification_joplin_not_configured'),
      }
    }

    return service.exportConversation(conversation, {
      includeMetadata: options.includeMetadata ?? true,
      format: 'markdown',
      templates: {
        markdownTemplate: exportConfig.markdownTemplate,
        messageTemplate: exportConfig.messageTemplate,
      },
    })
  }

  private generateContent(
    conversation: ChatConversation,
    options: ExportOptions,
    exportConfig: AppConfig['export']
  ): string {
    switch (options.format) {
      case 'markdown':
        return this.generateMarkdown(conversation, options.includeMetadata ?? true, exportConfig)
      case 'json':
        return this.generateJson(conversation, options.includeMetadata ?? true)
      case 'txt':
        return this.generatePlainText(conversation, options.includeMetadata ?? true)
      default:
        throw new Error(`Unsupported format: ${options.format}`)
    }
  }

  private generateMarkdown(
    conversation: ChatConversation,
    includeMetadata: boolean,
    exportConfig: AppConfig['export']
  ): string {
    return generateConversationMarkdown(conversation, includeMetadata, {
      markdownTemplate: exportConfig.markdownTemplate,
      messageTemplate: exportConfig.messageTemplate,
    })
  }

  private generateJson(conversation: ChatConversation, includeMetadata: boolean): string {
    const platformLabel = resolvePlatformLabel(conversation)
    const data = {
      title: conversation.title,
      url: conversation.url,
      extractedAt: conversation.extractedAt,
      ...(includeMetadata && { exportedAt: new Date().toISOString(), platform: platformLabel }),
      messages: conversation.messages.map(message => ({
        role: message.role,
        content: message.content,
      })),
    }

    return JSON.stringify(data, null, 2)
  }

  private generatePlainText(conversation: ChatConversation, includeMetadata: boolean): string {
    let text = `${conversation.title}\n`
    text += '='.repeat(conversation.title.length) + '\n\n'

    if (includeMetadata) {
      const platformLabel = resolvePlatformLabel(conversation)
      text += `Source: ${conversation.url}\n`
      text += `Platform: ${platformLabel}\n`
      text += `Exported at: ${new Date(conversation.extractedAt).toLocaleString()}\n\n`
      text += '-'.repeat(50) + '\n\n'
    }

    conversation.messages.forEach(message => {
      const role = message.role === 'user' ? 'User' : 'Assistant'
      text += `${role}:\n`
      text += convertMathFormula(message.content) + '\n\n'
    })

    return text
  }

  private generateFilename(conversation: ChatConversation, format: string): string {
    const timestamp = new Date(conversation.extractedAt)
    const dateStr = timestamp.toISOString().split('T')[0]
    const timeStr = timestamp.toTimeString().split(' ')[0].replace(/:/g, '-')

    const cleanTitle = conversation.title
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, '_')
      .slice(0, 50)

    const extensionMap: Record<string, string> = {
      markdown: 'md',
      json: 'json',
      txt: 'txt',
    }

    return `${cleanTitle}_${dateStr}_${timeStr}.${extensionMap[format] || format}`
  }

  private getMimeType(format: string): string {
    switch (format) {
      case 'markdown':
        return 'text/markdown'
      case 'json':
        return 'application/json'
      case 'txt':
        return 'text/plain'
      default:
        return 'text/plain'
    }
  }

  private async downloadFile(filename: string, content: string, mimeType: string): Promise<void> {
    const dataUrl = `data:${mimeType};charset=utf-8,${encodeURIComponent(content)}`

    await new Promise<void>((resolve, reject) => {
      chrome.downloads.download(
        {
          url: dataUrl,
          filename,
          saveAs: false,
        },
        () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            resolve()
          }
        }
      )
    })
  }

  async getDefaultExportOptions(): Promise<ExportOptions> {
    const config = await configStorage.getConfig()
    if (!config) {
      return {
        format: 'markdown',
        target: 'local',
        includeMetadata: true,
        scope: 'selected',
      }
    }

    return {
      format: config.export.defaultFormat,
      target: config.export.defaultTarget,
      includeMetadata: config.export.includeMetadata,
      scope: config.export.defaultScope ?? 'selected',
    }
  }

  validateExportOptions(options: ExportOptions): boolean {
    const validFormats = ['markdown', 'json', 'txt']
    const validTargets = ['local', 'notion', 'clipboard', 'obsidian', 'siyuan', 'joplin']
    const validScopes = ['all', 'selected']

    return (
      validFormats.includes(options.format) &&
      validTargets.includes(options.target) &&
      (typeof options.includeMetadata === 'boolean' ||
        typeof options.includeMetadata === 'undefined') &&
      validScopes.includes((options.scope ?? 'selected') as string)
    )
  }
}

export const exportService = new ExportService()
