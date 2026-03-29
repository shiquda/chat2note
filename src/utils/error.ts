import t from '../i18n'

export interface ErrorContext {
  component?: string
  action?: string
  timestamp?: number
  userId?: string
}

export interface ErrorReport {
  message: string
  stack?: string
  context?: ErrorContext
  timestamp: number
}

export class ErrorHandler {
  private static instance: ErrorHandler
  private errorReports: ErrorReport[] = []

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler()
    }
    return ErrorHandler.instance
  }

  /**
   * Handle errors and generate a report
   */
  handleError(error: Error | string, context?: ErrorContext): ErrorReport {
    const report: ErrorReport = {
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' && error.stack ? error.stack : undefined,
      context: {
        ...context,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
    }

    this.errorReports.push(report)
    console.error('Chat2Note Error:', report)

    // Limit stored error reports
    if (this.errorReports.length > 100) {
      this.errorReports = this.errorReports.slice(-50)
    }

    return report
  }

  /**
   * Get recent error reports
   */
  getRecentErrors(limit: number = 10): ErrorReport[] {
    return this.errorReports.slice(-limit)
  }

  /**
   * Clear stored error reports
   */
  clearErrors(): void {
    this.errorReports = []
  }

  /**
   * Format an error message for users
   */
  formatErrorMessage(error: Error | string, context?: ErrorContext): string {
    const report = this.handleError(error, context)

    // Return a user-friendly message based on the error type
    if (report.message.includes('NetworkError')) {
      return t('error_network_connection_failed')
    }

    if (report.message.includes('Notion') || report.message.includes('API')) {
      return t('error_notion_api_request_failed')
    }

    if (report.message.includes('storage') || report.message.includes('permission')) {
      return t('error_storage_permissions_failed')
    }

    if (report.message.includes('parsing') || report.message.includes('parse')) {
      return t('error_page_parsing_failed')
    }

    return t('error_export_failed_please_try_again_later')
  }

  /**
   * Create a user-friendly error object
   */
  createUserError(message: string, userFriendlyMessage: string, context?: ErrorContext): Error {
    const error = new Error(message)
    error.name = 'UserError'

    // Attach a user-friendly message property
    ;(error as any).userMessage = userFriendlyMessage

    this.handleError(error, context)
    return error
  }

  /**
   * Validate API configuration
   */
  validateApiConfig(config: { apiToken?: string; databaseId?: string }): void {
    const errors: string[] = []

    if (!config.apiToken) {
      errors.push(t('error_api_token_cannot_be_empty'))
    }

    if (!config.databaseId) {
      errors.push(t('error_database_id_cannot_be_empty'))
    } else if (!/^[a-f0-9]{32}$/.test(config.databaseId.replace(/-/g, ''))) {
      errors.push(t('error_database_id_format_is_invalid'))
    }

    if (errors.length > 0) {
      throw this.createUserError(
        `API configuration validation failed: ${errors.join(', ')}`,
        'Invalid Notion configuration. Please check your API token and database ID.',
        { component: 'NotionService', action: 'validateConfig' }
      )
    }
  }

  /**
   * Handle Notion API errors
   */
  handleNotionError(error: any): never {
    let userMessage = t('error_notion_api_request_failed_short')

    if (error.code === 'unauthorized') {
      userMessage = t('error_api_token_is_invalid_or_has_expired')
    } else if (error.code === 'object_not_found') {
      userMessage = t('error_database_not_found_check_database_id')
    } else if (error.code === 'rate_limited') {
      userMessage = t('error_api_calls_are_rate_limited_please_try_again_later')
    } else if (error.code === 'validation_error') {
      userMessage = t('error_request_data_format_is_invalid')
    }

    throw this.createUserError(`Notion API error: ${error.message}`, userMessage, {
      component: 'NotionService',
      action: 'apiCall',
    })
  }

  /**
   * Handle storage errors
   */
  handleStorageError(error: any): never {
    let userMessage = t('error_storage_operation_failed')

    if (error.message.includes('QUOTA')) {
      userMessage = t('error_storage_quota_exceeded')
    } else if (error.message.includes('permission')) {
      userMessage = t('error_missing_storage_permission_review_settings')
    }

    throw this.createUserError(`Storage error: ${error.message}`, userMessage, {
      component: 'StorageService',
      action: 'storage',
    })
  }

  /**
   * Handle network errors
   */
  handleNetworkError(error: any): never {
    const userMessage = 'Network connection failed. Please check your internet connection.'

    throw this.createUserError(`Network error: ${error.message}`, userMessage, {
      component: 'NetworkService',
      action: 'request',
    })
  }

  /**
   * Async wrapper with automatic error handling
   */
  async wrapAsync<T>(fn: () => Promise<T>, context?: ErrorContext, fallback?: T): Promise<T> {
    try {
      return await fn()
    } catch (error) {
      this.handleError(error as Error, context)
      if (fallback !== undefined) {
        return fallback
      }
      throw error
    }
  }

  /**
   * Sync wrapper with automatic error handling
   */
  wrapSync<T>(fn: () => T, context?: ErrorContext, fallback?: T): T {
    try {
      return fn()
    } catch (error) {
      this.handleError(error as Error, context)
      if (fallback !== undefined) {
        return fallback
      }
      throw error
    }
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance()

// Convenience helpers
export const handleError = (error: Error | string, context?: ErrorContext) =>
  errorHandler.handleError(error, context)

export const formatErrorMessage = (error: Error | string, context?: ErrorContext) =>
  errorHandler.formatErrorMessage(error, context)

export const wrapAsync = <T>(fn: () => Promise<T>, context?: ErrorContext, fallback?: T) =>
  errorHandler.wrapAsync(fn, context, fallback)

export const wrapSync = <T>(fn: () => T, context?: ErrorContext, fallback?: T) =>
  errorHandler.wrapSync(fn, context, fallback)
