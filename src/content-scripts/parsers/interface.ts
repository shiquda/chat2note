import { ChatConversation } from '../../types/chat'

/**
 * 聊天解析器接口
 * 所有聊天网站的解析器都需要实现这个接口
 */
export interface IChatParser {
  /**
   * 从当前页面提取对话
   * @returns ChatConversation 对话对象，如果无法提取则返回null
   */
  extractConversation(): ChatConversation | null | Promise<ChatConversation | null>

  /**
   * 检查当前页面是否是此解析器支持的网站
   * @returns boolean 如果当前页面是支持的网站则返回true
   */
  isSupportedSite(): boolean

  /**
   * 获取网站名称
   * @returns string 网站名称
   */
  getSiteName(): string

  /**
   * 获取页面中的消息容器列表
   */
  getMessageContainers(): Element[]
}

/**
 * 网站配置接口
 */
export interface SiteConfig {
  name: string
  hostnames: string[]
  titleSelectors: string[]
  messageContainerSelectors: string[]
  userMessageSelectors: string[]
  assistantMessageSelectors: string[]
  contentSelectors: string[]
}
