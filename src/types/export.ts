import { ChatConversation } from './chat'

export interface ExportOptions {
  format: 'markdown' | 'json' | 'txt'
  target: 'local' | 'notion' | 'clipboard' | 'obsidian' | 'siyuan' | 'joplin'
  includeMetadata?: boolean
  fileName?: string
  scope?: 'all' | 'selected'
}

export interface ExportResult {
  success: boolean
  message?: string
  error?: string
  data?: any
  pageUrl?: string
  handled?: boolean
}

export interface NotionExportResult extends ExportResult {
  pageId?: string
  pageUrl?: string
}

export interface LocalExportResult extends ExportResult {
  filename?: string
  fileSize?: number
}

export interface ClipboardExportResult extends ExportResult {
  contentLength?: number
}

export interface ObsidianExportResult extends ExportResult {
  vault?: string
  notePath?: string
  openedUris?: string[]
  uri?: string
}

export interface SiyuanExportResult extends ExportResult {
  notebookId?: string
  notePath?: string
  uri?: string
}

export interface JoplinExportResult extends ExportResult {
  noteId?: string
  noteUrl?: string
  notebookId?: string
  tags?: string[]
}

export type ExportResultType =
  | ExportResult
  | NotionExportResult
  | LocalExportResult
  | ClipboardExportResult
  | ObsidianExportResult
  | SiyuanExportResult
  | JoplinExportResult

export interface ExportProgress {
  stage: 'preparing' | 'processing' | 'uploading' | 'completing' | 'error' | 'completed'
  progress: number // 0-100
  message: string
  timestamp: number
}

export interface ExportJob {
  id: string
  conversation: ChatConversation
  options: ExportOptions
  progress: ExportProgress
  result?: ExportResultType
  createdAt: number
  completedAt?: number
}
