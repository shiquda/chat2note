import { useState, useEffect } from 'react'
import {
  IconBrandNotion,
  IconClipboardList,
  IconFileDownload,
  IconFileText,
  IconInfoCircle,
  IconLoader2,
  IconSettings,
  IconShare,
} from '@tabler/icons-react'
import { IconObsidian } from '../../src/config/custom-icons'
import { ExportOptions } from '../../src/types/export'
import type { AppConfig } from '../../src/types/config'
import { configStorage, CONFIG_STORAGE_KEY } from '../../src/config/storage'
import { DEFAULT_CONFIG } from '../../src/config/defaults'
import {
  EXPORT_TARGETS,
  EXPORT_FORMATS,
  type ExportTargetDefinition,
} from '../../src/config/ui-constants'
import { notificationBoard } from '../../src/services/notification-board'
import { migrateConfig } from '../../src/config/serializer'
import { applyThemePreference } from '../../src/utils/theme'
import { useTranslation } from '../../src/i18n/react'
import './App.css'

const SUPPORTED_HOST_SNIPPETS = ['chat.openai.com', 'chatgpt.com', 'claude.ai', 'chat.deepseek.com']

function App() {
  const t = useTranslation()
  const [isActiveTab, setIsActiveTab] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: DEFAULT_CONFIG.export.defaultFormat,
    target: DEFAULT_CONFIG.export.defaultTarget,
    includeMetadata: DEFAULT_CONFIG.export.includeMetadata,
    scope: DEFAULT_CONFIG.export.defaultScope,
  })
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [themePreference, setThemePreference] = useState<AppConfig['appearance']['theme']>(
    DEFAULT_CONFIG.appearance.theme
  )
  const [obsidianStrict, setObsidianStrict] = useState(DEFAULT_CONFIG.obsidian.strictMarkdown)

  useEffect(() => {
    checkActiveTab()
    loadDefaultOptions()
  }, [])

  useEffect(() => {
    const cleanup = applyThemePreference(themePreference)
    return cleanup
  }, [themePreference])

  useEffect(() => {
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName !== 'sync') return
      const updated = changes[CONFIG_STORAGE_KEY]?.newValue
      if (!updated) return

      try {
        const nextConfig = migrateConfig(updated)
        setThemePreference(nextConfig.appearance.theme)
        setObsidianStrict(nextConfig.obsidian?.strictMarkdown ?? true)
        setExportOptions({
          format:
            nextConfig.export.defaultTarget === 'obsidian'
              ? 'markdown'
              : nextConfig.export.defaultFormat,
          target: nextConfig.export.defaultTarget,
          includeMetadata: nextConfig.export.includeMetadata,
        })
      } catch (error) {
        console.error('Error applying updated configuration:', error)
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
    return () => chrome.storage.onChanged.removeListener(handleStorageChange)
  }, [])

  const checkActiveTab = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    const isSupported =
      !!tab.url && SUPPORTED_HOST_SNIPPETS.some(hostSnippet => tab.url!.includes(hostSnippet))
    setIsActiveTab(isSupported)
  }

  const loadDefaultOptions = async () => {
    try {
      const config = await configStorage.getConfig()
      if (config) {
        setExportOptions({
          format:
            config.export.defaultTarget === 'obsidian' ? 'markdown' : config.export.defaultFormat,
          target: config.export.defaultTarget,
          includeMetadata: config.export.includeMetadata,
          scope: config.export.defaultScope ?? 'all',
        })
        setThemePreference(config.appearance?.theme ?? DEFAULT_CONFIG.appearance.theme)
        setObsidianStrict(config.obsidian?.strictMarkdown ?? true)
      }
    } catch (error) {
      console.error('Error loading default options:', error)
    }
  }

  useEffect(() => {
    if (
      exportOptions.target === 'obsidian' &&
      obsidianStrict &&
      exportOptions.format !== 'markdown'
    ) {
      setExportOptions(prev => ({ ...prev, format: 'markdown' }))
    }
  }, [exportOptions.target, exportOptions.format, obsidianStrict])

  const handleExport = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })

    if (!tab?.id) {
      notificationBoard.error(t('error_no_active_tab'))
      return
    }

    setExporting(true)
    const progressNotice = notificationBoard.progress(t('notification_exporting'))

    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'EXPORT_FROM_POPUP',
        options: exportOptions,
      })

      if (response?.success) {
        const targetLabel =
          EXPORT_TARGETS.find((t: ExportTargetDefinition) => t.type === exportOptions.target)
            ?.label ?? exportOptions.target
        const formatLabel =
          EXPORT_FORMATS.find(
            (f: (typeof EXPORT_FORMATS)[number]) => f.type === exportOptions.format
          )?.label ?? exportOptions.format
        const message =
          response.result?.message ?? t('notification_export_success', [targetLabel, formatLabel])
        const linkLabel = isNotionAvailable
          ? t('notification_view_in_notion')
          : isObsidianTarget
            ? t('notification_open_in_obsidian')
            : undefined
        const linkHref = isObsidianTarget
          ? (response.result?.uri ?? response.result?.pageUrl)
          : response.result?.pageUrl
        const linkOptions =
          linkLabel && linkHref
            ? {
                link: {
                  label: linkLabel,
                  href: linkHref,
                },
              }
            : undefined
        setExporting(false)
        progressNotice.success(message, linkOptions)
      } else {
        const errorMessage = response?.result?.error ?? t('notification_export_failed')
        progressNotice.error(errorMessage, { dismissible: true })
      }
    } catch (error) {
      console.error('Error exporting:', error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      progressNotice.error(t('notification_export_failed') + ': ' + message, {
        dismissible: true,
      })
    } finally {
      setExporting(false)
    }
  }

  const openOptions = () => {
    // 获取扩展的URL并在新标签页中打开options页面
    const optionsUrl = chrome.runtime.getURL('options.html')
    chrome.tabs.create({ url: optionsUrl })
  }

  const updateExportOption = <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => {
    setExportOptions(prev => {
      const next: ExportOptions = { ...prev, [key]: value }
      if (key === 'target' && value === 'obsidian' && obsidianStrict) {
        next.format = 'markdown'
      }
      if (
        key === 'format' &&
        prev.target === 'obsidian' &&
        obsidianStrict &&
        value !== 'markdown'
      ) {
        next.format = 'markdown'
      }
      return next
    })
  }

  const isNotionAvailable = exportOptions.target === 'notion'
  const isObsidianTarget = exportOptions.target === 'obsidian'

  return (
    <div className="app">
      <div className="header">
        <h1>{t('app_name')}</h1>
        <p className="subtitle">{t('app_subtitle')}</p>
      </div>

      <div className="content">
        {!isActiveTab ? (
          <div className="error">
            <p>{t('error_not_supported_page')}</p>
          </div>
        ) : (
          <div className="export-section">
            {/* Export options */}
            <div className="export-options">
              <div className="option-group">
                <label>{t('export_destination')}</label>
                <select
                  value={exportOptions.target}
                  onChange={e =>
                    updateExportOption('target', e.target.value as ExportOptions['target'])
                  }
                  disabled={exporting}
                >
                  {EXPORT_TARGETS.map((target: ExportTargetDefinition) => (
                    <option key={target.type} value={target.type}>
                      {target.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="option-group">
                <label>{t('file_format')}</label>
                <select
                  value={exportOptions.format}
                  onChange={e =>
                    updateExportOption('format', e.target.value as ExportOptions['format'])
                  }
                  disabled={exporting || (isObsidianTarget && obsidianStrict)}
                >
                  {EXPORT_FORMATS.map((format: (typeof EXPORT_FORMATS)[number]) => (
                    <option
                      key={format.type}
                      value={format.type}
                      disabled={isObsidianTarget && obsidianStrict && format.type !== 'markdown'}
                    >
                      {format.label} (.{format.extension})
                    </option>
                  ))}
                </select>
                {isObsidianTarget && obsidianStrict && (
                  <p
                    style={{ fontSize: '12px', color: 'var(--text-muted, #666)', marginTop: '4px' }}
                  >
                    {t('obsidian_format_locked')}
                  </p>
                )}
              </div>

              <div className="option-group">
                <label>{t('export_scope')}</label>
                <select
                  value={exportOptions.scope ?? 'all'}
                  onChange={e =>
                    updateExportOption('scope', e.target.value as ExportOptions['scope'])
                  }
                  disabled={exporting}
                >
                  <option value="all">{t('scope_all')}</option>
                  <option value="selected">{t('scope_selected')}</option>
                </select>
              </div>

              <button className="advanced-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
                {showAdvanced ? t('advanced_options_hide') : t('advanced_options_show')}
              </button>
            </div>

            {/* Advanced options */}
            {showAdvanced && (
              <div className="advanced-options">
                <div className="checkbox-group">
                  <input
                    type="checkbox"
                    id="include-metadata"
                    checked={exportOptions.includeMetadata}
                    onChange={e => updateExportOption('includeMetadata', e.target.checked)}
                    disabled={exporting}
                  />
                  <label htmlFor="include-metadata">{t('include_metadata')}</label>
                </div>
              </div>
            )}

            {/* Export button */}
            <button onClick={handleExport} className="export-button" disabled={exporting}>
              {exporting ? (
                <>
                  <IconLoader2 className="icon spin" aria-hidden />
                  <span>{t('exporting')}</span>
                </>
              ) : (
                <>
                  <IconShare className="icon" aria-hidden />
                  <span>{t('export_button')}</span>
                  {isNotionAvailable && (
                    <IconBrandNotion className="icon" aria-hidden aria-label="Notion" />
                  )}
                  {isObsidianTarget && (
                    <IconObsidian className="icon" aria-hidden aria-label="Obsidian" />
                  )}
                </>
              )}
            </button>

            {/* Notion configuration hint */}
            {isNotionAvailable && (
              <div className="notion-hint">
                <p>
                  <IconInfoCircle className="icon" aria-hidden />
                  <span>{t('notion_hint')}</span>
                </p>
                <button onClick={openOptions} className="settings-button">
                  <IconSettings className="icon" aria-hidden />
                  <span>{t('open_settings')}</span>
                </button>
              </div>
            )}
            {isObsidianTarget && (
              <div className="notion-hint">
                <p>
                  <IconInfoCircle className="icon" aria-hidden />
                  <span>{t('obsidian_target_hint')}</span>
                </p>
                <button onClick={openOptions} className="settings-button">
                  <IconSettings className="icon" aria-hidden />
                  <span>{t('open_settings')}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* How-to guide */}
        <div className="info">
          <h3>{t('how_to_use')}</h3>
          <ol>
            <li>{t('how_to_step1')}</li>
            <li>{t('how_to_step2')}</li>
            <li>{t('how_to_step3')}</li>
            <li>{t('how_to_step4')}</li>
          </ol>

          <div className="feature-list">
            <h4>{t('available_features')}</h4>
            <ul>
              <li>
                <IconFileDownload className="icon" aria-hidden />
                <span>{t('feature_local_download')}</span>
              </li>
              <li>
                <IconBrandNotion className="icon" aria-hidden />
                <span>{t('feature_notion_integration')}</span>
              </li>
              <li>
                <IconClipboardList className="icon" aria-hidden />
                <span>{t('feature_clipboard')}</span>
              </li>
              <li>
                <IconFileText className="icon" aria-hidden />
                <span>{t('feature_multiple_formats')}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Settings button */}
        <div className="settings-section">
          <button onClick={openOptions} className="settings-button">
            <IconSettings className="icon" aria-hidden />
            <span>{t('open_settings')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
