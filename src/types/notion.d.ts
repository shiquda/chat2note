/**
 * Notion API 和 Martian 库的类型定义
 */

// Martian 库返回的 Block 类型
export interface NotionBlock {
  object: 'block'
  type: string
  [key: string]: unknown
}

export interface TableBlock extends NotionBlock {
  type: 'table'
  table: {
    table_width: number
    has_column_header: boolean
    has_row_header: boolean
    children: TableRowBlock[]
  }
}

export interface TableRowBlock extends NotionBlock {
  type: 'table_row'
  table_row: {
    cells: TableCell[][]
  }
}

export type TableCell = Array<{
  type: 'text'
  text: {
    content: string
    link?: {
      url: string
    }
  }
  plain_text?: string
  href?: string
  annotations?: {
    bold?: boolean
    italic?: boolean
    strikethrough?: boolean
    underline?: boolean
    code?: boolean
    color?: string
  }
}>

// Martian 库的函数签名
declare module '@tryfabric/martian' {
  export interface MartianOptions {
    notionLimits?: {
      truncate?: boolean
      onError?: (error: Error) => void
    }
    strictImageUrls?: boolean
    enableEmojiCallouts?: boolean
    nonInline?: 'ignore' | 'throw'
  }

  export function markdownToBlocks(markdown: string, options?: MartianOptions): NotionBlock[]

  export function markdownToRichText(markdown: string, options?: MartianOptions): RichText[]
}

export interface RichText {
  type: 'text'
  text: {
    content: string
    link?: {
      url: string
    }
  }
  plain_text?: string
  href?: string
}
