export interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: number
}

export interface ChatConversation {
  id: string
  title: string
  messages: ChatMessage[]
  url: string
  extractedAt: number
  platform?: string
  tags?: string[]
}
