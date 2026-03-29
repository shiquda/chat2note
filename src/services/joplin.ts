import { ChatConversation } from '../types/chat'
import { JoplinExportResult } from '../types/export'
import { configStorage } from '../config/storage'
import { CryptoUtils } from '../utils/crypto'
import { resolvePlatformLabel } from '../utils/platform'
import t from '../i18n'
import {
  convertMathFormula,
  generateConversationMarkdown,
  type ConversationMarkdownTemplates,
} from '../utils/markdown'

// Joplin API 响应类型
interface JoplinNote {
  id: string
  title: string
  body: string
  parent_id?: string
  user_created_time?: number
  user_updated_time?: number
}

interface JoplinFolder {
  id: string
  title: string
  parent_id?: string
}

interface JoplinTag {
  id: string
  title: string
}

interface JoplinAuthResponse {
  auth_token?: string
  status?: 'waiting' | 'accepted' | 'rejected'
  token?: string
}

// Joplin API 客户端
class JoplinClient {
  private apiUrl: string
  private apiToken: string

  constructor(apiUrl: string, apiToken: string) {
    this.apiUrl = apiUrl.replace(/\/$/, '') // 移除末尾斜杠
    this.apiToken = apiToken
  }

  private buildUrl(endpoint: string): string {
    const url = `${this.apiUrl}/${endpoint}`
    const separator = endpoint.includes('?') ? '&' : '?'
    return `${url}${separator}token=${encodeURIComponent(this.apiToken)}`
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async request<T = unknown>(endpoint: string, options: any = {}): Promise<T> {
    const url = this.buildUrl(endpoint)

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Joplin API error: ${response.status} ${errorText}`)
      }

      return response.json()
    } catch (error) {
      console.error('[JoplinClient] Request failed:', error)
      throw error
    }
  }

  // 测试连接
  async ping(): Promise<boolean> {
    try {
      const url = this.buildUrl('ping')
      const response = await fetch(url)

      if (!response.ok) {
        return false
      }

      const text = await response.text()
      // Joplin ping 返回 "JoplinClipperServer" 文本
      return text === 'JoplinClipperServer'
    } catch (error) {
      console.error('[JoplinClient] Ping failed:', error)
      return false
    }
  }

  // 获取笔记本列表
  async getFolders(): Promise<JoplinFolder[]> {
    try {
      const response = await this.request<{ items: JoplinFolder[] }>('folders')
      return response.items || []
    } catch (error) {
      console.error('[JoplinClient] Failed to get folders:', error)
      return []
    }
  }

  // 获取标签列表
  async getTags(): Promise<JoplinTag[]> {
    try {
      const response = await this.request<{ items: JoplinTag[] }>('tags')
      return response.items || []
    } catch (error) {
      console.error('[JoplinClient] Failed to get tags:', error)
      return []
    }
  }

  // 创建笔记
  async createNote(params: {
    title: string
    body: string
    parent_id?: string
  }): Promise<JoplinNote> {
    return this.request<JoplinNote>('notes', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  }

  // 根据名称查找或创建标签
  async findOrCreateTag(tagName: string): Promise<string> {
    const tags = await this.getTags()
    const existingTag = tags.find(tag => tag.title === tagName)

    if (existingTag) {
      return existingTag.id
    }

    // 创建新标签
    const newTag = await this.request<JoplinTag>('tags', {
      method: 'POST',
      body: JSON.stringify({ title: tagName }),
    })

    return newTag.id
  }

  // 将标签附加到笔记
  async attachTagToNote(noteId: string, tagId: string): Promise<void> {
    await this.request(`tags/${tagId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ id: noteId }),
    })
  }

  // 程序化授权：请求授权
  async requestAuth(): Promise<string> {
    const response = await this.request<JoplinAuthResponse>('auth', {
      method: 'POST',
    })

    if (!response.auth_token) {
      throw new Error('Failed to get auth token from Joplin')
    }

    return response.auth_token
  }

  // 程序化授权：检查授权状态
  async checkAuthStatus(authToken: string): Promise<'waiting' | 'accepted' | 'rejected'> {
    try {
      const response = await this.request<JoplinAuthResponse>(`auth/check?auth_token=${authToken}`)

      if (response.status === 'accepted' && response.token) {
        // 授权成功，返回的 token 就是最终的 API token
        this.apiToken = response.token
        return 'accepted'
      }

      return response.status || 'waiting'
    } catch {
      return 'rejected'
    }
  }
}

export interface JoplinServiceConfig {
  apiUrl: string
  apiToken: string
  defaultNotebookId?: string
  defaultTags?: string[]
  includeMetadata?: boolean
}

export class JoplinService {
  private client: JoplinClient | null = null
  private config: JoplinServiceConfig | null = null

  constructor() {
    // 构造函数
  }

