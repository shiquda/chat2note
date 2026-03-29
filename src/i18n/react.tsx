/**
 * React Integration for i18n
 * Provides hooks and components for using i18n in React
 */

import { useMemo, useSyncExternalStore } from 'react'
import { t, getCurrentLocale } from './index'
import type { TranslationKey, Substitutions } from './types'

/**
 * Store for locale changes
 * Note: Browser extension i18n locale is static and doesn't change at runtime,
 * but we provide this for future extensibility
 */
const localeStore = {
  getSnapshot: () => getCurrentLocale(),
  subscribe: (_callback: () => void) => {
    // Browser locale doesn't change at runtime in extensions
    // Return empty unsubscribe function
    return () => {}
  },
}

/**
 * Hook to get the current locale
 * @returns Current locale string (e.g., 'en', 'zh-CN')
 */
export function useLocale(): string {
  return useSyncExternalStore(localeStore.subscribe, localeStore.getSnapshot)
}

/**
 * Hook to get the translation function
 * @returns Translation function
 *
 * Example:
 * ```tsx
 * function MyComponent() {
 *   const t = useTranslation()
 *   return <div>{t('app_name')}</div>
 * }
 * ```
 */
export function useTranslation() {
  const locale = useLocale()

  // Memoize the translation function
  // Note: locale dependency is kept for future runtime language switching
  return useMemo(
    () => (key: TranslationKey, substitutions?: Substitutions) => t(key, substitutions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale]
  )
}

/**
 * Component to render translated text
 *
 * Example:
 * ```tsx
 * <Trans id="welcome_message" values={{ name: 'John' }} />
 * ```
 */
export function Trans({
  id,
  values,
  fallback,
}: {
  id: TranslationKey
  values?: Substitutions
  fallback?: string
}) {
  const message = t(id, values)

  // If translation not found and fallback provided, use fallback
  if (message === id && fallback) {
    return <>{fallback}</>
  }

  return <>{message}</>
}

/**
 * HOC to inject translation function into component props
 *
 * Example:
 * ```tsx
 * const MyComponent = withTranslation(({ t }) => {
 *   return <div>{t('app_name')}</div>
 * })
 * ```
 */
export function withTranslation<P extends { t: ReturnType<typeof useTranslation> }>(
  Component: React.ComponentType<P>
) {
  const WithTranslation = (props: Omit<P, 't'>) => {
    const t = useTranslation()
    return <Component {...(props as P)} t={t} />
  }

  WithTranslation.displayName = `withTranslation(${Component.displayName || Component.name || 'Component'})`

  return WithTranslation
}
