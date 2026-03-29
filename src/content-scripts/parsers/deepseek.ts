import { BaseParser } from './base'
import { SiteConfig } from './interface'
import { ChatMessage, ChatConversation } from '../../types/chat'

interface DeepSeekAPIResponse {
  code: number
  msg: string
  data: {
    biz_code: number
    biz_msg: string
    biz_data: {
      chat_session: {
        id: string
        seq_id: number
        agent: string
        title: string
        title_type: string
        version: number
        current_message_id: number
        pinned: boolean
        inserted_at: number
        updated_at: number
      }
      chat_messages: Array<{
        message_id: number
        parent_id: number | null
        model: string
        role: 'USER' | 'ASSISTANT'
        thinking_enabled: boolean
        ban_edit: boolean
        ban_regenerate: boolean
        status: string
        accumulated_token_usage: number
        files: any[]
        inserted_at: number
        search_enabled: boolean
        feedback: any
        fragments: Array<{
          id: number
          type: 'REQUEST' | 'RESPONSE' | 'THINK'
          content: string
          elapsed_secs?: number
        }>
      }>
      cache_valid: boolean
      route_id: string | null
    }
  }
}

export class DeepSeekParser extends BaseParser {
  private static config: SiteConfig = {
    name: 'DeepSeek',
    hostnames: ['chat.deepseek.com'],
    titleSelectors: ['title', 'h1', '[class*="title"]', '[class*="heading"]'],
    messageContainerSelectors: [], // API-only parser, no DOM selection needed
    userMessageSelectors: [], // API-only parser, no DOM selection needed
    assistantMessageSelectors: [], // API-only parser, no DOM selection needed
    contentSelectors: [], // API-only parser, no DOM selection needed
  }

  constructor() {
    super(DeepSeekParser.config)
  }

  async extractConversation(): Promise<ChatConversation | null> {
    try {
      // 使用API方式获取数据
      const apiConversation = await this.extractConversationFromAPI()
      if (apiConversation) {
        return apiConversation
      }

      console.error('[DeepSeek] API method failed')
      console.error('[DeepSeek] Please check:')
      console.error('[DeepSeek] 1. Are you on a conversation page (not chat list)?')
      console.error('[DeepSeek] 2. Are you logged in to DeepSeek?')
      console.error('[DeepSeek] 3. Check browser console for specific error details')

      return null
    } catch (error) {
      console.error('[DeepSeek] Critical error in extractConversation:', error)
      return null
    }
  }

