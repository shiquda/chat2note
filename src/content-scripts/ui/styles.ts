/**
 * Generate CSS styles for the Chat2Note export UI
 * @param containerId - The ID of the main container element
 * @returns CSS string
 */
export function generateStyles(containerId: string): string {
  return `
#${containerId} {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 2147483647;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: var(--text-primary);
  pointer-events: none;
}

#${containerId}.chat2note-open {
  pointer-events: auto;
}

#${containerId} .chat2note-main-button,
#${containerId} .chat2note-options-panel {
  pointer-events: auto;
}

#${containerId}.chat2note-hidden {
  display: none !important;
}

#${containerId}.chat2note-position-top-right {
  top: 20px;
  right: 20px;
  bottom: auto;
  left: auto;
  transform: none;
  align-items: flex-end;
}

#${containerId}.chat2note-position-middle-right {
  top: 50%;
  right: 20px;
  bottom: auto;
  left: auto;
  transform: translateY(-50%);
  align-items: flex-end;
}

#${containerId}.chat2note-position-bottom-right {
  top: auto;
  right: 20px;
  bottom: 20px;
  left: auto;
  transform: none;
  align-items: flex-end;
  flex-direction: column-reverse;
}

#${containerId}.chat2note-position-top-left {
  top: 20px;
  right: auto;
  bottom: auto;
  left: 20px;
  transform: none;
  align-items: flex-start;
}

#${containerId}.chat2note-position-middle-left {
  top: 50%;
  right: auto;
  bottom: auto;
  left: 20px;
  transform: translateY(-50%);
  align-items: flex-start;
}

#${containerId}.chat2note-position-bottom-left {
  top: auto;
  right: auto;
  bottom: 20px;
  left: 20px;
  transform: none;
  align-items: flex-start;
  flex-direction: column-reverse;
}

#${containerId} button {
  border: none;
  background: none;
  padding: 0;
  margin: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;
}

#${containerId} .chat2note-main-button {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--accent-strong);
  color: var(--accent-contrast);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12px 28px var(--shadow-soft);
  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
  border: 1px solid var(--border-subtle);
}

#${containerId} .chat2note-main-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 16px 32px var(--shadow-strong);
  filter: brightness(1.05);
}

#${containerId} .chat2note-main-button:active {
  transform: translateY(0);
  filter: brightness(0.95);
}

#${containerId} .chat2note-main-button:focus-visible {
  outline: 2px solid var(--control-focus);
  outline-offset: 3px;
}

#${containerId} .chat2note-main-svg {
  width: 22px;
  height: 22px;
}

#${containerId} .chat2note-options-panel {
  margin-top: 6px;
  background: var(--bg-surface);
  color: var(--text-primary);
  border-radius: 12px;
  padding: 10px 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 180px;
  opacity: 0;
  transform: translateY(6px);
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
  box-shadow: 0 18px 36px var(--shadow-soft);
  border: 1px solid var(--border-subtle);
}

#${containerId}.chat2note-open .chat2note-options-panel {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

#${containerId}.chat2note-position-bottom-right .chat2note-options-panel,
#${containerId}.chat2note-position-bottom-left .chat2note-options-panel {
  margin-top: 0;
  margin-bottom: 6px;
  transform: translateY(-6px);
}

#${containerId}.chat2note-position-bottom-right.chat2note-open .chat2note-options-panel,
#${containerId}.chat2note-position-bottom-left.chat2note-open .chat2note-options-panel {
  transform: translateY(0);
}

#${containerId} .chat2note-option-button {
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 10px;
  padding: 8px 12px;
  color: var(--text-secondary);
  background: transparent;
  transition: background-color 0.2s ease, transform 0.2s ease, color 0.2s ease;
}

#${containerId} .chat2note-option-button:hover,
#${containerId} .chat2note-option-button:focus-visible {
  background: var(--interactive-hover);
  transform: translateX(-2px);
  color: var(--text-primary);
  outline: none;
}

#${containerId}.chat2note-position-top-left .chat2note-option-button:hover,
#${containerId}.chat2note-position-top-left .chat2note-option-button:focus-visible,
#${containerId}.chat2note-position-middle-left .chat2note-option-button:hover,
#${containerId}.chat2note-position-middle-left .chat2note-option-button:focus-visible,
#${containerId}.chat2note-position-bottom-left .chat2note-option-button:hover,
#${containerId}.chat2note-position-bottom-left .chat2note-option-button:focus-visible {
  transform: translateX(2px);
}

#${containerId} .chat2note-option-button:active {
  transform: translateX(0);
}

#${containerId} .chat2note-option-icon {
  font-size: 1rem;
  line-height: 1;
  color: var(--accent-strong);
}

#${containerId} .chat2note-option-label {
  font-size: 0.95rem;
}

#${containerId} .chat2note-scope-group {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  padding: 4px 4px 6px;
}

#${containerId} .chat2note-scope-button {
  border-radius: 999px;
  border: 1px solid var(--border-subtle);
  background: var(--control-bg);
  color: var(--text-secondary);
  font-size: 0.78rem;
  padding: 6px 10px;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

#${containerId} .chat2note-scope-button:hover,
#${containerId} .chat2note-scope-button:focus-visible {
  background: var(--interactive-hover);
  border-color: var(--control-focus);
  color: var(--text-primary);
  outline: none;
}

#${containerId} .chat2note-scope-button-active {
  background: var(--accent-strong);
  border-color: var(--accent-strong);
  color: var(--accent-contrast);
}

#${containerId} .chat2note-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Preview card styles */
.chat2note-preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
}

.chat2note-preview-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--backdrop-mask);
}

.chat2note-preview-card {
  position: relative;
  width: min(90%, 720px);
  max-height: 85vh;
  background: var(--bg-surface);
  border-radius: 14px;
  box-shadow: 0 24px 48px var(--shadow-strong);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
}

.chat2note-preview-header {
  padding: 18px 24px 14px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-elevated);
}

.chat2note-preview-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.chat2note-preview-toolbar {
  padding: 12px 24px;
  display: flex;
  gap: 8px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-subtle);
}

.chat2note-preview-toolbar-btn {
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle);
  background: var(--control-bg);
  color: var(--text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.chat2note-preview-toolbar-btn svg {
  width: 16px;
  height: 16px;
}

.chat2note-preview-toolbar-label {
  line-height: 1;
}

.chat2note-preview-toolbar-btn:hover,
.chat2note-preview-toolbar-btn:focus-visible {
  background: var(--interactive-hover);
  border-color: var(--control-focus);
  color: var(--text-primary);
  outline: none;
}

.chat2note-preview-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
  min-height: 200px;
  background: var(--bg-surface);
}

.chat2note-preview-message-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  margin-bottom: 12px;
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
  background: var(--bg-elevated);
  transition: background 0.2s ease, border-color 0.2s ease;
}

.chat2note-preview-message-item:hover {
  background: var(--bg-subtle);
  border-color: var(--border-strong);
}

.chat2note-preview-checkbox {
  width: 20px;
  height: 20px;
  margin-top: 4px;
  accent-color: var(--accent-strong);
  cursor: pointer;
  flex-shrink: 0;
}

.chat2note-preview-message-main {
  flex: 1;
  min-width: 0;
}

.chat2note-preview-message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.chat2note-preview-role-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: var(--accent-strong);
}

.chat2note-preview-role-icon svg {
  width: 100%;
  height: 100%;
}

.chat2note-preview-role-user {
  color: var(--accent-strong);
}

.chat2note-preview-role-assistant {
  color: var(--control-focus);
}

.chat2note-preview-role-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-primary);
}

.chat2note-preview-timestamp {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.chat2note-preview-message-content {
  color: var(--text-secondary);
}

.chat2note-preview-content-text {
  font-size: 0.875rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  margin-bottom: 8px;
}

.chat2note-preview-toggle-btn {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--border-subtle);
  background: var(--control-bg);
  color: var(--text-secondary);
  font-size: 0.75rem;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.chat2note-preview-toggle-btn:hover,
.chat2note-preview-toggle-btn:focus-visible {
  background: var(--interactive-hover);
  color: var(--text-primary);
  border-color: var(--control-focus);
  outline: none;
}

.chat2note-preview-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  background: var(--bg-subtle);
}

.chat2note-preview-btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  border: 1px solid transparent;
}

.chat2note-preview-btn:focus-visible {
  outline: none;
  border-color: var(--control-focus);
}

.chat2note-preview-btn-cancel {
  background: var(--control-bg);
  color: var(--text-secondary);
  border-color: var(--border-subtle);
}

.chat2note-preview-btn-cancel:hover {
  background: var(--interactive-hover);
  color: var(--text-primary);
}

.chat2note-preview-btn-confirm {
  background: var(--accent-strong);
  color: var(--accent-contrast);
  border-color: var(--accent-strong);
}

.chat2note-preview-btn-confirm:hover {
  box-shadow: 0 8px 16px var(--shadow-soft);
  filter: brightness(1.05);
}

.chat2note-preview-btn-confirm:active {
  filter: brightness(0.95);
}

@media (prefers-reduced-motion: reduce) {
  #${containerId} .chat2note-main-button,
  #${containerId} .chat2note-options-panel,
  #${containerId} .chat2note-option-button,
  .chat2note-preview-toolbar-btn,
  .chat2note-preview-message-item,
  .chat2note-preview-toggle-btn,
  .chat2note-preview-btn {
    transition: none;
  }
}
  `
}
