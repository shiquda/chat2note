import { BaseParser } from './base'
import { SiteConfig } from './interface'
import { ChatMessage, ChatConversation } from '../../types/chat'

interface YuanbaoMessageContent {
  type: 'text'
  msg: string
  redirect?: unknown
}

interface YuanbaoSpeech {
  traceID: string
  speechType: 'text'
  pluginId: string
  content: YuanbaoMessageContent[]
  chatModelId: string
  internetFlag: number
  speechIndex: number
  extra?: unknown
  options?: unknown
}

interface YuanbaoConversationMessage {
  userId: string
  conversationId: string
  status: number
  id: string
  speaker: 'human' | 'ai'
  speech?: string
  speechMode: number
  displayPrompt?: string
  displayPromptType?: number
  speechesV2: YuanbaoSpeech[]
  createTime: number
  index: number
  sensitive: boolean
  subConversationId: string
  chatInputType: string
}

interface YuanbaoAPIResponse {
  id: string
  userId: string
  convs: YuanbaoConversationMessage[]
  title: string
  agentId: string
  agentName: string
  hasMore: boolean
  sessionTitle: string
  lastReplyContent: string
}

export class YuanbaoParser extends BaseParser {
  private static config: SiteConfig = {
    name: 'Yuanbao',
    hostnames: ['yuanbao.tencent.com'],
    titleSelectors: ['title', 'h1', '[class*="title"]'],
    messageContainerSelectors: [], // API-only parser, no DOM selection needed
    userMessageSelectors: [], // API-only parser, no DOM selection needed
    assistantMessageSelectors: [], // API-only parser, no DOM selection needed
    contentSelectors: [], // API-only parser, no DOM selection needed
  }

  constructor() {
    super(YuanbaoParser.config)
  }

  async extractConversation(): Promise<ChatConversation | null> {
    try {
      const apiConversation = await this.extractConversationFromAPI()
      if (apiConversation) {
        return apiConversation
      }

      console.error('[Yuanbao] Failed to extract conversation')
      return null
    } catch (error) {
      console.error('[Yuanbao] Error in extractConversation:', error)
      return null
    }
  }

  /**
   * Extract conversation data from API (primary method)
   */
  private async extractConversationFromAPI(): Promise<ChatConversation | null> {
    try {
      const { agentId, conversationId } = this.extractIdsFromUrl()
      if (!agentId || !conversationId) {
        console.error('[Yuanbao] No agent ID or conversation ID found in URL')
        return null
      }

      const response = await fetch(
        'https://yuanbao.tencent.com/api/user/agent/conversation/v1/detail',
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            accept: 'application/json, text/plain, */*',
            'accept-language': 'zh-CN,zh;q=0.9',
            'content-type': 'application/json',
            'x-language': 'zh-CN',
            'x-platform': 'win',
            'x-requested-with': 'XMLHttpRequest',
            'x-source': 'web',
          },
          body: JSON.stringify({
            conversationId,
            offset: 0,
            limit: 1000,
            agentId,
          }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Yuanbao] API request failed:', response.status, errorText)
        return null
      }

      const data: YuanbaoAPIResponse = await response.json()

      if (!data.convs || data.convs.length === 0) {
        console.error('[Yuanbao] No messages found in API response')
        return null
      }

      const messages: ChatMessage[] = []

      data.convs.forEach(msg => {
        const role = msg.speaker === 'human' ? 'user' : 'assistant'
        let content = ''

        msg.speechesV2.forEach(speech => {
          speech.content.forEach(contentItem => {
            if (contentItem.type === 'text' && contentItem.msg) {
              content += contentItem.msg + '\n\n'
            }
          })
        })

        content = content.trim()
        if (content) {
          messages.push({
            id: msg.id,
            content,
            role,
            timestamp: msg.createTime * 1000,
          })
        }
      })

      messages.sort((a, b) => a.timestamp - b.timestamp)

      return {
        id: conversationId,
        title: data.title || data.sessionTitle || 'Untitled Chat',
        messages,
        url: window.location.href,
        extractedAt: Date.now(),
        platform: this.getSiteName(),
      }
    } catch (error) {
      console.error('[Yuanbao] API extraction failed:', error)
      return null
    }
  }

  /**
   * Extract agent ID and conversation ID from URL
   */
  private extractIdsFromUrl(): { agentId: string | null; conversationId: string | null } {
    const urlMatch = window.location.pathname.match(/\/chat\/([^/]+)\/([^/]+)/)
    if (urlMatch) {
      return {
        agentId: urlMatch[1],
        conversationId: urlMatch[2],
      }
    }
    return { agentId: null, conversationId: null }
  }

  getSiteName(): string {
    return this.config.name
  }

  // Static methods for backward compatibility
  static async extractConversation(): Promise<ChatConversation | null> {
    const parser = new YuanbaoParser()
    return await parser.extractConversation()
  }

  static isYuanbaoPage(): boolean {
    return window.location.hostname.includes('yuanbao.tencent.com')
  }
}
