'use client'

import { useMemo, useState } from 'react'
import { useLocale } from '@/context/LocaleContext'
import type { CompanyMeta } from '@/types'
import { CompanyLogo } from '@/components/CompanyLogo'

/** Searchable company picker (ticker or Arabic/English name). */
export default function TickerPicker({
  meta, value, onChange, placeholder,
}: {
  meta: CompanyMeta[]
  value: string
  onChange: (sym: string) => void
  placeholder?: string
}) {
  const { t } = useLocale()
  const [q, setQ]       = useState('')
  const [open, setOpen] = useState(false)
  const selected = useMemo(() => meta.find(m => m.sym === value), [meta, value])

  const matches = useMemo(() => {
    const k = q.trim().toLowerCase()
    const list = !k ? meta : meta.filter(m =>
      m.sym.toLowerCase().includes(k) || m.ar.includes(q.trim()) || m.en.toLowerCase().includes(k))
    return list.slice(0, 30)
  }, [meta, q])

  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
      <input
        value={open ? q : (selected ? `${selected.ar} (${selected.sym})` : q)}
        onChange={e => { setQ(e.target.value); setOpen(true); if (value) onChange('') }}
        onFocus={() => { setOpen(true); setQ('') }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder ?? t.learn.tickerSearch}
        style={{
          width: '100%', height: 38, borderRadius: 9, background: 'var(--surf2)',
          border: '1px solid var(--line)', color: 'var(--ink)', fontSize: 13,
          padding: '0 12px', outline: 'none', fontFamily: 'inherit', direction: 'rtl',
        }} />
      {open && matches.length > 0 && (
        <div style={{
          position: 'absolute', top: 42, insetInlineStart: 0, insetInlineEnd: 0, zIndex: 50,
          maxHeight: 260, overflowY: 'auto', background: 'var(--surf)',
          border: '1px solid var(--line)', borderRadius: 10, boxShadow: '0 12px 30px rgba(0,0,0,.35)',
        }}>
          {matches.map(m => (
            <button key={m.sym} type="button"
              onMouseDown={e => { e.preventDefault(); onChange(m.sym); setOpen(false); setQ('') }}
              style={{
                display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'start',
                padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer',
                borderBottom: '1px solid var(--line)', fontFamily: 'inherit',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <CompanyLogo sym={m.sym} logo={m.logo} color={m.color} letters={3} style={{
                background: 'var(--brand)',
                width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: '#fff',
              }} />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.ar}</span>
              <span style={{ fontSize: 10.5, color: 'var(--ink4)', fontFamily: 'var(--font-mono)' }}>{m.sym}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
