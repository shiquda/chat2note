export const SELECTABLE_LANGUAGES = ['en', 'zh_CN', 'fr', 'de', 'es', 'pt', 'ja', 'ko'] as const

export const LANGUAGE_PREFERENCE_VALUES = ['auto', ...SELECTABLE_LANGUAGES] as const

export type SelectableLanguage = (typeof SELECTABLE_LANGUAGES)[number]

export type LanguagePreference = (typeof LANGUAGE_PREFERENCE_VALUES)[number]

const LANGUAGE_NATIVE_NAME_OVERRIDES: Partial<Record<SelectableLanguage, string>> = {
  zh_CN: '简体中文',
  ja: '日本語',
  ko: '한국어',
}

const displayNameCache = new Map<SelectableLanguage, string>()

function normalizeLocaleCode(language: SelectableLanguage): string {
  return language.replace('_', '-')
}

function formatName(name: string): string {
  if (!name) return name
  const trimmed = name.trim()
  if (!trimmed) {
    return trimmed
  }

  const [firstChar] = trimmed
  const upperFirst = firstChar.toLocaleUpperCase()
  if (firstChar === upperFirst) {
    return trimmed
  }

  return `${upperFirst}${trimmed.slice(1)}`
}

export function getLanguageNativeName(language: SelectableLanguage): string {
  const cached = displayNameCache.get(language)
  if (cached) return cached

  const locale = normalizeLocaleCode(language)

  if (typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function') {
    try {
      const displayNames = new Intl.DisplayNames([locale], { type: 'language' })
      const lookupOrder = Array.from(
        new Set([
          locale,
          locale.toLowerCase(),
          locale.split('-')[0],
          locale.split('-')[0].toLowerCase(),
        ])
      )

      for (const candidate of lookupOrder) {
        if (!candidate) continue
        const result = displayNames.of(candidate)
        if (typeof result === 'string' && result.trim()) {
          const formatted = formatName(result)
          displayNameCache.set(language, formatted)
          return formatted
        }
      }
    } catch {
      // Ignore failures and fall back to overrides
    }
  }

  const fallback =
    LANGUAGE_NATIVE_NAME_OVERRIDES[language] ?? formatName(language.replace('_', '-'))
  displayNameCache.set(language, fallback)
  return fallback
}

export function matchLanguagePreference(candidate: string): LanguagePreference | null {
  if (!candidate) return null

  const normalized = candidate.replace('-', '_').trim()
  if (!normalized) return null

  const lowered = normalized.toLowerCase()

  if (lowered === 'auto') {
    return 'auto'
  }

  const directMatch = SELECTABLE_LANGUAGES.find(language => language.toLowerCase() === lowered)
  if (directMatch) {
    return directMatch
  }

  const primaryCode = lowered.split('_')[0]
  const primaryMatch = SELECTABLE_LANGUAGES.find(
    language => language.split('_')[0].toLowerCase() === primaryCode
  )
  if (primaryMatch) {
    return primaryMatch
  }

  return null
}
