import {
  IconCircleCheck,
  IconFileDownload,
  IconSettings,
  IconLoader2,
  IconUpload,
  IconArrowBackUp,
  IconLicense,
  IconPalette,
  IconDeviceDesktop,
  IconSunHigh,
  IconMoonStars,
  IconWorld,
  IconBook,
  IconEye,
  IconEyeOff,
} from '@tabler/icons-react'
import {
  useMemo,
  useState,
  type ComponentType,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import { useTranslation } from '../../../src/i18n/react'
import { SELECTABLE_LANGUAGES, getLanguageNativeName } from '../../../src/i18n/supported-languages'
import { NOTEBOOK_SOFTWARES, EXPORT_TARGETS } from '../../../src/config/ui-constants'
import { DEFAULT_CONFIG } from '../../../src/config/defaults'
import type { AppConfig, NotionPropertyMappings } from '../../../src/types/config'
import { APP_VERSION } from '../../../src/utils/version'

interface OpenSourceLibrary {
  name: string
  version: string
  license: string
  link: string
}

const openSourceLibraries: OpenSourceLibrary[] = [
  { name: 'React', version: '19.1.1', license: 'MIT', link: 'https://github.com/facebook/react' },
  { name: 'WXT', version: '0.20.6', license: 'MIT', link: 'https://github.com/wxt-dev/wxt' },
  {
    name: '@tabler/icons-react',
    version: '3.35.0',
    license: 'MIT',
    link: 'https://github.com/tabler/tabler-icons',
  },
  {
    name: '@tryfabric/martian',
    version: '1.2.4',
    license: 'MIT',
    link: 'https://github.com/tryfabric/martian',
  },
  {
    name: 'crypto-js',
    version: '4.2.0',
    license: 'MIT',
    link: 'https://github.com/brix/crypto-js',
  },
]

interface ContentAreaProps {
  activeSection: string
  config: AppConfig
  onConfigUpdate: (updates: Partial<AppConfig>) => void
  connectionStatus: {
    notion: 'unknown' | 'connected' | 'disconnected'
    obsidian: 'unknown' | 'connected' | 'disconnected'
    siyuan: 'unknown' | 'connected' | 'disconnected'
    joplin: 'unknown' | 'connected' | 'disconnected'
  }
  onResetConfig: () => void
  onTestConnection: (software: string) => void
  onExportConfig: () => void
  onImportClick: () => void
  testing: boolean
  saving: boolean
}

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className'>

function PasswordInput({ id, ...props }: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className="password-input" data-password-input-id={id}>
      <input {...props} id={id} type={isVisible ? 'text' : 'password'} className="form-control" />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setIsVisible(prev => !prev)}
        aria-label={isVisible ? 'Hide value' : 'Show value'}
      >
        {isVisible ? <IconEyeOff size={18} /> : <IconEye size={18} />}
      </button>
    </div>
  )
}

function Panel({
  title,
  icon: Icon,
  actions,
  children,
}: {
  title: string
  icon: ComponentType<{ className?: string; size?: number | string }>
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="content-panel">
      <div className="panel-header">
        <Icon className="panel-icon" />
        <h2 className="panel-title">{title}</h2>
        {actions}
      </div>
      <div className="panel-content">{children}</div>
    </div>
  )
}

