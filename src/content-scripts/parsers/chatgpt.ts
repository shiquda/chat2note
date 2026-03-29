import { BaseParser } from './base'
import { SiteConfig } from './interface'
import { ChatMessage, ChatConversation } from '../../types/chat'

interface ChatGPTMessageContent {
  content_type: string
  parts?: string[]
  text?: string
}

interface ChatGPTMessage {
  id: string
  author: {
    role: 'user' | 'assistant' | 'system'
    name?: string | null
    metadata: Record<string, any>
  }
  create_time: number | null
  update_time: number | null
  content: ChatGPTMessageContent
  status: string
  end_turn: boolean | null
  weight: number
  metadata: {
    is_visually_hidden_from_conversation?: boolean
    [key: string]: any
  }
  recipient: string
}

interface ChatGPTMappingNode {
  id: string
  message: ChatGPTMessage | null
  parent: string | null
  children: string[]
}

interface ChatGPTAPIResponse {
  title: string
  create_time: number
  update_time: number
  mapping: Record<string, ChatGPTMappingNode>
  moderation_results: any[]
  current_node: string
  conversation_id: string
  is_archived: boolean
}

export class ChatGPTParser extends BaseParser {
  private static config: SiteConfig = {
    name: 'ChatGPT',
    hostnames: ['chat.openai.com', 'chatgpt.com'],
    titleSelectors: ['title', 'h1', '[class*="title"]', '[class*="heading"]'],
    messageContainerSelectors: [], // API-only parser, no DOM selection needed
    userMessageSelectors: [], // API-only parser, no DOM selection needed
    assistantMessageSelectors: [], // API-only parser, no DOM selection needed
    contentSelectors: [], // API-only parser, no DOM selection needed
  }

  constructor() {
    super(ChatGPTParser.config)
  }

  async extractConversation(): Promise<ChatConversation | null> {
    try {
      console.log('[ChatGPT] Starting conversation extraction...')

      // Use API method to get data
      const apiConversation = await this.extractConversationFromAPI()
      if (apiConversation) {
        console.log('[ChatGPT] Successfully extracted conversation:', {
          title: apiConversation.title,
          messages: apiConversation.messages.length,
        })
        return apiConversation
      }

      console.error('[ChatGPT] API method failed')
      console.error('[ChatGPT] Please check:')
      console.error('[ChatGPT] 1. Are you on a conversation page (not chat list)?')
      console.error('[ChatGPT] 2. Are you logged in to ChatGPT?')
      console.error('[ChatGPT] 3. Check browser console for specific error details')

      return null
    } catch (error) {
      console.error('[ChatGPT] Critical error in extractConversation:', error)
      return null
    }
  }

