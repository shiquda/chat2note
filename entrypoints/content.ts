import { defineContentScript } from '#imports'
import { ParserRegistry } from '../src/content-scripts/parsers/registry'
import { notificationBoard } from '../src/services/notification-board'
import { DEFAULT_CONFIG } from '../src/config/defaults'
import { EXPORT_TARGETS } from '../src/config/ui-constants'
import { configStorage, CONFIG_STORAGE_KEY } from '../src/config/storage'
import { migrateConfig } from '../src/config/serializer'
import { applyThemePreference, applyThemeTokens } from '../src/utils/theme'
import { MessageSelectionManager } from '../src/content-scripts/ui/selection-manager'
import { MessagePreviewCard } from '../src/content-scripts/ui/preview-card'
import { ExportButton } from '../src/content-scripts/ui/export-button'
import { generateStyles } from '../src/content-scripts/ui/styles'
import { fetchDefaultExportOptions } from '../src/content-scripts/utils/config-sync'
import { ExportHandler } from '../src/content-scripts/handlers/export-handler'
import { createMessageListener } from '../src/content-scripts/handlers/message-handler'
import t, { initI18n } from '../src/i18n'
import type { ChatConversation } from '../src/types/chat'

type CleanupHandle = () => void

declare global {
  interface Window {
    __chat2noteCleanup?: CleanupHandle
  }
}

const DEFAULT_STYLE_ID = 'chat2note-export-style'
const CONTAINER_ID = 'chat2note-export-container'

