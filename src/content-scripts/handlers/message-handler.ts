import type { ExportOptions } from '../../types/export'
import type { ExportHandler } from './export-handler'
import { handleClipboardExport } from './clipboard-handler'
import { handleObsidianExport } from './obsidian-handler'
import { notificationBoard } from '../../services/notification-board'
import type { NotificationOptions } from '../../services/notification-board'
import t from '../../i18n'

/**
 * Create message listener for handling export requests from popup and context menu
 */
export function createMessageListener(exportHandler: ExportHandler) {
  return (
    message: unknown,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ) => {
    const handleRequest = async (overrides?: Partial<ExportOptions>) => {
      try {
        const preparation = await exportHandler.prepareExportPayload(overrides)
        if (!preparation?.payload) {
          const errorMessage = preparation?.error ?? 'Export aborted'
          sendResponse({
            success: false,
            result: { success: false, error: errorMessage, handled: preparation?.handled },
          })
          return
        }

        const { conversation, options } = preparation.payload
        const response = await exportHandler.sendExportRequest(conversation, options)
        sendResponse(response)
      } catch (err) {
        const messageText = err instanceof Error ? err.message : 'Unknown error'
        notificationBoard.error(t('notification_export_failed') + ': ' + messageText)
        sendResponse({
          success: false,
          result: { success: false, error: messageText, handled: true },
        })
      }
    }

    // Handle clipboard export - in content script context
    if ((message as any).type === 'HANDLE_CLIPBOARD_EXPORT') {
      handleClipboardExport((message as any).content as string).then(result => {
        sendResponse(result)
      })
      return true
    }

    // Handle Obsidian export - in content script context
    if ((message as any).type === 'HANDLE_OBSIDIAN_EXPORT') {
      handleObsidianExport(
        (message as any).uris as string[],
        (message as any).clipboardContent as string | undefined
      ).then(result => {
        sendResponse(result)
      })
      return true
    }

    // Handle export from popup
    if ((message as any).type === 'EXPORT_FROM_POPUP') {
      handleRequest((message as any).options as Partial<ExportOptions> | undefined)
      return true
    }

    // Handle export from context menu
    if ((message as any).type === 'EXPORT_FROM_CONTEXT_MENU') {
      handleRequest()
      return true
    }

    // Handle export from keyboard shortcut
    if ((message as any).type === 'EXPORT_FROM_KEYBOARD_SHORTCUT') {
      handleRequest((message as any).options as Partial<ExportOptions> | undefined)
      return true
    }

    // Handle show notification from background script
    if ((message as any).type === 'SHOW_NOTIFICATION') {
      const notificationType = (message as any).notificationType as
        | 'info'
        | 'success'
        | 'error'
        | 'progress'
      const notificationMessage = (message as any).message as string
      const link = (message as any).link as NotificationOptions['link'] | undefined

      if (notificationBoard[notificationType]) {
        notificationBoard[notificationType](notificationMessage, { dismissible: true, link })
      }
      return false // No response needed
    }

    // Handle clear notifications from background script
    if ((message as any).type === 'CLEAR_NOTIFICATIONS') {
      // Clear all notifications by removing the notification board
      const board = document.getElementById('chat2note-notification-board')
      if (board) {
        board.remove()
      }
      return false // No response needed
    }

    return false
  }
}
