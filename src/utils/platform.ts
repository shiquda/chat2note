import { ChatConversation } from '../types/chat'

const HOSTNAME_PLATFORM_MAP: Record<string, string> = {
  'chat.openai.com': 'ChatGPT',
  'chatgpt.com': 'ChatGPT',
  'claude.ai': 'Claude',
  'www.claude.ai': 'Claude',
  'chat.deepseek.com': 'DeepSeek',
  'gemini.google.com': 'Gemini',
  'kimi.com': 'Kimi',
  'www.kimi.com': 'Kimi',
  'yuanbao.tencent.com': 'Yuanbao',
  'doubao.com': 'Doubao',
  'www.doubao.com': 'Doubao',
  'grok.com': 'Grok',
}

const SECOND_LEVEL_PLATFORM_MAP: Record<string, string> = {
  openai: 'ChatGPT',
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  deepseek: 'DeepSeek',
  gemini: 'Gemini',
  kimi: 'Kimi',
  yuanbao: 'Yuanbao',
  doubao: 'Doubao',
  grok: 'Grok',
}

const UNKNOWN_LABEL = 'Unknown'

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function sanitizeSegment(segment: string): string {
  return segment.replace(/[-_]+/g, ' ').trim()
}

function resolveFromHostname(hostname: string): string {
  const normalizedHost = hostname.toLowerCase()
  if (HOSTNAME_PLATFORM_MAP[normalizedHost]) {
    return HOSTNAME_PLATFORM_MAP[normalizedHost]
  }

  const withoutWww = normalizedHost.replace(/^www\./, '')
  if (HOSTNAME_PLATFORM_MAP[withoutWww]) {
    return HOSTNAME_PLATFORM_MAP[withoutWww]
  }

  const segments = withoutWww.split('.')
  if (segments.length >= 2) {
    const secondLevel = segments[segments.length - 2]
    if (SECOND_LEVEL_PLATFORM_MAP[secondLevel]) {
      return SECOND_LEVEL_PLATFORM_MAP[secondLevel]
    }
    const sanitized = sanitizeSegment(secondLevel)
    if (sanitized) {
      return toTitleCase(sanitized)
    }
  }

  const sanitized = sanitizeSegment(withoutWww.replace(/\.[^.]+$/, ''))
  if (sanitized) {
    return toTitleCase(sanitized)
  }

  return UNKNOWN_LABEL
}

function resolveFromDirectPlatform(platform: string): string | null {
  const normalized = platform.trim().toLowerCase()

  if (SECOND_LEVEL_PLATFORM_MAP[normalized]) {
    return SECOND_LEVEL_PLATFORM_MAP[normalized]
  }

  return null
}

export function resolvePlatformLabel(conversation: ChatConversation): string {
  const direct = conversation.platform?.trim()
  if (direct) {
    const normalized = resolveFromDirectPlatform(direct)
    if (normalized) {
      return normalized
    }

    return direct
  }

  if (conversation.url) {
    try {
      const { hostname } = new URL(conversation.url)
      const fromHost = resolveFromHostname(hostname)
      if (fromHost !== UNKNOWN_LABEL) {
        return fromHost
      }
    } catch (error) {
      console.warn('Failed to parse conversation URL when resolving platform:', error)
    }
  }

  return UNKNOWN_LABEL
}

export const UNKNOWN_PLATFORM_LABEL = UNKNOWN_LABEL
