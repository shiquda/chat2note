// UI-only constants - DO NOT import in background scripts
import { IconBrandNotion, IconClipboardList, IconFileDownload, IconBook } from '@tabler/icons-react'
import type { AppConfig } from '../types/config'
import t from '../i18n'
import { IconJoplin, IconObsidian } from './custom-icons'

export type ExportTargetDefinition = {
  type: 'local' | 'notion' | 'clipboard' | 'obsidian' | 'siyuan' | 'joplin'
  label: string
  icon: React.ComponentType<{ className?: string; size?: number | string }>
  supportedFormats?: ReadonlyArray<'markdown' | 'json' | 'txt'>
}

export type ExportTargetId = ExportTargetDefinition['type']

export const EXPORT_TARGETS = [
  {
    type: 'local',
    get label() {
      return t('target_local')
    },
    icon: IconFileDownload,
  },
  {
    type: 'notion',
    get label() {
      return t('target_notion')
    },
    icon: IconBrandNotion,
  },
  {
    type: 'clipboard',
    get label() {
      return t('target_clipboard')
    },
    icon: IconClipboardList,
  },
  {
    type: 'obsidian',
    get label() {
      return t('target_obsidian')
    },
    icon: IconObsidian,
    supportedFormats: ['markdown'],
  },
  {
    type: 'siyuan',
    get label() {
      return t('target_siyuan')
    },
    icon: IconBook,
    supportedFormats: ['markdown'],
  },
  {
    type: 'joplin',
    get label() {
      return t('target_joplin')
    },
    icon: IconJoplin,
    supportedFormats: ['markdown'],
  },
] satisfies ReadonlyArray<ExportTargetDefinition>

export const NOTEBOOK_SOFTWARES = [
  {
    id: 'notion',
    name: 'Notion',
    configKey: 'notion' as const,
    icon: IconBrandNotion,
    supportedFormats: ['markdown', 'json', 'txt'] as const,
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    configKey: 'obsidian' as const,
    icon: IconObsidian,
    supportedFormats: ['markdown'] as const,
  },
  {
    id: 'siyuan',
    name: 'SiYuan',
    configKey: 'siyuan' as const,
    icon: IconBook,
    supportedFormats: ['markdown'] as const,
  },
  {
    id: 'joplin',
    name: 'Joplin',
    configKey: 'joplin' as const,
    icon: IconJoplin,
    supportedFormats: ['markdown'] as const,
  },
] satisfies ReadonlyArray<{
  id: string
  name: string
  configKey: keyof AppConfig
  icon: React.ComponentType<{ className?: string; size?: number | string }>
  supportedFormats?: ReadonlyArray<'markdown' | 'json' | 'txt'>
}>

export const EXPORT_FORMATS = [
  {
    type: 'markdown' as const,
    get label() {
      return t('format_markdown')
    },
    extension: 'md',
    mimeType: 'text/markdown',
  },
  {
    type: 'json' as const,
    get label() {
      return t('format_json')
    },
    extension: 'json',
    mimeType: 'application/json',
  },
  {
    type: 'txt' as const,
    get label() {
      return t('format_plain_text')
    },
    extension: 'txt',
    mimeType: 'text/plain',
  },
]

export const NOTION_CONFIG_HELP = {
  apiToken: {
    get label() {
      return t('notion_api_token')
    },
    get description() {
      return t('notion_api_token_description')
    },
    get placeholder() {
      return t('notion_api_token_placeholder')
    },
  },
  databaseId: {
    get label() {
      return t('notion_database_id')
    },
    get description() {
      return t('notion_database_id_description')
    },
    get placeholder() {
      return t('notion_database_id_placeholder')
    },
  },
}

export const EXPORT_CONFIG_HELP = {
  defaultFormat: {
    get label() {
      return t('export_default_format')
    },
    get description() {
      return t('export_default_format_description')
    },
  },
  defaultTarget: {
    get label() {
      return t('export_default_target')
    },
    get description() {
      return t('export_default_target_description')
    },
  },
  includeMetadata: {
    get label() {
      return t('include_metadata')
    },
    get description() {
      return t('export_include_metadata_description')
    },
  },
  defaultScope: {
    get label() {
      return t('export_default_scope')
    },
    get description() {
      return t('export_default_scope_description')
    },
  },
  fileNameTemplate: {
    get label() {
      return t('export_filename_template')
    },
    get description() {
      return t('export_filename_template_description')
    },
    get placeholder() {
      return t('export_filename_template_placeholder')
    },
  },
  markdownTemplate: {
    get label() {
      return t('export_markdown_template')
    },
    get description() {
      return t('export_markdown_template_description')
    },
    get placeholder() {
      return t('export_markdown_template_placeholder')
    },
  },
  messageTemplate: {
    get label() {
      return t('export_message_template')
    },
    get description() {
      return t('export_message_template_description')
    },
    get placeholder() {
      return t('export_message_template_placeholder')
    },
  },
  visibleTargets: {
    get label() {
      return t('export_visible_targets')
    },
    get description() {
      return t('export_visible_targets_description')
    },
  },
}