export default function ContentArea({
  activeSection,
  config,
  onConfigUpdate,
  connectionStatus,
  onResetConfig,
  onTestConnection,
  onExportConfig,
  onImportClick,
  testing,
  saving,
}: ContentAreaProps) {
  const t = useTranslation()

  const targetOptions = useMemo(
    () => EXPORT_TARGETS.filter(target => config.export.visibleTargets.includes(target.type)),
    [config.export.visibleTargets]
  )

  const updateNotionPropertyMapping = (
    key: keyof NotionPropertyMappings,
    updates: Partial<import('../../../src/types/config').NotionPropertyConfig>
  ) => {
    const currentMappings =
      config.notion.propertyMappings || DEFAULT_CONFIG.notion.propertyMappings!
    const currentProperty = currentMappings[key]
    onConfigUpdate({
      notion: {
        ...config.notion,
        propertyMappings: {
          ...currentMappings,
          [key]: { ...currentProperty, ...updates },
        },
      },
    })
  }

  const renderExport = () => (
    <Panel title={t('export_settings')} icon={IconFileDownload}>
      <div className="form-group">
        <label htmlFor="default-format">{t('export_default_format')}</label>
        <select
          id="default-format"
          className="form-control"
          value={config.export.defaultFormat}
          onChange={e =>
            onConfigUpdate({
              export: {
                ...config.export,
                defaultFormat: e.target.value as AppConfig['export']['defaultFormat'],
              },
            })
          }
        >
          <option value="markdown">Markdown (.md)</option>
          <option value="json">JSON (.json)</option>
          <option value="txt">Plain Text (.txt)</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="default-target">{t('export_default_target')}</label>
        <select
          id="default-target"
          className="form-control"
          value={config.export.defaultTarget}
          onChange={e =>
            onConfigUpdate({
              export: {
                ...config.export,
                defaultTarget: e.target.value as AppConfig['export']['defaultTarget'],
              },
            })
          }
        >
          {EXPORT_TARGETS.map(target => (
            <option key={target.type} value={target.type}>
              {target.label}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="default-scope">{t('export_default_scope')}</label>
        <select
          id="default-scope"
          className="form-control"
          value={config.export.defaultScope}
          onChange={e =>
            onConfigUpdate({
              export: {
                ...config.export,
                defaultScope: e.target.value as AppConfig['export']['defaultScope'],
              },
            })
          }
        >
          <option value="all">{t('scope_all')}</option>
          <option value="selected">{t('scope_selected')}</option>
        </select>
      </div>

      <div className="form-section">
        <h3 className="section-title">{t('export_advanced_options')}</h3>

        <div className="form-group checkbox-group">
          <input
            type="checkbox"
            id="include-metadata"
            checked={config.export.includeMetadata}
            onChange={e =>
              onConfigUpdate({
                export: { ...config.export, includeMetadata: e.target.checked },
              })
            }
          />
          <div>
            <label htmlFor="include-metadata">{t('include_metadata')}</label>
            <p className="description">{t('export_include_metadata_description')}</p>
          </div>
        </div>
      </div>

      <div className="form-group checkbox-group">
        <p>{t('export_visible_targets')}</p>
        <div className="checkbox-grid">
          {EXPORT_TARGETS.map(target => {
            const checked = config.export.visibleTargets.includes(target.type)
            return (
              <label key={target.type} className="checkbox-group">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={e => {
                    const nextTargets = e.target.checked
                      ? [...config.export.visibleTargets, target.type]
                      : config.export.visibleTargets.filter(item => item !== target.type)
                    onConfigUpdate({
                      export: {
                        ...config.export,
                        visibleTargets: nextTargets.length ? nextTargets : ['local'],
                      },
                    })
                  }}
                />
                <span>{target.label}</span>
              </label>
            )
          })}
        </div>
      </div>

      <div className="form-section">
        <h3 className="section-title">{t('export_template_settings')}</h3>

        <div className="form-group">
          <label htmlFor="filename-template">{t('export_filename_template')}</label>
          <input
            id="filename-template"
            className="form-control"
            value={config.export.fileNameTemplate}
            onChange={e =>
              onConfigUpdate({
                export: { ...config.export, fileNameTemplate: e.target.value },
              })
            }
          />
        </div>

        <div className="form-group">
          <label htmlFor="markdown-template">{t('export_markdown_template')}</label>
          <textarea
            id="markdown-template"
            className="form-control"
            rows={8}
            value={config.export.markdownTemplate}
            onChange={e =>
              onConfigUpdate({
                export: { ...config.export, markdownTemplate: e.target.value },
              })
            }
          />
        </div>

        <div className="form-group">
          <label htmlFor="message-template">{t('export_message_template')}</label>
          <textarea
            id="message-template"
            className="form-control"
            rows={8}
            value={config.export.messageTemplate}
            onChange={e =>
              onConfigUpdate({
                export: { ...config.export, messageTemplate: e.target.value },
              })
            }
          />
        </div>
      </div>
    </Panel>
  )

  const renderNotion = () => (
    <Panel
      title="Notion"
      icon={NOTEBOOK_SOFTWARES.find(s => s.id === 'notion')!.icon}
      actions={
        <span className={`status ${connectionStatus.notion}`}>{connectionStatus.notion}</span>
      }
    >
      <div className="form-group checkbox-group">
        <input
          type="checkbox"
          id="notion-enabled"
          checked={config.notion.enabled}
          onChange={e =>
            onConfigUpdate({ notion: { ...config.notion, enabled: e.target.checked } })
          }
        />
        <label htmlFor="notion-enabled">{t('notion_enable')}</label>
      </div>
      <div className="form-group">
        <label htmlFor="notion-api-token">{t('notion_api_token')}</label>
        <PasswordInput
          id="notion-api-token"
          value={config.notion.apiToken}
          onChange={e => onConfigUpdate({ notion: { ...config.notion, apiToken: e.target.value } })}
        />
      </div>
      <div className="form-group">
        <label htmlFor="notion-database-id">{t('notion_database_id')}</label>
        <input
          id="notion-database-id"
          className="form-control"
          value={config.notion.databaseId}
          onChange={e =>
            onConfigUpdate({ notion: { ...config.notion, databaseId: e.target.value } })
          }
        />
      </div>
      <div className="form-group checkbox-group">
        <input
          type="checkbox"
          id="notion-include-properties"
          checked={config.notion.includeProperties}
          onChange={e =>
            onConfigUpdate({ notion: { ...config.notion, includeProperties: e.target.checked } })
          }
        />
        <label htmlFor="notion-include-properties">{t('notion_include_properties')}</label>
      </div>
      <p className="help-text">{t('notion_include_properties_description')}</p>
      {config.notion.includeProperties && (
        <>
          {(['url', 'exportedAt', 'platform', 'messageCount', 'tags'] as const).map(key => (
            <div className="form-group" key={key}>
              <p>{key}</p>
              <div className="checkbox-group">
                <input
                  type="checkbox"
                  checked={config.notion.propertyMappings?.[key].enabled ?? true}
                  onChange={e => updateNotionPropertyMapping(key, { enabled: e.target.checked })}
                />
                <input
                  className="form-control"
                  value={config.notion.propertyMappings?.[key].propertyName ?? ''}
                  onChange={e => updateNotionPropertyMapping(key, { propertyName: e.target.value })}
                />
              </div>
            </div>
          ))}
        </>
      )}
      <button
        type="button"
        className="button"
        onClick={() => onTestConnection('notion')}
        disabled={testing || !config.notion.apiToken || !config.notion.databaseId}
      >
        {testing ? <IconLoader2 className="icon spin" /> : <IconCircleCheck className="icon" />}
        <span>{t('notion_test_connection')}</span>
      </button>
    </Panel>
  )

  const renderObsidian = () => (
    <Panel title="Obsidian" icon={NOTEBOOK_SOFTWARES.find(s => s.id === 'obsidian')!.icon}>
      <div className="form-group checkbox-group">
        <input
          type="checkbox"
          id="obsidian-enabled"
          checked={config.obsidian.enabled}
          onChange={e =>
            onConfigUpdate({ obsidian: { ...config.obsidian, enabled: e.target.checked } })
          }
        />
        <label htmlFor="obsidian-enabled">{t('obsidian_enable')}</label>
      </div>
      <div className="form-group">
        <label htmlFor="obsidian-vault-name">{t('obsidian_vault_name_label')}</label>
        <input
          id="obsidian-vault-name"
          className="form-control"
          value={config.obsidian.vaultName}
          onChange={e =>
            onConfigUpdate({ obsidian: { ...config.obsidian, vaultName: e.target.value } })
          }
        />
      </div>
      <div className="form-group">
        <label htmlFor="obsidian-folder-path">{t('obsidian_vault_folder_label')}</label>
        <input
          id="obsidian-folder-path"
          className="form-control"
          value={config.obsidian.folderPath}
          onChange={e =>
            onConfigUpdate({ obsidian: { ...config.obsidian, folderPath: e.target.value } })
          }
        />
      </div>
      <div className="form-group">
        <label htmlFor="obsidian-open-mode">{t('obsidian_open_mode_label')}</label>
        <select
          id="obsidian-open-mode"
          className="form-control"
          value={config.obsidian.openMode}
          onChange={e =>
            onConfigUpdate({
              obsidian: {
                ...config.obsidian,
                openMode: e.target.value as AppConfig['obsidian']['openMode'],
              },
            })
          }
        >
          <option value="note">{t('obsidian_open_mode_note')}</option>
          <option value="vault">{t('obsidian_open_mode_app')}</option>
          <option value="none">{t('obsidian_open_mode_none')}</option>
        </select>
      </div>
      <div className="form-group checkbox-group">
        <input
          type="checkbox"
          id="obsidian-strict-markdown"
          checked={config.obsidian.strictMarkdown}
          onChange={e =>
            onConfigUpdate({
              obsidian: { ...config.obsidian, strictMarkdown: e.target.checked },
            })
          }
        />
        <label htmlFor="obsidian-strict-markdown">{t('obsidian_enforce_markdown_label')}</label>
      </div>
      <div className="form-group checkbox-group">
        <input
          type="checkbox"
          id="obsidian-frontmatter"
          checked={config.obsidian.includeYamlFrontmatter}
          onChange={e =>
            onConfigUpdate({
              obsidian: { ...config.obsidian, includeYamlFrontmatter: e.target.checked },
            })
          }
        />
        <label htmlFor="obsidian-frontmatter">{t('obsidian_include_yaml_frontmatter_label')}</label>
      </div>
      <button
        type="button"
        className="button"
        onClick={() => onTestConnection('obsidian')}
        disabled={testing}
      >
        {testing ? <IconLoader2 className="icon spin" /> : <IconCircleCheck className="icon" />}
        <span>{t('obsidian_settings')}</span>
      </button>
    </Panel>
  )

  const renderSiyuan = () => (
    <Panel title="SiYuan" icon={NOTEBOOK_SOFTWARES.find(s => s.id === 'siyuan')!.icon}>
      <div className="form-group checkbox-group">
        <input
          type="checkbox"
          id="siyuan-enabled"
          checked={config.siyuan.enabled}
          onChange={e =>
            onConfigUpdate({ siyuan: { ...config.siyuan, enabled: e.target.checked } })
          }
        />
        <label htmlFor="siyuan-enabled">{t('siyuan_enable')}</label>
      </div>
      <div className="form-group">
        <label htmlFor="siyuan-api-url">{t('siyuan_api_url')}</label>
        <input
          id="siyuan-api-url"
          className="form-control"
          value={config.siyuan.apiUrl}
          onChange={e => onConfigUpdate({ siyuan: { ...config.siyuan, apiUrl: e.target.value } })}
        />
      </div>
      <div className="form-group">
        <label htmlFor="siyuan-api-token">{t('siyuan_api_token')}</label>
        <PasswordInput
          id="siyuan-api-token"
          value={config.siyuan.apiToken}
          onChange={e => onConfigUpdate({ siyuan: { ...config.siyuan, apiToken: e.target.value } })}
        />
      </div>
      <div className="form-group">
        <label htmlFor="siyuan-notebook-id">{t('siyuan_notebook_id')}</label>
        <input
          id="siyuan-notebook-id"
          className="form-control"
          value={config.siyuan.notebookId}
          onChange={e =>
            onConfigUpdate({ siyuan: { ...config.siyuan, notebookId: e.target.value } })
          }
        />
      </div>
      <div className="form-group">
        <label htmlFor="siyuan-folder-path">{t('siyuan_folder_path')}</label>
        <input
          id="siyuan-folder-path"
          className="form-control"
          value={config.siyuan.folderPath}
          onChange={e =>
            onConfigUpdate({ siyuan: { ...config.siyuan, folderPath: e.target.value } })
          }
        />
      </div>
      <button
        type="button"
        className="button"
        onClick={() => onTestConnection('siyuan')}
        disabled={
          testing || !config.siyuan.apiUrl || !config.siyuan.apiToken || !config.siyuan.notebookId
        }
      >
        {testing ? <IconLoader2 className="icon spin" /> : <IconCircleCheck className="icon" />}
        <span>{t('siyuan_test_connection')}</span>
      </button>
    </Panel>
  )

  const renderJoplin = () => (
    <Panel title="Joplin" icon={NOTEBOOK_SOFTWARES.find(s => s.id === 'joplin')!.icon}>
      <div className="form-group checkbox-group">
        <input
          type="checkbox"
          id="joplin-enabled"
          checked={config.joplin.enabled}
          onChange={e =>
            onConfigUpdate({ joplin: { ...config.joplin, enabled: e.target.checked } })
          }
        />
        <label htmlFor="joplin-enabled">{t('joplin_enable')}</label>
      </div>
      <div className="form-group">
        <label htmlFor="joplin-api-url">{t('joplin_api_url')}</label>
        <input
          id="joplin-api-url"
          className="form-control"
          value={config.joplin.apiUrl}
          onChange={e => onConfigUpdate({ joplin: { ...config.joplin, apiUrl: e.target.value } })}
        />
      </div>
      <div className="form-group">
        <label htmlFor="joplin-api-token">{t('joplin_api_token')}</label>
        <PasswordInput
          id="joplin-api-token"
          value={config.joplin.apiToken}
          onChange={e => onConfigUpdate({ joplin: { ...config.joplin, apiToken: e.target.value } })}
        />
      </div>
      <div className="form-group">
        <label htmlFor="joplin-notebook-id">{t('joplin_notebook_id')}</label>
        <input
          id="joplin-notebook-id"
          className="form-control"
          value={config.joplin.defaultNotebookId}
          onChange={e =>
            onConfigUpdate({ joplin: { ...config.joplin, defaultNotebookId: e.target.value } })
          }
        />
      </div>
      <button
        type="button"
        className="button"
        onClick={() => onTestConnection('joplin')}
        disabled={testing || !config.joplin.apiUrl || !config.joplin.apiToken}
      >
        {testing ? <IconLoader2 className="icon spin" /> : <IconCircleCheck className="icon" />}
        <span>{t('joplin_test_connection')}</span>
      </button>
    </Panel>
  )

  const renderAppearance = () => (
    <Panel title={t('appearance')} icon={IconPalette}>
      <p className="help-text">{t('appearance_description')}</p>

      <div className="form-group">
        <p className="group-label">{t('theme')}</p>
        <div className="theme-options">
          {[
            {
              value: 'system',
              label: t('theme_system'),
              desc: t('theme_system_desc'),
              icon: IconDeviceDesktop,
            },
            {
              value: 'light',
              label: t('theme_light'),
              desc: t('theme_light_desc'),
              icon: IconSunHigh,
            },
            {
              value: 'dark',
              label: t('theme_dark'),
              desc: t('theme_dark_desc'),
              icon: IconMoonStars,
            },
          ].map(theme => (
            <button
              key={theme.value}
              type="button"
              className={`theme-option ${config.appearance.theme === theme.value ? 'selected' : ''}`}
              onClick={() =>
                onConfigUpdate({
                  appearance: {
                    ...config.appearance,
                    theme: theme.value as AppConfig['appearance']['theme'],
                  },
                })
              }
              aria-pressed={config.appearance.theme === theme.value}
            >
              <theme.icon className="icon theme-option-icon" aria-hidden="true" />
              <span className="theme-label">{theme.label}</span>
              <span className="theme-description">{theme.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="language-select">{t('language_settings')}</label>
        <select
          id="language-select"
          className="form-control"
          value={config.appearance.language}
          onChange={e =>
            onConfigUpdate({
              appearance: {
                ...config.appearance,
                language: e.target.value as AppConfig['appearance']['language'],
              },
            })
          }
        >
          <option value="auto">{t('language_auto')}</option>
          {SELECTABLE_LANGUAGES.map(language => (
            <option key={language} value={language}>
              {getLanguageNativeName(language)}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="floating-button-position">{t('floating_button_position')}</label>
        <p className="description">{t('floating_button_position_description')}</p>
        <select
          id="floating-button-position"
          className="form-control"
          value={config.appearance.floatingButtonPosition}
          onChange={e =>
            onConfigUpdate({
              appearance: {
                ...config.appearance,
                floatingButtonPosition: e.target
                  .value as AppConfig['appearance']['floatingButtonPosition'],
              },
            })
          }
        >
          <option value="top-right">{t('floating_button_position_top_right')}</option>
          <option value="middle-right">{t('floating_button_position_middle_right')}</option>
          <option value="bottom-right">{t('floating_button_position_bottom_right')}</option>
          <option value="bottom-left">{t('floating_button_position_bottom_left')}</option>
          <option value="middle-left">{t('floating_button_position_middle_left')}</option>
          <option value="top-left">{t('floating_button_position_top_left')}</option>
          <option value="hidden">{t('floating_button_position_hidden')}</option>
        </select>
      </div>
    </Panel>
  )

  const renderAdvanced = () => (
    <Panel title={t('advanced_settings')} icon={IconSettings}>
      <div className="button-group">
        <button type="button" className="button" onClick={onExportConfig} disabled={saving}>
          <IconUpload className="icon" />
          <span>{t('export_settings')}</span>
        </button>
        <button type="button" className="button" onClick={onImportClick} disabled={saving}>
          <IconArrowBackUp className="icon" />
          <span>{t('import_settings')}</span>
        </button>
        <button type="button" className="button danger" onClick={onResetConfig} disabled={saving}>
          <IconDeviceDesktop className="icon" />
          <span>{t('reset_settings')}</span>
        </button>
      </div>
    </Panel>
  )

  const renderAbout = () => (
    <Panel title={t('about_nav')} icon={IconBook}>
      <p>Chat2Note OSS snapshot</p>
      <p>Version: {APP_VERSION}</p>
      <p>Focus: local-first export from AI chat tools to Markdown, JSON, TXT, and note apps.</p>
      <div className="checkbox-grid">
        <span>
          <IconSunHigh size={16} /> Light/Dark themes
        </span>
        <span>
          <IconMoonStars size={16} /> Selection export
        </span>
        <span>
          <IconWorld size={16} /> Multi-language UI
        </span>
      </div>
    </Panel>
  )

  const renderOpenSource = () => (
    <Panel title={t('open_source_nav')} icon={IconLicense}>
      <div className="form-group">
        <p>Enabled export targets</p>
        <ul>
          {targetOptions.map(target => (
            <li key={target.type}>{target.label}</li>
          ))}
        </ul>
      </div>
      <div className="form-group">
        <p>Bundled libraries</p>
        <ul>
          {openSourceLibraries.map(library => (
            <li key={library.name}>
              <a href={library.link} target="_blank" rel="noreferrer">
                {library.name}
              </a>{' '}
              · {library.version} · {library.license}
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  )

  switch (activeSection) {
    case 'notion':
      return renderNotion()
    case 'obsidian':
      return renderObsidian()
    case 'siyuan':
      return renderSiyuan()
    case 'joplin':
      return renderJoplin()
    case 'appearance':
      return renderAppearance()
    case 'advanced':
      return renderAdvanced()
    case 'about':
      return renderAbout()
    case 'open-source':
      return renderOpenSource()
    case 'export':
    default:
      return renderExport()
  }
}
