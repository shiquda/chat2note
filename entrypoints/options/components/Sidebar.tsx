/* eslint-disable react/prop-types */
import { useState } from 'react'
import {
  IconNotebook,
  IconFileDownload,
  IconSettings,
  IconChevronDown,
  IconChevronRight,
  IconCircleCheck,
  IconCircleX,
  IconHelp,
  IconInfoCircle,
  IconLicense,
  IconPalette,
} from '@tabler/icons-react'
import { NOTEBOOK_SOFTWARES } from '../../../src/config/ui-constants'
import { useTranslation } from '../../../src/i18n/react'

interface SidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
  connectionStatus: {
    notion: 'unknown' | 'connected' | 'disconnected'
    obsidian: 'unknown' | 'connected' | 'disconnected'
    siyuan: 'unknown' | 'connected' | 'disconnected'
    joplin: 'unknown' | 'connected' | 'disconnected'
  }
}

interface NavItemProps {
  id: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  isActive: boolean
  onClick: () => void
  status?: 'unknown' | 'connected' | 'disconnected'
  badge?: string
}

const NavItem: React.FC<NavItemProps> = ({
  id: _id,
  icon: Icon,
  label,
  isActive,
  onClick,
  status,
  badge,
}) => {
  return (
    <button
      type="button"
      className={`nav-item ${isActive ? 'active' : ''}`}
      onClick={onClick}
      aria-pressed={isActive}
    >
      <div className="nav-item-content">
        <Icon className="nav-item-icon" />
        <span className="nav-item-label">{label}</span>
        {badge && <span className="nav-item-badge">{badge}</span>}
      </div>
      {status && (
        <div className={`nav-item-status ${status}`}>
          {status === 'connected' && <IconCircleCheck className="status-icon" />}
          {status === 'disconnected' && <IconCircleX className="status-icon" />}
          {status === 'unknown' && <IconHelp className="status-icon" />}
        </div>
      )}
    </button>
  )
}

interface NavSectionProps {
  title: string
  items: NavItemProps[]
  defaultExpanded?: boolean
}

const NavSection: React.FC<NavSectionProps> = ({ title, items, defaultExpanded = true }) => {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className="nav-section">
      <button
        type="button"
        className="nav-section-header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        {expanded ? (
          <IconChevronDown className="nav-section-toggle" />
        ) : (
          <IconChevronRight className="nav-section-toggle" />
        )}
        <span className="nav-section-title">{title}</span>
      </button>
      {expanded && (
        <div className="nav-section-items">
          {items.map(item => (
            <NavItem key={item.id} {...item} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Sidebar({
  activeSection,
  onSectionChange,
  connectionStatus,
}: SidebarProps) {
  const t = useTranslation()

  interface NotebookSoftware {
    id: 'notion' | 'obsidian' | 'siyuan' | 'joplin'
    name: string
    icon: React.ComponentType<{ className?: string }>
  }

  const notebookItems = (NOTEBOOK_SOFTWARES as NotebookSoftware[]).map(software => ({
    id: software.id,
    icon: software.icon,
    label: software.name,
    isActive: activeSection === software.id,
    onClick: () => onSectionChange(software.id),
    status: connectionStatus[software.id as keyof typeof connectionStatus],
  }))

  const generalItems = [
    {
      id: 'export',
      icon: IconFileDownload,
      label: t('export_settings'),
      isActive: activeSection === 'export',
      onClick: () => onSectionChange('export'),
    },
    {
      id: 'appearance',
      icon: IconPalette,
      label: t('appearance'),
      isActive: activeSection === 'appearance',
      onClick: () => onSectionChange('appearance'),
    },
  ]

  const advancedItems = [
    {
      id: 'advanced',
      icon: IconSettings,
      label: t('advanced_settings'),
      isActive: activeSection === 'advanced',
      onClick: () => onSectionChange('advanced'),
    },
  ]

  const otherItems = [
    {
      id: 'about',
      icon: IconInfoCircle,
      label: t('about_nav'),
      isActive: activeSection === 'about',
      onClick: () => onSectionChange('about'),
    },
    {
      id: 'open-source',
      icon: IconLicense,
      label: t('open_source_nav'),
      isActive: activeSection === 'open-source',
      onClick: () => onSectionChange('open-source'),
    },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <IconNotebook className="sidebar-logo" />
        <h2 className="sidebar-title">{t('settings_title')}</h2>
      </div>

      <nav className="sidebar-nav">
        <NavSection title={t('general_settings_section')} items={generalItems} />
        <NavSection title={t('notebook_software_section')} items={notebookItems} />
        <NavSection title={t('advanced_settings_section')} items={advancedItems} />
        <NavSection title={t('other_section')} items={otherItems} />
      </nav>
    </aside>
  )
}
