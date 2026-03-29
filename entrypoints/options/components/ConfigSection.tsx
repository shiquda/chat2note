import { ReactNode } from 'react'

interface ConfigSectionProps {
  title: string
  description?: string
  children: ReactNode
  icon?: ReactNode
  status?: ReactNode
}

export default function ConfigSection({
  title,
  description,
  children,
  icon,
  status,
}: ConfigSectionProps) {
  return (
    <section className="config-section">
      <div className="config-section-header">
        {icon && <div className="config-section-icon">{icon}</div>}
        <div className="config-section-title-area">
          <h2 className="config-section-title">{title}</h2>
          {description && <p className="config-section-description">{description}</p>}
        </div>
        {status && <div className="config-section-status">{status}</div>}
      </div>
      <div className="config-section-content">{children}</div>
    </section>
  )
}
