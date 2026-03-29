/**
 * i18n Core Module
 * Cross-browser compatible internationalization support for Chrome and Firefox
 * Supports user-selectable language preferences
 */

import type { TranslationKey, Substitutions } from './types'
import { getEffectiveLocale, SupportedLanguage as SupportedLanguageType } from './language-manager'

// Translation messages cache
let currentMessages: Record<string, any> = {}
let currentLocale: string = 'en'

/**
 * Fallback messages for when extension API is not available
 */
function getFallbackMessages(locale: string): Record<string, any> {
  const fallbackMessages: Record<string, Record<string, any>> = {
    en: {
      app_name: { message: 'Chat2Note' },
      error_unknown_error_occurred: { message: 'An unknown error occurred' },
      context_menu_save_conversation: { message: 'Save Conversation with Chat2Note' },
      notification_export_success: {
        message: 'Exported to $TARGET$ ($FORMAT$)',
        placeholders: {
          target: { content: '$1' },
          format: { content: '$2' },
        },
      },
      target_clipboard: { message: 'Clipboard' },
    },
    zh_CN: {
      app_name: { message: 'Chat2Note' },
      error_unknown_error_occurred: { message: '发生未知错误' },
      context_menu_save_conversation: { message: '使用 Chat2Note 保存对话' },
      notification_export_success: {
        message: '已导出到 $TARGET$ ($FORMAT$)',
        placeholders: {
          target: { content: '$1' },
          format: { content: '$2' },
        },
      },
      target_clipboard: { message: '剪贴板' },
    },
    fr: {
      app_name: { message: 'Chat2Note' },
      error_unknown_error_occurred: { message: "Une erreur inconnue s'est produite" },
      context_menu_save_conversation: { message: 'Sauvegarder la conversation avec Chat2Note' },
      notification_export_success: {
        message: 'Exporté vers $TARGET$ ($FORMAT$)',
        placeholders: {
          target: { content: '$1' },
          format: { content: '$2' },
        },
      },
      target_clipboard: { message: 'Presse-papiers' },
    },
    de: {
      app_name: { message: 'Chat2Note' },
      error_unknown_error_occurred: { message: 'Ein unbekannter Fehler ist aufgetreten' },
      context_menu_save_conversation: { message: 'Unterhaltung mit Chat2Note speichern' },
      notification_export_success: {
        message: 'Exportiert zu $TARGET$ ($FORMAT$)',
        placeholders: {
          target: { content: '$1' },
          format: { content: '$2' },
        },
      },
      target_clipboard: { message: 'Zwischenablage' },
    },
  }

  return fallbackMessages[locale] || fallbackMessages.en
}

/**
 * Initialize i18n system
 * Loads messages based on user preference
 */
export async function initI18n(): Promise<void> {
  try {
    // Get user's language preference
    const browserAPI = globalThis.browser || globalThis.chrome
    let preference: SupportedLanguageType = 'auto'

    if (browserAPI?.storage) {
      const result = await browserAPI.storage.sync.get('chat2note-language-preference')
      preference = (result['chat2note-language-preference'] as SupportedLanguageType) || 'auto'
      console.log(`[i18n] Found language preference: ${preference}`)
    } else {
      console.log('[i18n] Browser storage not available, using auto')
    }

    const browserAPIi18n = globalThis.browser?.i18n || globalThis.chrome?.i18n
    if (browserAPIi18n) {
      const uiLang = browserAPIi18n.getUILanguage()
      console.log(`[i18n] Browser UI language: ${uiLang}`)
    }

    currentLocale = getEffectiveLocale(preference)
    console.log(`[i18n] Effective locale determined: ${currentLocale}`)

    // Load translation messages for the determined locale
    await loadMessages(currentLocale)
    console.log(`[i18n] Successfully initialized with locale: ${currentLocale}`)
  } catch (error) {
    console.error('[i18n] Failed to initialize:', error)
    // Fallback to English
    currentLocale = 'en'
    await loadMessages('en')
    console.log('[i18n] Fallback to English completed')
  }
}

/**
 * Load messages for a specific locale
 */
async function loadMessages(locale: string): Promise<void> {
  try {
    const browserAPI = globalThis.browser || globalThis.chrome
    if (!browserAPI?.runtime?.getURL) {
      console.log('[i18n] Browser API not available, using fallback messages')
      currentMessages = getFallbackMessages(locale)
      return
    }

    const url = browserAPI.runtime.getURL(`_locales/${locale}/messages.json`)
    console.log(`[i18n] Loading messages from: ${url}`)

    // Try using fetch with better error handling
    try {
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const messages = await response.json()
      currentMessages = messages
      console.log(
        `[i18n] Successfully loaded ${Object.keys(messages).length} messages for locale ${locale}`
      )
    } catch (fetchError) {
      console.error(
        `[i18n] Fetch failed for locale ${locale}, trying alternative method:`,
        fetchError
      )

      // Fallback: try using XMLHttpRequest which may have better compatibility in content scripts
      try {
        const messages = await loadMessagesViaXHR(url)
        currentMessages = messages
        console.log(
          `[i18n] Successfully loaded ${Object.keys(messages).length} messages via XHR for locale ${locale}`
        )
      } catch (xhrError) {
        console.error(
          `[i18n] XHR also failed for locale ${locale}, using fallback messages:`,
          xhrError
        )
        currentMessages = getFallbackMessages(locale)
      }
    }
  } catch (error) {
    console.error(`[i18n] Failed to load messages for locale ${locale}:`, error)
    currentMessages = getFallbackMessages(locale)
  }
}