export default defineContentScript({
  matches: [
    '*://chat.openai.com/*',
    '*://chatgpt.com/*',
    '*://claude.ai/*',
    '*://chat.deepseek.com/*',
    '*://gemini.google.com/*',
    '*://kimi.com/*',
    '*://www.kimi.com/*',
    '*://yuanbao.tencent.com/*',
    '*://doubao.com/*',
    '*://www.doubao.com/*',
    '*://grok.com/*',
    '*://www.grok.com/*',
  ],
  main() {
    void (async () => {
      console.log('Chat2Note content script loaded')

      // Cleanup previous instance if exists
      const previousCleanup = window.__chat2noteCleanup
      if (typeof previousCleanup === 'function') {
        try {
          previousCleanup()
        } catch (error) {
          console.error('Chat2Note: cleanup error from previous instance', error)
        }
      }

      const cleanupCallbacks: CleanupHandle[] = []
      const registerCleanup = (callback: CleanupHandle) => {
        cleanupCallbacks.push(callback)
      }
      const cleanup = () => {
        while (cleanupCallbacks.length > 0) {
          const callback = cleanupCallbacks.pop()
          if (!callback) continue
          try {
            callback()
          } catch (error) {
            console.error('Chat2Note: cleanup error', error)
          }
        }
        if (window.__chat2noteCleanup === cleanup) {
          delete window.__chat2noteCleanup
        }
      }
      window.__chat2noteCleanup = cleanup

      // Check if current page is supported
      if (!ParserRegistry.isCurrentPageSupported()) {
        console.log('Chat2Note: Current page is not supported')
        cleanup()
        return
      }

      const parser = ParserRegistry.getCurrentParser()
      if (!parser) {
        console.warn('Chat2Note: Unable to resolve parser for supported page')
        cleanup()
        return
      }

      const siteName = parser.getSiteName()
      console.log(`Chat2Note: Detected ${siteName} page`)

      await initI18n()

      // Fetch default export options
      const defaultExportOptions = await fetchDefaultExportOptions()
      const cachedDefaultOptions = { ...defaultExportOptions }
      cachedDefaultOptions.scope = cachedDefaultOptions.scope ?? 'all'

      // Get configuration
      const storedConfig = await configStorage.getConfig()
      const visibleTargets =
        storedConfig?.export?.visibleTargets ?? DEFAULT_CONFIG.export.visibleTargets
      const filteredExportTargets = EXPORT_TARGETS.filter(target =>
        visibleTargets.includes(target.type)
      )
      const themePreference = storedConfig?.appearance?.theme ?? DEFAULT_CONFIG.appearance.theme
      const floatingButtonPosition =
        storedConfig?.appearance?.floatingButtonPosition ??
        DEFAULT_CONFIG.appearance.floatingButtonPosition

      // Initialize UI components
      const selectionManager = new MessageSelectionManager()
      selectionManager.setScope(cachedDefaultOptions.scope ?? 'all')
      registerCleanup(() => selectionManager.destroy())

      const previewCard = new MessagePreviewCard(selectionManager)
      registerCleanup(() => previewCard.hide())

      // Inject styles
      const styleContent = generateStyles(CONTAINER_ID)
      const existingStyle = document.getElementById(DEFAULT_STYLE_ID)
      if (existingStyle) {
        existingStyle.remove()
      }

      const styleElement = document.createElement('style')
      styleElement.id = DEFAULT_STYLE_ID
      styleElement.textContent = styleContent
      document.head.appendChild(styleElement)
      registerCleanup(() => {
        if (styleElement.parentNode) {
          styleElement.parentNode.removeChild(styleElement)
        }
      })

      // Helper functions for export
      const getConversation = async (): Promise<{
        conversation: ChatConversation | null
        error?: string
        handled?: boolean
      }> => {
        try {
          const conversation = await parser.extractConversation()
          if (!conversation) {
            const errorMessage = t('error_no_conversation', { site: siteName })
            notificationBoard.error(errorMessage)
            return { conversation: null, error: errorMessage, handled: true }
          }

          return { conversation }
        } catch (error) {
          const message = error instanceof Error ? error.message : t('error_unknown')
          const errorMessage = t('error_extract_conversation', { error: message })
          notificationBoard.error(errorMessage)
          return { conversation: null, error: errorMessage, handled: true }
        }
      }

      const sendExportRequest = async (conversation: ChatConversation, options: any) => {
        return chrome.runtime.sendMessage({
          type: 'EXPORT_CONVERSATION',
          data: conversation,
          options,
          site: siteName,
        })
      }

      // Create export button UI
      const exportButton = new ExportButton({
        containerId: CONTAINER_ID,
        siteName,
        exportTargets: filteredExportTargets,
        selectionManager,
        previewCard,
        cachedDefaultOptions,
        getConversation,
        sendExportRequest,
        floatingButtonPosition,
      })

      const exportButtonElement = exportButton.getElement()

      // Apply theme to the actual button element
      let disposeTheme = applyThemePreference(themePreference, exportButtonElement, {
        onResolved: resolved => {
          applyThemeTokens(exportButtonElement, resolved)
          exportButtonElement.style.colorScheme = resolved
        },
      })
      registerCleanup(() => disposeTheme())

      // Listen for theme changes
      const handleThemeStorageChange = (
        changes: { [key: string]: chrome.storage.StorageChange },
        areaName: string
      ) => {
        if (areaName !== 'sync') return
        const updated = changes[CONFIG_STORAGE_KEY]?.newValue
        if (!updated) return

        try {
          const migrated = migrateConfig(updated)
          exportButton.setPlacement(
            migrated.appearance.floatingButtonPosition ??
              DEFAULT_CONFIG.appearance.floatingButtonPosition
          )
          disposeTheme()
          disposeTheme = applyThemePreference(migrated.appearance.theme, exportButtonElement, {
            onResolved: resolved => {
              applyThemeTokens(exportButtonElement, resolved)
              exportButtonElement.style.colorScheme = resolved
            },
          })
        } catch (error) {
          console.error('Chat2Note: failed to apply updated theme', error)
        }
      }

      chrome.storage.onChanged.addListener(handleThemeStorageChange)
      registerCleanup(() => chrome.storage.onChanged.removeListener(handleThemeStorageChange))

      // Append button to document
      document.body.appendChild(exportButtonElement)
      registerCleanup(() => exportButton.destroy())

      // Create export handler
      const exportHandler = new ExportHandler(
        selectionManager,
        cachedDefaultOptions,
        siteName,
        getConversation
      )

      // Setup message listener for popup and context menu
      const messageListener = createMessageListener(exportHandler)
      chrome.runtime.onMessage.addListener(messageListener)
      registerCleanup(() => chrome.runtime.onMessage.removeListener(messageListener))

      console.log(`Chat2Note: Initialized for ${siteName} with floating export controls`)
    })()
  },
})
