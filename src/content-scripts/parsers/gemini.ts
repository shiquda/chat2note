import { BaseParser } from './base'
import { SiteConfig } from './interface'
import { ChatConversation, ChatMessage } from '../../types/chat'

interface GeminiMessageElement extends Element {
  dataset: DOMStringMap & {
    messageAuthorRole?: string
    authorRole?: string
    role?: string
  }
}

function normalizeRole(value: string | null | undefined): 'user' | 'assistant' | null {
  if (!value) {
    return null
  }

  const normalized = value.trim().toLowerCase()

  if (!normalized) {
    return null
  }

  if (/(^|[^a-z])(user|you)([^a-z]|$)/.test(normalized)) {
    return 'user'
  }

  if (/(assistant|model|gemini|ai)/.test(normalized)) {
    return 'assistant'
  }

  return null
}

export class GeminiParser extends BaseParser {
  private static config: SiteConfig = {
    name: 'Gemini',
    hostnames: ['gemini.google.com'],
    titleSelectors: [
      '[data-e2e="conversation-header"] h1',
      '[data-e2e="title"]',
      'header h1',
      'title',
      '[data-test-id="conversation-title"]',
      '.conversation-title',
    ],
    messageContainerSelectors: [
      '[data-e2e="message"]',
      '[data-e2e="message-group"]',
      'chat-message',
      'cib-message',
      '[data-mdl-component="conversation-message"]',
      '[data-test-id="message"]',
      '[data-test-id="conversation-turn"]',
      'model-response',
      'user-message',
      '.message-container',
      '[role="presentation"] .markdown',
    ],
    userMessageSelectors: [
      '[data-e2e="user-message"]',
      '[data-e2e="message"] [data-message-author-role="user"]',
      '[data-author-role="user"]',
      '[data-role="user"]',
      '.user-message',
      '[data-test-id="user-message"]',
      'user-message .text-content',
    ],
    assistantMessageSelectors: [
      '[data-e2e="model-message"]',
      '[data-e2e="message"] [data-message-author-role="model"]',
      '[data-author-role="model"]',
      '[data-author-role="assistant"]',
      '[data-role="model"]',
      '.model-response',
      '.assistant-message',
      '[data-test-id="model-message"]',
      'model-response .text-content',
    ],
    contentSelectors: [
      '[data-e2e="markdown"]',
      '[data-e2e="message-content"]',
      '[data-mdl-text]',
      '[data-md="markdown"]',
      'markdown',
      'article',
      '.markdown',
      '.response-content',
      '.user-text',
      '[data-test-id="markdown"]',
      '.text-content',
      '[data-test-id="response-text"]',
      'pre',
      'code',
    ],
  }

  constructor() {
    super(GeminiParser.config)
  }

  extractConversation(): ChatConversation | null {
    try {
      console.log('[Gemini] Starting to extract conversation...')

      const containers = this.collectMessageContainers()
      console.log(`[Gemini] Located ${containers.length} potential message containers`)

      const messages = this.extractMessagesFromContainers(containers)
      console.log(`[Gemini] Extracted ${messages.length} messages after filtering`)

      if (messages.length === 0) {
        console.warn('[Gemini] No valid messages extracted')
        return null
      }

      const conversation = this.createConversation(messages)
      console.log('[Gemini] Successfully built conversation object', {
        title: conversation.title,
        messages: conversation.messages.length,
      })

      return conversation
    } catch (error) {
      console.error('[Gemini] Failed to extract conversation:', error)
      return null
    }
  }

  getSiteName(): string {
    return this.config.name
  }

