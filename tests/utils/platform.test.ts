import { describe, it, expect } from 'vitest'
import { resolvePlatformLabel, UNKNOWN_PLATFORM_LABEL } from '../../src/utils/platform'
import type { ChatConversation } from '../../src/types/chat'

describe('Platform Utilities', () => {
  describe('resolvePlatformLabel', () => {
    it('should return platform name when directly specified', () => {
      const conversation: ChatConversation = {
        id: 'test',
        title: 'Test',
        messages: [],
        url: 'https://example.com',
        extractedAt: Date.now(),
        platform: 'CustomPlatform',
      }

      expect(resolvePlatformLabel(conversation)).toBe('CustomPlatform')
    })

    it('should normalize known platform ids when directly specified', () => {
      const conversation: ChatConversation = {
        id: 'test',
        title: 'Test',
        messages: [],
        url: 'https://chat.openai.com/c/123',
        extractedAt: Date.now(),
        platform: 'chatgpt',
      }

      expect(resolvePlatformLabel(conversation)).toBe('ChatGPT')
    })

    it('should resolve ChatGPT from chat.openai.com', () => {
      const conversation: ChatConversation = {
        id: 'test',
        title: 'Test',
        messages: [],
        url: 'https://chat.openai.com/c/123',
        extractedAt: Date.now(),
      }

      expect(resolvePlatformLabel(conversation)).toBe('ChatGPT')
    })

    it('should resolve ChatGPT from chatgpt.com', () => {
      const conversation: ChatConversation = {
        id: 'test',
        title: 'Test',
        messages: [],
        url: 'https://chatgpt.com/c/123',
        extractedAt: Date.now(),
      }

      expect(resolvePlatformLabel(conversation)).toBe('ChatGPT')
    })

    it('should resolve Claude from claude.ai', () => {
      const conversation: ChatConversation = {
        id: 'test',
        title: 'Test',
        messages: [],
        url: 'https://claude.ai/chat/123',
        extractedAt: Date.now(),
      }

      expect(resolvePlatformLabel(conversation)).toBe('Claude')
    })

    it('should resolve Claude from www.claude.ai', () => {
      const conversation: ChatConversation = {
        id: 'test',
        title: 'Test',
        messages: [],
        url: 'https://www.claude.ai/chat/123',
        extractedAt: Date.now(),
      }

      expect(resolvePlatformLabel(conversation)).toBe('Claude')
    })

    it('should resolve DeepSeek from chat.deepseek.com', () => {
      const conversation: ChatConversation = {
        id: 'test',
        title: 'Test',
        messages: [],
        url: 'https://chat.deepseek.com/chat/123',
        extractedAt: Date.now(),
      }

      expect(resolvePlatformLabel(conversation)).toBe('DeepSeek')
    })

    it('should resolve Gemini from gemini.google.com', () => {
      const conversation: ChatConversation = {
        id: 'test',
        title: 'Test',
        messages: [],
        url: 'https://gemini.google.com/app/123',
        extractedAt: Date.now(),
      }

      expect(resolvePlatformLabel(conversation)).toBe('Gemini')
    })

    it('should resolve from second-level domain if hostname not in map', () => {
      const conversation: ChatConversation = {
        id: 'test',
        title: 'Test',
        messages: [],
        url: 'https://custom.openai.com/chat/123',
        extractedAt: Date.now(),
      }

      expect(resolvePlatformLabel(conversation)).toBe('ChatGPT')
    })

    it('should return title case of domain name for unknown platforms', () => {
      const conversation: ChatConversation = {
        id: 'test',
        title: 'Test',
        messages: [],
        url: 'https://my-custom-platform.com/chat/123',
        extractedAt: Date.now(),
      }

      expect(resolvePlatformLabel(conversation)).toBe('My Custom Platform')
    })

    it('should handle underscores and hyphens in domain names', () => {
      const conversation: ChatConversation = {
        id: 'test',
        title: 'Test',
        messages: [],
        url: 'https://my-custom_platform.org/chat/123',
        extractedAt: Date.now(),
      }

      expect(resolvePlatformLabel(conversation)).toBe('My Custom Platform')
    })

    it('should handle malformed URLs gracefully', () => {
      const conversation: ChatConversation = {
        id: 'test',
        title: 'Test',
        messages: [],
        url: 'not-a-url',
        extractedAt: Date.now(),
      }

      expect(resolvePlatformLabel(conversation)).toBe(UNKNOWN_PLATFORM_LABEL)
    })

    it('should handle empty URL', () => {
      const conversation: ChatConversation = {
        id: 'test',
        title: 'Test',
        messages: [],
        url: '',
        extractedAt: Date.now(),
      }

      expect(resolvePlatformLabel(conversation)).toBe(UNKNOWN_PLATFORM_LABEL)
    })

    it('should handle undefined URL', () => {
      const conversation: ChatConversation = {
        id: 'test',
        title: 'Test',
        messages: [],
        url: '',
        extractedAt: Date.now(),
      }

      expect(resolvePlatformLabel(conversation)).toBe(UNKNOWN_PLATFORM_LABEL)
    })

    it('should handle empty platform name', () => {
      const conversation: ChatConversation = {
        id: 'test',
        title: 'Test',
        messages: [],
        url: 'https://example.com',
        extractedAt: Date.now(),
        platform: '',
      }

      expect(resolvePlatformLabel(conversation)).toBe('Example') // example.com resolves to 'Example'
    })

    it('should handle whitespace-only platform name', () => {
      const conversation: ChatConversation = {
        id: 'test',
        title: 'Test',
        messages: [],
        url: 'https://example.com',
        extractedAt: Date.now(),
        platform: '   ',
      }

      expect(resolvePlatformLabel(conversation)).toBe('Example') // example.com resolves to 'Example'
    })
  })
})
