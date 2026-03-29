import { describe, it, expect } from 'vitest'
import { convertMathFormula, generateConversationMarkdown } from '../src/utils/markdown'
import type { ChatConversation } from '../src/types/chat'

type PartialConversation = Omit<ChatConversation, 'id'>

const baseConversation: PartialConversation = {
  title: 'Sample Conversation',
  messages: [
    {
      id: 'm1',
      role: 'user',
      content: 'Hello world',
      timestamp: Date.UTC(2024, 0, 1, 12, 0, 0),
    },
    {
      id: 'm2',
      role: 'assistant',
      content: 'Response with math $ \\tau $',
      timestamp: Date.UTC(2024, 0, 1, 12, 5, 0),
    },
  ],
  url: 'https://chat.openai.com/c/123',
  extractedAt: Date.UTC(2024, 0, 1, 12, 30, 0),
  platform: undefined,
}

describe('Markdown Utilities', () => {
  describe('generateConversationMarkdown', () => {
    it('should reproduce legacy Markdown output with default templates', () => {
      const conversation: ChatConversation = { id: 'conv-default', ...baseConversation }
      const result = generateConversationMarkdown(conversation, true)

      const exportedAt = new Date(conversation.extractedAt).toLocaleString()
      const assistantContent = convertMathFormula(conversation.messages[1].content)
      const expected = [
        `# ${conversation.title}`,
        '',
        `**Extracted from:** ${conversation.url}`,
        '**Platform:** ChatGPT',
        `**Exported at:** ${exportedAt}`,
        '',
        '---',
        '',
        '## User',
        '',
        'Hello world',
        '',
        '## Assistant',
        '',
        assistantContent,
        '',
        '',
      ].join('\n')

      expect(result).toBe(expected)
    })

    it('should substitute placeholders correctly with custom templates', () => {
      const conversation: ChatConversation = { id: 'conv-custom', ...baseConversation }
      const output = generateConversationMarkdown(conversation, true, {
        markdownTemplate: 'Title: {{title}}\nSource: {{url}}\nMessages:\n{{messages}}--end--',
        messageTemplate: '- [{{index}}/{{messageCount}}] {{rawRole}} => {{content}}\n',
      })

      const assistantContent = convertMathFormula(conversation.messages[1].content)
      const expected = [
        `Title: ${conversation.title}`,
        `Source: ${conversation.url}`,
        'Messages:',
        '- [1/2] user => Hello world',
        `- [2/2] assistant => ${assistantContent}`,
        '--end--',
      ].join('\n')

      expect(output).toBe(expected)
    })

    it('should render missing variables as empty strings', () => {
      const conversation: ChatConversation = { id: 'conv-missing', ...baseConversation }
      const output = generateConversationMarkdown(conversation, false, {
        markdownTemplate: '{{title}} {{missing}}{{messages}}',
        messageTemplate: '{{content}}{{unknown}}',
      })

      const assistantContent = convertMathFormula(conversation.messages[1].content)
      const expected = `Sample Conversation Hello world${assistantContent}`
      expect(output).toBe(expected)
    })

    it('should fall back to defaults when templates are blank', () => {
      const conversation: ChatConversation = { id: 'conv-fallback', ...baseConversation }
      const fallback = generateConversationMarkdown(conversation, true, {
        markdownTemplate: '   ',
        messageTemplate: '',
      })
      const baseline = generateConversationMarkdown(conversation, true)

      expect(fallback).toBe(baseline)
    })
  })

  describe('convertMathFormula', () => {
    it('should convert LaTeX inline math to Markdown format', () => {
      const input = 'This is a test with \\( \\tau \\) formula.'
      const output = convertMathFormula(input)
      const expected = 'This is a test with $\\tau$ formula.'

      expect(output).toBe(expected)
    })

    it('should convert LaTeX block math to Markdown format', () => {
      const input = 'Block formula: \\[ x^2 + y^2 = z^2 \\]'
      const output = convertMathFormula(input)
      const expected = 'Block formula: $$\nx^2 + y^2 = z^2\n$$'

      expect(output).toBe(expected)
    })

    it('should handle complex LaTeX expressions with spaces', () => {
      const input = '\\(  \\frac{1}{2}  \\) and \\[  E = mc^2  \\]'
      const output = convertMathFormula(input)
      const expected = '$\\frac{1}{2}$ and $$\nE = mc^2\n$$'

      expect(output).toBe(expected)
    })

    it('should preserve existing Markdown math formulas unchanged', () => {
      const input = 'Existing $\\tau$ and $$\\begin{align} ...$$'
      const output = convertMathFormula(input)
      const expected = 'Existing $\\tau$ and $$\\begin{align} ...$$'

      expect(output).toBe(expected)
    })

    it('should handle empty input', () => {
      expect(convertMathFormula('')).toBe('')
      expect(convertMathFormula(undefined as unknown as string)).toBeUndefined()
    })

    it('should preserve newlines and handle mixed content', () => {
      const input = 'Line 1\n\\( test \\)\nLine 3\n\\[ block \\]\nLine 5'
      const output = convertMathFormula(input)
      const expected = 'Line 1\n$test$\nLine 3\n$$\nblock\n$$\nLine 5'

      expect(output).toBe(expected)
    })
  })
})
