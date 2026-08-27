'use client'

/**
 * The chrome the two depository routes share.
 *
 * They are siblings of /statistics, so they wear its stylesheet rather than a
 * grammar of their own: `.stw` page, `.stw-head`, `.stw-rail`, `.stw-note`,
 * `.stw-empty` and the `.mv-table` family are the approved Statistics
 * vocabulary, reused verbatim. styles/depository.css adds only the three
 * things /statistics has no equivalent of — a search field, a percentage cell
 * with a bar, and the coverage disclosure.
 */
import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import { useApp } from '@/context/AppContext'
import { DitherArt } from '@/components/design/DitherArt'
import { monthLabel } from '@/lib/statistics'
import type { Coverage, Period } from './depositoryData'
/* ⚠ `.mv-table` and its column classes live in their OWN stylesheet, not in
   statistics.css. Importing statistics.css alone renders the board completely
   unstyled — 27px rows, no padding, body font — which is the same trap
   styles/data-table.css documents in its own header for the oil table. */
import '@/styles/data-table.css'
import '@/styles/statistics.css'
import '@/styles/depository.css'

export function DepositoryHead({ title, standfirst }: { title: string; standfirst: string }) {
  const { t: T, href: L } = useLocale()
  const ow = T.ownership
  const { theme } = useApp()
  return (
    <>
      {/* The sibling breadcrumb — locale-aware, so /en/… climbs to /en/statistics. */}
      <Link className="dep-back" href={L('/statistics')}>
        <span className="dir-go" aria-hidden="true">›</span> {ow.breadcrumb}
      </Link>
      <header className="stw-head">
        <div className="stw-head-art" aria-hidden="true">
          <DitherArt scene="stats" theme={theme === 'dark' ? 'dark' : 'light'} />
        </div>
        <div className="stw-title">
          <h1>{title}</h1>
          <p>{standfirst}</p>
        </div>
      </header>
    </>
  )
}

/** The report this page read, and when it covers. Never «مباشر», never «اليوم». */
export function SourceNote({ period }: { period: Period | null }) {
  const { t: T, locale } = useLocale()
  const ow = T.ownership
  const ym = period ? `${period.year}-${String(period.month).padStart(2, '0')}` : null
  return (
    <p className="stw-note dep-source">
      {ow.source}: {ow.sourceReport} · {ow.period} <bdi>{monthLabel(ym, locale)}</bdi>
    </p>
  )
}

/**
 * Coverage, stated as product copy rather than as an apology or an error.
 *
 * Roughly half the company names in each report survive OCR in a form that can
 * be proven against the register. Saying so is the honest alternative to
 * quietly showing a shorter table, and it is the reason the page never guesses.
 */
export function CoverageNote({ coverage }: { coverage: Coverage }) {
  const { t: T } = useLocale()
  const ow = T.ownership
  if (coverage.matched >= coverage.sourceCompanies) return null
  return (
    <p className="dep-coverage">
      {ow.coverageNote}{' '}
      <span>{ow.coverageCount(String(coverage.matched), String(coverage.sourceCompanies))}</span>
    </p>
  )
}

export function SearchField({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string
}) {
  const { t: T } = useLocale()
  const ow = T.ownership
  return (
    <div className="dep-search">
      <label>
        <span className="sr-only">{ow.searchLabel}</span>
        <input type="search" value={value} placeholder={placeholder} dir="auto"
          onChange={e => onChange(e.target.value)} />
      </label>
    </div>
  )
}

/** A percentage and the bar that reads it at a glance. The bar is decoration —
    the number carries the meaning, so it is never colour-only. */
export function PctCell({ pct }: { pct: number }) {
  return (
    <div className="dep-pct">
      <bdi>{pct.toFixed(2)}%</bdi>
      <span className="dep-pct-track" aria-hidden="true">
        <i style={{ inlineSize: `${Math.max(0, Math.min(100, pct))}%` }} />
      </span>
    </div>
  )
}

export function DepositoryEmpty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="stw-empty" role="status">
      <strong>{title}</strong>
      {hint ? <span>{hint}</span> : null}
    </div>
  )
}
