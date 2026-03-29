import { BaseParser } from './base'
import { SiteConfig } from './interface'
import { ChatMessage, ChatConversation } from '../../types/chat'

interface DoubaoTextBlock {
  text: string
  icon_url?: string
  icon_url_dark?: string
}

interface DoubaoContentBlock {
  block_type: number
  block_id: string
  parent_id: string
  content: {
    text_block?: DoubaoTextBlock
    suggest_block?: unknown
    search_text_block?: unknown
    // ... other block types
  }
  meta_info?: unknown[]
  is_finish: boolean
  append_fields?: unknown[]
}

interface DoubaoMessage {
  conversation_id: string
  message_id: string
  sender_id: string
  user_type: number // 1 = user, 2 = assistant
  status: number
  content_type: number
  content: string
  content_block: DoubaoContentBlock[]
  index_in_conv: string
  create_time: string
  update_time: string
}

interface DoubaoAPIResponse {
  cmd: number
  sequence_id: string
  downlink_body: {
    pull_singe_chain_downlink_body: {
      messages: DoubaoMessage[]
      has_more: boolean
    }
  }
  version: string
  status_code: number
  status_desc: string
}

export class DoubaoParser extends BaseParser {
  private static config: SiteConfig = {
    name: 'Doubao',
    hostnames: ['doubao.com', 'www.doubao.com'],
    titleSelectors: ['title', 'h1', '[class*="title"]'],
    messageContainerSelectors: [], // API-only parser, no DOM selection needed
    userMessageSelectors: [], // API-only parser, no DOM selection needed
    assistantMessageSelectors: [], // API-only parser, no DOM selection needed
    contentSelectors: [], // API-only parser, no DOM selection needed
  }

  constructor() {
    super(DoubaoParser.config)
  }

  async extractConversation(): Promise<ChatConversation | null> {
    try {
      const apiConversation = await this.extractConversationFromAPI()
      if (apiConversation) {
        return apiConversation
      }

      console.error('[Doubao] Failed to extract conversation')
      return null
    } catch (error) {
      console.error('[Doubao] Error in extractConversation:', error)
      return null
    }
  }

