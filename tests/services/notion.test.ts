import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NotionService } from '../../src/services/notion'
import { ChatConversation } from '../../src/types/chat'
import { configStorage } from '../../src/config/storage'
import { CryptoUtils } from '../../src/utils/crypto'

// Mock dependencies
vi.mock('../../src/config/storage')
vi.mock('../../src/utils/crypto')
vi.mock('../../src/i18n', () => ({
  default: (key: string, ..._args: any[]) => {
    // eslint-disable-line @typescript-eslint/no-explicit-any
    const translations: Record<string, string> = {
      notification_export_success: 'Exported to $TARGET$ ($FORMAT$)',
      notification_export_failed: 'Export failed: $ERROR$',
      target_notion: 'Notion',
    }
    return translations[key] || key
  },
}))

// Mock @tryfabric/martian
vi.mock('@tryfabric/martian', () => ({
  markdownToBlocks: vi.fn().mockImplementation((markdown: string) => [
    {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: markdown } }],
      },
    },
  ]),
}))

const mockConfigStorage = vi.mocked(configStorage)
const mockCryptoUtils = vi.mocked(CryptoUtils)

function createSuccessResponse(data: unknown) {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  } as any
}

function createErrorResponse(status: number, message: string) {
  return {
    ok: false,
    status,
    json: vi.fn().mockResolvedValue({ message }),
    text: vi.fn().mockResolvedValue(message),
  } as any
}

function mockNotionInitFetch() {
  global.fetch = vi
    .fn()
    .mockResolvedValueOnce(
      createSuccessResponse({
        bot: { owner: { type: 'workspace' } },
      })
    )
    .mockResolvedValueOnce(
      createSuccessResponse({
        id: 'test-database-id',
        properties: {
          Name: { type: 'title', title: {} },
          URL: { type: 'url' },
          Date: { type: 'date' },
          Source: { type: 'select' },
          Count: { type: 'number' },
          Tags: { type: 'multi_select' },
        },
      })
    )
}

