import type { AppConfig } from '../types/config'

export type ThemePreference = AppConfig['appearance']['theme']

export function resolveEffectiveTheme(
  preference: ThemePreference,
  fallback: 'light' | 'dark' = 'light'
): 'light' | 'dark' {
  if (preference === 'system') {
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      try {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      } catch {
        return fallback
      }
    }
    return fallback
  }

  return preference
}

export function applyResolvedTheme(
  theme: 'light' | 'dark',
  target: Document | HTMLElement = document
): void {
  const element = target instanceof Document ? target.documentElement : target
  element.classList.add('chat2note-theme-scope')
  element.setAttribute('data-theme', theme)
}

export function applyThemePreference(
  preference: ThemePreference,
  target: Document | HTMLElement = document,
  options: { onResolved?: (theme: 'light' | 'dark') => void } = {}
): () => void {
  const element = target instanceof Document ? target.documentElement : target
  let mediaQuery: MediaQueryList | null = null
  let legacyListener: ((event: MediaQueryListEvent) => void) | null = null

  const apply = (theme: 'light' | 'dark') => {
    applyResolvedTheme(theme, element)
    options.onResolved?.(theme)
  }

  const applyFromMedia = (matches: boolean) => {
    apply(matches ? 'dark' : 'light')
  }

  if (preference === 'system') {
    const fallback = element.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
    const resolved = resolveEffectiveTheme(preference, fallback as 'light' | 'dark')
    apply(resolved)

    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      try {
        mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
        applyFromMedia(mediaQuery.matches)

        const handleChange = (event: MediaQueryListEvent) => {
          applyFromMedia(event.matches)
        }

        if (typeof mediaQuery.addEventListener === 'function') {
          mediaQuery.addEventListener('change', handleChange)
        } else {
          legacyListener = event => handleChange(event)
          mediaQuery.addListener(legacyListener)
        }

        return () => {
          if (!mediaQuery) return
          if (typeof mediaQuery.removeEventListener === 'function') {
            mediaQuery.removeEventListener('change', handleChange)
          } else if (legacyListener) {
            mediaQuery.removeListener(legacyListener)
          }
        }
      } catch {
        return () => {}
      }
    }

    return () => {}
  }

  apply(preference)

  return () => {}
}

export const THEME_TOKENS: Record<'light' | 'dark', Record<string, string>> = {
  light: {
    '--bg-body': '#f5f5f5',
    '--bg-surface': '#ffffff',
    '--bg-elevated': '#f0f0f0',
    '--bg-subtle': '#fafafa',
    '--text-primary': '#111111',
    '--text-secondary': '#3f3f3f',
    '--text-muted': '#6c6c6c',
    '--border-subtle': '#d8d8d8',
    '--border-strong': '#bcbcbc',
    '--accent-strong': '#111111',
    '--accent-contrast': '#f7f7f7',
    '--control-bg': '#f0f0f0',
    '--control-border': '#cccccc',
    '--control-focus': '#9c9c9c',
    '--interactive-hover': 'rgba(0, 0, 0, 0.08)',
    '--shadow-soft': 'rgba(0, 0, 0, 0.12)',
    '--shadow-strong': 'rgba(0, 0, 0, 0.18)',
    '--backdrop-mask': 'rgba(0, 0, 0, 0.45)',
    '--divider-subtle': 'rgba(0, 0, 0, 0.1)',
    '--badge-background': '#ededed',
    '--badge-border': '#c8c8c8',
    '--badge-text': '#2f2f2f',
    '--button-disabled-bg': 'rgba(0, 0, 0, 0.06)',
    '--button-disabled-text': 'rgba(17, 17, 17, 0.35)',
    '--input-placeholder': 'rgba(17, 17, 17, 0.45)',
  },
  dark: {
    '--bg-body': '#0d0d0d',
    '--bg-surface': '#151515',
    '--bg-elevated': '#1d1d1d',
    '--bg-subtle': '#121212',
    '--text-primary': '#f4f4f4',
    '--text-secondary': '#d0d0d0',
    '--text-muted': '#9a9a9a',
    '--border-subtle': '#272727',
    '--border-strong': '#3b3b3b',
    '--accent-strong': '#f5f5f5',
    '--accent-contrast': '#121212',
    '--control-bg': '#1d1d1d',
    '--control-border': '#323232',
    '--control-focus': '#4a4a4a',
    '--interactive-hover': 'rgba(255, 255, 255, 0.08)',
    '--shadow-soft': 'rgba(0, 0, 0, 0.55)',
    '--shadow-strong': 'rgba(0, 0, 0, 0.7)',
    '--backdrop-mask': 'rgba(0, 0, 0, 0.65)',
    '--divider-subtle': 'rgba(255, 255, 255, 0.08)',
    '--badge-background': '#1c1c1c',
    '--badge-border': '#343434',
    '--badge-text': '#e1e1e1',
    '--button-disabled-bg': 'rgba(255, 255, 255, 0.08)',
    '--button-disabled-text': 'rgba(244, 244, 244, 0.4)',
    '--input-placeholder': 'rgba(244, 244, 244, 0.45)',
  },
}

export function applyThemeTokens(target: HTMLElement, theme: 'light' | 'dark'): void {
  const tokens = THEME_TOKENS[theme]
  Object.entries(tokens).forEach(([key, value]) => {
    target.style.setProperty(key, value)
  })
}
