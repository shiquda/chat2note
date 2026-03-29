import { BaseParser } from './base'
import { SiteConfig } from './interface'
import { ChatMessage, ChatConversation } from '../../types/chat'

interface GrokResponse {
  responseId: string
  message: string
  sender: 'human' | 'ASSISTANT'
  createTime: string
  parentResponseId?: string
  model?: string
  metadata?: {
    requestModelDetails?: {
      modelId: string
    }
    request_metadata?: {
      model?: string
      mode?: string
      effort?: string
    }
  }
  requestMetadata?: {
    model?: string
    mode?: string
    effort?: string
  }
}

interface GrokAPIResponse {
  responses: GrokResponse[]
}

export class GrokParser extends BaseParser {
  private static config: SiteConfig = {
    name: 'Grok',
    hostnames: ['grok.com', 'www.grok.com'],
    titleSelectors: ['title', 'h1', '[class*="title"]', '[class*="heading"]'],
    messageContainerSelectors: [], // API-only parser, no DOM selection needed
    userMessageSelectors: [], // API-only parser, no DOM selection needed
    assistantMessageSelectors: [], // API-only parser, no DOM selection needed
    contentSelectors: [], // API-only parser, no DOM selection needed
  }

  constructor() {
    super(GrokParser.config)
  }

