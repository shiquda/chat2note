import { BaseParser } from './base'
import { SiteConfig } from './interface'
import { ChatMessage, ChatConversation } from '../../types/chat'

interface KimiMessageBlock {
  id: string
  text?: {
    content: string
  }
}

interface KimiMessage {
  id: string
  parentId?: string
  role: 'user' | 'assistant'
  status: string
  blocks: KimiMessageBlock[]
  createTime: string
}

interface KimiAPIResponse {
  messages: KimiMessage[]
}

export class KimiParser extends BaseParser {
  private static config: SiteConfig = {
    name: 'Kimi',
    hostnames: ['kimi.com', 'www.kimi.com'],
    titleSelectors: ['title', 'h1', '[class*="title"]'],
    messageContainerSelectors: [], // API-only parser, no DOM selection needed
    userMessageSelectors: [], // API-only parser, no DOM selection needed
    assistantMessageSelectors: [], // API-only parser, no DOM selection needed
    contentSelectors: [], // API-only parser, no DOM selection needed
  }

  constructor() {
    super(KimiParser.config)
  }

  async extractConversation(): Promise<ChatConversation | null> {
    try {
      const apiConversation = await this.extractConversationFromAPI()
      if (apiConversation) {
        return apiConversation
      }

      console.error('[Kimi] Failed to extract conversation')
      return null
    } catch (error) {
      console.error('[Kimi] Error in extractConversation:', error)
      return null
    }
  }

  /**
   * Extract conversation data from API (primary method)
   */
  private async extractConversationFromAPI(): Promise<ChatConversation | null> {
    try {
      const chatId = this.extractChatId()
      if (!chatId) {
        console.error('[Kimi] No chat ID found in URL')
        return null
      }

      const authToken = this.extractAuthToken()
      if (!authToken) {
        console.error('[Kimi] No authentication token found')
        return null
      }

      const deviceId = this.extractDeviceId()
      const sessionId = this.extractSessionId()
      const trafficId = this.extractTrafficId()

      const headers: Record<string, string> = {
        accept: '*/*',
        'accept-language': 'zh-CN,zh;q=0.9',
        'connect-protocol-version': '1',
        'content-type': 'application/json',
        'r-timezone': 'Asia/Shanghai',
        'x-language': 'zh-CN',
        'x-msh-platform': 'web',
        authorization: `Bearer ${authToken}`,
      }

      if (deviceId) headers['x-msh-device-id'] = deviceId
      if (sessionId) headers['x-msh-session-id'] = sessionId
      if (trafficId) headers['x-traffic-id'] = trafficId

      const response = await fetch(
        'https://www.kimi.com/apiv2/kimi.gateway.chat.v1.ChatService/ListMessages',
        {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify({ chat_id: chatId, page_size: 1000 }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Kimi] API request failed:', response.status, errorText)
        return null
      }

      const data: KimiAPIResponse = await response.json()

      if (!data.messages || data.messages.length === 0) {
        console.error('[Kimi] No messages found in API response')
        return null
      }

      const messages: ChatMessage[] = []

      data.messages.forEach(msg => {
        let content = ''
        msg.blocks.forEach(block => {
          if (block.text?.content) {
            content += block.text.content + '\n\n'
          }
        })

        content = content.trim()
        if (content) {
          messages.push({
            id: msg.id,
            content,
            role: msg.role,
            timestamp: new Date(msg.createTime).getTime(),
          })
        }
      })

      messages.sort((a, b) => a.timestamp - b.timestamp)

      const title = this.extractTitle() || 'Untitled Chat'

      return {
        id: chatId,
        title,
        messages,
        url: window.location.href,
        extractedAt: Date.now(),
        platform: this.getSiteName(),
      }
    } catch (error) {
      console.error('[Kimi] API extraction failed:', error)
      return null
    }
  }

  /**
   * Extract chat ID from URL
   */
  private extractChatId(): string | null {
    const urlMatch = window.location.pathname.match(/\/chat\/([a-z0-9_-]+)/i)
    return urlMatch ? urlMatch[1] : null
  }

  /**
   * Extract authorization token from localStorage
   */
  private extractAuthToken(): string | null {
    // Try logged-in user token first (contains ssid)
    const accessToken = localStorage.getItem('access_token')
    if (accessToken) return accessToken

    // Fallback to anonymous token
    const anonymousToken = localStorage.getItem('anonymous_access_token')
    if (anonymousToken) return anonymousToken

    // Last resort: try kimi-auth cookie
    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
      const trimmedCookie = cookie.trim()
      if (trimmedCookie.startsWith('kimi-auth=')) {
        const token = trimmedCookie.split('=')[1]?.trim()
        if (token) return token
      }
    }

    return null
  }

  /**
   * Extract device ID from localStorage
   */
  private extractDeviceId(): string | null {
    try {
      const teaCache = localStorage.getItem('__tea_cache_tokens_20001731')
      if (teaCache) {
        const parsed = JSON.parse(teaCache)
        if (parsed.web_id) return parsed.web_id
      }
    } catch {
      // Ignore
    }
    return null
  }

  /**
   * Extract session ID from JWT token
   */
  private extractSessionId(): string | null {
    try {
      const token =
        localStorage.getItem('access_token') || localStorage.getItem('anonymous_access_token')
      if (token) {
        const parts = token.split('.')
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]))
          if (payload.ssid) return payload.ssid
        }
      }
    } catch {
      // Ignore
    }
    return null
  }

  /**
   * Extract traffic ID (user ID)
   */
  private extractTrafficId(): string | null {
    try {
      const teaCache = localStorage.getItem('__tea_cache_tokens_20001731')
      if (teaCache) {
        const parsed = JSON.parse(teaCache)
        if (parsed.user_unique_id) return parsed.user_unique_id
      }
    } catch {
      // Ignore
    }
    return null
  }

  /**
   * Extract conversation title from page
   */
  protected extractTitle(): string {
    const docTitle = document.title
    if (docTitle && docTitle !== 'Kimi') {
      return docTitle.replace(/\s*-\s*Kimi$/, '').trim()
    }

    for (const selector of this.config.titleSelectors) {
      const titleElement = document.querySelector(selector)
      if (titleElement) {
        const text = titleElement.textContent?.trim()
        if (text && text !== 'Kimi') return text
      }
    }

    return 'Untitled Conversation'
  }

  getSiteName(): string {
    return this.config.name
  }

  // Static methods for backward compatibility
  static async extractConversation(): Promise<ChatConversation | null> {
    const parser = new KimiParser()
    return await parser.extractConversation()
  }

  static isKimiPage(): boolean {
    return window.location.hostname.includes('kimi.com')
  }
}