describe('NotionService', () => {
  let notionService: NotionService
  let mockConversation: ChatConversation

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup mock conversation
    mockConversation = {
      id: 'test-conversation-1',
      title: 'Test Conversation',
      platform: 'chatgpt',
      url: 'https://chat.openai.com/c/test-conversation-1',
      extractedAt: Date.now() - 5000,
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
    }

    // Setup default config
    mockConfigStorage.getConfig.mockResolvedValue({
      version: '1.0.0',
      notion: {
        apiToken: 'test-api-token',
        databaseId: 'test-database-id',
        enabled: true,
        propertyMappings: {
          url: { enabled: true, propertyName: 'Source URL', fallbackNames: ['URL'] },
          exportedAt: { enabled: true, propertyName: 'Exported At', fallbackNames: ['Date'] },
          platform: { enabled: true, propertyName: 'Platform', fallbackNames: ['Source'] },
          messageCount: { enabled: true, propertyName: 'Message Count', fallbackNames: ['Count'] },
          tags: { enabled: true, propertyName: 'Tags', fallbackNames: ['Label'] },
        },
        includeProperties: true,
      },
      obsidian: {
        enabled: false,
        vaultName: '',
        folderPath: '',
        openMode: 'none' as const,
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
        authMethod: 'manual' as const,
      },
      export: {
        defaultFormat: 'markdown' as const,
        defaultTarget: 'local' as const,
        includeMetadata: false,
        defaultScope: 'all' as const,
        fileNameTemplate: '{{title}} - {{date}}',
        markdownTemplate: '',
        messageTemplate: '',
        visibleTargets: ['local'] as (
          | 'local'
          | 'notion'
          | 'clipboard'
          | 'obsidian'
          | 'siyuan'
          | 'joplin'
        )[],
      },
      appearance: {
        theme: 'system' as const,
        language: 'en' as const,
        floatingButtonPosition: 'bottom-right' as const,
      },
    } as any) // eslint-disable-line @typescript-eslint/no-explicit-any

    // Setup crypto utils
    mockCryptoUtils.decrypt.mockResolvedValue('decrypted-api-token')
    mockCryptoUtils.encrypt.mockResolvedValue('encrypted-api-token')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createFromStorage', () => {
    it('应该成功创建NotionService实例', async () => {
      // Mock CryptoUtils.getApiToken to return the token
      mockCryptoUtils.getApiToken = vi.fn().mockResolvedValue('test-api-token')

      mockNotionInitFetch()

      const service = await NotionService.createFromStorage()

      expect(service).toBeInstanceOf(NotionService)
    })

    it('应该处理配置缺失的情况', async () => {
      mockConfigStorage.getConfig.mockResolvedValue(null)

      const service = await NotionService.createFromStorage()

      expect(service).toBeNull()
    })

    it('应该处理Notion未启用的情况', async () => {
      mockConfigStorage.getConfig.mockResolvedValue({
        version: '1.0.0',
        notion: {
          apiToken: 'test-api-token',
          enabled: false,
          databaseId: 'test-database-id',
          propertyMappings: {
            url: { enabled: true, propertyName: 'URL', fallbackNames: ['Source', 'Link'] },
            exportedAt: {
              enabled: true,
              propertyName: 'Exported At',
              fallbackNames: ['Date', 'Created'],
            },
            platform: {
              enabled: false,
              propertyName: 'Platform',
              fallbackNames: ['Source', 'App'],
            },
            messageCount: {
              enabled: false,
              propertyName: 'Messages',
              fallbackNames: ['Count', 'Length'],
            },
            tags: {
              enabled: true,
              propertyName: 'Tags',
              fallbackNames: ['Label', 'Labels'],
            },
          },
          includeProperties: true,
        },
        obsidian: {
          enabled: false,
          vaultName: '',
          folderPath: '',
          openMode: 'none' as const,
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
          authMethod: 'manual' as const,
        },
        export: {
          defaultFormat: 'markdown' as const,
          defaultTarget: 'local' as const,
          includeMetadata: false,
          defaultScope: 'all' as const,
          fileNameTemplate: '{{title}} - {{date}}',
          markdownTemplate: '',
          messageTemplate: '',
          visibleTargets: ['local'] as (
            | 'local'
            | 'notion'
            | 'clipboard'
            | 'obsidian'
            | 'siyuan'
            | 'joplin'
          )[],
        },
        appearance: {
          theme: 'system' as const,
          language: 'en' as const,
          floatingButtonPosition: 'bottom-right' as const,
        },
      } as any) // eslint-disable-line @typescript-eslint/no-explicit-any

      const service = await NotionService.createFromStorage()

      expect(service).toBeNull()
    })

    it('应该处理API token缺失的情况', async () => {
      mockCryptoUtils.getApiToken = vi.fn().mockResolvedValue(null)

      const service = await NotionService.createFromStorage()

      expect(service).toBeNull()
    })

    it('应该处理database ID缺失的情况', async () => {
      mockConfigStorage.getConfig.mockResolvedValue({
        version: '1.0.0',
        notion: {
          apiToken: 'test-api-token',
          enabled: true,
          databaseId: '',
          propertyMappings: {
            url: { enabled: true, propertyName: 'URL', fallbackNames: ['Source', 'Link'] },
            exportedAt: {
              enabled: true,
              propertyName: 'Exported At',
              fallbackNames: ['Date', 'Created'],
            },
            platform: {
              enabled: false,
              propertyName: 'Platform',
              fallbackNames: ['Source', 'App'],
            },
            messageCount: {
              enabled: false,
              propertyName: 'Messages',
              fallbackNames: ['Count', 'Length'],
            },
          },
          includeProperties: true,
        },
        obsidian: {
          enabled: false,
          vaultName: '',
          folderPath: '',
          openMode: 'none' as const,
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
          authMethod: 'manual' as const,
        },
        export: {
          defaultFormat: 'markdown' as const,
          defaultTarget: 'local' as const,
          includeMetadata: false,
          defaultScope: 'all' as const,
          fileNameTemplate: '{{title}} - {{date}}',
          markdownTemplate: '',
          messageTemplate: '',
          visibleTargets: ['local'] as (
            | 'local'
            | 'notion'
            | 'clipboard'
            | 'obsidian'
            | 'siyuan'
            | 'joplin'
          )[],
        },
        appearance: {
          theme: 'system' as const,
          language: 'en' as const,
          floatingButtonPosition: 'bottom-right' as const,
        },
      } as any) // eslint-disable-line @typescript-eslint/no-explicit-any

      const service = await NotionService.createFromStorage()

      expect(service).toBeNull()
    })
  })

  describe('exportConversation', () => {
    beforeEach(() => {
      notionService = new NotionService()
      // Mock successful initialization
      mockCryptoUtils.getApiToken = vi.fn().mockResolvedValue('test-api-token')

      mockNotionInitFetch()
    })

    it('应该成功导出到Notion', async () => {
      await notionService.initialize({
        apiToken: 'test-api-token',
        databaseId: 'test-database-id',
        propertyMappings: {
          url: { enabled: true, propertyName: 'URL', fallbackNames: ['Source', 'Link'] },
          exportedAt: {
            enabled: true,
            propertyName: 'Exported At',
            fallbackNames: ['Date', 'Created'],
          },
          platform: { enabled: false, propertyName: 'Platform', fallbackNames: ['Source', 'App'] },
          messageCount: {
            enabled: false,
            propertyName: 'Messages',
            fallbackNames: ['Count', 'Length'],
          },
          tags: { enabled: true, propertyName: 'Tags', fallbackNames: ['Label', 'Labels'] },
        },
        includeProperties: true,
      })

      // Reset fetch to mock the actual API call during export
      global.fetch = vi.fn().mockResolvedValue(createSuccessResponse({ id: 'test-page-id' }))

      const result = await notionService.exportConversation(mockConversation, {
        format: 'plain',
      })

      expect(result.success).toBe(true)
      expect(result.pageUrl).toBe('https://www.notion.so/testpageid')
      expect(result.pageId).toBe('test-page-id')

      const fetchCalls = vi.mocked(fetch).mock.calls
      const requestInit = fetchCalls[fetchCalls.length - 1]?.[1] as RequestInit | undefined
      expect(typeof requestInit?.body).toBe('string')
      expect(requestInit?.body).not.toMatch(/^"\{/)

      const parsedBody = JSON.parse(requestInit?.body as string) as {
        parent: { database_id: string }
        properties: Record<string, unknown>
        children: unknown[]
      }
      expect(parsedBody.parent.database_id).toBe('test-database-id')
      expect(Array.isArray(parsedBody.children)).toBe(true)
      expect(parsedBody.properties.Tags).toEqual({
        type: 'multi_select',
        multi_select: [{ name: 'Chat2Note' }, { name: 'ChatGPT' }],
      })
    })

    it('应该处理API错误', async () => {
      await notionService.initialize({
        apiToken: 'test-api-token',
        databaseId: 'test-database-id',
        propertyMappings: {
          url: { enabled: true, propertyName: 'URL', fallbackNames: ['Source', 'Link'] },
          exportedAt: {
            enabled: true,
            propertyName: 'Exported At',
            fallbackNames: ['Date', 'Created'],
          },
          platform: { enabled: false, propertyName: 'Platform', fallbackNames: ['Source', 'App'] },
          messageCount: {
            enabled: false,
            propertyName: 'Messages',
            fallbackNames: ['Count', 'Length'],
          },
          tags: { enabled: true, propertyName: 'Tags', fallbackNames: ['Label', 'Labels'] },
        },
        includeProperties: true,
      })

      global.fetch = vi.fn().mockResolvedValue(createErrorResponse(401, 'Unauthorized'))

      const result = await notionService.exportConversation(mockConversation, {
        format: 'plain',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to create Notion page')
    })

    it('应该处理网络错误', async () => {
      await notionService.initialize({
        apiToken: 'test-api-token',
        databaseId: 'test-database-id',
        propertyMappings: {
          url: { enabled: true, propertyName: 'URL', fallbackNames: ['Source', 'Link'] },
          exportedAt: {
            enabled: true,
            propertyName: 'Exported At',
            fallbackNames: ['Date', 'Created'],
          },
          platform: { enabled: false, propertyName: 'Platform', fallbackNames: ['Source', 'App'] },
          messageCount: {
            enabled: false,
            propertyName: 'Messages',
            fallbackNames: ['Count', 'Length'],
          },
          tags: { enabled: true, propertyName: 'Tags', fallbackNames: ['Label', 'Labels'] },
        },
        includeProperties: true,
      })

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const result = await notionService.exportConversation(mockConversation, {
        format: 'plain',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to create Notion page')
    })

    it('应该正确处理包含元数据的导出', async () => {
      await notionService.initialize({
        apiToken: 'test-api-token',
        databaseId: 'test-database-id',
        propertyMappings: {
          url: { enabled: true, propertyName: 'URL', fallbackNames: ['Source', 'Link'] },
          exportedAt: {
            enabled: true,
            propertyName: 'Exported At',
            fallbackNames: ['Date', 'Created'],
          },
          platform: { enabled: false, propertyName: 'Platform', fallbackNames: ['Source', 'App'] },
          messageCount: {
            enabled: false,
            propertyName: 'Messages',
            fallbackNames: ['Count', 'Length'],
          },
          tags: { enabled: true, propertyName: 'Tags', fallbackNames: ['Label', 'Labels'] },
        },
        includeProperties: true,
      })

      global.fetch = vi.fn().mockResolvedValue(createSuccessResponse({ id: 'test-page-id' }))

      const result = await notionService.exportConversation(mockConversation, {
        includeMetadata: true,
        format: 'plain',
      })

      expect(result.success).toBe(true)
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('api.notion.com/v1/pages'),
        expect.objectContaining({
          method: 'POST',
        })
      )
    })
  })

  describe('testConnection', () => {
    beforeEach(() => {
      notionService = new NotionService()
    })

    it('应该成功测试连接', async () => {
      mockNotionInitFetch()

      await notionService.initialize({
        apiToken: 'test-api-token',
        databaseId: 'test-database-id',
        propertyMappings: {
          url: { enabled: true, propertyName: 'URL', fallbackNames: ['Source', 'Link'] },
          exportedAt: {
            enabled: true,
            propertyName: 'Exported At',
            fallbackNames: ['Date', 'Created'],
          },
          platform: { enabled: false, propertyName: 'Platform', fallbackNames: ['Source', 'App'] },
          messageCount: {
            enabled: false,
            propertyName: 'Messages',
            fallbackNames: ['Count', 'Length'],
          },
          tags: { enabled: true, propertyName: 'Tags', fallbackNames: ['Label', 'Labels'] },
        },
        includeProperties: true,
      })

      global.fetch = vi
        .fn()
        .mockResolvedValue(createSuccessResponse({ bot: { owner: { type: 'workspace' } } }))

      const result = await notionService.testConnection()

      expect(result).toBe(true)
    })

    it('应该处理连接测试失败', async () => {
      mockNotionInitFetch()

      await notionService.initialize({
        apiToken: 'test-api-token',
        databaseId: 'test-database-id',
        propertyMappings: {
          url: { enabled: true, propertyName: 'URL', fallbackNames: ['Source', 'Link'] },
          exportedAt: {
            enabled: true,
            propertyName: 'Exported At',
            fallbackNames: ['Date', 'Created'],
          },
          platform: { enabled: false, propertyName: 'Platform', fallbackNames: ['Source', 'App'] },
          messageCount: {
            enabled: false,
            propertyName: 'Messages',
            fallbackNames: ['Count', 'Length'],
          },
          tags: { enabled: true, propertyName: 'Tags', fallbackNames: ['Label', 'Labels'] },
        },
        includeProperties: true,
      })

      global.fetch = vi.fn().mockResolvedValue(createErrorResponse(401, 'Unauthorized'))

      await expect(notionService.testConnection()).rejects.toThrow(
        'Failed to connect to Notion API'
      )
    })
  })

  describe('错误处理和边界情况', () => {
    beforeEach(async () => {
      notionService = new NotionService()
      mockNotionInitFetch()
      await notionService.initialize({
        apiToken: 'test-api-token',
        databaseId: 'test-database-id',
        propertyMappings: {
          url: { enabled: true, propertyName: 'URL', fallbackNames: ['Source', 'Link'] },
          exportedAt: {
            enabled: true,
            propertyName: 'Exported At',
            fallbackNames: ['Date', 'Created'],
          },
          platform: { enabled: false, propertyName: 'Platform', fallbackNames: ['Source', 'App'] },
          messageCount: {
            enabled: false,
            propertyName: 'Messages',
            fallbackNames: ['Count', 'Length'],
          },
          tags: { enabled: true, propertyName: 'Tags', fallbackNames: ['Label', 'Labels'] },
        },
        includeProperties: true,
      })
    })

    it('应该处理空消息列表', async () => {
      const emptyConversation = {
        ...mockConversation,
        messages: [],
      }

      global.fetch = vi.fn().mockResolvedValue(createSuccessResponse({ id: 'test-page-id' }))

      const result = await notionService.exportConversation(emptyConversation, {
        format: 'plain',
      })

      expect(result.success).toBe(true)
    })

    it('应该处理超长标题', async () => {
      const longTitleConversation = {
        ...mockConversation,
        title: 'a'.repeat(1000), // 超长标题
      }

      global.fetch = vi.fn().mockResolvedValue(createSuccessResponse({ id: 'test-page-id' }))

      const result = await notionService.exportConversation(longTitleConversation, {
        format: 'plain',
      })

      expect(result.success).toBe(true)
      // 标题应该被处理
    })

    it('应该处理特殊字符内容', async () => {
      const specialCharConversation = {
        ...mockConversation,
        messages: [
          {
            id: 'msg-1',
            role: 'user' as const,
            content: 'Hello with special chars: 你好 🌟',
            timestamp: Date.now() - 10000,
          },
        ],
      }

      global.fetch = vi.fn().mockResolvedValue(createSuccessResponse({ id: 'test-page-id' }))

      const result = await notionService.exportConversation(specialCharConversation, {
        format: 'plain',
      })

      expect(result.success).toBe(true)
    })
  })
})
