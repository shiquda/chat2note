import { ChatConversation } from '../types/chat'
import { NotionExportResult } from '../types/export'
import { configStorage } from '../config/storage'
import { CryptoUtils } from '../utils/crypto'
import { markdownToBlocks } from '@tryfabric/martian'
import { resolvePlatformLabel } from '../utils/platform'
import t from '../i18n'
import {
  convertMathFormula,
  generateConversationMarkdown,
  type ConversationMarkdownTemplates,
} from '../utils/markdown'
import type { NotionBlock } from '../types/notion'

// 自定义 Notion 客户端，使用浏览器 fetch API
class NotionClient {
  private apiToken: string

  constructor(apiToken: string) {
    this.apiToken = apiToken
  }

  async request(
    endpoint: string,
    options: {
      method?: string
      headers?: Record<string, string>
      body?: unknown
    } = {}
  ) {
    const url = `https://api.notion.com/v1/${endpoint}`

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Notion API error: ${response.status} ${error}`)
    }

    return response.json()
  }

  users() {
    return {
      me: () => this.request('users/me'),
    }
  }

  pages() {
    return {
      create: (data: any) =>
        this.request('pages', {
          method: 'POST',
          body: data,
        }),
    }
  }

  blocks() {
    return {
      children: {
        append: (blockId: string, data: any) =>
          this.request(`blocks/${blockId}/children`, {
            method: 'PATCH',
            body: data,
          }),
      },
    }
  }

  databases() {
    return {
      retrieve: (databaseId: string) => this.request(`databases/${databaseId}`),
    }
  }
}

export interface NotionPageProperties {
  title: string
  url?: string
  exportedAt?: string
  platform?: string
  messageCount?: number
  tags?: string[]
}

export interface NotionServiceConfig {
  apiToken: string
  databaseId: string
  propertyMappings?: import('../types/config').NotionPropertyMappings
  includeProperties?: boolean // 是否导出数据库属性
}

export class NotionService {
  private client: NotionClient | null = null
  private config: NotionServiceConfig | null = null
  private databaseProperties: Record<string, { type: string }> | null = null

  constructor() {
    // 构造函数
  }

  private async ensureDatabaseSchema(force = false): Promise<void> {
    if (!this.client || !this.config) {
      throw new Error('Notion service not initialized')
    }

    if (!force && this.databaseProperties) {
      return
    }

    try {
      const database = await this.client.databases().retrieve(this.config.databaseId)
      this.databaseProperties = (database as any)?.properties ?? {}
    } catch (error) {
      console.error('Failed to load Notion database schema:', error)
      this.databaseProperties = {}
    }
  }

  private getTitlePropertyName(): string {
    if (!this.databaseProperties) {
      return 'title'
    }

    const entry = Object.entries(this.databaseProperties).find(
      ([, schema]) => schema?.type === 'title'
    )
    if (entry) {
      return entry[0]
    }

    console.warn('Notion database title property not found, defaulting to "title"')
    return 'title'
  }

  private getPropertyKey(
    mappingKey: keyof import('../types/config').NotionPropertyMappings,
    expectedType: string
  ): string | undefined {
    if (!this.databaseProperties || !this.config?.propertyMappings) {
      return undefined
    }

    const mapping = this.config.propertyMappings[mappingKey]
    if (!mapping || !mapping.enabled) {
      return undefined
    }

    // First, try the configured property name
    const preferredProperty = this.databaseProperties[mapping.propertyName]
    if (preferredProperty?.type === expectedType) {
      return mapping.propertyName
    }

    // Then try fallback names
    if (mapping.fallbackNames) {
      for (const fallbackName of mapping.fallbackNames) {
        const fallbackProperty = this.databaseProperties[fallbackName]
        if (fallbackProperty?.type === expectedType) {
          return fallbackName
        }
      }
    }

    return undefined
  }
  /**
   * 初始化Notion服务
   */
  async initialize(config: NotionServiceConfig): Promise<void> {
    try {
      this.config = config
      this.client = new NotionClient(config.apiToken)

      // 测试连接
      await this.testConnection()

      await this.ensureDatabaseSchema(true)
    } catch (error) {
      console.error('Failed to initialize Notion service:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to initialize Notion service: ${errorMessage}`)
    }
  }

  /**
   * 测试Notion连接
   */
  async testConnection(): Promise<boolean> {
    if (!this.client) {
      throw new Error('Notion client not initialized')
    }

    try {
      const response = await this.client.users().me()
      console.log('Notion connection test successful:', response)
      return true
    } catch (error) {
      console.error('Notion connection test failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to connect to Notion API: ${errorMessage}`)
    }
  }

  /**
   * 导出对话到Notion
   */
  async exportConversation(
    conversation: ChatConversation,
    options: {
      includeMetadata?: boolean
      format?: 'markdown' | 'plain'
      templates?: ConversationMarkdownTemplates
    } = {}
  ): Promise<NotionExportResult> {
    if (!this.client || !this.config) {
      throw new Error('Notion service not initialized')
    }

    try {
      const { includeMetadata = true, format = 'markdown' } = options

      // 准备页面属性（根据config.includeProperties决定是否包含元信息）
      const pageProperties = this.preparePageProperties(conversation)

      // 准备页面内容（includeMetadata控制Markdown正文中的元信息）
      const pageContent = this.preparePageContent(
        conversation,
        format,
        includeMetadata,
        options.templates
      )

      // 创建Notion页面
      const page = await this.createPage(pageProperties, pageContent)

      const pageUrl = `https://www.notion.so/${page.id.replace(/-/g, '')}`

      return {
        success: true,
        message: t('notification_export_success', ['Notion', 'Markdown']),
        pageId: page.id,
        pageUrl: pageUrl,
        data: {
          id: page.id,
          url: pageUrl,
          title: conversation.title,
        },
      }
    } catch (error) {
      console.error('Failed to export conversation to Notion:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * 准备页面属性
   */
  private preparePageProperties(conversation: ChatConversation): NotionPageProperties {
    const platformLabel = resolvePlatformLabel(conversation)
    const messageCount = conversation.messages.length

    const properties: NotionPageProperties = {
      title: conversation.title,
      messageCount,
    }

    // 根据配置决定是否导出数据库属性
    const includeProperties = this.config?.includeProperties ?? true
    if (includeProperties) {
      properties.url = conversation.url
      properties.exportedAt = new Date(conversation.extractedAt).toISOString()
      properties.platform = platformLabel
      properties.tags = this.buildConversationTags(conversation, platformLabel)
    }

    return properties
  }

  private buildConversationTags(conversation: ChatConversation, platformLabel: string): string[] {
    const candidateTags = [
      ...(Array.isArray(conversation.tags) ? conversation.tags : []),
      'Chat2Note',
      platformLabel,
    ]

    return Array.from(new Set(candidateTags.map(tag => tag.trim()).filter(tag => tag.length > 0)))
  }

  /**
   * 准备页面内容
   */
  private preparePageContent(
    conversation: ChatConversation,
    format: 'markdown' | 'plain',
    includeMetadata: boolean,
    templates?: ConversationMarkdownTemplates
  ): NotionBlock[] {
    if (format === 'markdown') {
      // 使用martian库处理完整的markdown内容
      return this.prepareMarkdownContent(conversation, includeMetadata, templates)
    } else {
      // 纯文本格式保持原有逻辑
      return this.preparePlainContent(conversation, includeMetadata)
    }
  }

  /**
   * 准备Markdown格式的内容（使用martian库）
   */
  private prepareMarkdownContent(
    conversation: ChatConversation,
    includeMetadata: boolean,
    templates?: ConversationMarkdownTemplates
  ): NotionBlock[] {
    const markdownContent = generateConversationMarkdown(conversation, includeMetadata, templates)

    // 使用martian库将完整的markdown转换为Notion blocks
    return this.parseMarkdownToBlocks(markdownContent)
  }

  /**
   * 准备纯文本格式的内容
   */
  private preparePlainContent(
    conversation: ChatConversation,
    includeMetadata: boolean
  ): NotionBlock[] {
    const content: NotionBlock[] = []
    const platformLabel = resolvePlatformLabel(conversation)

    // 添加标题
    content.push({
      object: 'block',
      type: 'heading_1',
      heading_1: {
        rich_text: [{ type: 'text', text: { content: conversation.title } }],
      },
    })

    if (includeMetadata) {
      // 添加元数据
      content.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: 'Conversation Details' } }],
        },
      })

      content.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            { type: 'text', text: { content: 'Source: ' } },
            { type: 'text', text: { content: conversation.url, link: { url: conversation.url } } },
          ],
        },
      })

      content.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            { type: 'text', text: { content: 'Platform: ' } },
            { type: 'text', text: { content: platformLabel } },
          ],
        },
      })

      content.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            { type: 'text', text: { content: 'Exported at: ' } },
            {
              type: 'text',
              text: { content: new Date(conversation.extractedAt).toLocaleString() },
            },
          ],
        },
      })

      // 添加分隔线
      content.push({
        object: 'block',
        type: 'divider',
        divider: {},
      })
    }

    // 添加对话内容
    conversation.messages.forEach(message => {
      const role = message.role === 'user' ? 'User' : 'Assistant'

      // 添加消息标题
      content.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: role } }],
        },
      })

      // 添加消息内容（纯文本），转换LaTeX公式格式
      const processedContent = convertMathFormula(message.content)
      content.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: processedContent } }],
        },
      })
    })

    return content
  }

  /**
   * 使用martian库将markdown转换为Notion blocks
   */
  private parseMarkdownToBlocks(markdown: string): NotionBlock[] {
    try {
      // 预处理markdown以修复表格列数不一致问题
      const fixedMarkdown = this.fixTableInconsistencies(markdown)

      // 使用martian库进行专业的markdown到Notion blocks转换
      const blocks = markdownToBlocks(fixedMarkdown)
      return blocks
    } catch (error) {
      console.error('Failed to convert markdown to Notion blocks:', error)
      // 如果martian转换失败，提供一个基本的fallback
      return [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: markdown } }],
          },
        },
      ] as NotionBlock[]
    }
  }

  /**
   * 修复Markdown表格中的列数不一致问题
   */
  private fixTableInconsistencies(markdown: string): string {
    const lines = markdown.split('\n')
    const result: string[] = []
    let inTable = false
    let tableColumnCount = 0
    let currentTableLines: string[] = []

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmedLine = line.trim()

      // 检测表格开始（只处理真正的表格行，包含 | 开头和结尾的）
      if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|') && !inTable) {
        inTable = true
        currentTableLines = []

        // 确定列数（基于表头，去掉首尾空元素）
        const parts = line.split('|')
        const contentParts = parts.slice(1, -1) // 去掉首尾空元素
        tableColumnCount = contentParts.length

        currentTableLines.push(line)
        continue
      }

      // 检测表格结束
      if (
        inTable &&
        (!trimmedLine.includes('|') || trimmedLine === '' || !trimmedLine.startsWith('|'))
      ) {
        // 处理当前表格
        const fixedTableLines = this.fixTableColumns(currentTableLines, tableColumnCount)
        result.push(...fixedTableLines)

        inTable = false
        currentTableLines = []
        result.push(line)
        continue
      }

      // 在表格内部
      if (inTable) {
        currentTableLines.push(line)
        continue
      }

      // 不在表格中
      result.push(line)
    }

    // 处理文件末尾的表格
    if (inTable && currentTableLines.length > 0) {
      const fixedTableLines = this.fixTableColumns(currentTableLines, tableColumnCount)
      result.push(...fixedTableLines)
    }

    return result.join('\n')
  }

  /**
   * 修复表格行中的列数
   */
  private fixTableColumns(tableLines: string[], expectedColumnCount: number): string[] {
    const fixedLines: string[] = []

    for (const line of tableLines) {
      if (!line.trim().includes('|')) {
        fixedLines.push(line)
        continue
      }

      // 分割列
      const parts = line.split('|')

      // 如果是分隔线（如 |---|---|---），跳过修复
      if (parts.every(part => part.trim().match(/^:?-+:?$/))) {
        fixedLines.push(line)
        continue
      }

      // 获取内容部分（去掉首尾空元素）
      const contentParts = parts.slice(1, -1)

      // 修复列数
      if (contentParts.length < expectedColumnCount) {
        // 列数不足，添加空列
        const missingColumns = expectedColumnCount - contentParts.length
        const extraColumns = Array(missingColumns).fill(' ')
        const newContentParts = [...contentParts, ...extraColumns]
        const fixedLine = '|' + newContentParts.join('|') + '|'
        fixedLines.push(fixedLine)
      } else if (contentParts.length > expectedColumnCount) {
        // 列数过多，截断或合并多余列
        const fixedContentParts = contentParts.slice(0, expectedColumnCount)

        // 如果最后一列被截断，尝试合并多余内容
        if (contentParts.length > expectedColumnCount) {
          const remainingParts = contentParts.slice(expectedColumnCount)
          const lastColumn =
            fixedContentParts[fixedContentParts.length - 1] + ' ' + remainingParts.join(' ')
          fixedContentParts[fixedContentParts.length - 1] = lastColumn.trim()
        }

        const fixedLine = '|' + fixedContentParts.join('|') + '|'
        fixedLines.push(fixedLine)
      } else {
        // 列数正确，保持原样
        fixedLines.push(line)
      }
    }

    return fixedLines
  }

  /**
   * 创建Notion页面（支持超过100个blocks的内容）
   */
  private async createPage(properties: NotionPageProperties, content: NotionBlock[]) {
    if (!this.client || !this.config) {
      throw new Error('Notion service not initialized')
    }

    try {
      await this.ensureDatabaseSchema()

      const titlePropertyName = this.getTitlePropertyName()
      const pagePropertiesPayload: Record<string, unknown> = {
        [titlePropertyName]: {
          type: 'title',
          title: [{ type: 'text', text: { content: properties.title } }],
        },
      }

      if (properties.url) {
        const urlPropertyName = this.getPropertyKey('url', 'url')
        if (urlPropertyName) {
          pagePropertiesPayload[urlPropertyName] = {
            type: 'url',
            url: properties.url,
          }
        } else {
          console.warn('URL property not found in Notion database schema, skipping URL field.')
        }
      }

      if (properties.exportedAt) {
        const datePropertyName = this.getPropertyKey('exportedAt', 'date')
        if (datePropertyName) {
          pagePropertiesPayload[datePropertyName] = {
            type: 'date',
            date: { start: properties.exportedAt },
          }
        } else {
          console.warn(
            'Date property not found in Notion database schema, skipping exported timestamp field.'
          )
        }
      }

      if (properties.platform) {
        // Try select type first (recommended), then rich_text as fallback
        let platformPropertyName = this.getPropertyKey('platform', 'select')
        if (platformPropertyName) {
          pagePropertiesPayload[platformPropertyName] = {
            type: 'select',
            select: { name: properties.platform },
          }
        } else {
          // Try rich_text as fallback
          platformPropertyName = this.getPropertyKey('platform', 'rich_text')
          if (platformPropertyName) {
            pagePropertiesPayload[platformPropertyName] = {
              type: 'rich_text',
              rich_text: [{ type: 'text', text: { content: properties.platform } }],
            }
          } else {
            console.warn(
              'Platform property not found in Notion database schema (tried select and rich_text), skipping platform field.'
            )
          }
        }
      }

      if (typeof properties.messageCount === 'number') {
        const messageCountPropertyName = this.getPropertyKey('messageCount', 'number')
        if (messageCountPropertyName) {
          pagePropertiesPayload[messageCountPropertyName] = {
            type: 'number',
            number: properties.messageCount,
          }
        } else {
          console.warn(
            'Number property not found in Notion database schema, skipping message count field.'
          )
        }
      }

      if (properties.tags?.length) {
        let tagsPropertyName = this.getPropertyKey('tags', 'multi_select')
        if (tagsPropertyName) {
          pagePropertiesPayload[tagsPropertyName] = {
            type: 'multi_select',
            multi_select: properties.tags.map(tag => ({ name: tag })),
          }
        } else {
          tagsPropertyName = this.getPropertyKey('tags', 'rich_text')
          if (tagsPropertyName) {
            pagePropertiesPayload[tagsPropertyName] = {
              type: 'rich_text',
              rich_text: [{ type: 'text', text: { content: properties.tags.join(', ') } }],
            }
          } else {
            console.warn(
              'Tags property not found in Notion database schema (tried multi_select and rich_text), skipping tags field.'
            )
          }
        }
      }

      // Notion API 限制：一次请求最多 100 个 blocks
      const BLOCKS_LIMIT = 100
      const initialBlocks = content.slice(0, BLOCKS_LIMIT)
      const remainingBlocks = content.slice(BLOCKS_LIMIT)

      console.log(
        `[Notion] Creating page with ${initialBlocks.length} blocks (${remainingBlocks.length} remaining)`
      )

      // 创建页面，包含前 100 个 blocks
      const page = await this.client.pages().create({
        parent: {
          type: 'database_id',
          database_id: this.config.databaseId,
        },
        properties: pagePropertiesPayload,
        children: initialBlocks,
      })

      // 如果还有剩余的 blocks，分批追加
      if (remainingBlocks.length > 0) {
        console.log(`[Notion] Appending ${remainingBlocks.length} remaining blocks...`)
        await this.appendBlocksInBatches(page.id, remainingBlocks, BLOCKS_LIMIT)
      }

      return page
    } catch (error) {
      console.error('Failed to create Notion page:', error)
      throw new Error('Failed to create Notion page')
    }
  }

  /**
   * 分批追加 blocks 到页面
   */
  private async appendBlocksInBatches(
    pageId: string,
    blocks: NotionBlock[],
    batchSize: number
  ): Promise<void> {
    if (!this.client) {
      throw new Error('Notion client not initialized')
    }

    let offset = 0
    while (offset < blocks.length) {
      const batch = blocks.slice(offset, offset + batchSize)
      console.log(`[Notion] Appending batch: ${offset + 1}-${offset + batch.length}`)

      try {
        await this.client.blocks().children.append(pageId, {
          children: batch,
        })
      } catch (error) {
        console.error(
          `[Notion] Failed to append batch ${offset + 1}-${offset + batch.length}:`,
          error
        )
        throw error
      }

      offset += batchSize
    }

    console.log(`[Notion] Successfully appended all ${blocks.length} blocks`)
  }

  /**
   * 检查数据库是否存在和可访问
   */
  async checkDatabaseAccess(): Promise<boolean> {
    if (!this.client || !this.config) {
      throw new Error('Notion service not initialized')
    }

    try {
      const database = await this.client.databases().retrieve(this.config.databaseId)
      console.log('Database access verified:', database.id)
      return true
    } catch (error) {
      console.error('Database access check failed:', error)
      return false
    }
  }

  /**
   * 从存储的配置创建Notion服务实例
   */
  static async createFromStorage(): Promise<NotionService | null> {
    try {
      const config = await configStorage.getConfig()
      if (!config || !config.notion.enabled) {
        return null
      }

      const apiToken = await CryptoUtils.getApiToken()
      if (!apiToken || !config.notion.databaseId) {
        return null
      }

      const service = new NotionService()
      await service.initialize({
        apiToken,
        databaseId: config.notion.databaseId,
        propertyMappings: config.notion.propertyMappings,
        includeProperties: config.notion.includeProperties,
      })

      return service
    } catch (error) {
      console.error('Failed to create Notion service from storage:', error)
      return null
    }
  }
}

// 导出单例实例
export const notionService = new NotionService()
