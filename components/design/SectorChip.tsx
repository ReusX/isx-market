'use client'

import Link from 'next/link'
import { type CSSProperties } from 'react'
import { changeMagnitude } from './magnitude'

export function SectorChip({
  label,
  change,
  selected = false,
  selectionTone = 'accent',
  href,
  onClick,
  static: isStatic = false,
}: {
  label: string
  change?: number
  selected?: boolean
  selectionTone?: 'accent' | 'neutral'
  href?: string
  onClick?: () => void
  static?: boolean
}) {
  const className = [
    'shared-sector-chip',
    selected ? 'selected' : '',
    selected ? `${selectionTone}-selection` : '',
    change !== undefined ? (change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral') : '',
  ].filter(Boolean).join(' ')

  const style = change === undefined ? undefined : {
    ['--change-mix' as string]: `${55 + changeMagnitude(change) * 45}%`,
  } as CSSProperties

  const content = (
    <>
      <span>{label}</span>
      {change !== undefined ? <bdi>{change > 0 ? '+' : ''}{change.toFixed(2)}%</bdi> : null}
    </>
  )

  // next/link rather than a bare <a> so sector drill-through is a client
  // navigation like the rest of the app.
  if (href) {
    return <Link className={className} href={href} style={style}>{content}</Link>
  }

  if (isStatic) {
    return <span className={className} style={style}>{content}</span>
  }

  return (
    <button aria-pressed={selected} className={className} type="button" onClick={onClick} style={style}>
      {content}
    </button>
  )
}
