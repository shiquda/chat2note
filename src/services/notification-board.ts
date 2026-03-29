const BOARD_ID = 'chat2note-notification-board'
const STYLE_ID = 'chat2note-notification-styles'

type NotificationKind = 'info' | 'success' | 'error' | 'progress'

interface NotificationLinkOptions {
  label: string
  href: string
  external?: boolean
}

export interface NotificationOptions {
  title?: string
  /** Duration in ms before auto dismissal. Use null to disable auto close. */
  duration?: number | null
  dismissible?: boolean
  link?: NotificationLinkOptions
}

interface VisualConfig {
  icon: string
  accent: string
  accentGlow: string
  iconBackground: string
  iconColor: string
}

const visualConfig: Record<NotificationKind, VisualConfig> = {
  info: {
    icon: 'ℹ',
    accent: '#1fb6ff',
    accentGlow: 'rgba(31, 182, 255, 0.55)',
    iconBackground: 'rgba(31, 182, 255, 0.16)',
    iconColor: '#e9f8ff',
  },
  success: {
    icon: '✔',
    accent: '#2bff88',
    accentGlow: 'rgba(43, 255, 136, 0.55)',
    iconBackground: 'rgba(43, 255, 136, 0.16)',
    iconColor: '#f1fff7',
  },
  error: {
    icon: '✖',
    accent: '#ff4d6d',
    accentGlow: 'rgba(255, 77, 109, 0.55)',
    iconBackground: 'rgba(255, 77, 109, 0.16)',
    iconColor: '#fff0f3',
  },
  progress: {
    icon: '…',
    accent: '#ffbf3d',
    accentGlow: 'rgba(255, 191, 61, 0.52)',
    iconBackground: 'rgba(255, 191, 61, 0.18)',
    iconColor: '#fff8e6',
  },
}

const defaultDurations: Record<NotificationKind, number | null> = {
  info: 4200,
  success: 3600,
  error: 5600,
  progress: null,
}

