import { ChatConversation } from '../types/chat'
import { SiyuanConfig } from '../types/config'
import { ExportOptions, SiyuanExportResult } from '../types/export'
import { configStorage } from '../config/storage'
import { generateConversationMarkdown } from '../utils/markdown'
import t from '../i18n'

const FALLBACK_NOTE_TITLE = 'Chat2Note Export'

interface SiyuanApiResponse<T = unknown> {
  code: number
  msg?: string
  data?: T
}

type CreateDocResponse = string // 思源笔记直接返回文档ID字符串

export class SiyuanService {
  private constructor(private readonly config: SiyuanConfig) {}

  static async createFromStorage(): Promise<SiyuanService | null> {
    const appConfig = await configStorage.getConfig()
    console.log('[SiYuan] Raw config from storage:', appConfig?.siyuan)

    if (!appConfig?.siyuan || !appConfig.siyuan.enabled) {
      console.log('[SiYuan] SiYuan not enabled')
      return null
    }

    const { apiUrl, apiToken, notebookId } = appConfig.siyuan
    console.log('[SiYuan] Config check:', {
      hasApiUrl: !!apiUrl?.trim(),
      hasApiToken: !!apiToken?.trim(),
      hasNotebookId: !!notebookId?.trim(),
      setBlockAttributes: appConfig.siyuan.setBlockAttributes,
    })

    if (!apiUrl?.trim() || !apiToken?.trim() || !notebookId?.trim()) {
      console.log('[SiYuan] Missing required fields')
      return null
    }

    const service = new SiyuanService({
      ...appConfig.siyuan,
      apiUrl: apiUrl.trim(),
      apiToken: apiToken.trim(),
      notebookId: notebookId.trim(),
      folderPath: appConfig.siyuan.folderPath?.trim() ?? '',
    })

    console.log('[SiYuan] Service created successfully')
    return service
  }

  static create(config: SiyuanConfig): SiyuanService {
    return new SiyuanService({
      ...config,
      apiUrl: config.apiUrl?.trim() ?? '',
      apiToken: config.apiToken?.trim() ?? '',
      notebookId: config.notebookId?.trim() ?? '',
      folderPath: config.folderPath?.trim() ?? '',
    })
  }

