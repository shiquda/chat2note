import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ObsidianService } from '../../src/services/obsidian'
import { ChatConversation } from '../../src/types/chat'
import { configStorage } from '../../src/config/storage'
import { ObsidianConfig } from '../../src/types/config'

// Mock dependencies
vi.mock('../../src/config/storage')
vi.mock('../../src/i18n', () => ({
  default: (key: string, ..._args: any[]) => {
    // eslint-disable-line @typescript-eslint/no-explicit-any
    const translations: Record<string, string> = {
      notification_export_success: 'Exported to $TARGET$ ($FORMAT$)',
      notification_export_failed: 'Export failed: $ERROR$',
      target_obsidian: 'Obsidian',
    }
    return translations[key] || key
  },
}))

const mockConfigStorage = vi.mocked(configStorage)

// Helper function to create ObsidianService for testing
async function createTestObsidianService(
  config?: Partial<ObsidianConfig>
): Promise<ObsidianService> {
  const testConfig: ObsidianConfig = {
    enabled: true,
    vaultName: 'TestVault',
    folderPath: 'Chats',
    openMode: 'note',
    strictMarkdown: true,
    includeYamlFrontmatter: false,
    ...config,
  }

  mockConfigStorage.getConfig.mockResolvedValue({
    obsidian: testConfig,
  } as any) // eslint-disable-line @typescript-eslint/no-explicit-any

  const service = await ObsidianService.createFromStorage()
  if (!service) {
    throw new Error('Failed to create ObsidianService for testing')
  }
  return service
}

