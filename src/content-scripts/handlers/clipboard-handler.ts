import t from '../../i18n'

/**
 * Handle clipboard export in content script context
 * Uses DOM manipulation to copy text to clipboard
 * @param content - Text content to copy
 * @returns Success or error result
 */
export async function handleClipboardExport(
  content: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Use DOM manipulation to copy to clipboard in content script
    const textArea = document.createElement('textarea')
    textArea.value = content
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.select()

    // Try to copy
    const success = document.execCommand('copy')
    document.body.removeChild(textArea)

    if (success) {
      return { success: true }
    } else {
      // If execCommand fails, try using Clipboard API
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(content)
        return { success: true }
      } else {
        return { success: false, error: 'Both clipboard methods failed' }
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : t('error_unknown_clipboard_error')
    return { success: false, error: message }
  }
}
