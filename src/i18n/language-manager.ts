/**
 * Language Manager
 * Handles language preference storage and switching
 */
import {
  matchLanguagePreference,
  type LanguagePreference,
  type SelectableLanguage,
} from './supported-languages'

const LANGUAGE_STORAGE_KEY = 'chat2note-language-preference'

export type SupportedLanguage = LanguagePreference

/**
 * Get the stored language preference
 */
export async function getStoredLanguage(): Promise<SupportedLanguage> {
  try {
    const browserAPI = globalThis.browser || globalThis.chrome
    if (!browserAPI?.storage) {
      return 'auto'
    }

    const result = await browserAPI.storage.sync.get(LANGUAGE_STORAGE_KEY)
    const storedValue = result[LANGUAGE_STORAGE_KEY]
    if (typeof storedValue === 'string') {
      const matched = matchLanguagePreference(storedValue)
      if (matched) {
        return matched
      }
    }

    return 'auto'
  } catch {
    return 'auto'
  }
}

/**
 * Set language preference
 */
export async function setStoredLanguage(
  language: SupportedLanguage,
  options: { silent?: boolean } = {}
): Promise<void> {
  try {
    const browserAPI = globalThis.browser || globalThis.chrome
    if (!browserAPI?.storage) {
      return
    }

    await browserAPI.storage.sync.set({ [LANGUAGE_STORAGE_KEY]: language })

    // Notify all tabs about language change
    notifyLanguageChange(language)

    // Reload current page to apply new language
    // This is necessary because browser extension i18n API reads language at load time
    if (typeof window !== 'undefined' && !options.silent) {
      window.location.reload()
    }
  } catch (error) {
    console.error('[Language Manager] Failed to store language preference:', error)
  }
}

/**
 * Get effective locale based on preference
 * @param preference - User's language preference
 * @returns Actual locale to use
 */
export function getEffectiveLocale(preference: SupportedLanguage = 'auto'): string {
  if (preference === 'auto') {
    // Use browser language
    const browserAPI = globalThis.browser?.i18n || globalThis.chrome?.i18n
    if (browserAPI) {
      const uiLang = browserAPI.getUILanguage()
      // Map browser language to supported locales
      // More precise language matching to avoid false positives
      const lang = uiLang.toLowerCase()

      const matched = matchLanguagePreference(lang)
      if (matched && matched !== 'auto') {
        return matched
      }

      // Default to English for unsupported languages
      console.log(
        `[Language Manager] Unsupported browser language: ${uiLang}, defaulting to English`
      )
      return 'en'
    }
    return 'en'
  }

  return preference
}

export function isSupportedLanguage(language: string): language is SelectableLanguage {
  const matched = matchLanguagePreference(language)
  return Boolean(matched && matched !== 'auto')
}

/**
 * Notify all tabs about language change
 */
function notifyLanguageChange(language: SupportedLanguage): void {
  try {
    const browserAPI = globalThis.browser || globalThis.chrome
    if (!browserAPI?.tabs) {
      // Not in an extension context, trigger custom event for current page
      window.dispatchEvent(
        new CustomEvent('chat2note-language-change', {
          detail: { language },
        })
      )
      return
    }

    // In extension context, notify all tabs
    browserAPI.tabs.query({}, tabs => {
      tabs.forEach(tab => {
        if (tab.id) {
          browserAPI.tabs
            .sendMessage(tab.id, {
              type: 'LANGUAGE_CHANGED',
              language,
            })
            .catch(() => {
              // Tab might not have content script, ignore
            })
        }
      })
    })
  } catch {
    // Silently fail if we can't notify
  }
}

/**
 * Listen for language changes
 */
export function onLanguageChange(callback: (language: SupportedLanguage) => void): () => void {
  const handleStorageChange = (changes: any, areaName: string) => {
    if (areaName === 'sync' && changes[LANGUAGE_STORAGE_KEY]) {
      callback(changes[LANGUAGE_STORAGE_KEY].newValue)
    }
  }

  const handleCustomEvent = (event: Event) => {
    const customEvent = event as CustomEvent
    if (customEvent.detail?.language) {
      callback(customEvent.detail.language)
    }
  }

  try {
    const browserAPI = globalThis.browser || globalThis.chrome
    if (browserAPI?.storage) {
      browserAPI.storage.onChanged.addListener(handleStorageChange)
    }

    // Also listen for custom events (for non-extension pages)
    window.addEventListener('chat2note-language-change', handleCustomEvent)

    return () => {
      if (browserAPI?.storage) {
        browserAPI.storage.onChanged.removeListener(handleStorageChange)
      }
      window.removeEventListener('chat2note-language-change', handleCustomEvent)
    }
  } catch {
    return () => {}
  }
}
