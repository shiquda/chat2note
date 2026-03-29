import { BaseParser } from './base'
import { SiteConfig } from './interface'
import { ChatMessage, ChatConversation } from '../../types/chat'

interface ClaudeMessageContent {
  type: 'text' | 'tool_use' | 'tool_result'
  text?: string
  name?: string
  input?: any
  content?: any[]
  start_timestamp?: string
  stop_timestamp?: string
  citations?: any[]
}

interface ClaudeMessage {
  uuid: string
  text: string
  content: ClaudeMessageContent[]
  sender: 'human' | 'assistant'
  index: number
  created_at: string
  updated_at: string
  truncated: boolean
  attachments?: any[]
  files?: any[]
  files_v2?: any[]
  parent_message_uuid: string
}

interface ClaudeAPIResponse {
  uuid: string
  name: string
  summary: string
  created_at: string
  updated_at: string
  settings: {
    enabled_web_search?: boolean
    preview_feature_uses_artifacts?: boolean
  }
  is_starred: boolean
  is_temporary: boolean
  current_leaf_message_uuid: string
  chat_messages: ClaudeMessage[]
}

export class ClaudeParser extends BaseParser {
  private static config: SiteConfig = {
    name: 'Claude',
    hostnames: ['claude.ai', 'www.claude.ai'],
    titleSelectors: ['title', 'h1', '[class*="title"]', '[class*="heading"]'],
    messageContainerSelectors: [], // API-only parser, no DOM selection needed
    userMessageSelectors: [], // API-only parser, no DOM selection needed
    assistantMessageSelectors: [], // API-only parser, no DOM selection needed
    contentSelectors: [], // API-only parser, no DOM selection needed
  }

  constructor() {
    super(ClaudeParser.config)
  }

  async extractConversation(): Promise<ChatConversation | null> {
    try {
      console.log('[Claude] Starting conversation extraction...')

      // Use API method to get data
      const apiConversation = await this.extractConversationFromAPI()
      if (apiConversation) {
        console.log('[Claude] Successfully extracted conversation:', {
          title: apiConversation.title,
          messages: apiConversation.messages.length,
        })
        return apiConversation
      }

      console.error('[Claude] API method failed')
      console.error('[Claude] Please check:')
      console.error('[Claude] 1. Are you on a conversation page (not chat list)?')
      console.error('[Claude] 2. Are you logged in to Claude?')
      console.error('[Claude] 3. Check browser console for specific error details')

      return null
    } catch (error) {
      console.error('[Claude] Critical error in extractConversation:', error)
      return null
    }
  }

  /**
   * Extract conversation data from API (primary method)
   */
  private async extractConversationFromAPI(): Promise<ChatConversation | null> {
    try {
      // Extract conversation UUID from URL
      const conversationId = this.extractConversationId()
      console.log('[Claude] Conversation ID:', conversationId)

      if (!conversationId) {
        console.error('[Claude] No conversation ID found in URL')
        console.error('[Claude] Expected URL format: https://claude.ai/chat/{CONVERSATION_ID}')
        console.error('[Claude] Current URL:', window.location.href)
        return null
      }

      // Extract organization ID from URL or storage
      const organizationId = await this.extractOrganizationId()
      console.log('[Claude] Organization ID:', organizationId)

      if (!organizationId) {
        console.error('[Claude] No organization ID found')
        return null
      }

      // Call API to get conversation data
      // NOTE: sessionKey is an HttpOnly cookie, so we can't access it via JavaScript
      // Instead, we use credentials: 'include' to let the browser automatically attach it
      const apiUrl = `https://claude.ai/api/organizations/${organizationId}/chat_conversations/${conversationId}?tree=True&rendering_mode=messages&render_all_tools=true`
      console.log('[Claude] API URL:', apiUrl)

      const response = await fetch(apiUrl, {
        method: 'GET',
        credentials: 'include', // Important: this makes the browser send HttpOnly cookies
        headers: {
          accept: '*/*',
          'accept-language': 'zh-CN,zh;q=0.9',
          'content-type': 'application/json',
        },
      })

      console.log('[Claude] API response status:', response.status, response.statusText)

      if (!response.ok) {
        console.error('[Claude] API request failed:')
        console.error('[Claude] Status:', response.status, response.statusText)
        const responseText = await response.text()
        console.error('[Claude] Response body:', responseText)
        return null
      }

      const data: ClaudeAPIResponse = await response.json()
      console.log('[Claude] API response data:', data)

      if (!data.chat_messages || data.chat_messages.length === 0) {
        console.error('[Claude] No messages found in API response')
        return null
      }

      // Convert message format
      const messages: ChatMessage[] = []

      data.chat_messages.forEach(msg => {
        const role = msg.sender === 'human' ? 'user' : 'assistant'

        // Extract text content from content array
        let content = ''

        msg.content.forEach(contentItem => {
          if (contentItem.type === 'text' && contentItem.text) {
            content += contentItem.text + '\n\n'
          }
          // Ignore tool_use and tool_result for now (can be enhanced later)
        })

        content = content.trim()

        if (content) {
          messages.push({
            id: msg.uuid,
            content,
            role,
            timestamp: new Date(msg.created_at).getTime(),
          })
        }
      })

      console.log('[Claude] Extracted messages count:', messages.length)

      return {
        id: data.uuid,
        title: data.name || 'Untitled Chat',
        messages,
        url: window.location.href,
        extractedAt: Date.now(),
        platform: this.getSiteName(),
      }
    } catch (error) {
      console.error('[Claude] API extraction failed:', error)
      return null
    }
  }

  /**
   * Extract conversation ID from URL
   */
  private extractConversationId(): string | null {
    // Match patterns like:
    // https://claude.ai/chat/d374903b-58db-4058-bef1-20acf5d70cfc
    const urlMatch = window.location.pathname.match(/\/chat\/([a-f0-9-]+)/)
    return urlMatch ? urlMatch[1] : null
  }

  /**
   * Extract organization ID from URL or storage
   */
  private async extractOrganizationId(): Promise<string | null> {
    try {
      // Try to get from localStorage first
      const lastActiveOrg = localStorage.getItem('lastActiveOrg')
      if (lastActiveOrg) {
        return lastActiveOrg
      }

      // Try to get from cookie
      const cookies = document.cookie.split(';')
      for (const cookie of cookies) {
        const trimmedCookie = cookie.trim()
        if (trimmedCookie.startsWith('lastActiveOrg=')) {
          const orgId = trimmedCookie.split('=')[1]?.trim()
          if (orgId) {
            return orgId
          }
        }
      }

      // Try to extract from current API calls (check network activity)
      // This is a fallback - the organization ID should be in localStorage or cookies
      console.warn(
        '[Claude] Organization ID not found in storage, may need to extract from network'
      )

      return null
    } catch (error) {
      console.error('[Claude] Failed to get organization ID:', error)
      return null
    }
  }

  getSiteName(): string {
    return this.config.name
  }

  // Static methods for backward compatibility
  static async extractConversation(): Promise<ChatConversation | null> {
    const parser = new ClaudeParser()
    return await parser.extractConversation()
  }

  static isClaudePage(): boolean {
    return window.location.hostname === 'claude.ai'
  }
}