  async extractConversation(): Promise<ChatConversation | null> {
    try {
      console.log('[Grok] Starting conversation extraction...')

      // Use API method to get data
      const apiConversation = await this.extractConversationFromAPI()
      if (apiConversation) {
        console.log('[Grok] Successfully extracted conversation:', {
          title: apiConversation.title,
          messages: apiConversation.messages.length,
        })
        return apiConversation
      }

      console.error('[Grok] API method failed')
      console.error('[Grok] Please check:')
      console.error('[Grok] 1. Are you on a conversation page (not chat list)?')
      console.error('[Grok] 2. Are you logged in to Grok?')
      console.error('[Grok] 3. Check browser console for specific error details')

      return null
    } catch (error) {
      console.error('[Grok] Critical error in extractConversation:', error)
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
      console.log('[Grok] Conversation ID:', conversationId)

      if (!conversationId) {
        console.error('[Grok] No conversation ID found in URL')
        console.error('[Grok] Expected URL format: https://grok.com/c/{CONVERSATION_ID}')
        console.error('[Grok] Current URL:', window.location.href)
        return null
      }

      // First, get conversation info to retrieve response IDs
      const conversationInfo = await this.fetchConversationInfo(conversationId)
      console.log('[Grok] Conversation info:', conversationInfo)

      let responseIds: string[]

      if (
        !conversationInfo ||
        !conversationInfo.responseIds ||
        conversationInfo.responseIds.length === 0
      ) {
        console.error('[Grok] No response IDs found in conversation info')
        console.error('[Grok] Trying to extract from page state...')

        // Fallback: try to extract from page
        const fallbackIds = await this.extractResponseIds()
        if (!fallbackIds || fallbackIds.length === 0) {
          console.error('[Grok] Failed to get response IDs from both API and page state')
          return null
        }

        responseIds = fallbackIds
        console.log('[Grok] Response IDs (from fallback):', responseIds)
      } else {
        responseIds = conversationInfo.responseIds
        console.log('[Grok] Response IDs (from API):', responseIds)
      }

      // Call API to get conversation data
      const apiUrl = `https://grok.com/rest/app-chat/conversations/${conversationId}/load-responses`
      console.log('[Grok] API URL:', apiUrl)

      const response = await fetch(apiUrl, {
        method: 'POST',
        credentials: 'include', // Important: this makes the browser send HttpOnly cookies
        headers: {
          accept: '*/*',
          'accept-language': 'zh-CN,zh;q=0.9',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          responseIds: responseIds,
        }),
      })

      console.log('[Grok] API response status:', response.status, response.statusText)

      if (!response.ok) {
        console.error('[Grok] API request failed:')
        console.error('[Grok] Status:', response.status, response.statusText)
        const responseText = await response.text()
        console.error('[Grok] Response body:', responseText)
        return null
      }

      const data: GrokAPIResponse = await response.json()
      console.log('[Grok] API response data:', data)

      if (!data.responses || data.responses.length === 0) {
        console.error('[Grok] No responses found in API response')
        return null
      }

      // Convert message format
      const messages: ChatMessage[] = []

      data.responses.forEach(resp => {
        const role = resp.sender === 'human' ? 'user' : 'assistant'

        const content = resp.message.trim()

        if (content) {
          messages.push({
            id: resp.responseId,
            content,
            role,
            timestamp: new Date(resp.createTime).getTime(),
          })
        }
      })

      console.log('[Grok] Extracted messages count:', messages.length)

      // Get conversation title (fallback to default if not available)
      const title = await this.extractConversationTitle()

      return {
        id: conversationId,
        title: title || 'Grok Conversation',
        messages,
        url: window.location.href,
        extractedAt: Date.now(),
        platform: this.getSiteName(),
      }
    } catch (error) {
      console.error('[Grok] API extraction failed:', error)
      return null
    }
  }

  /**
   * Extract conversation ID from URL
   */
  private extractConversationId(): string | null {
    // Match patterns like:
    // https://grok.com/c/0a0ec329-e213-45be-aae8-9590d18db48f
    const urlMatch = window.location.pathname.match(/\/c\/([a-f0-9-]+)/)
    return urlMatch ? urlMatch[1] : null
  }

  /**
   * Fetch conversation info to get response IDs
   */
  private async fetchConversationInfo(
    conversationId: string
  ): Promise<{ responseIds: string[] } | null> {
    try {
      // Use the response-node endpoint to get conversation structure
      const metadataUrl = `https://grok.com/rest/app-chat/conversations/${conversationId}/response-node?includeThreads=true`

      console.log('[Grok] Fetching conversation metadata from:', metadataUrl)

      const response = await fetch(metadataUrl, {
        method: 'GET',
        credentials: 'include',
        headers: {
          accept: '*/*',
          'accept-language': 'zh-CN,zh;q=0.9',
        },
      })

      if (!response.ok) {
        console.warn('[Grok] Metadata fetch failed:', response.status, response.statusText)
        const errorText = await response.text()
        console.warn('[Grok] Error response:', errorText)
        return null
      }

      const data = await response.json()
      console.log('[Grok] Metadata response:', data)

      // Extract response IDs from the responseNodes array
      const responseIds: string[] = []

      if (data.responseNodes && Array.isArray(data.responseNodes)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data.responseNodes.forEach((node: any) => {
          if (node.responseId) {
            responseIds.push(node.responseId)
          }
        })
      }

      if (responseIds.length > 0) {
        console.log('[Grok] Collected response IDs:', responseIds)
        return { responseIds }
      }

      console.warn('[Grok] No response IDs found in metadata')
      return null
    } catch (error) {
      console.error('[Grok] Failed to fetch conversation metadata:', error)
      return null
    }
  }

  /**
   * Extract response IDs from the page
   * This tries to get response IDs from the page's React state or DOM
   */
  private async extractResponseIds(): Promise<string[]> {
    try {
      // Try to find response IDs in the page's React state
      // This is a common pattern for React apps
      const scriptTags = Array.from(document.querySelectorAll('script'))
      for (const script of scriptTags) {
        const scriptContent = script.textContent || ''
        if (scriptContent.includes('responseId')) {
          // Try to extract response IDs from the script content
          const responseIdMatches = scriptContent.match(/"responseId":"([a-f0-9-]+)"/g)
          if (responseIdMatches) {
            const ids = responseIdMatches.map(match => {
              const idMatch = match.match(/"responseId":"([a-f0-9-]+)"/)
              return idMatch ? idMatch[1] : null
            })
            const filteredIds = ids.filter(id => id !== null) as string[]
            if (filteredIds.length > 0) {
              return filteredIds
            }
          }
        }
      }

      // Alternative: try to find response IDs in window object
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const windowWithState = window as any
      if (windowWithState.__INITIAL_STATE__ || windowWithState.__NEXT_DATA__) {
        const state = windowWithState.__INITIAL_STATE__ || windowWithState.__NEXT_DATA__
        console.log('[Grok] Found initial state:', state)
        // Try to extract response IDs from the state
        const responseIds = this.extractResponseIdsFromObject(state)
        if (responseIds.length > 0) {
          return responseIds
        }
      }

      console.warn('[Grok] Could not find response IDs in page state')
      return []
    } catch (error) {
      console.error('[Grok] Failed to extract response IDs:', error)
      return []
    }
  }

  /**
   * Recursively search for response IDs in an object
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractResponseIdsFromObject(obj: any): string[] {
    const ids: string[] = []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const search = (o: any) => {
      if (!o || typeof o !== 'object') return

      if (o.responseId && typeof o.responseId === 'string') {
        ids.push(o.responseId)
      }

      if (Array.isArray(o)) {
        o.forEach(item => search(item))
      } else {
        Object.values(o).forEach(value => search(value))
      }
    }

    search(obj)
    return ids
  }

  /**
   * Extract conversation title from the page
   */
  private async extractConversationTitle(): Promise<string | null> {
    try {
      // Try to get title from document title first
      const docTitle = document.title
      if (docTitle && docTitle !== 'Grok' && !docTitle.includes('Chat')) {
        return docTitle.replace(/\s*\|\s*Grok$/, '').trim()
      }

      // Try to find title in DOM
      const titleSelectors = ['h1', '[class*="title"]', '[class*="heading"]']
      for (const selector of titleSelectors) {
        const element = document.querySelector(selector)
        if (element && element.textContent) {
          const text = element.textContent.trim()
          if (text && text !== 'Grok' && text.length > 0) {
            return text
          }
        }
      }

      return null
    } catch (error) {
      console.error('[Grok] Failed to extract title:', error)
      return null
    }
  }

  getSiteName(): string {
    return this.config.name
  }

  // Static methods for backward compatibility
  static async extractConversation(): Promise<ChatConversation | null> {
    const parser = new GrokParser()
    return await parser.extractConversation()
  }

  static isGrokPage(): boolean {
    return window.location.hostname === 'grok.com' || window.location.hostname === 'www.grok.com'
  }
}