  async testConnection(): Promise<boolean> {
    try {
      console.log('[SiYuan] Testing connection to:', this.config.apiUrl)

      if (!this.config.apiUrl) {
        console.error('[SiYuan] API URL is not configured')
        return false
      }

      // 使用用户提供的curl格式测试打开notebook
      const openNotebookUrl = `${this.config.apiUrl}/api/notebook/openNotebook`
      console.log('[SiYuan] Testing openNotebook with ID:', this.config.notebookId)

      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }

        // 添加Authorization头，思源笔记API可能需要它来正确识别请求
        if (this.config.apiToken) {
          headers['Authorization'] = `Token ${this.config.apiToken}`
        }

        const response = await fetch(openNotebookUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ notebook: this.config.notebookId }),
        })

        console.log('[SiYuan] openNotebook response status:', response.status)
        const responseText = await response.text()
        console.log('[SiYuan] openNotebook response:', responseText.substring(0, 200))

        if (response.ok && responseText.trim()) {
          console.log('[SiYuan] ✓ Successfully accessed notebook!')

          // 尝试解析JSON响应
          try {
            const parsed = JSON.parse(responseText)
            console.log('[SiYuan] Parsed response:', parsed)

            // 检查返回码是否符合文档格式
            if (parsed.code === 0) {
              console.log('[SiYuan] ✓ API response format is correct (code: 0)')
              return true
            } else {
              console.error('[SiYuan] API returned error code:', parsed.code)
              console.error('[SiYuan] Error message:', parsed.msg)
              return false
            }
          } catch (parseError) {
            console.log(
              '[SiYuan] Failed to parse JSON response:',
              parseError instanceof Error ? parseError.message : parseError
            )
            console.log('[SiYuan] Raw response:', responseText)
            return false
          }
        } else {
          console.error('[SiYuan] Failed to open notebook - HTTP status:', response.status)
          return false
        }
      } catch (error) {
        console.error('[SiYuan] openNotebook test failed:', error)
        return false
      }
    } catch (error) {
      console.error('[SiYuan] Connection test failed:', error)
      return false
    }
  }

  async exportConversation(
    conversation: ChatConversation,
    options: Pick<ExportOptions, 'includeMetadata' | 'format'>,
    templates: { markdownTemplate?: string; messageTemplate?: string } = {}
  ): Promise<SiyuanExportResult> {
    if (options.format && options.format !== 'markdown') {
      return {
        success: false,
        error: t('siyuan_format_required'),
      }
    }

    if (!this.config.apiUrl || !this.config.apiToken || !this.config.notebookId) {
      return {
        success: false,
        error: t('notification_siyuan_not_configured'),
      }
    }

    // 处理路径：如果用户未提供folderPath，则默认使用"Chat2Note"
    const folderPath = this.normalizeFolderPath(this.config.folderPath) || 'Chat2Note'
    const safeTitle = this.sanitizeFileName(conversation.title || FALLBACK_NOTE_TITLE)
    const fileName = safeTitle || FALLBACK_NOTE_TITLE
    const path = `/${folderPath}/${fileName}`.replace(/\/{2,}/g, '/')

    const fullContent = generateConversationMarkdown(
      conversation,
      options.includeMetadata ?? true,
      templates,
      false // 思源笔记始终不使用YAML frontmatter
    )

    const sanitizedContent = fullContent
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')

    try {
      // 使用正确的API接口创建文档
      const createUrl = `${this.config.apiUrl}/api/filetree/createDocWithMd`
      const createResponse = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${this.config.apiToken}`,
        },
        body: JSON.stringify({
          notebook: this.config.notebookId,
          path: path,
          markdown: sanitizedContent,
        }),
      })

      if (!createResponse.ok) {
        throw new Error(`SiYuan createDocWithMd API failed with status ${createResponse.status}`)
      }

      const responseText = await createResponse.text()
      if (!responseText.trim()) {
        throw new Error('SiYuan createDocWithMd API returned empty response')
      }

      const createResponseParsed = JSON.parse(responseText) as SiyuanApiResponse<CreateDocResponse>
      console.log('[SiYuan] createDocWithMd response:', createResponseParsed)

      if (createResponseParsed.code !== 0) {
        const errorMessage = createResponseParsed.msg || 'Failed to create document in SiYuan'
        console.error('[SiYuan] createDocWithMd failed:', createResponseParsed)
        return {
          success: false,
          error: errorMessage,
          data: { response: createResponseParsed },
        }
      }

      // 思源笔记的 data 字段直接就是文档ID字符串
      const docId = createResponseParsed.data
      console.log('[SiYuan] Extracted docId:', docId)
      console.log('[SiYuan] Document created, checking block attributes:', {
        docId,
        setBlockAttributes: this.config.setBlockAttributes,
        conversationHasData: !!conversation,
      })

      // 设置块属性（元数据）
      if (docId && this.config.setBlockAttributes) {
        console.log('[SiYuan] Starting block attributes setting process')
        try {
          await this.setBlockAttributes(docId, conversation)
          console.log('[SiYuan] Block attributes setting completed')
        } catch (attrError) {
          console.warn('[SiYuan] Failed to set block attributes:', attrError)
          // 不影响主要导出功能，只记录警告
        }
      } else {
        console.log('[SiYuan] Skipping block attributes:', {
          hasDocId: !!docId,
          setBlockAttributes: this.config.setBlockAttributes,
        })
      }

      return {
        success: true,
        message: t('notification_export_siyuan_success', [path]),
        notebookId: this.config.notebookId,
        notePath: path,
        data: {
          notebookId: this.config.notebookId,
          notePath: path,
          docId,
        },
      }
    } catch (error) {
      console.error('[SiYuan] Export failed:', error)
      const message = error instanceof Error ? error.message : 'Unknown SiYuan export error'
      return {
        success: false,
        error: message,
      }
    }
  }

  private async request<T = unknown>(
    endpoint: string,
    payload: Record<string, unknown> | null = {}
  ): Promise<SiyuanApiResponse<T>> {
    const url = this.normalizeApiUrl(endpoint)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    // SiYuan API uses token-based authentication (consistent with createDocWithMd)
    if (this.config.apiToken) {
      headers['Authorization'] = `Token ${this.config.apiToken}`
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: payload ? JSON.stringify(payload) : '{}',
    })

    if (!response.ok) {
      throw new Error(`SiYuan API request failed with status ${response.status}`)
    }

    const responseText = await response.text()

    if (!responseText || responseText.trim() === '') {
      throw new Error('SiYuan API returned empty response')
    }

    try {
      return JSON.parse(responseText) as SiyuanApiResponse<T>
    } catch {
      throw new Error(`SiYuan API returned invalid JSON: ${responseText}`)
    }
  }

  private normalizeApiUrl(endpoint: string): string {
    const base = this.config.apiUrl.replace(/\/+$/, '')
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    return `${base}${path}`
  }

  private normalizeFolderPath(folderPath: string | undefined): string {
    if (!folderPath) return ''
    return folderPath
      .replace(/\\/g, '/')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^\/+/, '')
      .replace(/\/+$/, '')
  }

  private sanitizeFileName(value: string): string {
    return value
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80)
  }

  /**
   * 设置块属性（元数据）
   */
  private async setBlockAttributes(docId: string, conversation: ChatConversation): Promise<void> {
    console.log('[SiYuan] setBlockAttributes called with:', {
      docId,
      hasApiUrl: !!this.config.apiUrl,
      hasApiToken: !!this.config.apiToken,
      apiUrl: this.config.apiUrl,
    })

    if (!this.config.apiUrl || !this.config.apiToken) {
      console.warn('[SiYuan] Missing API URL or token, skipping block attributes')
      return
    }

    const attrs: Record<string, string> = {}

    // 设置源URL
    if (conversation.url) {
      attrs['custom-source-url'] = conversation.url
    }

    // 设置平台
    if (conversation.platform) {
      attrs['custom-platform'] = conversation.platform
    }

    // 设置导出时间
    attrs['custom-exported-at'] = new Date(conversation.extractedAt).toISOString()

    // 设置消息数量
    attrs['custom-message-count'] = conversation.messages.length.toString()

    // 如果有标题，设置标题
    if (conversation.title) {
      attrs['custom-title'] = conversation.title
    }

    console.log('[SiYuan] Prepared attributes:', {
      attrCount: Object.keys(attrs).length,
      attrs: attrs,
    })

    // 使用思源API设置块属性
    const setAttrsUrl = `${this.config.apiUrl}/api/attr/setBlockAttrs`

    console.log('[SiYuan] Making API call to:', setAttrsUrl)
    console.log('[SiYuan] Request payload:', {
      id: docId,
      attrs: attrs,
    })

    try {
      const response = await fetch(setAttrsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Token ${this.config.apiToken}`,
        },
        body: JSON.stringify({
          id: docId,
          attrs: attrs,
        }),
      })

      console.log('[SiYuan] API response status:', response.status)
      console.log('[SiYuan] API response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[SiYuan] API error response:', errorText)
        throw new Error(
          `Set block attributes API failed with status ${response.status}: ${errorText}`
        )
      }

      const responseText = await response.text()
      console.log('[SiYuan] API response body:', responseText)

      if (responseText.trim()) {
        const result = JSON.parse(responseText) as SiyuanApiResponse
        console.log('[SiYuan] Parsed API response:', result)

        if (result.code !== 0) {
          console.warn('[SiYuan] Set block attributes warning:', result.msg)
        } else {
          console.log('[SiYuan] ✓ Successfully set block attributes')
        }
      }
    } catch (error) {
      console.error('[SiYuan] Failed to set block attributes:', error)
      throw error
    }
  }
}
