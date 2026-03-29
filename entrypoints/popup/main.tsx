import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './style.css'
import { configStorage } from '../../src/config/storage'
import { DEFAULT_CONFIG } from '../../src/config/defaults'
import { resolveEffectiveTheme, applyResolvedTheme } from '../../src/utils/theme'
import { initI18n } from '../../src/i18n'

const initialTheme = resolveEffectiveTheme(DEFAULT_CONFIG.appearance.theme)
applyResolvedTheme(initialTheme)

void (async () => {
  try {
    // Initialize i18n system
    await initI18n()

    const stored = await configStorage.getConfig()
    if (stored?.appearance?.theme) {
      const resolved = resolveEffectiveTheme(stored.appearance.theme)
      applyResolvedTheme(resolved)
    }
  } catch (error) {
    console.error('Failed to apply stored theme preference:', error)
  }
})()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