const styleContent = [
  '.chat2note-notification-board {',
  '  position: fixed;',
  '  bottom: 24px;',
  '  left: 24px;',
  '  display: flex;',
  '  flex-direction: column;',
  '  gap: 12px;',
  '  max-width: min(420px, 90vw);',
  '  z-index: 2147483647;',
  '  pointer-events: none;',
  "  font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;",
  '}',
  '',
  '.chat2note-notification {',
  '  position: relative;',
  '  display: grid;',
  '  grid-template-columns: 6px 44px 1fr auto;',
  '  gap: 16px;',
  '  align-items: center;',
  '  border-radius: 14px;',
  '  background: rgba(6, 12, 24, 0.88);',
  '  backdrop-filter: blur(14px) saturate(140%);',
  '  color: #f9fafb;',
  '  padding: 16px 18px;',
  '  box-shadow: 0 24px 60px rgba(8, 12, 24, 0.62), 0 0 0 1px rgba(148, 163, 184, 0.12);',
  '  transform: translateX(-18px);',
  '  opacity: 0;',
  '  animation: chat2note-slide-in 220ms ease forwards;',
  '  pointer-events: auto;',
  '}',
  '',
  '.chat2note-notification-leave {',
  '  animation: chat2note-slide-out 180ms ease forwards;',
  '}',
  '',
  '.chat2note-notification-accent {',
  '  width: 6px;',
  '  height: 100%;',
  '  border-radius: 6px;',
  '  background: var(--chat2note-accent, #5ef2ff);',
  '  box-shadow: 0 0 18px var(--chat2note-accent-glow, rgba(94, 242, 255, 0.45));',
  '  grid-column: 1;',
  '}',
  '',
  '.chat2note-notification-icon,',
  '.chat2note-notification-spinner {',
  '  width: 32px;',
  '  height: 32px;',
  '  border-radius: 999px;',
  '  display: flex;',
  '  align-items: center;',
  '  justify-content: center;',
  '  grid-column: 2;',
  '}',
  '',
  '.chat2note-notification-icon {',
  '  font-size: 18px;',
  '  background: var(--chat2note-icon-bg, rgba(148, 163, 184, 0.12));',
  '  color: var(--chat2note-icon-color, #f8fafc);',
  '  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.14);',
  '}',
  '',
  '.chat2note-notification-spinner {',
  '  border: 3px solid rgba(100, 116, 139, 0.26);',
  '  border-top-color: var(--chat2note-accent, rgba(248, 250, 252, 0.92));',
  '  animation: chat2note-spin 900ms linear infinite;',
  '  display: none;',
  '}',
  '',
  '.chat2note-notification-content {',
  '  display: flex;',
  '  flex-direction: column;',
  '  gap: 4px;',
  '  padding-right: 8px;',
  '  word-break: break-word;',
  '  grid-column: 3;',
  '}',
  '',
  '.chat2note-notification-title {',
  '  font-size: 14px;',
  '  font-weight: 600;',
  '  color: #f3f4f6;',
  '  display: none;',
  '}',
  '',
  '.chat2note-notification-message {',
  '  font-size: 13px;',
  '  line-height: 1.45;',
  '  color: rgba(229, 231, 235, 0.94);',
  '}',
  '',
  '.chat2note-notification-message a {',
  '  color: #1ec8ff;',
  '  text-decoration: underline;',
  '  font-weight: 500;',
  '  transition: color 0.2s ease;',
  '}',
  '',
  '.chat2note-notification-message a:hover,',
  '.chat2note-notification-message a:focus {',
  '  color: #6ae1ff;',
  '}',
  '',
  '.chat2note-notification-close {',
  '  appearance: none;',
  '  border: none;',
  '  background: transparent;',
  '  color: rgba(226, 232, 240, 0.76);',
  '  cursor: pointer;',
  '  font-size: 18px;',
  '  line-height: 1;',
  '  padding: 4px;',
  '  border-radius: 6px;',
  '  transition: background-color 0.2s ease, color 0.2s ease;',
  '  grid-column: 4;',
  '}',
  '',
  '.chat2note-notification-close:hover {',
  '  background: rgba(148, 163, 184, 0.22);',
  '  color: rgba(248, 250, 252, 0.95);',
  '}',
  '',
  '.chat2note-notification-info .chat2note-notification-icon {',
  '  background: rgba(31, 182, 255, 0.16);',
  '  color: #e9f8ff;',
  '}',
  '',
  '.chat2note-notification-success .chat2note-notification-icon {',
  '  background: rgba(43, 255, 136, 0.16);',
  '  color: #f1fff7;',
  '}',
  '',
  '.chat2note-notification-error .chat2note-notification-icon {',
  '  background: rgba(255, 77, 109, 0.16);',
  '  color: #fff0f3;',
  '}',
  '',
  '.chat2note-notification-progress .chat2note-notification-icon {',
  '  display: none;',
  '}',
  '',
  '.chat2note-notification-progress .chat2note-notification-close {',
  '  display: none;',
  '}',
  '',
  '@keyframes chat2note-slide-in {',
  '  from {',
  '    opacity: 0;',
  '    transform: translate(-20px, 10px);',
  '  }',
  '  to {',
  '    opacity: 1;',
  '    transform: translate(0, 0);',
  '  }',
  '}',
  '',
  '@keyframes chat2note-slide-out {',
  '  from {',
  '    opacity: 1;',
  '    transform: translate(0, 0);',
  '  }',
  '  to {',
  '    opacity: 0;',
  '    transform: translate(-20px, 10px);',
  '  }',
  '}',
  '',
  '@keyframes chat2note-spin {',
  '  from { transform: rotate(0deg); }',
  '  to { transform: rotate(360deg); }',
  '}',
  '',
  '@media (max-width: 520px) {',
  '  .chat2note-notification-board {',
  '    left: 16px;',
  '    bottom: 16px;',
  '    max-width: 92vw;',
  '  }',
  '}',
].join('\n')

