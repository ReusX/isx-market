'use client'

// Shared bits for the /statistics cards and their dedicated full pages.
import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'
import { CompanyLogo } from '@/components/CompanyLogo'

/* ⚠ The third copy of the month table is GONE. It was pan-Arab while the rest
   of this same route used the Levantine one from lib/statistics, so a reader
   saw two different month vocabularies on one page. There is one
   table now, in lib/date.ts, and this re-exports it under the name the panels
   already use. */
import { AR_MONTHS } from '@/lib/date'
export { AR_MONTHS as arMonth }

export function fmtIQD(v: number): string {
  const a = Math.abs(v), s = v < 0 ? '−' : ''
  if (a >= 1e12) return s + (a / 1e12).toFixed(2) + 'T'
  if (a >= 1e9)  return s + (a / 1e9).toFixed(2) + 'B'
  if (a >= 1e6)  return s + (a / 1e6).toFixed(1) + 'M'
  if (a >= 1e3)  return s + (a / 1e3).toFixed(0) + 'K'
  return s + a.toFixed(0)
}

/* `arDate` was a fourth reimplementation of the same three lines. It is now
   the one in lib/date.ts, re-exported so existing importers do not move. */
export { arDate } from '@/lib/date'

// ── Company logo with fallback (mirrors the site CoLogo) ───────────────────────
export function CoLogo({ sym, logo, size = 28 }: { sym: string; logo?: string; size?: number }) {
  return (
    <CompanyLogo
      sym={sym}
      logo={logo}
      letters={3}
      style={{
        width: size, height: size, borderRadius: 6, flexShrink: 0, background: 'var(--surf3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 9, fontWeight: 800, color: 'var(--ink3)',
      }}
    />
  )
}

// ── Segmented control ──────────────────────────────────────────────────────────
export function Seg<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: [T, string][]
}) {
  return (
    <div className="seg-control" role="group">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          className={v === value ? 'seg-btn is-active' : 'seg-btn'}
          aria-pressed={v === value}
          onClick={() => onChange(v)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// ── Compact card shell for the statistics grid ─────────────────────────────────
// Same shell as <Panel> on /statistics, plus an "عرض الكل" link through to the
// feature's dedicated full page.
export function PreviewCard({ title, subtitle, badge, badgeLive, href, loading, children }: {
  title: string; subtitle?: string; badge?: string; badgeLive?: boolean
  href: string; loading?: boolean; children: React.ReactNode
}) {
  const { t: T, href: L } = useLocale()
  const ow = T.ownership
  return (
    <section className="app-card statistics-card stat-panel">
      <div className="statistics-card-heading">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {badge && (
          <span className={badgeLive ? 'app-badge success' : 'app-badge accent'}>
            {badgeLive && <span className="app-badge-dot" aria-hidden="true" />}
            {badge}
          </span>
        )}
      </div>

      <div className="stat-panel-body">
        {loading ? <div className="skeleton" style={{ height: 120, borderRadius: 10 }} /> : children}
      </div>

      <Link className="panel-cta" href={href}>
        {ow.showAll}
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </section>
  )
}

// ── Page header with back link for the dedicated full pages ────────────────────
/**
 * ⚠ The `live` prop and its «مباشر» badge are REMOVED.
 *
 * Both of these pages read a MONTHLY report from the depository. Nothing on
 * them is live, nothing is even daily, and a green «مباشر» dot over a
 * month-old table is the single most misleading thing the product could put
 * on a page. No caller passed it, so nothing rendered it — but leaving it in
 * meant one prop away from shipping.
 */
export function BackHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { t: T, href: L } = useLocale()
  const ow = T.ownership
  return (
    <>
      <Link className="statistics-breadcrumb" href={L('/statistics')}>
        <span className="dir-go" aria-hidden="true">›</span>
        {ow.breadcrumb}
      </Link>
      <header className="statistics-detail-heading">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </header>
    </>
  )
}