  /**
   * 初始化 Joplin 服务
   */
  async initialize(config: JoplinServiceConfig): Promise<void> {
    try {
      this.config = config
      this.client = new JoplinClient(config.apiUrl, config.apiToken)

      // 测试连接
      const isConnected = await this.testConnection()
      if (!isConnected) {
        throw new Error(
          'Failed to connect to Joplin. Please check if Joplin is running and Web Clipper is enabled.'
        )
      }
    } catch (error) {
      console.error('[JoplinService] Failed to initialize:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      throw new Error(`Failed to initialize Joplin service: ${errorMessage}`)
    }
  }

  /**
   * 测试 Joplin 连接
   */
  async testConnection(): Promise<boolean> {
    if (!this.client) {
      throw new Error('Joplin client not initialized')
    }

    try {
      const isConnected = await this.client.ping()
      console.log('[JoplinService] Connection test:', isConnected ? 'success' : 'failed')
      return isConnected
    } catch (error) {
      console.error('[JoplinService] Connection test failed:', error)
      return false
    }
  }

  /**
   * 导出对话到 Joplin
   */
  async exportConversation(
    conversation: ChatConversation,
    options: {
      includeMetadata?: boolean
      format?: 'markdown' | 'plain'
      templates?: ConversationMarkdownTemplates
    } = {}
  ): Promise<JoplinExportResult> {
    if (!this.client || !this.config) {
      throw new Error('Joplin service not initialized')
    }

    try {
      const { includeMetadata = true, format = 'markdown' } = options

      // 准备笔记内容
      const noteBody = this.prepareNoteContent(
        conversation,
        format,
        includeMetadata,
        options.templates
      )

      // 创建笔记
      const note = await this.client.createNote({
        title: conversation.title,
        body: noteBody,
        parent_id: this.config.defaultNotebookId || undefined,
      })

      // 附加标签
      if (this.config.defaultTags && this.config.defaultTags.length > 0) {
        await this.attachTags(note.id, this.config.defaultTags)
      }

      // 自动添加平台标签
      const platformLabel = resolvePlatformLabel(conversation)
      await this.attachTags(note.id, [platformLabel])

      // 构建笔记 URL (Joplin URL scheme)
      const noteUrl = `joplin://x-callback-url/openNote?id=${note.id}`

      return {
        success: true,
        message: t('notification_export_success', ['Joplin', 'Markdown']),
        noteId: note.id,
        noteUrl: noteUrl,
        notebookId: this.config.defaultNotebookId,
        tags: [...(this.config.defaultTags || []), platformLabel],
        data: {
          id: note.id,
          url: noteUrl,
          title: conversation.title,
        },
      }
    } catch (error) {
      console.error('[JoplinService] Failed to export conversation:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }
    }
  }

  /**
   * 准备笔记内容
   */
  private prepareNoteContent(
    conversation: ChatConversation,
    format: 'markdown' | 'plain',
    includeMetadata: boolean,
    templates?: ConversationMarkdownTemplates
  ): string {
    if (format === 'markdown') {
      return this.prepareMarkdownContent(conversation, includeMetadata, templates)
    } else {
      return this.preparePlainContent(conversation, includeMetadata)
    }
  }

  /**
   * 准备 Markdown 格式内容
   */
  private prepareMarkdownContent(
    conversation: ChatConversation,
    includeMetadata: boolean,
    templates?: ConversationMarkdownTemplates
  ): string {
    return generateConversationMarkdown(conversation, includeMetadata, templates)
  }

  /**
   * 准备纯文本格式内容
   */
  private preparePlainContent(conversation: ChatConversation, includeMetadata: boolean): string {
    const platformLabel = resolvePlatformLabel(conversation)
    let content = `# ${conversation.title}\n\n`

    if (includeMetadata) {
      content += `**Source:** ${conversation.url}\n`
      content += `**Platform:** ${platformLabel}\n`
      content += `**Exported at:** ${new Date(conversation.extractedAt).toLocaleString()}\n\n`
      content += '---\n\n'
    }

    conversation.messages.forEach(message => {
      const role = message.role === 'user' ? 'User' : 'Assistant'
      content += `## ${role}\n\n`

      // 转换 LaTeX 公式格式
      const processedContent = convertMathFormula(message.content)
      content += processedContent + '\n\n'
    })

    return content
  }

  /**
   * 附加标签到笔记
   */
  private async attachTags(noteId: string, tagNames: string[]): Promise<void> {
    if (!this.client || tagNames.length === 0) {
      return
    }

    try {
      for (const tagName of tagNames) {
        const tagId = await this.client.findOrCreateTag(tagName)
        await this.client.attachTagToNote(noteId, tagId)
      }
    } catch (error) {
      console.error('[JoplinService] Failed to attach tags:', error)
      // 标签附加失败不影响主流程
    }
  }

  /**
   * 获取笔记本列表
   */
  async getFolders(): Promise<JoplinFolder[]> {
    if (!this.client) {
      throw new Error('Joplin client not initialized')
    }

    return this.client.getFolders()
  }

  /**
   * 获取标签列表
   */
  async getTags(): Promise<JoplinTag[]> {
    if (!this.client) {
      throw new Error('Joplin client not initialized')
    }

    return this.client.getTags()
  }

  /**
   * 程序化授权流程
   */
  async requestProgrammaticAuth(): Promise<string> {
    if (!this.client) {
      throw new Error('Joplin client not initialized')
    }

    return this.client.requestAuth()
  }

  /**
   * 检查授权状态
   */
  async checkAuthStatus(authToken: string): Promise<'waiting' | 'accepted' | 'rejected'> {
    if (!this.client) {
      throw new Error('Joplin client not initialized')
    }

    return this.client.checkAuthStatus(authToken)
  }

  /**
   * 从存储的配置创建 Joplin 服务实例
   */
  static async createFromStorage(): Promise<JoplinService | null> {
    try {
      const config = await configStorage.getConfig()
      if (!config || !config.joplin.enabled) {
        return null
      }

      const apiToken = await CryptoUtils.getJoplinApiToken()
      if (!apiToken) {
        return null
      }

      const service = new JoplinService()
      await service.initialize({
        apiUrl: config.joplin.apiUrl,
        apiToken,
        defaultNotebookId: config.joplin.defaultNotebookId,
        defaultTags: config.joplin.defaultTags,
        includeMetadata: config.joplin.includeMetadata,
      })

      return service
    } catch (error) {
      console.error('[JoplinService] Failed to create from storage:', error)
      return null
    }
  }
}

// 导出单例实例
export const joplinService = new JoplinService()