  /**
   * Extract conversation data from API (primary method)
   */
  private async extractConversationFromAPI(): Promise<ChatConversation | null> {
    try {
      const conversationId = this.extractConversationId()
      if (!conversationId) {
        console.error('[Doubao] No conversation ID found in URL')
        return null
      }

      const deviceId = this.extractDeviceId()
      const webId = this.extractWebId()
      const teaUuid = this.extractTeaUuid()

      // Build API URL with query parameters
      const apiUrl = new URL('https://www.doubao.com/im/chain/single')
      apiUrl.searchParams.set('version_code', '20800')
      apiUrl.searchParams.set('language', 'zh')
      apiUrl.searchParams.set('device_platform', 'web')
      apiUrl.searchParams.set('aid', '497858')
      apiUrl.searchParams.set('real_aid', '497858')
      apiUrl.searchParams.set('pkg_type', 'release_version')
      if (deviceId) apiUrl.searchParams.set('device_id', deviceId)
      if (webId) apiUrl.searchParams.set('web_id', webId)
      if (teaUuid) apiUrl.searchParams.set('tea_uuid', teaUuid)
      apiUrl.searchParams.set('use-olympus-account', '1')
      apiUrl.searchParams.set('region', 'CN')
      apiUrl.searchParams.set('sys_region', 'CN')
      apiUrl.searchParams.set('samantha_web', '1')

      const response = await fetch(apiUrl.toString(), {
        method: 'POST',
        credentials: 'include',
        headers: {
          accept: 'application/json, text/plain, */*',
          'accept-language': 'zh-CN,zh;q=0.9',
          'agw-js-conv': 'str',
          'content-type': 'application/json; encoding=utf-8',
        },
        body: JSON.stringify({
          cmd: 3100,
          uplink_body: {
            pull_singe_chain_uplink_body: {
              conversation_id: conversationId,
              anchor_index: 9007199254740991,
              conversation_type: 3,
              direction: 1,
              limit: 1000,
              ext: {},
              filter: {
                index_list: [],
              },
            },
          },
          sequence_id: this.generateSequenceId(),
          channel: 2,
          version: '1',
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Doubao] API request failed:', response.status, errorText)
        return null
      }

      const data: DoubaoAPIResponse = await response.json()

      if (
        !data.downlink_body?.pull_singe_chain_downlink_body?.messages ||
        data.downlink_body.pull_singe_chain_downlink_body.messages.length === 0
      ) {
        console.error('[Doubao] No messages found in API response')
        return null
      }

      const messages: ChatMessage[] = []

      data.downlink_body.pull_singe_chain_downlink_body.messages.forEach(msg => {
        const role = msg.user_type === 1 ? 'user' : 'assistant'
        let content = ''

        // Extract text from content_block array
        if (msg.content_block && Array.isArray(msg.content_block)) {
          msg.content_block.forEach(block => {
            if (block.content?.text_block?.text) {
              content += block.content.text_block.text + '\n\n'
            }
          })
        }

        content = content.trim()
        if (content) {
          messages.push({
            id: msg.message_id,
            content,
            role,
            timestamp: parseInt(msg.create_time) * 1000,
          })
        }
      })

      messages.sort((a, b) => a.timestamp - b.timestamp)

      const title = this.extractTitle() || 'Untitled Chat'

      return {
        id: conversationId,
        title,
        messages,
        url: window.location.href,
        extractedAt: Date.now(),
        platform: this.getSiteName(),
      }
    } catch (error) {
      console.error('[Doubao] API extraction failed:', error)
      return null
    }
  }

  /**
   * Extract conversation ID from URL
   */
  private extractConversationId(): string | null {
    const urlMatch = window.location.pathname.match(/\/chat\/([0-9]+)/)
    return urlMatch ? urlMatch[1] : null
  }

  /**
   * Extract device ID from localStorage
   */
  private extractDeviceId(): string | null {
    try {
      const teaCache = localStorage.getItem('__tea_cache_tokens_497858')
      if (teaCache) {
        const parsed = JSON.parse(teaCache)
        if (parsed.device_id) return parsed.device_id
      }
    } catch {
      // Ignore
    }
    return null
  }

  /**
   * Extract web ID from localStorage
   */
  private extractWebId(): string | null {
    try {
      const teaCache = localStorage.getItem('__tea_cache_tokens_497858')
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
   * Extract tea UUID from localStorage
   */
  private extractTeaUuid(): string | null {
    try {
      const teaCache = localStorage.getItem('__tea_cache_tokens_497858')
      if (teaCache) {
        const parsed = JSON.parse(teaCache)
        if (parsed.tea_uuid) return parsed.tea_uuid
      }
    } catch {
      // Ignore
    }
    return null
  }

  /**
   * Generate a random sequence ID for API request
   */
  private generateSequenceId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  /**
   * Extract conversation title from page
   */
  protected extractTitle(): string {
    const docTitle = document.title
    if (docTitle && docTitle !== 'Doubao' && docTitle !== '豆包') {
      return docTitle.replace(/\s*-\s*(Doubao|豆包)$/, '').trim()
    }

    for (const selector of this.config.titleSelectors) {
      const titleElement = document.querySelector(selector)
      if (titleElement) {
        const text = titleElement.textContent?.trim()
        if (text && text !== 'Doubao' && text !== '豆包') return text
      }
    }

    return 'Untitled Conversation'
  }

  getSiteName(): string {
    return this.config.name
  }

  // Static methods for backward compatibility
  static async extractConversation(): Promise<ChatConversation | null> {
    const parser = new DoubaoParser()
    return await parser.extractConversation()
  }

  static isDoubaoPage(): boolean {
    return window.location.hostname.includes('doubao.com')
  }
}
