import { useState, useEffect, useRef, useCallback } from 'react'
import type { ChangeEvent } from 'react'
import { IconLoader2, IconDeviceFloppy } from '@tabler/icons-react'
import type { AppConfig } from '../../src/types/config'
import { configStorage } from '../../src/config/storage'
import { CryptoUtils } from '../../src/utils/crypto'
import { NotionService } from '../../src/services/notion'
import { notificationBoard } from '../../src/services/notification-board'
import { DEFAULT_CONFIG } from '../../src/config/defaults'
import { applyThemePreference } from '../../src/utils/theme'
import { useTranslation } from '../../src/i18n/react'
import { initI18n } from '../../src/i18n'
import { setStoredLanguage } from '../../src/i18n/language-manager'
import Sidebar from './components/Sidebar'
import ContentArea from './components/ContentArea'
import { SiyuanService } from '../../src/services/siyuan'

const ENCRYPTED_PLACEHOLDER = '***encrypted***'
type ConnectionState = 'unknown' | 'connected' | 'disconnected'

type ConnectionStatus = {
  notion: ConnectionState
  obsidian: ConnectionState
  siyuan: ConnectionState
  joplin: ConnectionState
}

export default function Options() {
  const t = useTranslation()
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [activeSection, setActiveSection] = useState<string>('export')
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    notion: 'unknown',
    obsidian: 'unknown',
    siyuan: 'unknown',
    joplin: 'unknown',
  })
  const [hasRealToken, setHasRealToken] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const cleanup = applyThemePreference(config.appearance.theme)
    return cleanup
  }, [config.appearance.theme])

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true)
      const savedConfig = await configStorage.getConfig()
      if (savedConfig) {
        const mergedConfig = {
          ...DEFAULT_CONFIG,
          ...savedConfig,
        }
        setConfig(mergedConfig)
        await setStoredLanguage(mergedConfig.appearance.language, { silent: true })
      }

      const storedToken = await CryptoUtils.getApiToken()
      if (storedToken) {
        setHasRealToken(true)
        setConfig(prev => ({
          ...prev,
          notion: {
            ...prev.notion,
            apiToken: storedToken,
          },
        }))
      }

      const storedJoplinToken = await CryptoUtils.getJoplinApiToken()
      if (storedJoplinToken) {
        setConfig(prev => ({
          ...prev,
          joplin: {
            ...prev.joplin,
            apiToken: storedJoplinToken,
          },
        }))
      }

      setConnectionStatus({
        notion: savedConfig?.notion.enabled ? 'unknown' : 'disconnected',
        obsidian: savedConfig?.obsidian.enabled ? 'connected' : 'disconnected',
        siyuan: savedConfig?.siyuan.enabled ? 'unknown' : 'disconnected',
        joplin: savedConfig?.joplin?.enabled ? 'unknown' : 'disconnected',
      })
    } catch {
      notificationBoard.error(t('notification_settings_load_failed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    initI18n()
      .then(() => loadConfig())
      .catch(error => {
        console.error('Failed to initialize i18n:', error)
        loadConfig()
      })
  }, [loadConfig])

  const saveConfig = async () => {
    const savingNotice = notificationBoard.progress(t('notification_saving'))
    try {
      setSaving(true)

      const validation = await configStorage.validateConfig(config)
      if (!validation.isValid) {
        savingNotice.error(t('notification_validation_failed', [validation.errors.join(', ')]), {
          dismissible: true,
        })
        return
      }

      const apiTokenValue = config.notion.apiToken || ''
      const isPlaceholderToken = apiTokenValue === ENCRYPTED_PLACEHOLDER

      if (config.notion.enabled) {
        if (apiTokenValue && !isPlaceholderToken) {
          await CryptoUtils.storeApiToken(apiTokenValue)
          setHasRealToken(true)
        } else if (!apiTokenValue || (isPlaceholderToken && !hasRealToken)) {
          await CryptoUtils.clearApiToken()
          setHasRealToken(false)
        }
      } else {
        await CryptoUtils.clearApiToken()
        setHasRealToken(false)
      }

      const joplinApiToken = config.joplin?.apiToken || ''
      if (config.joplin?.enabled && joplinApiToken) {
        await CryptoUtils.storeJoplinApiToken(joplinApiToken)
      } else {
        await CryptoUtils.clearJoplinApiToken()
      }

      const configToSave = {
        ...config,
        notion: {
          ...config.notion,
          apiToken: config.notion.enabled ? ENCRYPTED_PLACEHOLDER : '',
        },
        joplin: {
          ...config.joplin,
          apiToken: '',
        },
      }

      await configStorage.saveConfig(configToSave)
      savingNotice.success(t('notification_settings_saved'))

      if (config.notion.enabled) {
        setConnectionStatus(prev => ({ ...prev, notion: 'unknown' }))
        void checkNotionConnection()
      } else {
        setConnectionStatus(prev => ({ ...prev, notion: 'disconnected' }))
      }

      setConnectionStatus(prev => ({
        ...prev,
        obsidian: config.obsidian.enabled ? 'connected' : 'disconnected',
      }))

      if (config.siyuan.enabled) {
        await checkSiyuanConnection()
      } else {
        setConnectionStatus(prev => ({ ...prev, siyuan: 'disconnected' }))
      }

      if (config.joplin?.enabled) {
        await checkJoplinConnection()
      } else {
        setConnectionStatus(prev => ({ ...prev, joplin: 'disconnected' }))
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      savingNotice.error(t('notification_settings_save_failed', [message]), {
        dismissible: true,
      })
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async (software: string) => {
    if (software === 'notion') {
      if (!config.notion.enabled || !config.notion.apiToken || !config.notion.databaseId) {
        notificationBoard.error(t('notification_notion_config_incomplete'))
        return
      }

      const testingNotice = notificationBoard.progress(t('notification_notion_testing'))
      try {
        setTesting(true)
        const service = new NotionService()
        await service.initialize({
          apiToken: config.notion.apiToken,
          databaseId: config.notion.databaseId,
        })
        const isConnected = await service.testConnection()
        setConnectionStatus(prev => ({
          ...prev,
          notion: isConnected ? 'connected' : 'disconnected',
        }))
        if (isConnected) {
          testingNotice.success(t('notification_notion_test_success'))
        } else {
          testingNotice.error(t('notification_notion_test_failed'), { dismissible: true })
        }
      } catch (error) {
        setConnectionStatus(prev => ({ ...prev, notion: 'disconnected' }))
        const message = error instanceof Error ? error.message : 'Unknown error'
        testingNotice.error(t('notification_connection_test_failed', [message]), {
          dismissible: true,
        })
      } finally {
        setTesting(false)
      }
      return
    }

    if (software === 'obsidian') {
      setConnectionStatus(prev => ({
        ...prev,
        obsidian: config.obsidian.enabled ? 'connected' : 'disconnected',
      }))
      notificationBoard.info(t('obsidian_connection_note'))
      return
    }

    if (software === 'siyuan') {
      if (
        !config.siyuan.enabled ||
        !config.siyuan.apiUrl ||
        !config.siyuan.apiToken ||
        !config.siyuan.notebookId
      ) {
        notificationBoard.error(t('notification_siyuan_config_incomplete'))
        return
      }

      const testingNotice = notificationBoard.progress(t('notification_siyuan_testing'))
      try {
        setTesting(true)
        const service = SiyuanService.create(config.siyuan)
        const isConnected = await service.testConnection()
        setConnectionStatus(prev => ({
          ...prev,
          siyuan: isConnected ? 'connected' : 'disconnected',
        }))
        if (isConnected) {
          testingNotice.success(t('notification_siyuan_test_success'))
        } else {
          testingNotice.error(t('notification_siyuan_test_failed'), { dismissible: true })
        }
      } catch (error) {
        setConnectionStatus(prev => ({ ...prev, siyuan: 'disconnected' }))
        const message = error instanceof Error ? error.message : 'Unknown error'
        testingNotice.error(t('notification_connection_test_failed', [message]), {
          dismissible: true,
        })
      } finally {
        setTesting(false)
      }
      return
    }

    if (software === 'joplin') {
      if (!config.joplin?.enabled || !config.joplin?.apiUrl || !config.joplin?.apiToken) {
        notificationBoard.error(t('notification_joplin_config_incomplete'))
        return
      }

      const testingNotice = notificationBoard.progress(t('notification_joplin_testing'))
      try {
        setTesting(true)
        const { JoplinService } = await import('../../src/services/joplin')
        const service = new JoplinService()
        await service.initialize({
          apiUrl: config.joplin.apiUrl,
          apiToken: config.joplin.apiToken,
          defaultNotebookId: config.joplin.defaultNotebookId,
          defaultTags: config.joplin.defaultTags,
        })
        const isConnected = await service.testConnection()
        setConnectionStatus(prev => ({
          ...prev,
          joplin: isConnected ? 'connected' : 'disconnected',
        }))
        if (isConnected) {
          testingNotice.success(t('notification_joplin_test_success'))
        } else {
          testingNotice.error(t('notification_joplin_test_failed'), { dismissible: true })
        }
      } catch (error) {
        setConnectionStatus(prev => ({ ...prev, joplin: 'disconnected' }))
        const message = error instanceof Error ? error.message : 'Unknown error'
        testingNotice.error(t('notification_connection_test_failed', [message]), {
          dismissible: true,
        })
      } finally {
        setTesting(false)
      }
    }
  }

  async function checkNotionConnection() {
    try {
      const service = await NotionService.createFromStorage()
      if (service) {
        const isConnected = await service.testConnection()
        setConnectionStatus(prev => ({
          ...prev,
          notion: isConnected ? 'connected' : 'disconnected',
        }))
      } else {
        setConnectionStatus(prev => ({ ...prev, notion: 'disconnected' }))
      }
    } catch {
      setConnectionStatus(prev => ({ ...prev, notion: 'disconnected' }))
    }
  }

  async function checkSiyuanConnection() {
    try {
      const service = await SiyuanService.createFromStorage()
      if (service) {
        const isConnected = await service.testConnection()
        setConnectionStatus(prev => ({
          ...prev,
          siyuan: isConnected ? 'connected' : 'disconnected',
        }))
      } else {
        setConnectionStatus(prev => ({ ...prev, siyuan: 'disconnected' }))
      }
    } catch {
      setConnectionStatus(prev => ({ ...prev, siyuan: 'disconnected' }))
    }
  }

  async function checkJoplinConnection() {
    try {
      const { JoplinService } = await import('../../src/services/joplin')
      const service = await JoplinService.createFromStorage()
      if (service) {
        const isConnected = await service.testConnection()
        setConnectionStatus(prev => ({
          ...prev,
          joplin: isConnected ? 'connected' : 'disconnected',
        }))
      } else {
        setConnectionStatus(prev => ({ ...prev, joplin: 'disconnected' }))
      }
    } catch {
      setConnectionStatus(prev => ({ ...prev, joplin: 'disconnected' }))
    }
  }

  const resetConfig = async () => {
    const confirmed = confirm(t('confirm_reset_settings'))
    if (!confirmed) return

    const resetNotice = notificationBoard.progress(t('notification_resetting'))
    try {
      await configStorage.resetConfig()
      await CryptoUtils.clearApiToken()
      await CryptoUtils.clearJoplinApiToken()
      setConfig(DEFAULT_CONFIG)
      setHasRealToken(false)
      setConnectionStatus({
        notion: 'disconnected',
        obsidian: 'disconnected',
        siyuan: 'disconnected',
        joplin: 'disconnected',
      })
      resetNotice.success(t('notification_settings_reset'))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      resetNotice.error(t('notification_reset_failed', [message]), { dismissible: true })
    }
  }

  const handleExportConfig = async () => {
    const includeSensitive = confirm(t('confirm_export_sensitive'))
    const exportingNotice = notificationBoard.progress(t('notification_exporting_config'))

    try {
      const serialized = (await configStorage.exportConfig({
        as: 'string',
        includeSensitive,
      })) as string

      const payload = JSON.parse(serialized)
      const exportedAt: string =
        typeof payload?.exportedAt === 'string' ? payload.exportedAt : new Date().toISOString()
      const safeTimestamp = exportedAt.replace(/[:.]/g, '-')
      const fileName = `chat2note-settings-${safeTimestamp}${includeSensitive ? '-sensitive' : ''}.json`

      const blob = new Blob([serialized], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = fileName
      anchor.rel = 'noopener'
      anchor.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 0)

      exportingNotice.success(
        t('notification_config_exported', [
          includeSensitive
            ? t('config_export_with_sensitive')
            : t('config_export_without_sensitive'),
          fileName,
        ])
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      exportingNotice.error(t('notification_export_config_failed', [message]), {
        dismissible: true,
      })
    }
  }

  const handleImportConfig = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const confirmed = confirm(t('confirm_import_config'))
    if (!confirmed) return

    const importingNotice = notificationBoard.progress(t('notification_importing_config'))
    try {
      const content = await file.text()
      const importedConfig = await configStorage.importConfig(content)
      setConfig(importedConfig)
      setConnectionStatus({
        notion: importedConfig.notion.enabled ? 'unknown' : 'disconnected',
        obsidian: importedConfig.obsidian.enabled ? 'connected' : 'disconnected',
        siyuan: importedConfig.siyuan.enabled ? 'unknown' : 'disconnected',
        joplin: importedConfig.joplin?.enabled ? 'unknown' : 'disconnected',
      })
      importingNotice.success(t('notification_config_imported'))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      importingNotice.error(t('notification_import_config_failed', [message]), {
        dismissible: true,
      })
    }
  }

  const updateConfig = (updates: Partial<AppConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }

  const handleImportButtonClick = () => {
    fileInputRef.current?.click()
  }

  useEffect(() => {
    const shouldForceMarkdown =
      config.export.defaultTarget === 'obsidian' && config.obsidian.strictMarkdown

    if (shouldForceMarkdown && config.export.defaultFormat !== 'markdown') {
      setConfig(prev => ({
        ...prev,
        export: { ...prev.export, defaultFormat: 'markdown' },
      }))
    }
  }, [config.export.defaultTarget, config.export.defaultFormat, config.obsidian.strictMarkdown])

  if (loading) {
    return (
      <div className="container">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <IconLoader2 className="icon spin" size={32} />
          <p>{t('loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        connectionStatus={connectionStatus}
      />

      <main className="content-area">
        <div className="content-container">
          <ContentArea
            activeSection={activeSection}
            config={config}
            onConfigUpdate={updateConfig}
            connectionStatus={connectionStatus}
            onResetConfig={resetConfig}
            onTestConnection={testConnection}
            onExportConfig={handleExportConfig}
            onImportClick={handleImportButtonClick}
            testing={testing}
            saving={saving}
          />
        </div>
      </main>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleImportConfig}
      />

      <div className="floating-save" aria-live="polite">
        <button
          type="button"
          className="button primary floating-save__button"
          onClick={saveConfig}
          disabled={saving}
        >
          {saving ? (
            <>
              <IconLoader2 className="icon spin" />
              <span>{t('saving')}</span>
            </>
          ) : (
            <>
              <IconDeviceFloppy className="icon" />
              <span>{t('save_settings')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
