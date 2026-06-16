'use client'

// Shared bits for the /statistics cards and their dedicated full pages.
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'

export const arMonth = ['', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

export function fmtIQD(v: number): string {
  const a = Math.abs(v), s = v < 0 ? '−' : ''
  if (a >= 1e12) return s + (a / 1e12).toFixed(2) + 'T'
  if (a >= 1e9)  return s + (a / 1e9).toFixed(2) + 'B'
  if (a >= 1e6)  return s + (a / 1e6).toFixed(1) + 'M'
  if (a >= 1e3)  return s + (a / 1e3).toFixed(0) + 'K'
  return s + a.toFixed(0)
}

export function arDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${arMonth[m]} ${y}`
}

// ── Company logo with fallback (mirrors the site CoLogo) ───────────────────────
export function CoLogo({ sym, logo, size = 28 }: { sym: string; logo?: string; size?: number }) {
  const [err, setErr] = useState(false)
  const src = !err ? (logo || `https://isc.gov.iq/Uploads/Companies/${sym}.png`) : null
  if (src) {
    return (
      <Image src={src} alt={sym} width={size} height={size} loading="lazy" sizes={`${size * 2}px`}
        style={{ borderRadius: 6, objectFit: 'contain', background: '#fff', padding: 1, flexShrink: 0 }}
        onError={() => setErr(true)} />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: 6, flexShrink: 0, background: 'var(--surf3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, fontWeight: 800, color: 'var(--ink3)',
    }}>{sym.slice(0, 3)}</div>
  )
}

// ── Segmented control ──────────────────────────────────────────────────────────
export function Seg<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: [T, string][]
}) {
  return (
    <div style={{ display: 'inline-flex', background: 'var(--surf2)', borderRadius: 8, padding: 2, gap: 2 }}>
      {options.map(([v, label]) => {
        const on = v === value
        return (
          <button key={v} onClick={() => onChange(v)} style={{
            border: 'none', borderRadius: 6, padding: '5px 11px', fontSize: 11.5, fontWeight: 700,
            cursor: 'pointer', whiteSpace: 'nowrap',
            background: on ? 'var(--brand)' : 'transparent', color: on ? '#fff' : 'var(--ink3)',
          }}>{label}</button>
        )
      })}
    </div>
  )
}

// ── Compact card shell for the statistics grid ─────────────────────────────────
// Matches the look of the existing <Panel>; adds an "عرض الكل" expand link to the
// feature's dedicated full page.
export function PreviewCard({ title, subtitle, badge, badgeLive, href, loading, children }: {
  title: string; subtitle?: string; badge?: string; badgeLive?: boolean
  href: string; loading?: boolean; children: React.ReactNode
}) {
  return (
    <div style={{
      background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 12,
      padding: '16px 18px', display: 'flex', flexDirection: 'column', minHeight: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 2 }}>{subtitle}</div>}
        </div>
        {badge && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 9.5, fontWeight: 700,
            padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap',
            color: badgeLive ? 'var(--up)' : '#fff',
            background: badgeLive ? 'var(--up-s)' : 'var(--badge, #266EC3)',
            border: badgeLive ? '1px solid rgba(22,163,74,0.25)' : 'none',
          }}>
            {badgeLive && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--up)' }} />}
            {badge}
          </span>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        {loading ? <div className="skeleton" style={{ height: 120, borderRadius: 10 }} /> : children}
      </div>

      <Link href={href} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        marginTop: 14, padding: '9px 0', borderRadius: 9, textDecoration: 'none',
        background: 'var(--surf2)', border: '1px solid var(--line)', color: 'var(--ink2)',
        fontSize: 12, fontWeight: 700,
      }}>
        عرض الكل
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" style={{ transform: 'scaleX(-1)' }}>
          <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </div>
  )
}

// ── Page header with back link for the dedicated full pages ────────────────────
export function BackHeader({ title, subtitle, live }: { title: string; subtitle?: string; live?: boolean }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <Link href="/statistics" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700,
        color: 'var(--ink3)', textDecoration: 'none', marginBottom: 12,
      }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
          <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        الإحصائيات
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: 21, fontWeight: 800, color: 'var(--ink)', margin: 0 }}>{title}</h1>
        {live && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700,
            color: 'var(--up)', background: 'var(--up-s)', border: '1px solid rgba(22,163,74,0.25)',
            padding: '3px 9px', borderRadius: 20,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--up)' }} />مباشر
          </span>
        )}
      </div>
      {subtitle && <p style={{ fontSize: 12.5, color: 'var(--ink4)', margin: '6px 0 0' }}>{subtitle}</p>}
    </div>
  )
}

export const pageWrap: React.CSSProperties = { padding: '20px 24px 60px', maxWidth: 1000, margin: '0 auto' }
