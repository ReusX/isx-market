'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import { fetchCompanyMeta } from '@/lib/market'
import Financials from '@/components/Financials'

export default function CompanyFinancialsPage() {
  const { sym } = useParams<{ sym: string }>()
  const { lang } = useApp()
  const ar = lang === 'ar'
  const [name, setName] = useState<string>(sym)

  useEffect(() => {
    fetchCompanyMeta().then(meta => {
      const c = (meta as any[]).find(m => m.sym === sym)
      if (c) setName(ar ? c.ar : c.en)
    })
  }, [sym, ar])

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px' }}>
      {/* breadcrumb */}
      <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 16 }}>
        <Link href="/market" style={{ color: 'var(--ink4)' }}>{ar ? 'السوق' : 'Market'}</Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <Link href={`/c/${sym}`} style={{ color: 'var(--ink4)' }}>{sym}</Link>
        <span style={{ margin: '0 6px' }}>›</span>
        <span style={{ color: 'var(--ink)' }}>{ar ? 'البيانات المالية' : 'Financials'}</span>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>{name}</h1>
      <div style={{ fontSize: 12, color: 'var(--ink4)', marginBottom: 18 }}>
        {ar ? `البيانات المالية — ${sym}` : `Financial Statements — ${sym}`}
      </div>

      {/* tab nav */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        <Link href={`/c/${sym}`} style={tabStyle(false)}>{ar ? 'نظرة عامة' : 'Overview'}</Link>
        <span style={tabStyle(true)}>{ar ? 'البيانات المالية' : 'Financials'}</span>
      </div>

      <Financials sym={sym} />
    </div>
  )
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none',
    border: '1px solid var(--line)',
    background: active ? 'var(--brand)' : 'transparent',
    color: active ? '#fff' : 'var(--ink3)',
    cursor: active ? 'default' : 'pointer',
  }
}