  private collectMessageContainers(): Element[] {
    const matches = new Set<Element>()

    this.config.messageContainerSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => {
        const normalized = this.findClosestMessageElement(element)
        if (normalized && this.isValidMessageContainer(normalized)) {
          matches.add(normalized)
        }
      })
    })

    if (matches.size === 0) {
      document.querySelectorAll('[data-e2e="markdown"]').forEach(element => {
        const normalized = this.findClosestMessageElement(element)
        if (normalized && this.isValidMessageContainer(normalized)) {
          matches.add(normalized)
        }
      })
    }

    return Array.from(matches)
  }

  private extractMessagesFromContainers(containers: Element[]): ChatMessage[] {
    const messages: ChatMessage[] = []

    containers
      .sort((a, b) => {
        const aRect = this.safeBoundingClientRect(a)
        const bRect = this.safeBoundingClientRect(b)
        return aRect.top - bRect.top || aRect.left - bRect.left
      })
      .forEach((container, index) => {
        try {
          const role = this.detectMessageRole(container)
          if (!role) {
            return
          }

          const content = this.extractMessageContent(container).trim()
          if (!content) {
            return
          }

          messages.push({
            id: `gemini_msg_${index}_${Date.now()}`,
            content,
            role,
            timestamp: Date.now(),
          })
        } catch (error) {
          console.warn('[Gemini] Failed to process message container', error)
        }
      })

    return messages
  }

  private findClosestMessageElement(element: Element): Element | null {
    const geminiMessage = element.closest('[data-e2e="message"]')
    if (geminiMessage) {
      return geminiMessage
    }

    const chatMessage = element.closest('chat-message')
    if (chatMessage) {
      return chatMessage
    }

    const listItem = element.closest('[role="listitem"]')
    if (listItem) {
      return listItem
    }

    return element
  }

  private safeBoundingClientRect(element: Element): DOMRect {
    if (typeof element.getBoundingClientRect === 'function') {
      try {
        return element.getBoundingClientRect()
      } catch (error) {
        console.warn('[Gemini] Failed to read element position', error)
      }
    }

    return new DOMRect()
  }

  private isValidMessageContainer(element: Element): boolean {
    if (element.closest('[data-e2e="suggested-responses"]')) {
      return false
    }

    if (element.getAttribute('data-e2e') === 'input-area') {
      return false
    }

    return true
  }

  protected detectMessageRole(container: Element): 'user' | 'assistant' | null {
    const element = container as GeminiMessageElement

    const roleFromAttributes =
      normalizeRole(element.dataset?.messageAuthorRole) ||
      normalizeRole(element.dataset?.authorRole) ||
      normalizeRole(element.dataset?.role) ||
      normalizeRole(container.getAttribute('data-message-author-role')) ||
      normalizeRole(container.getAttribute('data-author-role')) ||
      normalizeRole(container.getAttribute('data-role'))

    if (roleFromAttributes) {
      return roleFromAttributes
    }

    const ariaLabel = normalizeRole(container.getAttribute('aria-label'))
    if (ariaLabel) {
      return ariaLabel
    }

    const labelledBy = container.getAttribute('aria-labelledby')
    if (labelledBy) {
      const label = document.getElementById(labelledBy)
      const labelRole = normalizeRole(label?.textContent || '')
      if (labelRole) {
        return labelRole
      }
    }

    const iconRole = normalizeRole(this.extractIconLabel(container))
    if (iconRole) {
      return iconRole
    }

    const className = normalizeRole(container.getAttribute('class'))
    if (className) {
      return className
    }

    return super.detectMessageRole(container)
  }

  private extractIconLabel(container: Element): string | null {
    const iconSelectors = [
      '[data-e2e="user-avatar"]',
      '[data-e2e="model-avatar"]',
      'img[alt]',
      'svg[aria-label]',
    ]

    for (const selector of iconSelectors) {
      const icon = container.querySelector(selector) as HTMLElement | null
      if (!icon) {
        continue
      }

      const altText = icon.getAttribute('alt') || icon.getAttribute('aria-label')
      if (altText) {
        return altText
      }
    }

    return null
  }

  protected extractMessageContent(container: Element): string {
    const selectors = [
      '[data-e2e="markdown"]',
      '[data-e2e="rich-text"]',
      '[data-e2e="message-content"]',
      '[data-mdl-text]',
      '[data-md="markdown"]',
      '[data-e2e="text-content"]',
      '[data-e2e="user-message-text"]',
      'markdown',
      'md-block',
      'article',
      '.markdown',
      '.response-content',
      '.user-text',
      ...this.config.contentSelectors,
    ]

    const fragments: string[] = []
    const collected = new Set<Element>()

    for (const selector of selectors) {
      const elements = Array.from(container.querySelectorAll(selector))
      elements.forEach(element => {
        if (collected.has(element)) {
          return
        }

        collected.add(element)

        const text = this.extractTextContent(element)
        if (text.trim()) {
          fragments.push(text.trim())
        }
      })
    }

    if (fragments.length > 0) {
      return Array.from(new Set(fragments)).join('\n\n')
    }

    return this.extractTextContent(container)
  }

  static extractConversation(): ChatConversation | null {
    const parser = new GeminiParser()
    return parser.extractConversation()
  }

  static isGeminiPage(): boolean {
    return window.location.hostname === 'gemini.google.com'
  }
}
