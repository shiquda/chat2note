import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock Chrome API
const mockChrome = {
  runtime: {
    id: 'test-extension-id',
    getManifest: vi.fn(() => ({ version: '1.0.0-test' })),
    sendMessage: vi.fn((message, callback) => {
      if (message.type === 'STORAGE_GET') {
        const result = {}
        if (callback) callback(result)
        return Promise.resolve(result)
      }

      if (message.type === 'STORAGE_SET') {
        if (callback) callback()
        return Promise.resolve()
      }

      // Default response
      if (callback) callback({ success: true })
      return Promise.resolve({ success: true })
    }),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
    getURL: vi.fn(path => `chrome-extension://test-id/${path}`),
  },
  storage: {
    local: {
      get: vi.fn((keys, callback) => {
        const result = {}
        if (callback) callback(result)
        return Promise.resolve(result)
      }),
      set: vi.fn((items, callback) => {
        if (callback) callback()
        return Promise.resolve()
      }),
      remove: vi.fn((keys, callback) => {
        if (callback) callback()
        return Promise.resolve()
      }),
      clear: vi.fn(callback => {
        if (callback) callback()
        return Promise.resolve()
      }),
    },
    sync: {
      get: vi.fn((keys, callback) => {
        const result = {}
        if (callback) callback(result)
        return Promise.resolve(result)
      }),
      set: vi.fn((items, callback) => {
        if (callback) callback()
        return Promise.resolve()
      }),
    },
  },
  tabs: {
    query: vi.fn((query, callback) => {
      const tabs = [{ id: 1, url: 'https://chat.openai.com/c/123', active: true }]
      if (callback) callback(tabs)
      return Promise.resolve(tabs)
    }),
    sendMessage: vi.fn((tabId, message, callback) => {
      if (callback) callback({ success: true })
      return Promise.resolve({ success: true })
    }),
  },
  i18n: {
    getMessage: vi.fn((key, substitutions) => {
      // Simple mock for i18n - returns the key
      if (substitutions && Array.isArray(substitutions)) {
        return `${key} [${substitutions.join(', ')}]`
      }
      return key
    }),
    getUILanguage: vi.fn(() => 'en'),
  },
  downloads: {
    download: vi.fn((options, callback) => {
      if (callback) callback(1)
      return Promise.resolve(1)
    }),
  },
  contextMenus: {
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    removeAll: vi.fn(),
  },
  scripting: {
    executeScript: vi.fn((injection, callback) => {
      if (callback) callback([{ result: true }])
      return Promise.resolve([{ result: true }])
    }),
  },
}

// Assign to global with proper typing
;(globalThis as { chrome: unknown; browser: unknown }).chrome = mockChrome
;(globalThis as { chrome: unknown; browser: unknown }).browser = mockChrome

// Mock console methods to reduce noise in tests
vi.spyOn(console, 'warn').mockImplementation(() => {})
vi.spyOn(console, 'error').mockImplementation(() => {})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver with proper typing
const MockIntersectionObserverClass = class {
  root: Element | null = null
  rootMargin: string = '0px'
  thresholds: ReadonlyArray<number> = [0]

  constructor(
    private _callback: unknown,
    private _options?: unknown
  ) {}

  disconnect(): void {}
  observe(_target: Element): void {}
  unobserve(_target: Element): void {}
  takeRecords(): unknown[] {
    return []
  }
}

;(globalThis as { IntersectionObserver: unknown }).IntersectionObserver =
  MockIntersectionObserverClass

// Mock ResizeObserver
globalThis.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}
