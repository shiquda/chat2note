import { ChatConversation } from '../src/types/chat'
import { ExportOptions } from '../src/types/export'
import { configStorage } from '../src/config/storage'
import t, { initI18n } from '../src/i18n'
import { defineBackground } from 'wxt/utils/define-background'

const SUPPORTED_CONTEXT_PATTERNS = [
  '*://chat.openai.com/*',
  '*://chatgpt.com/*',
  '*://chat.deepseek.com/*',
  '*://claude.ai/*',
  '*://gemini.google.com/*',
  '*://kimi.com/*',
  '*://www.kimi.com/*',
  '*://yuanbao.tencent.com/*',
  '*://doubao.com/*',
  '*://www.doubao.com/*',
]

export default defineBackground(() => {
  console.log('[Background] Chat2Note background script loaded', {
    id: chrome?.runtime?.id || 'unknown',
  })

  // Initialize i18n system and storage first, then create context menus
  Promise.all([
    initI18n().then(() => console.log('[Background] i18n initialized')),
    configStorage.init().then(() => console.log('[Background] Config storage initialized')),
  ])
    .then(() => {
      // Create the context menus after i18n is ready
      createContextMenus()
      console.log('[Background] Context menus created')
    })
    .catch(error => console.error('[Background] Initialization failed:', error))

  // Listen for messages from Options page or other scripts
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    void sender
    void sendResponse
  })

  // Listen for context menu clicks
  chrome.contextMenus.onClicked.addListener(
    (info: chrome.contextMenus.OnClickData, tab: chrome.tabs.Tab | undefined) => {
      handleContextMenuClick(info, tab)
    }
  )

  // Listen for keyboard shortcuts
  chrome.commands.onCommand.addListener(async (command: string) => {
    if (command === 'export-conversation') {
      await handleKeyboardShortcutExport()
    }
  })

  // Listen for messages from the content script
  chrome.runtime.onMessage.addListener(
    (
      message: {
        type: string
        data?: ChatConversation
        options?: ExportOptions
      },
      sender: chrome.runtime.MessageSender,
      sendResponse: (response: {
        success: boolean
        result?: unknown
        data?: unknown
        error?: string
      }) => void
    ) => {
      if (message.type === 'EXPORT_CONVERSATION' || message.type === 'EXPORT_FROM_POPUP') {
        ;(async () => {
          try {
            if (!message.data) {
              throw new Error('No conversation data provided')
            }
            const result = await handleExportConversation(message.data, message.options, sender)
            sendResponse({ success: result.success, result })
          } catch (error) {
            const messageText =
              error instanceof Error ? error.message : t('error_unknown_error_occurred')
            sendResponse({ success: false, result: { success: false, error: messageText } })
          }
        })()
        return true
      }

      if (message.type === 'GET_DEFAULT_EXPORT_OPTIONS') {
        ;(async () => {
          try {
            const { exportService } = await import('../src/services/export')
            const options = await exportService.getDefaultExportOptions()
            sendResponse({ success: true, result: options })
          } catch (error) {
            const messageText =
              error instanceof Error ? error.message : t('error_unknown_error_occurred')
            sendResponse({ success: false, result: { success: false, error: messageText } })
          }
        })()
        return true
      }

      return false
    }
  )

  async function handleKeyboardShortcutExport() {
    try {
      // Get the current active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

      if (!tab || !tab.url || !tab.id) {
        console.error('No active tab found or tab is invalid')
        return
      }

      // Check if the current tab is on a supported chat platform
      if (!SUPPORTED_CONTEXT_PATTERNS.some(pattern => matchUrlPattern(tab.url!, pattern))) {
        console.log('Not on a supported chat platform, ignoring shortcut')
        return
      }

      console.log('Keyboard shortcut triggered, attempting to export conversation')

      // Show in-progress notification immediately
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'SHOW_NOTIFICATION',
          notificationType: 'progress',
          message: t('notification_export_in_progress'),
        })
      } catch (notificationError) {
        console.error('Failed to show in-progress notification:', notificationError)
      }

      // Get default export options
      const { exportService } = await import('../src/services/export')
      const defaultOptions = await exportService.getDefaultExportOptions()

      // Send message to content script to extract and export conversation
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'EXPORT_FROM_KEYBOARD_SHORTCUT',
        options: defaultOptions,
      })

      if (response && response.success) {
        console.log('Keyboard shortcut export succeeded')

        // Generate success message based on export target and format
        let successMessage = t('notification_export_success_shortcut')
        if (response.result?.data) {
          const data = response.result.data
          const format = defaultOptions.format

          if (data.filename) {
            // Local file export
            successMessage = t('notification_export_success', [
              t('target_local'),
              t(`format_${format}`),
            ])
          } else if (data.url || data.pageUrl) {
            // Notion export
            successMessage = t('notification_export_success', [
              t('target_notion'),
              t(`format_${format}`),
            ])
          } else if (data.notePath) {
            // Obsidian export
            successMessage = t('notification_export_obsidian_success', [data.notePath])
          } else if (data.contentLength) {
            // Clipboard export
            successMessage = t('notification_export_success', [
              t('target_clipboard'),
              t(`format_${format}`),
            ])
          }
        }

        const notificationMessage = response.result?.message ?? successMessage
        const link = response.result?.pageUrl
          ? {
              label: t('notification_view_in_notion'),
              href: response.result.pageUrl,
            }
          : undefined

        // Clear existing notifications and show success notification
        try {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'CLEAR_NOTIFICATIONS',
          })

          await chrome.tabs.sendMessage(tab.id, {
            type: 'SHOW_NOTIFICATION',
            notificationType: 'success',
            message: notificationMessage,
            link,
          })
        } catch (notificationError) {
          console.error('Failed to send success notification:', notificationError)
        }
      } else {
        console.error('Keyboard shortcut export failed:', response?.result?.error)

        // Clear existing notifications and send error notification
        try {
          await chrome.tabs.sendMessage(tab.id, {
            type: 'CLEAR_NOTIFICATIONS',
          })

          await chrome.tabs.sendMessage(tab.id, {
            type: 'SHOW_NOTIFICATION',
            notificationType: 'error',
            message: response?.result?.error || t('notification_export_failed'),
          })
        } catch (notificationError) {
          console.error('Failed to send error notification:', notificationError)
        }
      }
    } catch (error) {
      console.error('Error handling keyboard shortcut export:', error)
    }
  }

  async function handleExportConversation(
    conversation: ChatConversation,
    options?: ExportOptions,
    sender?: chrome.runtime.MessageSender
  ) {
    try {
      // Lazy import to avoid loading heavy dependencies during startup
      const { exportService } = await import('../src/services/export')

      // Use provided export options or fall back to defaults
      let exportOptions: ExportOptions
      if (options) {
        exportOptions = options
      } else {
        exportOptions = await exportService.getDefaultExportOptions()
      }

      // Export the conversation
      const result = await exportService.exportConversation(conversation, exportOptions)

      // Special handling for clipboard export - needs content script
      if (result.success && result.data?.requiresContentScript && sender?.tab?.id) {
        try {
          // Handle clipboard export
          if (exportOptions.target === 'clipboard') {
            const clipboardResponse = await chrome.tabs.sendMessage(sender.tab.id, {
              type: 'HANDLE_CLIPBOARD_EXPORT',
              content: result.data.content,
            })

            if (clipboardResponse?.success) {
              return {
                success: true,
                message: t('notification_export_success', [t('target_clipboard'), '']),
                contentLength: result.data.contentLength,
                data: { contentLength: result.data.contentLength },
              }
            } else {
              return {
                success: false,
                error: clipboardResponse?.error || 'Failed to copy to clipboard in content script',
              }
            }
          }

          // Handle Obsidian export
          if (exportOptions.target === 'obsidian') {
            const obsidianResult = result as import('../src/types/export').ObsidianExportResult
            const obsidianResponse = await chrome.tabs.sendMessage(sender.tab.id, {
              type: 'HANDLE_OBSIDIAN_EXPORT',
              uris: result.data.urisToOpen,
              clipboardContent: result.data.clipboardContent,
            })

            if (obsidianResponse?.success) {
              return {
                success: true,
                message: obsidianResult.message,
                vault: obsidianResult.vault,
                notePath: obsidianResult.notePath,
                data: obsidianResult.data,
              }
            } else {
              return {
                success: false,
                error: obsidianResponse?.error || 'Failed to open Obsidian URI in content script',
              }
            }
          }
        } catch (error) {
          return {
            success: false,
            error:
              error instanceof Error ? error.message : 'Failed to communicate with content script',
          }
        }
      }

      if (result.success) {
        console.log('Conversation exported successfully:', result)
      } else {
        console.error('Export failed:', result.error)
      }

      return result
    } catch (error) {
      console.error('Error in handleExportConversation:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : t('error_unknown_error_occurred'),
      }
    }
  }

  function createContextMenus() {
    chrome.contextMenus.create({
      id: 'chat2note-export',
      title: t('context_menu_save_conversation'),
      contexts: ['page'],
      documentUrlPatterns: SUPPORTED_CONTEXT_PATTERNS,
    })
  }

  async function handleContextMenuClick(
    info: chrome.contextMenus.OnClickData,
    tab: chrome.tabs.Tab | undefined
  ) {
    if (info.menuItemId === 'chat2note-export') {
      try {
        if (
          !tab ||
          !tab.url ||
          !SUPPORTED_CONTEXT_PATTERNS.some(pattern => matchUrlPattern(tab.url!, pattern))
        ) {
          console.error('Not on a supported chat page')
          return
        }

        // Get default export options to know the format
        const { exportService } = await import('../src/services/export')
        const defaultOptions = await exportService.getDefaultExportOptions()

        const response = await chrome.tabs.sendMessage(tab.id!, {
          type: 'EXPORT_FROM_CONTEXT_MENU',
        })

        if (response && response.success) {
          console.log('Context menu export succeeded')
          // Generate success message based on export target and format
          let successMessage = t('notification_export_success_generic')
          if (response.result?.data) {
            const data = response.result.data
            const format = defaultOptions.format

            if (data.filename) {
              // Local file export
              successMessage = t('notification_export_success', [
                t('target_local'),
                t(`format_${format}`),
              ])
            } else if (data.url || data.pageUrl) {
              // Notion export
              successMessage = t('notification_export_success', [
                t('target_notion'),
                t(`format_${format}`),
              ])
            } else if (data.notePath) {
              // Obsidian export
              successMessage = t('notification_export_obsidian_success', [data.notePath])
            } else if (data.contentLength) {
              // Clipboard export
              successMessage = t('notification_export_success', [
                t('target_clipboard'),
                t(`format_${format}`),
              ])
            }
          }

          const notificationMessage = response.result?.message ?? successMessage
          const link = response.result?.pageUrl
            ? {
                label: t('notification_view_in_notion'),
                href: response.result.pageUrl,
              }
            : undefined

          // Send success notification to content script
          try {
            await chrome.tabs.sendMessage(tab.id!, {
              type: 'SHOW_NOTIFICATION',
              notificationType: 'success',
              message: notificationMessage,
              link,
            })
          } catch (notificationError) {
            console.error('Failed to send success notification:', notificationError)
          }
        } else {
          console.error('Context menu export failed')
          // Send error notification to content script
          try {
            if (response?.result?.handled) {
              return
            }

            await chrome.tabs.sendMessage(tab.id!, {
              type: 'SHOW_NOTIFICATION',
              notificationType: 'error',
              message: response?.result?.error || t('notification_export_failed'),
            })
          } catch (notificationError) {
            console.error('Failed to send error notification:', notificationError)
          }
        }
      } catch (error) {
        console.error('Error handling context menu click:', error)
        // Send error notification to content script
        try {
          if (tab?.id) {
            await chrome.tabs.sendMessage(tab.id!, {
              type: 'SHOW_NOTIFICATION',
              notificationType: 'error',
              message: t('notification_export_failed'),
            })
          }
        } catch (notificationError) {
          console.error('Failed to send error notification:', notificationError)
        }
      }
    }
  }
})

function matchUrlPattern(url: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
  const regex = new RegExp(`^${escaped}$`)
  return regex.test(url)
}