export class NotificationHandle {
  private currentKind: NotificationKind
  private removeTimeout: number | null = null

  constructor(
    private readonly container: HTMLElement,
    private readonly accent: HTMLElement,
    private readonly icon: HTMLElement,
    private readonly spinner: HTMLElement,
    private readonly title: HTMLElement,
    private readonly message: HTMLElement,
    private readonly closeButton: HTMLButtonElement,
    private readonly remove: () => void,
    kind: NotificationKind,
    initialMessage: string,
    options?: NotificationOptions
  ) {
    this.currentKind = kind
    this.applyVisualState(kind)
    this.update(kind, initialMessage, options)
    this.closeButton.addEventListener('click', () => this.dismiss())
  }

  dismiss() {
    if (this.removeTimeout !== null) {
      window.clearTimeout(this.removeTimeout)
      this.removeTimeout = null
    }

    if (!this.container.classList.contains('chat2note-notification-leave')) {
      this.container.classList.add('chat2note-notification-leave')
      window.setTimeout(() => this.remove(), 180)
    }
  }

  update(kind: NotificationKind, message: string, options?: NotificationOptions) {
    this.currentKind = kind
    this.applyVisualState(kind)
    this.renderMessage(message, options?.link)

    if (options?.title) {
      this.title.textContent = options.title
      this.title.style.display = 'block'
    } else {
      this.title.textContent = ''
      this.title.style.display = 'none'
    }

    const duration = options?.duration ?? defaultDurations[kind]
    this.scheduleRemoval(duration)

    const dismissible = options?.dismissible ?? kind !== 'progress'
    this.closeButton.style.display = dismissible ? 'block' : 'none'
  }

  private renderMessage(message: string, link?: NotificationLinkOptions) {
    const nodes: Node[] = [document.createTextNode(message)]

    if (link) {
      const anchor = document.createElement('a')
      anchor.textContent = link.label
      anchor.href = link.href
      const openInNewTab = link.external !== false
      anchor.target = openInNewTab ? '_blank' : '_self'
      anchor.rel = 'noopener noreferrer'

      nodes.push(document.createTextNode(' '))
      nodes.push(anchor)
    }

    this.message.replaceChildren(...nodes)
  }

  success(message: string, options?: NotificationOptions) {
    this.update('success', message, options)
  }

  error(message: string, options?: NotificationOptions) {
    this.update('error', message, options)
  }

  info(message: string, options?: NotificationOptions) {
    this.update('info', message, options)
  }

  progress(message: string, options?: NotificationOptions) {
    const merged = { ...options, duration: options?.duration ?? null }
    this.update('progress', message, merged)
  }

  private scheduleRemoval(duration: number | null) {
    if (this.removeTimeout !== null) {
      window.clearTimeout(this.removeTimeout)
      this.removeTimeout = null
    }

    if (duration !== null) {
      this.removeTimeout = window.setTimeout(() => this.dismiss(), duration)
    }
  }

  private applyVisualState(kind: NotificationKind) {
    const config = visualConfig[kind]

    this.container.classList.remove(
      'chat2note-notification-info',
      'chat2note-notification-success',
      'chat2note-notification-error',
      'chat2note-notification-progress'
    )
    this.container.classList.add('chat2note-notification-' + kind)

    this.container.style.setProperty('--chat2note-accent', config.accent)
    this.container.style.setProperty('--chat2note-accent-glow', config.accentGlow)
    this.container.style.setProperty('--chat2note-icon-bg', config.iconBackground)
    this.container.style.setProperty('--chat2note-icon-color', config.iconColor)
    this.accent.style.removeProperty('background')
    this.accent.style.removeProperty('box-shadow')
    this.icon.textContent = config.icon
    this.icon.style.removeProperty('background')
    this.icon.style.removeProperty('color')
    this.spinner.style.borderTopColor = config.accent

    if (kind === 'progress') {
      this.icon.style.display = 'none'
      this.spinner.style.display = 'block'
      this.closeButton.style.display = 'none'
    } else {
      this.icon.style.display = 'flex'
      this.spinner.style.display = 'none'
    }
  }
}

