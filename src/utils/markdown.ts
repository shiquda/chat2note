import { ChatConversation } from '../types/chat'
import { resolvePlatformLabel } from './platform'

export interface ConversationMarkdownTemplates {
  markdownTemplate?: string
  messageTemplate?: string
}

export const DEFAULT_MESSAGE_TEMPLATE = '## {{role}}\n\n{{content}}\n\n'
export const DEFAULT_MARKDOWN_TEMPLATE = '# {{title}}\n\n{{metadata}}{{messages}}'

const PLACEHOLDER_PATTERN = /{{\s*([\w.]+)\s*}}/g

function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(PLACEHOLDER_PATTERN, (_, key: string) => variables[key] ?? '')
}

function formatTimestamp(timestamp?: number): { locale: string; iso: string } {
  if (!timestamp && timestamp !== 0) {
    return { locale: '', iso: '' }
  }

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return { locale: '', iso: '' }
  }

  return { locale: date.toLocaleString(), iso: date.toISOString() }
}

/**
 * Convert LaTeX style delimiters to more common Markdown math blocks.
 * Also removes spaces between $ delimiters and content for better Obsidian compatibility.
 */
export function convertMathFormula(input: string): string {
  if (!input) return input
  let s = String(input)

  // Block-level formula: \[ ... \] → $$ ... $$
  // Use negative lookahead to prevent crossing into another block formula
  s = s.replace(/\\\[\s*((?:(?!\\\[|\\\])[\s\S])*?)\s*\\\]/g, (_, body) => `$$\n${body.trim()}\n$$`)

  // Inline formula: \( ... \) → $ ... $
  // Use negative lookahead to prevent crossing into another delimiter
  s = s.replace(/\\\(\s*((?:(?!\\\(|\\\)).)*?)\s*\\\)/g, (_, body) => `$${body.trim()}$`)

  return s
}

function buildYamlFrontmatter(conversation: ChatConversation, platformLabel: string): string {
  const exportedAt = new Date(conversation.extractedAt)
  const frontmatter = {
    title: conversation.title || 'Untitled Conversation',
    source: conversation.url,
    platform: platformLabel,
    exported_at: exportedAt.toISOString(),
    message_count: conversation.messages.length,
    created_at: new Date(conversation.extractedAt).toISOString(),
    tags: ['chat2note', platformLabel.toLowerCase().replace(/\s+/g, '-')],
  }

  // Remove undefined values
  const cleanFrontmatter = Object.fromEntries(
    Object.entries(frontmatter).filter(([_, value]) => value !== undefined)
  )

  const yamlLines = ['---']
  for (const [key, value] of Object.entries(cleanFrontmatter)) {
    if (Array.isArray(value)) {
      yamlLines.push(`${key}: [${value.map(v => `"${v}"`).join(', ')}]`)
    } else if (typeof value === 'string' && value.includes('\n')) {
      // Handle multiline strings
      yamlLines.push(`${key}: |`)
      for (const line of value.split('\n')) {
        yamlLines.push(`  ${line}`)
      }
    } else {
      yamlLines.push(`${key}: ${typeof value === 'string' ? `"${value}"` : value}`)
    }
  }
  yamlLines.push('---')
  yamlLines.push('')

  return yamlLines.join('\n')
}

function buildMetadataBlock(
  conversation: ChatConversation,
  includeMetadata: boolean,
  platformLabel: string,
  includeYamlFrontmatter: boolean = false
): string {
  if (!includeMetadata) {
    return ''
  }

  if (includeYamlFrontmatter) {
    return buildYamlFrontmatter(conversation, platformLabel)
  }

  const exportedAt = new Date(conversation.extractedAt)
  const exportedAtLocale = exportedAt.toLocaleString()
  const metadataLines = [
    `**Extracted from:** ${conversation.url}`,
    `**Platform:** ${platformLabel}`,
    `**Exported at:** ${exportedAtLocale}`,
    '',
    '---',
    '',
  ]

  return `${metadataLines.join('\n')}\n`
}

function buildMessageMarkdown(
  conversation: ChatConversation,
  templates: ConversationMarkdownTemplates
): string {
  const messageTemplate = templates.messageTemplate?.trim()
    ? templates.messageTemplate
    : DEFAULT_MESSAGE_TEMPLATE

  return conversation.messages
    .map((message, index) => {
      const roleLabel = message.role === 'user' ? 'User' : 'Assistant'
      const processedContent = convertMathFormula(message.content)
      const { locale: timestamp, iso: timestampISO } = formatTimestamp(message.timestamp)

      const variables: Record<string, string> = {
        role: roleLabel,
        rawRole: message.role,
        content: processedContent,
        index: String(index + 1),
        messageCount: String(conversation.messages.length),
        timestamp,
        timestampISO,
      }

      return renderTemplate(messageTemplate, variables)
    })
    .join('')
}

export function generateConversationMarkdown(
  conversation: ChatConversation,
  includeMetadata: boolean,
  templates: ConversationMarkdownTemplates = {},
  includeYamlFrontmatter: boolean = false
): string {
  const platformLabel = resolvePlatformLabel(conversation)
  const metadataBlock = buildMetadataBlock(
    conversation,
    includeMetadata,
    platformLabel,
    includeYamlFrontmatter
  )
  const messageMarkdown = buildMessageMarkdown(conversation, templates)

  const { locale: exportedAt, iso: exportedAtISO } = formatTimestamp(conversation.extractedAt)

  const conversationVariables: Record<string, string> = {
    title: conversation.title,
    url: conversation.url,
    platform: platformLabel,
    exportedAt,
    exportedAtISO,
    metadata: metadataBlock,
    messages: messageMarkdown,
    messageCount: String(conversation.messages.length),
  }

  const markdownTemplate = templates.markdownTemplate?.trim()
    ? templates.markdownTemplate
    : DEFAULT_MARKDOWN_TEMPLATE

  return renderTemplate(markdownTemplate, conversationVariables)
}
