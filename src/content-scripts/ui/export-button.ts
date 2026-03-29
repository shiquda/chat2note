import type { ChatConversation } from '../../types/chat'
import type { ExportOptions } from '../../types/export'
import type { ExportTargetDefinition } from '../../config/ui-constants'
import type { FloatingButtonPosition } from '../../types/config'
import { MessageSelectionManager } from './selection-manager'
import { MessagePreviewCard } from './preview-card'
import { createIcon, getMainButtonIcon } from '../utils/icons'
import { notificationBoard } from '../../services/notification-board'
import t from '../../i18n'

export interface ExportButtonConfig {
  containerId: string
  siteName: string
  exportTargets: ExportTargetDefinition[]
  selectionManager: MessageSelectionManager
  previewCard: MessagePreviewCard
  cachedDefaultOptions: ExportOptions
  getConversation: () => Promise<{ conversation: ChatConversation | null; error?: string }>
  sendExportRequest: (conversation: ChatConversation, options: ExportOptions) => Promise<any>
  floatingButtonPosition: FloatingButtonPosition
}

/**
 * Export button UI manager
 * Handles button creation, panel management, and export flow
 */
export class ExportButton {
  private config: ExportButtonConfig
  private container: HTMLElement
  private mainButton: HTMLButtonElement
  private optionsPanel: HTMLElement
  private isPanelOpen = false
  private currentScope: ExportOptions['scope'] = 'all'
  private scopeButtons: Record<'all' | 'selected', HTMLButtonElement>
  private placementClass?: string

  constructor(config: ExportButtonConfig) {
    this.config = config
    this.currentScope = config.cachedDefaultOptions.scope ?? 'all'
    config.selectionManager.setScope(this.currentScope)
    // Create main container
    this.container = this.createContainer()

    // Create main button
    this.mainButton = this.createMainButton()

    // Create options panel with scope buttons and export targets
    const { panel, scopeButtons } = this.createOptionsPanel()
    this.optionsPanel = panel
    this.scopeButtons = scopeButtons

    // Assemble UI
    this.container.appendChild(this.mainButton)
    this.container.appendChild(this.optionsPanel)

    // Setup event listeners
    this.setupEventListeners()

    // Apply initial placement configuration
    this.setPlacement(config.floatingButtonPosition)
  }

  private createContainer(): HTMLElement {
    const container = document.createElement('div')
    container.id = this.config.containerId
    container.className = 'chat2note-export'
    container.setAttribute('role', 'region')
    container.setAttribute('aria-label', `Chat2Note export controls for ${this.config.siteName}`)
    return container
  }

  private createMainButton(): HTMLButtonElement {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'chat2note-main-button'
    const label = t('export_button')
    button.title = label
    button.setAttribute('aria-label', label)
    button.innerHTML = getMainButtonIcon()
    const srLabel = document.createElement('span')
    srLabel.className = 'chat2note-sr-only'
    srLabel.textContent = label
    button.appendChild(srLabel)
    return button
  }

  private createOptionsPanel(): {
    panel: HTMLElement
    scopeButtons: Record<'all' | 'selected', HTMLButtonElement>
  } {
    const panel = document.createElement('div')
    panel.className = 'chat2note-options-panel'
    panel.setAttribute('role', 'menu')
    panel.setAttribute('aria-hidden', 'true')

    // Create scope toggle group
    const { group, buttons } = this.createScopeToggleGroup()
    panel.appendChild(group)

    // Create export target buttons
    this.config.exportTargets.forEach(target => {
      const targetButton = this.createExportTargetButton(target)
      panel.appendChild(targetButton)
    })

    return { panel, scopeButtons: buttons }
  }

  private createScopeToggleGroup(): {
    group: HTMLElement
    buttons: Record<'all' | 'selected', HTMLButtonElement>
  } {
    const group = document.createElement('div')
    group.className = 'chat2note-scope-group'

    const allButton = this.createScopeButton('all', t('scope_all'))
    const selectedButton = this.createScopeButton('selected', t('scope_selected'))

    group.appendChild(allButton)
    group.appendChild(selectedButton)

    return {
      group,
      buttons: { all: allButton, selected: selectedButton },
    }
  }

