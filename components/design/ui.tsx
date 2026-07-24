import { type CSSProperties, type ReactNode } from 'react'
import { changeToneStyle } from './magnitude'

export function Card({
  children,
  className = '',
  labelledBy,
}: {
  children: ReactNode
  className?: string
  labelledBy?: string
}) {
  return <section className={`app-card ${className}`} aria-labelledby={labelledBy}>{children}</section>
}

export function PageHeader({
  eyebrow,
  title,
  description,
  trailing,
}: {
  eyebrow: string
  title: ReactNode
  description?: ReactNode
  trailing?: ReactNode
}) {
  return (
    <header className="page-heading">
      <div>
        <span className="app-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {trailing}
    </header>
  )
}

export function SectionHeader({
  eyebrow,
  title,
  action,
  id,
}: {
  eyebrow?: string
  title: ReactNode
  action?: ReactNode
  id?: string
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow ? <div className="section-kicker">{eyebrow}</div> : null}
        <h2 id={id}>{title}</h2>
      </div>
      {action}
    </div>
  )
}

export function Badge({
  children,
  tone = 'accent',
  dot = false,
}: {
  children: ReactNode
  tone?: 'accent' | 'success'
  dot?: boolean
}) {
  return (
    <span className={`app-badge ${tone}`}>
      {dot ? <span className="app-badge-dot" aria-hidden="true" /> : null}
      {children}
    </span>
  )
}

export function ChangeValue({
  value,
  suffix = '%',
  className = '',
}: {
  value: number
  suffix?: string
  className?: string
}) {
  const sign = value > 0 ? '+' : ''
  const tone = value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral'
  return (
    <bdi className={`change-value ${tone} ${className}`} style={changeToneStyle(value) as CSSProperties}>
      {sign}{value.toFixed(2)}{suffix}
    </bdi>
  )
}

export function DirectionalChange({
  value,
  suffix = '%',
  decimals = 2,
  className = '',
}: {
  value: number
  suffix?: string
  decimals?: number
  className?: string
}) {
  const tone = value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral'
  const sign = value > 0 ? '+' : ''
  return (
    <span className={`directional-change ${tone} ${className}`} style={changeToneStyle(value) as CSSProperties}>
      {value !== 0 ? <span aria-hidden="true">{value > 0 ? '↗' : '↘'}</span> : null}
      <bdi>{sign}{value.toFixed(decimals)}{suffix}</bdi>
    </span>
  )
}

/** Matches the `.empty-state` block already in globals.css (strong + span). */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      {description ? <span>{description}</span> : null}
      {action}
    </div>
  )
}

export function MetricCard({
  label,
  value,
  detail,
  tone,
  className = '',
  valueFirst = false,
}: {
  label: ReactNode
  value: ReactNode
  detail?: ReactNode
  tone?: 'positive' | 'negative'
  className?: string
  valueFirst?: boolean
}) {
  const labelNode = <span>{label}</span>
  const valueNode = <strong className={tone}>{value}</strong>
  return (
    <article className={`metric-card ${className}`}>
      {valueFirst ? valueNode : labelNode}
      {valueFirst ? labelNode : valueNode}
      {detail ? <small>{detail}</small> : null}
    </article>
  )
}

export function LoadingRows({ rows = 8 }: { rows?: number }) {
  return (
    <div className="loading-rows" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div className="skeleton-block" key={i} />
      ))}
    </div>
  )
}
