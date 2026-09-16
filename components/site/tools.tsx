'use client'

import { useId } from 'react'
import { useLocale } from '@/context/LocaleContext'
import { DoorRail } from './DoorRail'
import { existsIn } from '@/lib/i18n/routes'
import type { CompanyMeta } from '@/types'

/** The rail the three personal tools share. */
export function ToolsRail() {
  const { t, locale } = useLocale()
  const r = t.personal.tools.rail
  const items = [
    { label: r.portfolio, route: '/portfolio' },
    { label: r.watchlist, route: '/watchlist' },
    { label: r.alerts, route: '/alerts' },
  ].filter((i) => existsIn(i.route, locale))
  return <DoorRail door="markets" items={items} />
}

/**
 * A company picker: one input over a datalist of every listed company,
 * matched on Arabic name, English name or ticker. Resolves to a ticker or
 * to nothing — it never guesses.
 */
export function CompanyPicker({ meta, value, onChange, label }: {
  meta: CompanyMeta[]
  value: string
  onChange: (sym: string) => void
  label: string
}) {
  const { t, locale } = useLocale()
  const id = useId()
  const name = (m: CompanyMeta) => (locale === 'ar' ? m.ar || m.en : m.en || m.ar) || m.sym
  const resolve = (raw: string) => {
    const v = raw.trim().toLowerCase()
    if (!v) return ''
    const hit = meta.find((m) => m.sym.toLowerCase() === v)
      ?? meta.find((m) => `${name(m)} (${m.sym})`.toLowerCase() === v)
      ?? meta.find((m) => name(m).toLowerCase() === v)
    return hit?.sym ?? ''
  }
  const current = meta.find((m) => m.sym === value)
  return (
    <label className="tl-pick">
      <span className="id-cap">{label}</span>
      <input className="id-input" list={id} placeholder={t.personal.tools.pickHint} defaultValue={current ? `${name(current)} (${current.sym})` : ''}
        onChange={(e) => onChange(resolve(e.target.value))} onBlur={(e) => onChange(resolve(e.target.value))} />
      <datalist id={id}>
        {meta.map((m) => <option key={m.sym} value={`${name(m)} (${m.sym})`} />)}
      </datalist>
    </label>
  )
}

export const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
export const nf2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const pctStr = (v: number | null) => (v == null || !Number.isFinite(v) ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(2)}%`)
export const chgCls = (v: number | null | undefined) => (v == null ? 'is-flat' : v > 0 ? 'is-up' : v < 0 ? 'is-down' : 'is-flat')
