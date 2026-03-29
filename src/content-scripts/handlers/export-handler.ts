import type { ChatConversation } from '../../types/chat'
import type { ExportOptions } from '../../types/export'
import type { MessageSelectionManager } from '../ui/selection-manager'
import { notificationBoard } from '../../services/notification-board'
import t from '../../i18n'

/**
 * Export handler for managing conversation export flow
 */
type ConversationResult = {
  conversation: ChatConversation | null
  error?: string
  handled?: boolean
}

type PrepareExportPayloadResult =
  | {
      payload: { conversation: ChatConversation; options: ExportOptions }
      error?: undefined
      handled?: boolean
    }
  | { payload?: undefined; error: string; handled?: boolean }

export class ExportHandler {
  private selectionManager: MessageSelectionManager
  private cachedDefaultOptions: ExportOptions
  private siteName: string
  private getConversation: () => Promise<ConversationResult>

  constructor(
    selectionManager: MessageSelectionManager,
    cachedDefaultOptions: ExportOptions,
    siteName: string,
    getConversation: () => Promise<ConversationResult>
  ) {
    this.selectionManager = selectionManager
    this.cachedDefaultOptions = cachedDefaultOptions
    this.siteName = siteName
    this.getConversation = getConversation
  }

  /**
   * Prepare export payload with conversation data and options
   */
  async prepareExportPayload(
    overrides?: Partial<ExportOptions>
  ): Promise<PrepareExportPayloadResult> {
    const resolvedScope = overrides?.scope ?? this.selectionManager.getScope()
    this.selectionManager.setScope(resolvedScope)

    const { conversation, error, handled } = await this.getConversation()
    if (!conversation) {
      return { error: error ?? t('error_no_conversation_generic'), handled }
    }

    let conversationToExport = conversation
    if (resolvedScope === 'selected') {
      // In "selected only" mode, use selected messages or return error
      if (!this.selectionManager.hasSelection()) {
        const message = t('notification_export_selection_empty')
        notificationBoard.info(message)
        return { error: message, handled: true }
      }
      conversationToExport = this.selectionManager.filterConversation(conversation)
      if (!conversationToExport.messages.length) {
        const message = t('notification_export_selection_invalid')
        notificationBoard.error(message)
        return { error: message, handled: true }
      }
    }

    const resolvedOptions: ExportOptions = {
      ...this.cachedDefaultOptions,
      scope: resolvedScope,
      ...overrides,
    }

    if (resolvedOptions.target === 'obsidian') {
      resolvedOptions.format = 'markdown'
    }

    if (typeof resolvedOptions.includeMetadata !== 'boolean') {
      resolvedOptions.includeMetadata = this.cachedDefaultOptions.includeMetadata ?? true
    }

    return {
      payload: {
        conversation: conversationToExport,
        options: resolvedOptions,
      },
    }
  }

  /**
   * Send export request to background script
   */
  async sendExportRequest(conversation: ChatConversation, options: ExportOptions) {
    return chrome.runtime.sendMessage({
      type: 'EXPORT_CONVERSATION',
      data: conversation,
      options,
      site: this.siteName,
    })
  }

  /**
   * Handle export response and show notification
   */
  handleExportResponse(
    response: any,
    progressNotice: ReturnType<typeof notificationBoard.progress>
  ) {
    if (response?.success) {
      const message = response.result?.message ?? t('notification_export_success_generic')
      const linkOptions = response.result?.pageUrl
        ? {
            label: t('notification_view_in_notion'),
            href: response.result.pageUrl,
          }
        : undefined
      progressNotice.success(message, linkOptions ? { link: linkOptions } : undefined)
    } else {
      const errorMessage = response?.result?.error ?? t('notification_export_failed')
      progressNotice.error(errorMessage, { dismissible: true })
    }
  }

  /**
   * Handle export error and show notification
   */
  handleExportError(error: unknown, progressNotice: ReturnType<typeof notificationBoard.progress>) {
    const message = error instanceof Error ? error.message : t('error_unknown')
    progressNotice.error(t('notification_export_failed_with_reason', { reason: message }), {
      dismissible: true,
    })
  }
}