function ensureBoard(): HTMLElement | null {
  if (typeof document === 'undefined') {
    return null
  }

  let board = document.getElementById(BOARD_ID)
  if (!board) {
    board = document.createElement('div')
    board.id = BOARD_ID
    board.className = 'chat2note-notification-board'
    document.body.appendChild(board)
  }

  ensureStyles()
  return board
}

function ensureStyles() {
  if (typeof document === 'undefined') {
    return
  }

  if (document.getElementById(STYLE_ID)) {
    return
  }

  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = styleContent
  document.head.appendChild(style)
}

function createNotificationElement(
  kind: NotificationKind,
  message: string,
  options?: NotificationOptions
) {
  const board = ensureBoard()
  if (!board) {
    return null
  }

  const container = document.createElement('div')
  container.className = 'chat2note-notification'
  container.classList.add('chat2note-notification-' + kind)
  const config = visualConfig[kind]
  container.style.setProperty('--chat2note-accent', config.accent)
  container.style.setProperty('--chat2note-accent-glow', config.accentGlow)
  container.style.setProperty('--chat2note-icon-bg', config.iconBackground)
  container.style.setProperty('--chat2note-icon-color', config.iconColor)

  const accent = document.createElement('div')
  accent.className = 'chat2note-notification-accent'

  const icon = document.createElement('div')
  icon.className = 'chat2note-notification-icon'

  const spinner = document.createElement('div')
  spinner.className = 'chat2note-notification-spinner'

  const content = document.createElement('div')
  content.className = 'chat2note-notification-content'

  const title = document.createElement('div')
  title.className = 'chat2note-notification-title'

  const messageElement = document.createElement('div')
  messageElement.className = 'chat2note-notification-message'
  messageElement.textContent = message

  const close = document.createElement('button')
  close.className = 'chat2note-notification-close'
  close.setAttribute('aria-label', 'Dismiss notification')
  close.textContent = '×'

  content.appendChild(title)
  content.appendChild(messageElement)

  container.appendChild(accent)
  container.appendChild(icon)
  container.appendChild(spinner)
  container.appendChild(content)
  container.appendChild(close)

  board.appendChild(container)

  const handle = new NotificationHandle(
    container,
    accent,
    icon,
    spinner,
    title,
    messageElement,
    close,
    () => {
      if (container.parentElement === board) {
        board.removeChild(container)
      }
    },
    kind,
    message,
    options
  )

  return handle
}

function createNoopHandle(): NotificationHandle {
  const dummyContainer = document.createElement('div')
  const noop = new NotificationHandle(
    dummyContainer,
    document.createElement('div'),
    document.createElement('div'),
    document.createElement('div'),
    document.createElement('div'),
    document.createElement('div'),
    document.createElement('button'),
    () => undefined,
    'info',
    ''
  )

  noop.dismiss = () => undefined
  noop.update = () => undefined
  noop.success = () => undefined
  noop.error = () => undefined
  noop.info = () => undefined
  noop.progress = () => undefined

  return noop
}

function show(
  kind: NotificationKind,
  message: string,
  options?: NotificationOptions
): NotificationHandle {
  const handle = createNotificationElement(kind, message, options)
  if (!handle) {
    return createNoopHandle()
  }
  return handle
}

export const notificationBoard = {
  show,
  info(message: string, options?: NotificationOptions) {
    return show('info', message, options)
  },
  success(message: string, options?: NotificationOptions) {
    return show('success', message, options)
  },
  error(message: string, options?: NotificationOptions) {
    return show('error', message, options)
  },
  progress(message: string, options?: NotificationOptions) {
    const merged = { ...options, duration: options?.duration ?? null }
    return show('progress', message, merged)
  },
}

export type { NotificationKind }
