'use client'

import Link from 'next/link'
import { useLocale } from '@/context/LocaleContext'

/**
 * The company-level not-found boundary.
 *
 * ⚠ It was English-only — «Company Not Found» shown to an Arabic reader on an
 * Arabic page. It is localized now for the same reason the rest of the route
 * was, and because the moment Next can render a custom not-found inside a
 * layout again (see app/(ar)/not-found.tsx) this becomes reachable copy.
 *
 * It keeps its inline styles deliberately: this boundary can render outside
 * the token layer, so it must not depend on a stylesheet to be legible.
 */
export default function CompanyNotFound() {
  const { t, href: L } = useLocale()
  const cd = t.company

  return (
    <div style={{
      maxWidth: 480, margin: '80px auto', padding: '0 24px',
      textAlign: 'center', fontFamily: 'inherit',
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }} aria-hidden="true">📉</div>
      <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
        {cd.notFoundTitle('')}
      </h2>
      <p style={{ fontSize: 14, color: 'var(--ink3)', marginBottom: 24, lineHeight: 1.6 }}>
        {cd.notFoundNote}
      </p>
      <Link href={L('/market')} style={{
        display: 'inline-block', padding: '10px 24px',
        background: 'var(--brand)', color: '#fff',
        borderRadius: 10, fontWeight: 700, fontSize: 14,
      }}>
        {cd.allCompanies}
      </Link>
    </div>
  )
}
