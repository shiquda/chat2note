import type { ChatMessage } from '../../types/chat'
import t, { getCurrentLocale } from '../../i18n'
import { MessageSelectionManager } from './selection-manager'
import { applyThemeTokens } from '../../utils/theme'

type ToolbarIconPath = {
  d: string
  attrs?: Record<string, string>
}

const TOOLBAR_ICONS: Record<'selectAll' | 'deselectAll' | 'selectAssistant', ToolbarIconPath[]> = {
  selectAll: [
    { d: 'M0 0h24v24H0z', attrs: { stroke: 'none', fill: 'none' } },
    { d: 'M7 12l5 5l10 -10' },
    { d: 'M2 12l5 5m5 -5l5 -5' },
  ],
  deselectAll: [
    { d: 'M0 0h24v24H0z', attrs: { stroke: 'none', fill: 'none' } },
    { d: 'M10 10l4 4m0 -4l-4 4' },
    { d: 'M12 3c7.2 0 9 1.8 9 9s-1.8 9 -9 9s-9 -1.8 -9 -9s1.8 -9 9 -9z' },
  ],
  selectAssistant: [
    { d: 'M0 0h24v24H0z', attrs: { stroke: 'none', fill: 'none' } },
    { d: 'M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2z' },
    { d: 'M9 16c1 .667 2 1 3 1s2 -.333 3 -1' },
    { d: 'M9 7l-1 -4' },
    { d: 'M15 7l1 -4' },
    { d: 'M9 12v-1' },
    { d: 'M15 12v-1' },
  ],
}

/**
 * Preview card component
 * Displays message list and supports multi-selection
 */
export class MessagePreviewCard {
  private static readonly PREVIEW_CARD_ID = 'chat2note-preview-card'
  private static readonly MESSAGE_COLLAPSE_THRESHOLD = 100

  private container: HTMLElement | null = null
  private messages: ChatMessage[] = []
  private expandedIndices = new Set<number>()
  private onConfirm: ((selectedIndices: number[]) => void) | null = null
  private onCancel: (() => void) | null = null
  private selectionManager: MessageSelectionManager

  constructor(selectionManager: MessageSelectionManager) {
    this.selectionManager = selectionManager
  }

  show(
    messages: ChatMessage[],
    onConfirm: (selectedIndices: number[]) => void,
    onCancel: () => void
  ): void {
    this.messages = messages
    this.onConfirm = onConfirm
    this.onCancel = onCancel
    this.expandedIndices.clear()

    // Select all by default
    this.selectionManager.selectAll(messages.length)

    this.render()

    // Apply theme tokens to preview card for proper styling
    this.applyThemeToPreviewCard()
  }

