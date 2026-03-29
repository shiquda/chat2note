// Core configuration defaults - safe for background scripts
// DO NOT import React or UI libraries here
import type { AppConfig, NotionPropertyMappings } from '../types/config'
import { APP_VERSION } from '../utils/version'
import { DEFAULT_MARKDOWN_TEMPLATE, DEFAULT_MESSAGE_TEMPLATE } from '../utils/markdown'

export const DEFAULT_NOTION_PROPERTY_MAPPINGS: NotionPropertyMappings = {
  url: {
    enabled: true,
    propertyName: 'Source URL',
    fallbackNames: ['URL', 'Source', 'Link'],
  },
  exportedAt: {
    enabled: true,
    propertyName: 'Exported At',
    fallbackNames: ['Created', 'Date', 'Export Date', 'Exported at'],
  },
  platform: {
    enabled: true,
    propertyName: 'Platform',
    fallbackNames: ['Source Platform', 'AI Platform'],
  },
  messageCount: {
    enabled: true,
    propertyName: 'Message Count',
    fallbackNames: ['Messages', 'Total Messages', 'Count'],
  },
  tags: {
    enabled: true,
    propertyName: 'Tags',
    fallbackNames: ['Tag', 'Labels', 'Label', 'Categories', '标签'],
  },
}

export const DEFAULT_CONFIG: AppConfig = {
  version: APP_VERSION,
  notion: {
    apiToken: '',
    databaseId: '',
    enabled: false,
    propertyMappings: DEFAULT_NOTION_PROPERTY_MAPPINGS,
    includeProperties: true, // 默认导出属性
  },
  obsidian: {
    enabled: false,
    vaultName: '',
    folderPath: '',
    openMode: 'note',
    strictMarkdown: true,
    includeYamlFrontmatter: false,
  },
  siyuan: {
    enabled: false,
    apiUrl: '',
    apiToken: '',
    notebookId: '',
    folderPath: '',
    setBlockAttributes: true,
  },
  joplin: {
    enabled: false,
    apiUrl: 'http://127.0.0.1:41184',
    apiToken: '',
    defaultNotebookId: '',
    defaultTags: [],
    includeMetadata: true,
    authMethod: 'manual',
  },
  export: {
    defaultFormat: 'markdown',
    defaultTarget: 'local',
    includeMetadata: true,
    defaultScope: 'selected',
    fileNameTemplate: '{{title}}_{{date}}',
    markdownTemplate: DEFAULT_MARKDOWN_TEMPLATE,
    messageTemplate: DEFAULT_MESSAGE_TEMPLATE,
    visibleTargets: ['local', 'notion', 'clipboard', 'obsidian', 'siyuan', 'joplin'],
  },
  appearance: {
    theme: 'system',
    language: 'auto',
    floatingButtonPosition: 'top-right',
  },
}
