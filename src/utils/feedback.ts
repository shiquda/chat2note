import t from '../i18n'

export interface FeedbackMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  timestamp: number
  actions?: FeedbackAction[]
}

export interface FeedbackAction {
  label: string
  action: () => void
  primary?: boolean
}

export interface FeedbackOptions {
  type: FeedbackMessage['type']
  title: string
  message?: string
  duration?: number
  actions?: FeedbackAction[]
}

export class FeedbackManager {
  private static instance: FeedbackManager
  private messages: FeedbackMessage[] = []
  private listeners: Set<(message: FeedbackMessage) => void> = new Set()

  static getInstance(): FeedbackManager {
    if (!FeedbackManager.instance) {
      FeedbackManager.instance = new FeedbackManager()
    }
    return FeedbackManager.instance
  }

  /**
   * Display a feedback message
   */
  show(options: FeedbackOptions): string {
    const id = this.generateId()
    const message: FeedbackMessage = {
      id,
      type: options.type,
      title: options.title,
      message: options.message,
      duration: options.duration ?? this.getDefaultDuration(options.type),
      timestamp: Date.now(),
      actions: options.actions,
    }

    this.messages.push(message)
    this.notifyListeners(message)

    // Automatically remove the message
    if (message.duration && message.duration > 0) {
      setTimeout(() => {
        this.remove(id)
      }, message.duration)
    }

    return id
  }

  /**
   * Display a success message
   */
  success(title: string, message?: string, actions?: FeedbackAction[]): string {
    return this.show({ type: 'success', title, message, actions })
  }

  /**
   * Display an error message
   */
  error(title: string, message?: string, actions?: FeedbackAction[]): string {
    return this.show({ type: 'error', title, message, actions })
  }

  /**
   * Display a warning message
   */
  warning(title: string, message?: string, actions?: FeedbackAction[]): string {
    return this.show({ type: 'warning', title, message, actions })
  }

  /**
   * Display an info message
   */
  info(title: string, message?: string, actions?: FeedbackAction[]): string {
    return this.show({ type: 'info', title, message, actions })
  }

  /**
   * Remove a specific message
   */
  remove(id: string): void {
    const index = this.messages.findIndex(msg => msg.id === id)
    if (index > -1) {
      const message = this.messages[index]
      this.messages.splice(index, 1)
      this.notifyRemoval(message)
    }
  }

  /**
   * Clear all messages
   */
  clear(): void {
    const messages = [...this.messages]
    this.messages = []
    messages.forEach(message => this.notifyRemoval(message))
  }

  /**
   * Retrieve current messages
   */
  getMessages(): FeedbackMessage[] {
    return [...this.messages]
  }

  /**
   * Add a message listener
   */
  addListener(listener: (message: FeedbackMessage) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /**
   * Remove a message listener
   */
  removeListener(listener: (message: FeedbackMessage) => void): void {
    this.listeners.delete(listener)
  }

  /**
   * Create export success feedback
   */
  showExportSuccess(target: string, format: string, details?: any): string {
    const actions: FeedbackAction[] = []

    if (details?.pageUrl) {
      actions.push({
        label: t('feedback_view_page'),
        action: () => window.open(details.pageUrl, '_blank'),
        primary: true,
      })
    }

    if (details?.filename) {
      actions.push({
        label: t('feedback_open_file'),
        action: () => {
          // Attempt to open the downloaded file (browser limitations apply)
          this.info(t('feedback_file_saved_to_downloads'), `File name: ${details.filename}`)
        },
      })
    }

    return this.success(
      t('feedback_export_successful'),
      `Conversation exported to ${target} (${format})`,
      actions
    )
  }

  /**
   * Create export failure feedback
   */
  showExportError(error: string, suggestions?: string[]): string {
    const actions: FeedbackAction[] = []

    if (suggestions && suggestions.length > 0) {
      actions.push({
        label: t('feedback_view_help'),
        action: () => {
          this.info(
            t('feedback_troubleshooting'),
            `Suggested solutions:\n${suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
          )
        },
      })
    }

    actions.push({
      label: t('feedback_try_again'),
      action: () => {
        // Trigger retry logic (needs to be implemented by the caller)
        this.info(t('feedback_please_try_exporting_again'))
      },
      primary: true,
    })

    return this.error(t('feedback_export_failed'), error, actions)
  }

  /**
   * Create configuration validation feedback
   */
  showConfigValidation(errors: string[]): string {
    return this.error(
      t('feedback_configuration_validation_failed'),
      errors.length > 0
        ? `The following issues were found:\n${errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}`
        : undefined,
      [
        {
          label: t('feedback_open_settings'),
          action: () => {
            if (typeof chrome !== 'undefined' && chrome.runtime) {
              chrome.runtime.openOptionsPage()
            }
          },
          primary: true,
        },
      ]
    )
  }

  /**
   * Create connection test feedback
   */
  showConnectionTest(success: boolean, details?: string): string {
    if (success) {
      return this.success(
        t('feedback_connection_test_succeeded'),
        details || t('feedback_successfully_connected_to_notion_api')
      )
    } else {
      return this.error(
        t('feedback_connection_test_failed'),
        details || t('feedback_unable_to_connect_to_notion_api')
      )
    }
  }

  /**
   * Create progress feedback
   */
  showProgress(stage: string, progress: number, message?: string): string {
    return this.info(stage, message || `Progress: ${Math.round(progress * 100)}%`)
  }

  private generateId(): string {
    return `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getDefaultDuration(type: FeedbackMessage['type']): number {
    switch (type) {
      case 'success':
        return 3000
      case 'error':
        return 5000
      case 'warning':
        return 4000
      case 'info':
        return 3000
      default:
        return 3000
    }
  }

  private notifyListeners(message: FeedbackMessage): void {
    this.listeners.forEach(listener => {
      try {
        listener(message)
      } catch (error) {
        console.error('Error in feedback listener:', error)
      }
    })
  }

  private notifyRemoval(message: FeedbackMessage): void {
    // Notify listeners that a message was removed
    this.listeners.forEach(listener => {
      try {
        listener({ ...message, type: 'removed' as any })
      } catch (error) {
        console.error('Error in feedback listener:', error)
      }
    })
  }
}

// Export singleton instance
export const feedbackManager = FeedbackManager.getInstance()

// Convenience helpers
export const showSuccess = (title: string, message?: string, actions?: FeedbackAction[]) =>
  feedbackManager.success(title, message, actions)

export const showError = (title: string, message?: string, actions?: FeedbackAction[]) =>
  feedbackManager.error(title, message, actions)

export const showWarning = (title: string, message?: string, actions?: FeedbackAction[]) =>
  feedbackManager.warning(title, message, actions)

export const showInfo = (title: string, message?: string, actions?: FeedbackAction[]) =>
  feedbackManager.info(title, message, actions)

export const showExportSuccess = (target: string, format: string, details?: any) =>
  feedbackManager.showExportSuccess(target, format, details)

export const showExportError = (error: string, suggestions?: string[]) =>
  feedbackManager.showExportError(error, suggestions)

export const showConfigValidation = (errors: string[]) =>
  feedbackManager.showConfigValidation(errors)

export const showConnectionTest = (success: boolean, details?: string) =>
  feedbackManager.showConnectionTest(success, details)