/**
 * Fallback method to load messages using XMLHttpRequest
 */
function loadMessagesViaXHR(url: string): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', url, true)
    xhr.responseType = 'json'

    xhr.onload = () => {
      if (xhr.status === 200) {
        resolve(xhr.response)
      } else {
        reject(new Error(`XHR failed with status ${xhr.status}`))
      }
    }

    xhr.onerror = () => {
      reject(new Error('XHR network error'))
    }

    xhr.send()
  })
}

/**
 * Main translation function
 * Follows Web Extensions i18n API standard for placeholder replacement
 * @param key - Translation key
 * @param substitutions - Optional substitution values (can be string, array, or object)
 * @returns Translated message
 */
export function t(key: TranslationKey, substitutions?: Substitutions): string {
  const messageEntry = currentMessages[key]

  if (!messageEntry || !messageEntry.message) {
    console.warn(`[i18n] Missing translation for key: ${key}`)
    return key
  }

  let message = messageEntry.message

  // No substitutions needed
  if (!substitutions) {
    return message
  }

  // Build a substitution map: placeholder name -> value
  const substitutionMap = new Map<string, string>()

  if (Array.isArray(substitutions)) {
    // Array substitutions: use the order defined in placeholders
    if (messageEntry.placeholders) {
      // Sort placeholder names by their content value ($1, $2, etc.)
      const sortedPlaceholders = Object.entries(messageEntry.placeholders)
        .sort(([, a], [, b]) => {
          const aNum = parseInt((a as { content: string }).content.match(/\d+/)?.[0] || '999', 10)
          const bNum = parseInt((b as { content: string }).content.match(/\d+/)?.[0] || '999', 10)
          return aNum - bNum
        })
        .map(([name]) => name)

      sortedPlaceholders.forEach((name, index) => {
        if (index < substitutions.length) {
          substitutionMap.set(name.toLowerCase(), String(substitutions[index]))
        }
      })
    } else {
      // No placeholders definition: try numeric placeholders $1$, $2$, etc.
      substitutions.forEach((value, index) => {
        substitutionMap.set(`${index + 1}`, String(value))
      })
    }
  } else if (typeof substitutions === 'object') {
    // Object substitutions: use keys directly
    Object.entries(substitutions as Record<string, string | number>).forEach(([key, value]) => {
      substitutionMap.set(key.toLowerCase(), String(value))
    })
  } else {
    // Single string substitution: replace the first placeholder
    if (messageEntry.placeholders) {
      const firstPlaceholder = Object.entries(messageEntry.placeholders).sort(([, a], [, b]) => {
        const aNum = parseInt((a as { content: string }).content.match(/\d+/)?.[0] || '999', 10)
        const bNum = parseInt((b as { content: string }).content.match(/\d+/)?.[0] || '999', 10)
        return aNum - bNum
      })[0]
      if (firstPlaceholder) {
        substitutionMap.set(firstPlaceholder[0].toLowerCase(), String(substitutions))
      }
    } else {
      substitutionMap.set('1', String(substitutions))
    }
  }

  // Replace all placeholders in the message
  message = message.replace(/\$([^$]+)\$/g, (match: string, placeholderName: string) => {
    const value = substitutionMap.get(placeholderName.toLowerCase())
    return value !== undefined ? value : match
  })

  return message
}

/**
 * Get the current UI language
 * @returns Language code (e.g., 'en', 'zh_CN')
 */
export function getCurrentLocale(): string {
  return currentLocale
}

/**
 * Get the base language code without region
 * Example: 'zh_CN' -> 'zh', 'en' -> 'en'
 */
export function getBaseLanguage(): string {
  return currentLocale.split('_')[0]
}

/**
 * Check if current language is Chinese
 */
export function isChineseLocale(): boolean {
  const base = getBaseLanguage()
  return base === 'zh'
}

/**
 * Check if current language is English
 */
export function isEnglishLocale(): boolean {
  const base = getBaseLanguage()
  return base === 'en'
}

/**
 * Format a message with named placeholders
 * This is a helper for complex placeholder scenarios
 *
 * Example:
 * formatMessage('Hello, {name}! You have {count} messages.', { name: 'John', count: '5' })
 * -> 'Hello, John! You have 5 messages.'
 */
export function formatMessage(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return values[key]?.toString() || match
  })
}

// Export the translation function as default
export default t

// Re-export types
export type { TranslationKey, Substitutions } from './types'
