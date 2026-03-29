/**
 * i18n Type Definitions
 * Provides type safety for translation keys and functions
 */

/**
 * Translation key type - will be extended with actual keys
 */
export type TranslationKey = string

/**
 * Substitution values for parameterized translations
 * Example: { count: '5', name: 'John' }
 */
export type Substitutions = Record<string, string | number> | string[]

/**
 * i18n API interface
 */
export interface I18nAPI {
  getMessage(messageName: string, substitutions?: Substitutions): string
  getUILanguage(): string
  detectLanguage(
    text: string
  ): Promise<{ languages: Array<{ language: string; percentage: number }> }>
}

/**
 * Translation function type
 */
export type TranslateFn = (key: TranslationKey, substitutions?: Substitutions) => string

/**
 * Locale codes supported by the extension
 */
export type SupportedLocale = 'en' | 'zh_CN' | 'zh_TW'

/**
 * Translation message format (matches Web Extensions format)
 */
export interface TranslationMessage {
  message: string
  description?: string
  placeholders?: Record<
    string,
    {
      content: string
      example?: string
    }
  >
}

/**
 * Messages file structure
 */
export type MessagesFile = Record<string, TranslationMessage>