describe('ObsidianService', () => {
  let obsidianService: ObsidianService
  let mockConversation: ChatConversation

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mock conversation
    mockConversation = {
      id: 'test-conversation-1',
      title: 'Test Conversation',
      platform: 'chatgpt',
      messages: [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello, how are you?',
          timestamp: Date.now() - 10000,
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'I am doing well, thank you!',
          timestamp: Date.now() - 5000,
        },
      ],
      url: 'https://chat.openai.com/c/test-conversation-1',
      extractedAt: Date.now(),
    }

    // Setup default config
    mockConfigStorage.getConfig.mockResolvedValue({
      version: '1.0.0',
      notion: {
        apiToken: '',
        databaseId: '',
        enabled: false,
        includeProperties: false,
      },
      obsidian: {
        enabled: true,
        vaultName: 'TestVault',
        folderPath: 'Chats',
        openMode: 'note',
        strictMarkdown: true,
        includeYamlFrontmatter: false,
      },
      siyuan: {
        enabled: false,
        apiUrl: '',
        apiToken: '',
        notebookId: '',
        folderPath: '',
        setBlockAttributes: false,
      },
      joplin: {
        enabled: false,
        apiUrl: '',
        apiToken: '',
        defaultNotebookId: '',
        defaultTags: [],
        includeMetadata: false,
        authMethod: 'manual',
      },
      export: {
        defaultFormat: 'markdown',
        defaultTarget: 'local',
        defaultScope: 'all',
        includeMetadata: false,
        fileNameTemplate: '{{title}} - {{date}}',
        markdownTemplate: '',
        messageTemplate: '',
        visibleTargets: ['local'],
      },
      appearance: {
        theme: 'system',
        language: 'en',
        floatingButtonPosition: 'bottom-right',
      },
    } as any) // eslint-disable-line @typescript-eslint/no-explicit-any
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createFromStorage', () => {
    it('应该成功创建ObsidianService实例', async () => {
      const service = await ObsidianService.createFromStorage()

      expect(service).toBeInstanceOf(ObsidianService)
    })

    it('应该处理配置不存在的情况', async () => {
      mockConfigStorage.getConfig.mockResolvedValue(null)

      const service = await ObsidianService.createFromStorage()

      expect(service).toBeNull()
    })

    it('应该处理Obsidian未启用的情况', async () => {
      mockConfigStorage.getConfig.mockResolvedValue({
        version: '1.0.0',
        notion: {
          apiToken: '',
          databaseId: '',
          enabled: false,
          includeProperties: false,
        },
        obsidian: {
          enabled: false,
          vaultName: 'TestVault',
          folderPath: 'Chats',
          openMode: 'note',
          strictMarkdown: true,
          includeYamlFrontmatter: false,
        },
        siyuan: {
          enabled: false,
          apiUrl: '',
          apiToken: '',
          notebookId: '',
          folderPath: '',
          setBlockAttributes: false,
        },
        joplin: {
          enabled: false,
          apiUrl: '',
          apiToken: '',
          defaultNotebookId: '',
          defaultTags: [],
          includeMetadata: false,
          authMethod: 'manual',
        },
        export: {
          defaultFormat: 'markdown',
          defaultTarget: 'local',
          defaultScope: 'all',
          includeMetadata: false,
          fileNameTemplate: '{{title}} - {{date}}',
          markdownTemplate: '',
          messageTemplate: '',
          visibleTargets: ['local'],
        },
        appearance: {
          theme: 'system',
          language: 'en',
          floatingButtonPosition: 'bottom-right',
        },
      } as any) // eslint-disable-line @typescript-eslint/no-explicit-any

      const service = await ObsidianService.createFromStorage()

      expect(service).toBeNull()
    })

    it('应该处理vault名称为空的情况', async () => {
      mockConfigStorage.getConfig.mockResolvedValue({
        version: '1.0.0',
        notion: {
          apiToken: '',
          databaseId: '',
          enabled: false,
          includeProperties: false,
        },
        obsidian: {
          enabled: true,
          vaultName: '',
          folderPath: 'Chats',
          openMode: 'note',
          strictMarkdown: true,
          includeYamlFrontmatter: false,
        },
        siyuan: {
          enabled: false,
          apiUrl: '',
          apiToken: '',
          notebookId: '',
          folderPath: '',
          setBlockAttributes: false,
        },
        joplin: {
          enabled: false,
          apiUrl: '',
          apiToken: '',
          defaultNotebookId: '',
          defaultTags: [],
          includeMetadata: false,
          authMethod: 'manual',
        },
        export: {
          defaultFormat: 'markdown',
          defaultTarget: 'local',
          defaultScope: 'all',
          includeMetadata: false,
          fileNameTemplate: '{{title}} - {{date}}',
          markdownTemplate: '',
          messageTemplate: '',
          visibleTargets: ['local'],
        },
        appearance: {
          theme: 'system',
          language: 'en',
          floatingButtonPosition: 'bottom-right',
        },
      } as any) // eslint-disable-line @typescript-eslint/no-explicit-any

      const service = await ObsidianService.createFromStorage()

      expect(service).toBeNull()
    })
  })

  describe('exportConversation', () => {
    beforeEach(async () => {
      obsidianService = await createTestObsidianService()
    })

    it('应该成功导出到Obsidian', async () => {
      // Mock window.location for URI testing
      delete (global as any).window // eslint-disable-line @typescript-eslint/no-explicit-any
      global.window = {
        location: { href: '' },
      } as any // eslint-disable-line @typescript-eslint/no-explicit-any

      const result = await obsidianService.exportConversation(mockConversation, {
        includeMetadata: false,
        format: 'markdown',
      })

      expect(result.success).toBe(true)
      expect(result.vault).toBe('TestVault')
      expect(result.notePath).toContain('Test Conversation')
      expect(result.uri).toContain('obsidian://')
      expect(result.data?.urisToOpen).toContain(result.uri)
    })

    it('应该处理包含元数据的导出', async () => {
      delete (global as any).window // eslint-disable-line @typescript-eslint/no-explicit-any
      global.window = {
        location: { href: '' },
      } as any // eslint-disable-line @typescript-eslint/no-explicit-any

      const result = await obsidianService.exportConversation(mockConversation, {
        includeMetadata: true,
        format: 'markdown',
      })

      expect(result.success).toBe(true)
      expect(result.uri).toContain('obsidian://')
      expect(result.data?.clipboardContent).toContain('**Extracted from:**')
    })

    it('应该处理文件名特殊字符', async () => {
      const specialCharConversation = {
        ...mockConversation,
        title: 'Test/Conversation:Special*Chars?',
      }

      delete (global as any).window // eslint-disable-line @typescript-eslint/no-explicit-any
      global.window = {
        location: { href: '' },
      } as any // eslint-disable-line @typescript-eslint/no-explicit-any

      const result = await obsidianService.exportConversation(specialCharConversation, {
        includeMetadata: false,
        format: 'markdown',
      })

      expect(result.success).toBe(true)
      expect(result.notePath).toContain('Test_Conversation_Special_Chars_')
    })

    it('应该处理超长标题', async () => {
      const longTitleConversation = {
        ...mockConversation,
        title: 'a'.repeat(200), // 超长标题
      }

      delete (global as any).window // eslint-disable-line @typescript-eslint/no-explicit-any
      global.window = {
        location: { href: '' },
      } as any // eslint-disable-line @typescript-eslint/no-explicit-any

      const result = await obsidianService.exportConversation(longTitleConversation, {
        includeMetadata: false,
        format: 'markdown',
      })

      expect(result.success).toBe(true)
      expect(result.notePath).toBe(`Chats/${'a'.repeat(80)}.md`)
    })

    it('应该处理空标题的情况', async () => {
      const emptyTitleConversation = {
        ...mockConversation,
        title: '',
      }

      delete (global as any).window // eslint-disable-line @typescript-eslint/no-explicit-any
      global.window = {
        location: { href: '' },
      } as any // eslint-disable-line @typescript-eslint/no-explicit-any

      const result = await obsidianService.exportConversation(emptyTitleConversation, {
        includeMetadata: false,
        format: 'markdown',
      })

      expect(result.success).toBe(true)
      expect(result.notePath).toContain('Chat2Note Export') // 应该使用默认标题
    })
  })

  describe('URI长度限制', () => {
    beforeEach(async () => {
      obsidianService = await createTestObsidianService()
    })

    it('应该处理正常长度的URI', async () => {
      delete (global as any).window // eslint-disable-line @typescript-eslint/no-explicit-any
      global.window = {
        location: { href: '' },
      } as any // eslint-disable-line @typescript-eslint/no-explicit-any

      const result = await obsidianService.exportConversation(mockConversation, {
        includeMetadata: false,
        format: 'markdown',
      })

      expect(result.success).toBe(true)
      expect(result.uri!.length).toBeLessThanOrEqual(8000)
    })

    it('应该处理超长内容导致的URI过长', async () => {
      const longContentConversation = {
        ...mockConversation,
        messages: [
          {
            id: 'msg-1',
            role: 'user' as const,
            content: 'x'.repeat(10000), // 超长内容
            timestamp: Date.now() - 10000,
          },
        ],
      }

      delete (global as any).window // eslint-disable-line @typescript-eslint/no-explicit-any
      global.window = {
        location: { href: '' },
      } as any // eslint-disable-line @typescript-eslint/no-explicit-any

      const result = await obsidianService.exportConversation(longContentConversation, {
        includeMetadata: false,
        format: 'markdown',
      })

      expect(result.success).toBe(true)
      // 应该有处理超长URI的机制
    })
  })

  describe('文件夹路径处理', () => {
    it('应该正确处理文件夹路径', async () => {
      const service = await createTestObsidianService({
        folderPath: '/Chats/Subfolder/',
      })

      delete (global as any).window // eslint-disable-line @typescript-eslint/no-explicit-any
      global.window = {
        location: { href: '' },
      } as any // eslint-disable-line @typescript-eslint/no-explicit-any

      const result = await service.exportConversation(mockConversation, {
        includeMetadata: false,
        format: 'markdown',
      })

      expect(result.success).toBe(true)
      expect(result.notePath).toContain('Chats/Subfolder')
      expect(result.notePath).not.toContain('//')
    })

    it('应该处理空文件夹路径', async () => {
      const service = await createTestObsidianService({
        folderPath: '',
      })

      delete (global as any).window // eslint-disable-line @typescript-eslint/no-explicit-any
      global.window = {
        location: { href: '' },
      } as any // eslint-disable-line @typescript-eslint/no-explicit-any

      const result = await service.exportConversation(mockConversation, {
        includeMetadata: false,
        format: 'markdown',
      })

      expect(result.success).toBe(true)
    })

    it('应该处理Windows路径分隔符', async () => {
      const service = await createTestObsidianService({
        folderPath: 'Chats\\Subfolder',
      })

      delete (global as any).window // eslint-disable-line @typescript-eslint/no-explicit-any
      global.window = {
        location: { href: '' },
      } as any // eslint-disable-line @typescript-eslint/no-explicit-any

      const result = await service.exportConversation(mockConversation, {
        includeMetadata: false,
        format: 'markdown',
      })

      expect(result.success).toBe(true)
      expect(result.notePath).toContain('Chats/Subfolder')
    })
  })

  describe('错误处理和边界情况', () => {
    beforeEach(async () => {
      obsidianService = await createTestObsidianService()
    })

    it('应该处理空消息列表', async () => {
      const emptyConversation = {
        ...mockConversation,
        messages: [],
      }

      delete (global as any).window // eslint-disable-line @typescript-eslint/no-explicit-any
      global.window = {
        location: { href: '' },
      } as any // eslint-disable-line @typescript-eslint/no-explicit-any

      const result = await obsidianService.exportConversation(emptyConversation, {
        includeMetadata: false,
        format: 'markdown',
      })

      expect(result.success).toBe(true)
      expect(result.uri).toContain('obsidian://')
      expect(result.data?.clipboardContent).toBeDefined()
    })

    it('应该处理特殊字符内容', async () => {
      const specialCharConversation = {
        ...mockConversation,
        messages: [
          {
            id: 'msg-1',
            role: 'user' as const,
            content: 'Hello with special chars: 你好 🌟 \'quotes" and\\backslashes',
            timestamp: Date.now() - 10000,
          },
        ],
      }

      delete (global as any).window // eslint-disable-line @typescript-eslint/no-explicit-any
      global.window = {
        location: { href: '' },
      } as any // eslint-disable-line @typescript-eslint/no-explicit-any

      const result = await obsidianService.exportConversation(specialCharConversation, {
        includeMetadata: true,
        format: 'markdown',
      })

      expect(result.success).toBe(true)
      expect(result.uri).toContain('obsidian://')
    })

    it('应该处理YAML转义字符', async () => {
      const yamlCharConversation = {
        ...mockConversation,
        messages: [
          {
            id: 'msg-1',
            role: 'user' as const,
            content: 'Model with "quotes" and\nnewlines',
            timestamp: Date.now(),
          },
        ],
      }

      delete (global as any).window // eslint-disable-line @typescript-eslint/no-explicit-any
      global.window = {
        location: { href: '' },
      } as any // eslint-disable-line @typescript-eslint/no-explicit-any

      const result = await obsidianService.exportConversation(yamlCharConversation, {
        includeMetadata: true,
        format: 'markdown',
      })

      expect(result.success).toBe(true)
      expect(result.uri).toContain('obsidian://')
    })
  })
})