  /**
   * Extract conversation data from API (primary method)
   */
  private async extractConversationFromAPI(): Promise<ChatConversation | null> {
    try {
      // Extract conversation ID from URL
      const conversationId = this.extractConversationId()
      console.log('[ChatGPT] Conversation ID:', conversationId)

      if (!conversationId) {
        console.error('[ChatGPT] No conversation ID found in URL')
        console.error('[ChatGPT] Expected URL format: https://chatgpt.com/c/{CONVERSATION_ID}')
        console.error('[ChatGPT] Current URL:', window.location.href)
        return null
      }

      // Get authorization token from session cookie
      const authToken = await this.getAuthToken()
      console.log('[ChatGPT] Auth token retrieved:', authToken ? 'Yes' : 'No')

      if (!authToken) {
        console.error('[ChatGPT] No authorization token found')
        console.error('[ChatGPT] Make sure you are logged in to ChatGPT')
        return null
      }

      // Call API to get conversation data
      // Note: ChatGPT requires both authorization header and cookies
      const apiUrl = `https://chatgpt.com/backend-api/conversation/${conversationId}`
      console.log('[ChatGPT] API URL:', apiUrl)

      // Get or generate device ID
      let deviceId =
        localStorage.getItem('oai-device-id') || sessionStorage.getItem('oai-device-id')
      if (!deviceId) {
        // Generate a random UUID v4
        deviceId = crypto.randomUUID()
      }

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          accept: '*/*',
          'accept-language': 'zh-CN,zh;q=0.9',
          authorization: `Bearer ${authToken}`,
          'oai-language': 'zh-CN',
          'oai-device-id': deviceId,
          'content-type': 'application/json',
        },
        credentials: 'include', // Also send HttpOnly cookies
      })

      console.log('[ChatGPT] API response status:', response.status, response.statusText)

      if (!response.ok) {
        console.error('[ChatGPT] API request failed:')
        console.error('[ChatGPT] Status:', response.status, response.statusText)
        const responseText = await response.text()
        console.error('[ChatGPT] Response body:', responseText)
        return null
      }

      const data: ChatGPTAPIResponse = await response.json()
      console.log('[ChatGPT] API response data:', data)

      if (!data.mapping || Object.keys(data.mapping).length === 0) {
        console.error('[ChatGPT] No messages found in API response')
        return null
      }

      // Convert message format
      const messages: ChatMessage[] = []

      // ChatGPT uses a tree structure with parent-child relationships
      // We need to traverse from root to maintain correct order
      const traverseMapping = (nodeId: string) => {
        const node = data.mapping[nodeId]
        if (!node) return

        // Process current node's message
        if (node.message) {
          const msg = node.message

          // Skip hidden messages
          if (!msg.metadata?.is_visually_hidden_from_conversation) {
            // Skip system messages
            if (msg.author.role !== 'system') {
              // Extract content
              let content = ''

              if (msg.content.content_type === 'text' && msg.content.parts) {
                content = msg.content.parts.join('\n\n')
              } else if (msg.content.text) {
                content = msg.content.text
              }

              content = content.trim()

              if (content && (msg.author.role === 'user' || msg.author.role === 'assistant')) {
                messages.push({
                  id: msg.id,
                  content,
                  role: msg.author.role,
                  timestamp: msg.create_time ? msg.create_time * 1000 : Date.now(),
                })
              }
            }
          }
        }

        // Traverse children in order
        if (node.children && node.children.length > 0) {
          // Use the first child (main conversation path)
          // For branching conversations, we take the primary path
          traverseMapping(node.children[0])
        }
      }

      // Find root node and start traversal
      const rootNode = Object.values(data.mapping).find(node => node.parent === null)
      if (rootNode) {
        traverseMapping(rootNode.id)
      } else {
        console.warn('[ChatGPT] No root node found, falling back to timestamp sorting')
        // Fallback: use timestamp sorting
        Object.values(data.mapping).forEach(node => {
          if (!node.message) return
          const msg = node.message
          if (msg.metadata?.is_visually_hidden_from_conversation) return
          if (msg.author.role === 'system') return

          let content = ''
          if (msg.content.content_type === 'text' && msg.content.parts) {
            content = msg.content.parts.join('\n\n')
          } else if (msg.content.text) {
            content = msg.content.text
          }

          content = content.trim()
          if (content && (msg.author.role === 'user' || msg.author.role === 'assistant')) {
            messages.push({
              id: msg.id,
              content,
              role: msg.author.role,
              timestamp: msg.create_time ? msg.create_time * 1000 : Date.now(),
            })
          }
        })
        messages.sort((a, b) => a.timestamp - b.timestamp)
      }

      console.log('[ChatGPT] Extracted messages count:', messages.length)

      return {
        id: data.conversation_id,
        title: data.title || 'Untitled Chat',
        messages,
        url: window.location.href,
        extractedAt: Date.now(),
        platform: this.getSiteName(),
      }
    } catch (error) {
      console.error('[ChatGPT] API extraction failed:', error)
      return null
    }
  }

  /**
   * Extract conversation ID from URL
   */
  private extractConversationId(): string | null {
    // Match patterns like:
    // https://chatgpt.com/c/68dff033-71b0-8322-a954-c9c64951b8cc
    // https://chat.openai.com/c/68dff033-71b0-8322-a954-c9c64951b8cc
    const urlMatch = window.location.pathname.match(/\/c\/([a-f0-9-]+)/)
    return urlMatch ? urlMatch[1] : null
  }

  /**
   * Get Authorization Token from session API
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      // ChatGPT provides access token via session API
      const response = await fetch('https://chatgpt.com/api/auth/session', {
        credentials: 'include',
      })

      if (!response.ok) {
        console.error('[ChatGPT] Session API failed:', response.status)
        return null
      }

      const session = await response.json()

      if (session?.accessToken) {
        console.log('[ChatGPT] Successfully retrieved access token from session API')
        return session.accessToken
      }

      console.error('[ChatGPT] No access token found in session response')
      return null
    } catch (error) {
      console.error('[ChatGPT] Failed to get access token from session API:', error)
      return null
    }
  }

  getSiteName(): string {
    return this.config.name
  }

  // Static methods for backward compatibility
  static async extractConversation(): Promise<ChatConversation | null> {
    const parser = new ChatGPTParser()
    return await parser.extractConversation()
  }

  static isChatGPTPage(): boolean {
    return (
      window.location.hostname === 'chat.openai.com' || window.location.hostname === 'chatgpt.com'
    )
  }
}
