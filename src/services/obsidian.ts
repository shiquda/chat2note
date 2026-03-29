import { ChatConversation } from '../types/chat'
import { ObsidianConfig } from '../types/config'
import { ExportOptions, ObsidianExportResult } from '../types/export'
import { configStorage } from '../config/storage'
import { generateConversationMarkdown, type ConversationMarkdownTemplates } from '../utils/markdown'
import { resolvePlatformLabel } from '../utils/platform'
import t from '../i18n'

// Conservative limit for Obsidian URI to avoid "URI malformed" errors
// Testing shows Obsidian has stricter limits than browsers
const MAX_OBSIDIAN_URI_LENGTH = 8000
const FALLBACK_NOTE_TITLE = 'Chat2Note Export'

function escapeYaml(value: string): string {
  return value.replace(/"/g, '\\"')
}

function sanitizeFileName(value: string): string {
  return value
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

function normalizeFolderPath(folderPath: string): string {
  if (!folderPath) return ''
  return folderPath.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '')
}

export class ObsidianService {
  private constructor(private readonly config: ObsidianConfig) {}

  static async createFromStorage(): Promise<ObsidianService | null> {
    const config = await configStorage.getConfig()
    if (!config?.obsidian || !config.obsidian.enabled) {
      return null
    }

    if (!config.obsidian.vaultName.trim()) {
      return null
    }

    return new ObsidianService(config.obsidian)
  }

  async exportConversation(
    conversation: ChatConversation,
    options: Pick<ExportOptions, 'includeMetadata' | 'format'> & {
      templates?: ConversationMarkdownTemplates
    } = {
      includeMetadata: true,
      format: 'markdown',
    }
  ): Promise<ObsidianExportResult> {
    if (!this.config.strictMarkdown && options.format && options.format !== 'markdown') {
      return {
        success: false,
        error: t('obsidian_format_required'),
        vault: this.config.vaultName,
      }
    }

    const folderPath = normalizeFolderPath(this.config.folderPath)
    const safeTitle = sanitizeFileName(conversation.title || FALLBACK_NOTE_TITLE)
    const fileName = `${safeTitle || FALLBACK_NOTE_TITLE}.md`
    const notePath = folderPath ? `${folderPath}/${fileName}` : fileName

    const markdownBody = generateConversationMarkdown(
      conversation,
      options.includeMetadata ?? true,
      options.templates
    )

    let fullContent = markdownBody
    if (this.config.includeYamlFrontmatter) {
      const platformLabel = resolvePlatformLabel(conversation)
      const frontmatterLines = [
        `title: "${escapeYaml(conversation.title || FALLBACK_NOTE_TITLE)}"`,
        `source: "${escapeYaml(conversation.url)}"`,
        `platform: "${escapeYaml(platformLabel)}"`,
        `exported_at: ${new Date().toISOString()}`,
      ]
      const frontmatter = `---\n${frontmatterLines.join('\n')}\n---\n\n`
      fullContent = `${frontmatter}${markdownBody}`
    }

    // Use clipboard approach like Cherry Studio to avoid URI length limits
    // Obsidian will read content from clipboard when &clipboard parameter is present
    const obsidianUri =
      `obsidian://new?vault=${encodeURIComponent(this.config.vaultName.trim())}` +
      `&file=${encodeURIComponent(notePath)}` +
      `&clipboard=true`

    console.log('[Obsidian] Generated URI (clipboard mode):', obsidianUri)
    console.log('[Obsidian] URI length:', obsidianUri.length)
    console.log('[Obsidian] Content length:', fullContent.length)
    console.log('[Obsidian] Vault:', this.config.vaultName)
    console.log('[Obsidian] Note path:', notePath)

    // URI should always be short now (no content in URI)
    if (obsidianUri.length > MAX_OBSIDIAN_URI_LENGTH) {
      return {
        success: false,
        error: 'Obsidian URI unexpectedly too long',
        vault: this.config.vaultName,
        notePath,
        data: { contentLength: fullContent.length },
      }
    }

    // Prepare URIs to be opened by content script
    const urisToOpen: string[] = []

    if (this.config.openMode !== 'none') {
      urisToOpen.push(obsidianUri)

      if (this.config.openMode === 'vault') {
        const openVaultUri = `obsidian://open?vault=${encodeURIComponent(
          this.config.vaultName.trim()
        )}`
        urisToOpen.push(openVaultUri)
      }
    }

    return {
      success: true,
      message: t('notification_export_obsidian_success', [notePath]),
      vault: this.config.vaultName,
      notePath,
      uri: obsidianUri,
      data: {
        contentLength: fullContent.length,
        uri: obsidianUri,
        urisToOpen,
        notePath,
        vault: this.config.vaultName,
        requiresContentScript: true,
        clipboardContent: fullContent, // Content to be copied to clipboard
      },
    }
  }
}