  private createScopeButton(scope: ExportOptions['scope'], label: string): HTMLButtonElement {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'chat2note-scope-button'
    button.textContent = label
    button.addEventListener('click', event => {
      event.preventDefault()
      if (this.currentScope === scope) {
        return
      }
      this.currentScope = scope ?? 'all'
      this.config.selectionManager.setScope(this.currentScope)
      this.updateScopeButtons()
    })
    return button
  }

  private createExportTargetButton(target: ExportTargetDefinition): HTMLButtonElement {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'chat2note-option-button'
    button.setAttribute('role', 'menuitem')
    button.setAttribute('data-target', target.type)
    button.setAttribute('aria-label', t('aria_export_to', [target.label]))

    // Create icon container with SVG
    const iconContainer = document.createElement('span')
    iconContainer.className = 'chat2note-option-icon'
    iconContainer.setAttribute('aria-hidden', 'true')
    iconContainer.appendChild(createIcon(target.type))

    // Create label
    const label = document.createElement('span')
    label.className = 'chat2note-option-label'
    label.textContent = target.label

    button.appendChild(iconContainer)
    button.appendChild(label)

    button.addEventListener('click', event => {
      event.preventDefault()
      this.closePanel()
      void this.runExportFlow({ target: target.type })
    })

    button.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        this.closePanel()
        this.mainButton.focus()
      }
    })

    return button
  }

  private setupEventListeners() {
    // Main button click
    this.mainButton.addEventListener('click', () => {
      this.closePanel()
      void this.runExportFlow()
    })

    // Main button keyboard navigation
    this.mainButton.addEventListener('keydown', (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        this.openPanel()
        const firstOption = this.optionsPanel.querySelector<HTMLButtonElement>('button')
        firstOption?.focus()
      } else if (event.key === 'Escape') {
        event.preventDefault()
        this.closePanel()
      }
    })

    // Hover to open panel
    this.mainButton.addEventListener('mouseenter', () => this.openPanel())
    this.container.addEventListener('mouseleave', () => this.closePanel())

    // Focus management
    this.container.addEventListener('focusin', () => this.openPanel())
    this.container.addEventListener('focusout', (event: FocusEvent) => {
      const nextTarget = event.relatedTarget as Node | null
      if (nextTarget && this.container.contains(nextTarget)) {
        return
      }
      this.closePanel()
    })

    // Update scope buttons on mount
    this.updateScopeButtons()
  }

  private openPanel() {
    if (this.isPanelOpen) return
    this.isPanelOpen = true
    this.container.classList.add('chat2note-open')
    this.optionsPanel.setAttribute('aria-hidden', 'false')
  }

  private closePanel() {
    if (!this.isPanelOpen) return
    this.isPanelOpen = false
    this.container.classList.remove('chat2note-open')
    this.optionsPanel.setAttribute('aria-hidden', 'true')
  }

  private updateScopeButtons() {
    ;(['all', 'selected'] as const).forEach(scope => {
      const button = this.scopeButtons[scope]
      button.classList.toggle('chat2note-scope-button-active', this.currentScope === scope)
    })
  }

  private async runExportFlow(overrides?: Partial<ExportOptions>) {
    const resolvedScope = overrides?.scope ?? this.currentScope

    // Get conversation data
    const { conversation, error } = await this.config.getConversation()
    if (!conversation) {
      const message = error ?? t('error_no_conversation_generic')
      notificationBoard.error(message)
      return
    }

    // Show preview card in "selected" mode
    if (resolvedScope === 'selected') {
      console.log('[Export] Showing preview card with', conversation.messages.length, 'messages')
      this.config.previewCard.show(
        conversation.messages,
        async selectedIndices => {
          console.log('[Export] Preview card confirmed with indices:', selectedIndices)
          // Execute export after user confirmation
          if (selectedIndices.length === 0) {
            notificationBoard.info(t('notification_export_selection_empty'))
            return
          }

          // Filter selected messages
          const filteredMessages = conversation.messages.filter((_, index) =>
            selectedIndices.includes(index)
          )

          console.log('[Export] Filtered messages count:', filteredMessages.length)

          const conversationToExport: ChatConversation = {
            ...conversation,
            messages: filteredMessages,
          }

          const options: ExportOptions = {
            ...this.config.cachedDefaultOptions,
            scope: 'selected',
            ...overrides,
          }

          if (options.target === 'obsidian') {
            options.format = 'markdown'
          }

          if (typeof options.includeMetadata !== 'boolean') {
            options.includeMetadata = this.config.cachedDefaultOptions.includeMetadata ?? true
          }

          console.log(
            '[' + this.config.siteName + '] Extracted conversation:',
            conversationToExport
          )
          console.log('[' + this.config.siteName + '] Export options:', options)
          const progressNotice = notificationBoard.progress(t('notification_exporting'))

          try {
            console.log('[Export] Sending export request...')
            const response = await this.config.sendExportRequest(conversationToExport, options)
            console.log('[Export] Export response:', response)

            if (response?.success) {
              const message = response.result?.message ?? t('notification_export_success_generic')
              const linkOptions =
                options.target === 'notion' && response.result?.pageUrl
                  ? {
                      label: t('notification_view_in_notion'),
                      href: response.result.pageUrl,
                    }
                  : undefined
              progressNotice.success(message, linkOptions ? { link: linkOptions } : undefined)
            } else {
              const errorMessage = response?.result?.error ?? t('notification_export_failed')
              progressNotice.error(errorMessage, { dismissible: true })
            }
          } catch (error) {
            console.error('[Export] Export error:', error)
            const message = error instanceof Error ? error.message : t('error_unknown')
            progressNotice.error(t('notification_export_failed_with_reason', { reason: message }), {
              dismissible: true,
            })
          }
        },
        () => {
          // User cancelled
          console.log('[' + this.config.siteName + '] Export cancelled by user')
        }
      )
    } else {
      // "All" mode - direct export
      const options: ExportOptions = {
        ...this.config.cachedDefaultOptions,
        scope: 'all',
        ...overrides,
      }

      if (options.target === 'obsidian') {
        options.format = 'markdown'
      }

      if (typeof options.includeMetadata !== 'boolean') {
        options.includeMetadata = this.config.cachedDefaultOptions.includeMetadata ?? true
      }

      console.log('[' + this.config.siteName + '] Extracted conversation:', conversation)
      const progressNotice = notificationBoard.progress(t('notification_exporting'))

      try {
        const response = await this.config.sendExportRequest(conversation, options)

        if (response?.success) {
          const message = response.result?.message ?? t('notification_export_success_generic')
          const linkOptions =
            options.target === 'notion' && response.result?.pageUrl
              ? {
                  label: t('notification_view_in_notion'),
                  href: response.result.pageUrl,
                }
              : undefined
          progressNotice.success(message, linkOptions ? { link: linkOptions } : undefined)
        } else {
          const errorMessage = response?.result?.error ?? t('notification_export_failed')
          progressNotice.error(errorMessage, { dismissible: true })
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : t('error_unknown')
        progressNotice.error(t('notification_export_failed_with_reason', { reason: message }), {
          dismissible: true,
        })
      }
    }
  }

  /**
   * Get the container element to append to document
   */
  getElement(): HTMLElement {
    return this.container
  }

  setPlacement(position: FloatingButtonPosition) {
    if (this.placementClass) {
      this.container.classList.remove(this.placementClass)
    }
    this.container.classList.remove('chat2note-hidden')

    if (position === 'hidden') {
      this.container.classList.add('chat2note-hidden')
      this.container.setAttribute('aria-hidden', 'true')
      this.closePanel()
      this.placementClass = undefined
      return
    }

    const newClass = `chat2note-position-${position}`
    this.placementClass = newClass
    this.container.classList.add(newClass)
    this.container.setAttribute('aria-hidden', 'false')
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container)
    }
  }
}
