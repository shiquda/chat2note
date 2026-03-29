import type { ChatConversation, ChatMessage } from '../../types/chat'
import type { ExportOptions } from '../../types/export'

/**
 * Simplified message selection manager
 * Manages selection based on indices, no direct DOM manipulation
 */
export class MessageSelectionManager {
  private selectedIndices = new Set<number>()
  private scope: ExportOptions['scope'] = 'all'

  setScope(scope: ExportOptions['scope'] = 'all'): void {
    const nextScope = scope ?? 'all'
    if (this.scope === nextScope) {
      return
    }

    this.scope = nextScope

    if (this.scope === 'all') {
      this.clearSelection()
    }
  }

  getScope(): ExportOptions['scope'] {
    return this.scope ?? 'all'
  }

  clearSelection(): void {
    this.selectedIndices.clear()
  }

  selectAll(count: number): void {
    this.selectedIndices.clear()
    for (let i = 0; i < count; i++) {
      this.selectedIndices.add(i)
    }
  }

  selectByRole(messages: ChatMessage[], role: 'user' | 'assistant'): void {
    this.selectedIndices.clear()
    messages.forEach((message, index) => {
      if (message.role === role) {
        this.selectedIndices.add(index)
      }
    })
  }

  toggleSelection(index: number): void {
    if (this.selectedIndices.has(index)) {
      this.selectedIndices.delete(index)
    } else {
      this.selectedIndices.add(index)
    }
  }

  setSelection(indices: number[]): void {
    this.selectedIndices.clear()
    indices.forEach(i => this.selectedIndices.add(i))
  }

  isSelected(index: number): boolean {
    return this.selectedIndices.has(index)
  }

  hasSelection(): boolean {
    return this.selectedIndices.size > 0
  }

  getSelectedCount(): number {
    return this.selectedIndices.size
  }

  getSelectedIndices(): number[] {
    return Array.from(this.selectedIndices).sort((a, b) => a - b)
  }

  filterConversation(conversation: ChatConversation): ChatConversation {
    if ((this.scope ?? 'all') !== 'selected') {
      return conversation
    }

    if (!this.selectedIndices.size) {
      return { ...conversation, messages: [] }
    }

    const filteredMessages = conversation.messages.filter((_, index) =>
      this.selectedIndices.has(index)
    )

    return { ...conversation, messages: filteredMessages }
  }

  destroy(): void {
    this.selectedIndices.clear()
  }
}