  hide(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container)
    }
    this.container = null
    this.messages = []
    this.expandedIndices.clear()
    this.onConfirm = null
    this.onCancel = null
  }

  private render(): void {
    // Remove existing card
    const existing = document.getElementById(MessagePreviewCard.PREVIEW_CARD_ID)
    if (existing) {
      existing.remove()
    }

    // Create modal container
    this.container = document.createElement('div')
    this.container.id = MessagePreviewCard.PREVIEW_CARD_ID
    this.container.className = 'chat2note-preview-modal'
    this.container.setAttribute('role', 'dialog')
    this.container.setAttribute('aria-modal', 'true')
    this.container.setAttribute('aria-labelledby', 'chat2note-preview-title')

    // Create backdrop
    const backdrop = document.createElement('div')
    backdrop.className = 'chat2note-preview-backdrop'
    backdrop.addEventListener('click', () => this.handleCancel())

    // Create card content
    const card = document.createElement('div')
    card.className = 'chat2note-preview-card'
    card.addEventListener('click', e => e.stopPropagation())

    // Title
    const header = document.createElement('div')
    header.className = 'chat2note-preview-header'
    const title = document.createElement('h2')
    title.id = 'chat2note-preview-title'
    title.className = 'chat2note-preview-title'
    title.textContent = t('preview_title_select_messages')
    header.appendChild(title)

    // Toolbar (select all/deselect all)
    const toolbar = document.createElement('div')
    toolbar.className = 'chat2note-preview-toolbar'

    const selectAllBtn = this.createToolbarButton(
      t('preview_select_all'),
      TOOLBAR_ICONS.selectAll,
      () => this.handleSelectAll()
    )

    const selectAssistantBtn = this.createToolbarButton(
      t('preview_select_assistant'),
      TOOLBAR_ICONS.selectAssistant,
      () => this.handleSelectAssistant()
    )

    const deselectAllBtn = this.createToolbarButton(
      t('preview_deselect_all'),
      TOOLBAR_ICONS.deselectAll,
      () => this.handleDeselectAll()
    )

    toolbar.appendChild(selectAllBtn)
    toolbar.appendChild(selectAssistantBtn)
    toolbar.appendChild(deselectAllBtn)

    // Message list container
    const messageList = document.createElement('div')
    messageList.className = 'chat2note-preview-messages'

    const localeTag = (getCurrentLocale() || navigator.language || 'en-US').replace('_', '-')

    this.messages.forEach((message, index) => {
      const messageItem = this.createMessageItem(message, index, localeTag)
      messageList.appendChild(messageItem)
    })

    // Footer buttons
    const footer = document.createElement('div')
    footer.className = 'chat2note-preview-footer'

    const cancelBtn = document.createElement('button')
    cancelBtn.type = 'button'
    cancelBtn.className = 'chat2note-preview-btn chat2note-preview-btn-cancel'
    cancelBtn.textContent = t('preview_cancel')
    cancelBtn.addEventListener('click', () => this.handleCancel())

    const confirmBtn = document.createElement('button')
    confirmBtn.type = 'button'
    confirmBtn.className = 'chat2note-preview-btn chat2note-preview-btn-confirm'
    confirmBtn.textContent = t('preview_confirm')
    confirmBtn.addEventListener('click', () => this.handleConfirm())

    footer.appendChild(cancelBtn)
    footer.appendChild(confirmBtn)

    // Assemble card
    card.appendChild(header)
    card.appendChild(toolbar)
    card.appendChild(messageList)
    card.appendChild(footer)

    // Assemble modal
    this.container.appendChild(backdrop)
    this.container.appendChild(card)

    // Add to page
    document.body.appendChild(this.container)

    // Prevent background scrolling
    document.body.style.overflow = 'hidden'
  }

  private createMessageItem(message: ChatMessage, index: number, localeTag: string): HTMLElement {
    const item = document.createElement('div')
    item.className = 'chat2note-preview-message-item'
    item.setAttribute('data-index', index.toString())

    // Checkbox
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.className = 'chat2note-preview-checkbox'
    checkbox.checked = this.selectionManager.isSelected(index)
    checkbox.addEventListener('change', () => {
      this.selectionManager.toggleSelection(index)
    })

    // Message header (role + icon)
    const messageHeader = document.createElement('div')
    messageHeader.className = 'chat2note-preview-message-header'

    const roleIcon = document.createElement('span')
    roleIcon.className = `chat2note-preview-role-icon chat2note-preview-role-${message.role}`
    roleIcon.innerHTML = this.getRoleIcon(message.role)

    const roleLabel = document.createElement('span')
    roleLabel.className = 'chat2note-preview-role-label'
    roleLabel.textContent =
      message.role === 'user' ? t('preview_role_user') : t('preview_role_assistant')

    const timestamp = document.createElement('span')
    timestamp.className = 'chat2note-preview-timestamp'
    timestamp.textContent = new Date(message.timestamp).toLocaleTimeString(localeTag, {
      hour: '2-digit',
      minute: '2-digit',
    })

    messageHeader.appendChild(roleIcon)
    messageHeader.appendChild(roleLabel)
    messageHeader.appendChild(timestamp)

    // Message content
    const contentWrapper = document.createElement('div')
    contentWrapper.className = 'chat2note-preview-message-content'

    const needsCollapse = message.content.length > MessagePreviewCard.MESSAGE_COLLAPSE_THRESHOLD
    const isExpanded = this.expandedIndices.has(index)

    const content = document.createElement('div')
    content.className = 'chat2note-preview-content-text'

    if (needsCollapse && !isExpanded) {
      content.textContent =
        message.content.slice(0, MessagePreviewCard.MESSAGE_COLLAPSE_THRESHOLD) + '...'
    } else {
      content.textContent = message.content
    }

    contentWrapper.appendChild(content)

    // Collapse/expand button
    if (needsCollapse) {
      const toggleBtn = document.createElement('button')
      toggleBtn.type = 'button'
      toggleBtn.className = 'chat2note-preview-toggle-btn'
      toggleBtn.textContent = isExpanded ? t('preview_toggle_collapse') : t('preview_toggle_expand')
      toggleBtn.addEventListener('click', () => {
        if (this.expandedIndices.has(index)) {
          this.expandedIndices.delete(index)
        } else {
          this.expandedIndices.add(index)
        }
        this.updateMessageItem(item, message, index)
      })
      contentWrapper.appendChild(toggleBtn)
    }

    // Assemble message item
    const messageContent = document.createElement('div')
    messageContent.className = 'chat2note-preview-message-main'
    messageContent.appendChild(messageHeader)
    messageContent.appendChild(contentWrapper)

    item.appendChild(checkbox)
    item.appendChild(messageContent)

    return item
  }

  private updateMessageItem(item: HTMLElement, message: ChatMessage, index: number): void {
    const isExpanded = this.expandedIndices.has(index)
    const content = item.querySelector('.chat2note-preview-content-text')
    const toggleBtn = item.querySelector('.chat2note-preview-toggle-btn')

    if (content) {
      if (isExpanded) {
        content.textContent = message.content
      } else {
        content.textContent =
          message.content.slice(0, MessagePreviewCard.MESSAGE_COLLAPSE_THRESHOLD) + '...'
      }
    }

    if (toggleBtn) {
      toggleBtn.textContent = isExpanded ? t('preview_toggle_collapse') : t('preview_toggle_expand')
    }
  }

  private getRoleIcon(role: 'user' | 'assistant'): string {
    if (role === 'user') {
      // User icon
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>`
    } else {
      // Assistant/bot icon
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="11" width="18" height="10" rx="2"></rect>
        <circle cx="12" cy="5" r="2"></circle>
        <path d="M12 7v4"></path>
        <line x1="8" y1="16" x2="8" y2="16"></line>
        <line x1="16" y1="16" x2="16" y2="16"></line>
      </svg>`
    }
  }

  private handleSelectAll(): void {
    this.selectionManager.selectAll(this.messages.length)
    this.updateCheckboxes()
  }

  private handleDeselectAll(): void {
    this.selectionManager.clearSelection()
    this.updateCheckboxes()
  }

  private handleSelectAssistant(): void {
    this.selectionManager.selectByRole(this.messages, 'assistant')
    this.updateCheckboxes()
  }

  private createToolbarButton(
    label: string,
    iconPaths: ToolbarIconPath[],
    onClick: () => void
  ): HTMLButtonElement {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'chat2note-preview-toolbar-btn'
    button.title = label
    button.setAttribute('aria-label', label)

    const icon = this.createToolbarIcon(iconPaths)
    button.appendChild(icon)

    const labelSpan = document.createElement('span')
    labelSpan.className = 'chat2note-preview-toolbar-label'
    labelSpan.textContent = label
    button.appendChild(labelSpan)

    button.addEventListener('click', onClick)

    return button
  }

  private createToolbarIcon(iconPaths: ToolbarIconPath[]): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    svg.setAttribute('viewBox', '0 0 24 24')
    svg.setAttribute('fill', 'none')
    svg.setAttribute('stroke', 'currentColor')
    svg.setAttribute('stroke-width', '2')
    svg.setAttribute('stroke-linecap', 'round')
    svg.setAttribute('stroke-linejoin', 'round')

    iconPaths.forEach(pathDefinition => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      path.setAttribute('d', pathDefinition.d)
      if (pathDefinition.attrs) {
        Object.entries(pathDefinition.attrs).forEach(([key, value]) => {
          path.setAttribute(key, value)
        })
      }
      svg.appendChild(path)
    })

    return svg
  }

  private updateCheckboxes(): void {
    if (!this.container) return

    const checkboxes = this.container.querySelectorAll<HTMLInputElement>(
      '.chat2note-preview-checkbox'
    )
    checkboxes.forEach((checkbox, index) => {
      checkbox.checked = this.selectionManager.isSelected(index)
    })
  }

  private handleConfirm(): void {
    const selectedIndices = this.selectionManager.getSelectedIndices()
    console.log('[PreviewCard] Confirm clicked, selected indices:', selectedIndices)

    // Save callback before cleanup
    const confirmCallback = this.onConfirm

    document.body.style.overflow = ''
    this.hide()

    if (confirmCallback) {
      console.log('[PreviewCard] Calling onConfirm callback')
      confirmCallback(selectedIndices)
    } else {
      console.warn('[PreviewCard] onConfirm callback is null')
    }
  }

  private handleCancel(): void {
    console.log('[PreviewCard] Cancel clicked')

    // Save callback before cleanup
    const cancelCallback = this.onCancel

    document.body.style.overflow = ''
    this.hide()

    if (cancelCallback) {
      cancelCallback()
    }
  }

  private applyThemeToPreviewCard(): void {
    if (!this.container) return

    // Detect current theme preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const theme = prefersDark ? 'dark' : 'light'

    // Apply theme tokens to the preview card container
    applyThemeTokens(this.container, theme)

    // Add theme class and attribute for additional styling
    this.container.classList.add('chat2note-theme-scope')
    this.container.setAttribute('data-theme', theme)
  }
}
