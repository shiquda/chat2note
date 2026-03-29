import { IChatParser } from './interface'

/**
 * 解析器工厂类
 * 负责创建和管理不同网站的解析器
 */
export class ParserFactory {
  private static parsers: IChatParser[] = []

  /**
   * 注册解析器
   * @param parser 解析器实例
   */
  static registerParser(parser: IChatParser): void {
    this.parsers.push(parser)
  }

  /**
   * 获取当前页面的解析器
   * @returns IChatParser | null 如果没有找到支持的解析器则返回null
   */
  static getCurrentParser(): IChatParser | null {
    for (const parser of this.parsers) {
      if (parser.isSupportedSite()) {
        console.log(`[${parser.getSiteName()}] Parser selected for current page`)
        return parser
      }
    }
    return null
  }

  /**
   * 获取所有已注册的解析器
   * @returns IChatParser[] 解析器列表
   */
  static getAllParsers(): IChatParser[] {
    return [...this.parsers]
  }

  /**
   * 清空所有解析器
   */
  static clearParsers(): void {
    this.parsers = []
  }

  /**
   * 检查当前页面是否被支持
   * @returns boolean 如果当前页面被任何解析器支持则返回true
   */
  static isCurrentPageSupported(): boolean {
    return this.getCurrentParser() !== null
  }

  /**
   * 获取当前页面的网站名称
   * @returns string 网站名称，如果不支持则返回'Unknown'
   */
  static getCurrentSiteName(): string {
    const parser = this.getCurrentParser()
    return parser ? parser.getSiteName() : 'Unknown'
  }
}
