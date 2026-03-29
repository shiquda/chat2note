import { ChatMessage, ChatConversation } from '../../types/chat'
import { IChatParser, SiteConfig } from './interface'

/**
 * 基础解析器类
 * 包含所有解析器的通用功能
 */
export abstract class BaseParser implements IChatParser {
  protected config: SiteConfig

  constructor(config: SiteConfig) {
    this.config = config
  }

  abstract extractConversation(): ChatConversation | null | Promise<ChatConversation | null>
  abstract getSiteName(): string

  getMessageContainers(): Element[] {
    if (!this.config.messageContainerSelectors.length) {
      return []
    }
    const selector = this.config.messageContainerSelectors.join(', ')
    return Array.from(document.querySelectorAll(selector))
  }

  /**
   * 检查当前页面是否是支持的网站
   */
  isSupportedSite(): boolean {
    return this.config.hostnames.includes(window.location.hostname)
  }

  /**
   * 通用标题提取方法
   */
  protected extractTitle(): string {
    for (const selector of this.config.titleSelectors) {
      const element = document.querySelector(selector)
      if (element?.textContent?.trim()) {
        return element.textContent.trim()
      }
    }
    return 'Untitled Chat'
  }

  /**
   * 通用消息提取方法
   */
  protected extractMessages(): ChatMessage[] {
    const messages: ChatMessage[] = []
    const messageContainers = this.getMessageContainers()

    messageContainers.forEach((container, index) => {
      const element = container as HTMLElement | null
      try {
        const message = this.extractMessageFromContainer(container, index)
        if (message) {
          if (element) {
            element.setAttribute('data-chat2note-message-index', messages.length.toString())
          }
          messages.push(message)
        } else if (element) {
          element.removeAttribute('data-chat2note-message-index')
        }
      } catch (error) {
        console.warn(`[${this.getSiteName()}] Error processing message container ${index}:`, error)
        if (element) {
          element.removeAttribute('data-chat2note-message-index')
        }
      }
    })

    return messages
  }

  /**
   * 从容器中提取单个消息
   */
  protected extractMessageFromContainer(container: Element, index: number): ChatMessage | null {
    // 检测消息角色
    const role = this.detectMessageRole(container)
    if (!role) {
      return null
    }

    // 提取消息内容
    const content = this.extractMessageContent(container)
    if (!content.trim()) {
      return null
    }

    return {
      id: `msg_${index}_${Date.now()}`,
      content: content.trim(),
      role,
      timestamp: Date.now(),
    }
  }

  /**
   * 检测消息角色
   */
  protected detectMessageRole(container: Element): 'user' | 'assistant' | null {
    // 检查用户消息
    for (const selector of this.config.userMessageSelectors) {
      if (container.querySelector(selector)) {
        return 'user'
      }
    }

    // 检查助手消息
    for (const selector of this.config.assistantMessageSelectors) {
      if (container.querySelector(selector)) {
        return 'assistant'
      }
    }

    return null
  }

  /**
   * 提取消息内容
   */
  protected extractMessageContent(container: Element): string {
    for (const selector of this.config.contentSelectors) {
      const element = container.querySelector(selector)
      if (element) {
        return this.extractTextContent(element)
      }
    }
    return ''
  }

  /**
   * 提取文本内容（保留原有的格式化逻辑）
   */
  protected extractTextContent(element: Element): string {
    // 移除不需要的元素
    const clone = element.cloneNode(true) as Element

    // 移除按钮、输入框等交互元素
    const unwantedSelectors = ['button', 'input', 'textarea', 'select', '[role="button"]']
    unwantedSelectors.forEach(selector => {
      const elements = clone.querySelectorAll(selector)
      elements.forEach(el => el.remove())
    })

    // 处理代码块
    const codeBlocks = clone.querySelectorAll('pre, code')
    codeBlocks.forEach(block => {
      const pre = block.closest('pre')
      if (pre) {
        pre.textContent = `\n\`\`\`\n${block.textContent?.trim() || ''}\n\`\`\`\n`
      } else {
        block.textContent = `\`${block.textContent?.trim() || ''}\``
      }
    })

    // 获取原始文本内容
    let text = clone.textContent || ''

    // 文本清理 - 保留中文字符和格式
    text = text
      .replace(/[ \t]+/g, ' ') // 合并空格和制表符
      .replace(/\n\s*\n/g, '\n\n') // 合并多个换行
      .replace(/^\s+|\s+$/g, '') // 移除首尾空白

    return text
  }

  /**
   * 创建对话对象
   */
  protected createConversation(messages: ChatMessage[]): ChatConversation {
    return {
      id: `conv_${Date.now()}`,
      title: this.extractTitle(),
      messages,
      url: window.location.href,
      extractedAt: Date.now(),
      platform: this.getSiteName(),
    }
  }
}
