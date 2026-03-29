import { ParserFactory } from './factory'
import { ChatGPTParser } from './chatgpt'
import { DeepSeekParser } from './deepseek'
import { GeminiParser } from './gemini'
import { ClaudeParser } from './claude'
import { KimiParser } from './kimi'
import { YuanbaoParser } from './yuanbao'
import { DoubaoParser } from './doubao'
import { GrokParser } from './grok'

/**
 * 解析器注册表
 * 负责注册和管理所有支持的聊天网站解析器
 */
export class ParserRegistry {
  /**
   * 初始化并注册所有解析器
   */
  static initialize(): void {
    console.log('[ParserRegistry] Initializing parsers...')

    // 注册ChatGPT解析器
    const chatGPTParser = new ChatGPTParser()
    ParserFactory.registerParser(chatGPTParser)
    console.log('[ParserRegistry] Registered ChatGPT parser')

    // 注册Claude解析器
    const claudeParser = new ClaudeParser()
    ParserFactory.registerParser(claudeParser)
    console.log('[ParserRegistry] Registered Claude parser')

    // 注册DeepSeek解析器
    const deepSeekParser = new DeepSeekParser()
    ParserFactory.registerParser(deepSeekParser)
    console.log('[ParserRegistry] Registered DeepSeek parser')

    // 注册Gemini解析器
    const geminiParser = new GeminiParser()
    ParserFactory.registerParser(geminiParser)
    console.log('[ParserRegistry] Registered Gemini parser')

    // 注册Kimi解析器
    const kimiParser = new KimiParser()
    ParserFactory.registerParser(kimiParser)
    console.log('[ParserRegistry] Registered Kimi parser')

    // 注册Yuanbao解析器
    const yuanbaoParser = new YuanbaoParser()
    ParserFactory.registerParser(yuanbaoParser)
    console.log('[ParserRegistry] Registered Yuanbao parser')

    // 注册Doubao解析器
    const doubaoParser = new DoubaoParser()
    ParserFactory.registerParser(doubaoParser)
    console.log('[ParserRegistry] Registered Doubao parser')

    // 注册Grok解析器
    const grokParser = new GrokParser()
    ParserFactory.registerParser(grokParser)
    console.log('[ParserRegistry] Registered Grok parser')

    console.log(
      `[ParserRegistry] Total parsers registered: ${ParserFactory.getAllParsers().length}`
    )
  }

  /**
   * 获取当前页面的解析器
   */
  static getCurrentParser(): any {
    return ParserFactory.getCurrentParser()
  }

  /**
   * 检查当前页面是否被支持
   */
  static isCurrentPageSupported(): boolean {
    return ParserFactory.isCurrentPageSupported()
  }

  /**
   * 获取当前页面的网站名称
   */
  static getCurrentSiteName(): string {
    return ParserFactory.getCurrentSiteName()
  }

  /**
   * 获取所有支持的网站列表
   */
  static getSupportedSites(): string[] {
    return ParserFactory.getAllParsers().map(parser => parser.getSiteName())
  }
}

// 自动初始化（仅在内容脚本环境中）
if (typeof window !== 'undefined') {
  ParserRegistry.initialize()
}