  /**
   * 通过API获取对话数据（唯一方法）
   */
  private async extractConversationFromAPI(): Promise<ChatConversation | null> {
    try {
      // 从URL提取session_id
      const sessionId = this.extractSessionId()

      if (!sessionId) {
        console.error('[DeepSeek] No session ID found in URL')
        console.error(
          '[DeepSeek] Expected URL format: https://chat.deepseek.com/a/chat/s/{SESSION_ID}'
        )
        return null
      }

      // 获取authorization token
      const authToken = await this.getAuthToken()

      if (!authToken) {
        console.error('[DeepSeek] No auth token found')
        console.error('[DeepSeek] Make sure you are logged in to DeepSeek')
        return null
      }

      // 调用API获取对话数据
      const apiUrl = `https://chat.deepseek.com/api/v0/chat/history_messages?chat_session_id=${sessionId}`

      const response = await fetch(apiUrl, {
        headers: {
          authorization: `Bearer ${authToken}`,
          'content-type': 'application/json',
          'x-client-locale': 'zh_CN',
          'x-client-platform': 'web',
          'x-client-version': '1.4.0-fragments',
          'x-app-version': '20241129.1',
        },
      })

      if (!response.ok) {
        console.error('[DeepSeek] API request failed:')
        console.error('[DeepSeek] Status:', response.status, response.statusText)
        return null
      }

      const data: DeepSeekAPIResponse = await response.json()

      if (data.code !== 0) {
        console.error('[DeepSeek] API returned error code:', data.code)
        console.error('[DeepSeek] Message:', data.msg)
        return null
      }

      if (!data.data || !data.data.biz_data) {
        console.error('[DeepSeek] API response missing data structure')
        return null
      }

      if (data.data.biz_code !== 0) {
        console.error('[DeepSeek] API returned biz error code:', data.data.biz_code)
        console.error('[DeepSeek] Biz Message:', data.data.biz_msg)
        return null
      }

      const { chat_session, chat_messages } = data.data.biz_data

      // 转换消息格式 - 处理fragments结构
      const messages: ChatMessage[] = []

      chat_messages.forEach(msg => {
        const role = msg.role.toLowerCase() as 'user' | 'assistant'

        // 合并所有fragments的内容
        let content = ''
        msg.fragments.forEach(fragment => {
          if (fragment.type === 'REQUEST' || fragment.type === 'RESPONSE') {
            content += fragment.content + '\n\n'
          }
          // 忽略THINK类型的fragment，这是AI的内部思考过程
        })

        content = content.trim()

        if (content) {
          messages.push({
            id: `msg_${msg.message_id}`,
            content,
            role,
            timestamp: msg.inserted_at * 1000, // 转换为毫秒
          })
        }
      })

      return {
        id: `conv_${sessionId}`,
        title: chat_session.title,
        messages,
        url: window.location.href,
        extractedAt: Date.now(),
        platform: this.getSiteName(),
      }
    } catch (error) {
      console.error('[DeepSeek] API extraction failed:', error)
      return null
    }
  }

  /**
   * 从URL提取session ID
   */
  private extractSessionId(): string | null {
    const urlMatch = window.location.pathname.match(/\/a\/chat\/s\/([a-f0-9-]+)/)
    return urlMatch ? urlMatch[1] : null
  }

  /**
   * 获取Authorization Token
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      // 尝试从localStorage获取
      const tokenKeys = [
        'deepseek_token',
        'auth_token',
        'access_token',
        'token',
        'jwt_token',
        'bearer_token',
        'session_token',
        'user_token',
        'userToken',
        'ds_token',
        'deepseek_auth_token',
        'deepseek_access_token',
        'deepseek_session_token',
      ]
      let foundToken = null

      for (const key of tokenKeys) {
        const token = localStorage.getItem(key)
        if (token) {
          foundToken = token
          break
        }
      }

      if (foundToken) {
        // 检查token是否是JSON格式
        if (foundToken.startsWith('{') && foundToken.includes('"value"')) {
          try {
            const tokenObj = JSON.parse(foundToken)
            if (tokenObj.value) {
              return tokenObj.value
            }
          } catch {
            // JSON解析失败，继续使用原始token
          }
        }

        return foundToken
      }

      // 尝试从cookie获取
      const cookies = document.cookie.split(';')

      for (const cookie of cookies) {
        const trimmedCookie = cookie.trim()

        // 检查更多可能的token cookie名
        const tokenCookiePatterns = [
          'auth_token=',
          'deepseek_token=',
          'token=',
          'session_token=',
          'access_token=',
          'ds_token=',
          'jwt_token=',
        ]

        for (const pattern of tokenCookiePatterns) {
          if (trimmedCookie.startsWith(pattern)) {
            const tokenValue = trimmedCookie.split('=')[1]?.trim()
            if (tokenValue) {
              return tokenValue
            }
          }
        }
      }

      return null
    } catch (error) {
      console.error('[DeepSeek] Failed to get auth token:', error)
      return null
    }
  }

  getSiteName(): string {
    return this.config.name
  }

  // 保持向后兼容的静态方法
  static async extractConversation(): Promise<ChatConversation | null> {
    const parser = new DeepSeekParser()
    return await parser.extractConversation()
  }

  static isDeepSeekPage(): boolean {
    return window.location.hostname === 'chat.deepseek.com'
  }
}
