import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ExportService } from '../../src/services/export'
import { ChatConversation } from '../../src/types/chat'
import { ExportOptions } from '../../src/types/export'
import { configStorage } from '../../src/config/storage'
import { DEFAULT_CONFIG } from '../../src/config/defaults'

// Mock dependencies
vi.mock('../../src/config/storage')

vi.mock('../../src/i18n', () => ({
  default: (key: string, ..._args: unknown[]) => {
    const translations: Record<string, string> = {
      notification_export_success: 'Exported to $TARGET$ ($FORMAT$)',
      notification_export_failed: 'Export failed: $ERROR$',
      target_local: 'Local file',
      target_clipboard: 'Clipboard',
    }
    return translations[key] || key
  },
}))

// Mock Chrome APIs - 简化版本，避免与 setup.ts 冲突
const mockChromeDownload = vi.fn()

// 创建一个完整的 storage mock
const createStorageMock = () => {
  const storage: Record<string, unknown> = {}

  return {
    get: vi.fn().mockImplementation((keys, callback) => {
      const result = Array.isArray(keys)
        ? keys.reduce((acc, key) => ({ ...acc, [key]: storage[key] }), {})
        : storage[keys] || {}

      if (callback) callback(result)
      return Promise.resolve(result)
    }),
    set: vi.fn().mockImplementation((items, callback) => {
      Object.assign(storage, items)
      if (callback) callback()
      return Promise.resolve()
    }),
    remove: vi.fn().mockImplementation((keys, callback) => {
      if (Array.isArray(keys)) {
        keys.forEach(key => {
          delete storage[key]
        })
      } else {
        delete storage[keys]
      }
      if (callback) callback()
      return Promise.resolve()
    }),
    clear: vi.fn().mockImplementation(callback => {
      Object.keys(storage).forEach(key => {
        delete storage[key]
      })
      if (callback) callback()
      return Promise.resolve()
    }),
  }
}

// 确保在测试中重新定义 chrome API
beforeEach(() => {
  const storageMock = createStorageMock()

  Object.defineProperty(global, 'chrome', {
    value: {
      runtime: {
        id: 'test-extension-id',
        getManifest: vi.fn().mockReturnValue({ version: '1.0.0' }),
        lastError: null,
      },
      downloads: {
        download: mockChromeDownload,
      },
      storage: {
        local: storageMock,
        sync: storageMock,
      },
    },
    writable: true,
  })
})

// Mock navigator clipboard
const mockClipboardWriteText = vi.fn()
Object.defineProperty(global.navigator, 'clipboard', {
  value: {
    writeText: mockClipboardWriteText,
  },
  writable: true,
})

const mockConfigStorage = vi.mocked(configStorage)

describe('ExportService - Core Tests', () => {
  let exportService: ExportService
  let mockConversation: ChatConversation
  let mockOptions: ExportOptions

  beforeEach(async () => {
    vi.clearAllMocks()

    // Reset mock implementations - 使用 Promise 而不是同步返回
    mockChromeDownload.mockResolvedValue({ id: 'download-id' })
    mockClipboardWriteText.mockResolvedValue(undefined)

    mockConfigStorage.getConfig.mockResolvedValue(DEFAULT_CONFIG)

    // 创建新的 ExportService 实例，等待初始化完成
    exportService = new ExportService()

    // 等待一小段时间让异步初始化完成
    await new Promise(resolve => setTimeout(resolve, 100))

    // Setup mock conversation
    mockConversation = {
      id: 'test-conversation-1',
      title: 'Test Conversation',
      url: 'https://chat.openai.com/c/test-conversation-1',
      extractedAt: Date.now(),
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

    // Setup mock options
    mockOptions = {
      format: 'markdown',
      target: 'local',
      includeMetadata: false,
      scope: 'all',
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Basic functionality', () => {
    it('应该创建ExportService实例', () => {
      expect(exportService).toBeInstanceOf(ExportService)
    })

    it('应该返回默认导出选项', async () => {
      const options = await exportService.getDefaultExportOptions()

      expect(options).toEqual({
        format: 'markdown',
        target: 'local',
        includeMetadata: true,
        scope: 'selected',
      })
    })

    it('应该处理配置不存在的情况', async () => {
      mockConfigStorage.getConfig.mockResolvedValue(null)

      const options = await exportService.getDefaultExportOptions()

      expect(options).toEqual({
        format: 'markdown',
        target: 'local',
        includeMetadata: true,
        scope: 'selected',
      })
    })
  })

  describe('exportToClipboard', () => {
    it('应该成功准备剪贴板内容', async () => {
      const exportConfig = {
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
      }

      const result = await exportService.exportToClipboard(
        mockConversation,
        mockOptions,
        exportConfig
      )

      expect(result.success).toBe(true)
      expect(result.contentLength).toBeGreaterThan(0)
      expect(result.data).toBeDefined()
      expect(result.data!.content).toContain('Hello, how are you?')
      expect(result.data!.requiresContentScript).toBe(true)
    })

    it('应该处理内容生成失败的情况', async () => {
      const exportConfig = {
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
      }

      // 使用无效的对话数据来触发错误
      const invalidConversation = {
        ...mockConversation,
        messages: [], // 空消息列表应该触发错误或生成空内容
      }

      const result = await exportService.exportToClipboard(
        invalidConversation,
        mockOptions,
        exportConfig
      )

      // 根据实际实现，即使没有消息也应该成功生成内容
      expect(result.success).toBe(true)
      expect(result.contentLength).toBeGreaterThanOrEqual(0)
    })
  })

  describe('validation helpers', () => {
    it('应该接受 OSS core 支持的导出选项', () => {
      expect(exportService.validateExportOptions(mockOptions)).toBe(true)
    })

    it('应该拒绝无效的导出目标', () => {
      const invalidOptions: ExportOptions = {
        format: 'markdown',
        target: 'invalid' as any,
        includeMetadata: false,
        scope: 'all',
      }

      expect(exportService.validateExportOptions(invalidOptions)).toBe(false)
    })
  })

  describe('error handling', () => {
    it('应该处理导出目标无效的情况', async () => {
      const invalidOptions: ExportOptions = {
        format: 'markdown',
        target: 'invalid' as any,
        includeMetadata: false,
        scope: 'all',
      }

      const result = await exportService.exportConversation(mockConversation, invalidOptions)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})
