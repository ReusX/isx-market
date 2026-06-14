'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useApp } from '@/context/AppContext'
import {
  fetchLive, fetchCompanyMeta, mergeCompanies,
  fmtVol, fmtMcap, SECTORS,
} from '@/lib/market'
import type { Company } from '@/types'

function fmtPrice(v: number) { return v.toFixed(3) }

// ── Company logo with fallback ─────────────────────────────────────────────────
function CoLogo({ sym, logo, size = 30 }: { sym: string; logo?: string; size?: number }) {
  const [err, setErr] = useState(false)
  const src = !err ? (logo || `https://isc.gov.iq/Uploads/Companies/${sym}.png`) : null
  if (src) {
    return (
      <Image src={src} alt={sym} width={size} height={size} loading="lazy" sizes={`${size * 2}px`}
        style={{ borderRadius: 5, objectFit: 'contain', background: '#fff', padding: 1, flexShrink: 0 }}
        onError={() => setErr(true)} />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: 5, flexShrink: 0, background: 'var(--surf3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, fontWeight: 800, color: 'var(--ink3)',
    }}>{sym.slice(0, 3)}</div>
  )
}

function ChangeBadge({ val }: { val: number }) {
  const up = val >= 0
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 12.5, fontWeight: 700, fontFamily: 'var(--font-mono)',
      color: up ? 'var(--up)' : 'var(--dn)',
    }}>
      <svg width="7" height="7" viewBox="0 0 8 8" fill="currentColor">
        {up ? <polygon points="4,1 7,6 1,6" /> : <polygon points="4,7 7,2 1,2" />}
      </svg>
      {Math.abs(val).toFixed(2)}%
    </span>
  )
}

export default function WatchlistClient() {
  const { watchlist, toggleWatchlist, user, openAuth } = useApp()
  const router = useRouter()

  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchLive(), fetchCompanyMeta()])
      .then(([live, meta]) => setCompanies(mergeCompanies(meta, live.stocks)))
      .finally(() => setLoading(false))
  }, [])

  const rows = useMemo(
    () => companies.filter(c => watchlist.includes(c.sym) && c.close > 0),
    [companies, watchlist],
  )

  const stats = useMemo(() => {
    const up = rows.filter(c => c.pct > 0).length
    const dn = rows.filter(c => c.pct < 0).length
    return { up, dn, flat: rows.length - up - dn }
  }, [rows])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100dvh - 48px)' }}>

      {/* ── Header ── */}
      <div style={{
        padding: '14px 16px', flexShrink: 0,
        borderBottom: '1px solid var(--line)', background: 'var(--surf)',
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 11, flexShrink: 0,
          background: 'var(--brand-soft)', border: '1px solid var(--line)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--gold)', fontSize: 20,
        }}>★</div>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)', margin: 0 }}>
            قائمة المتابعة
          </h1>
          <div style={{ fontSize: 12, color: 'var(--ink4)', marginTop: 2 }}>
            {rows.length > 0
              ? `${rows.length} شركة • ${stats.up} رابح • ${stats.dn} خاسر`
              : 'تابع أسهمك المفضلة في مكان واحد'}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, color: 'var(--ink4)', fontSize: 13 }}>
          جارٍ تحميل البيانات...
        </div>
      ) : rows.length === 0 ? (
        <EmptyState user={user} openAuth={openAuth} onBrowse={() => router.push('/')} />
      ) : (
        <div style={{ flex: 1, overflow: 'auto' }}>
          <table className="home-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ width: 34, padding: '0 8px', height: 38, background: 'var(--surf2)', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 1 }} />
                <th className="home-col-co" style={{
                  padding: '0 14px', height: 38, textAlign: 'start', fontSize: 11, fontWeight: 600,
                  color: 'var(--ink4)', background: 'var(--surf2)', borderBottom: '1px solid var(--line)',
                  position: 'sticky', top: 0, zIndex: 1, whiteSpace: 'nowrap', minWidth: 180,
                }}>الشركة</th>
                <th style={{ padding: '0 14px', height: 38, textAlign: 'end', fontSize: 11, fontWeight: 600, color: 'var(--ink4)', background: 'var(--surf2)', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 1, whiteSpace: 'nowrap' }}>السعر</th>
                <th style={{ padding: '0 14px', height: 38, textAlign: 'end', fontSize: 11, fontWeight: 600, color: 'var(--ink4)', background: 'var(--surf2)', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 1, whiteSpace: 'nowrap' }}>التغيير%</th>
                <th className="mobcol-hide" style={{ padding: '0 14px', height: 38, textAlign: 'end', fontSize: 11, fontWeight: 600, color: 'var(--ink4)', background: 'var(--surf2)', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 1, whiteSpace: 'nowrap' }}>القيمة السوقية</th>
                <th className="mobcol-hide" style={{ padding: '0 14px', height: 38, textAlign: 'end', fontSize: 11, fontWeight: 600, color: 'var(--ink4)', background: 'var(--surf2)', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 1, whiteSpace: 'nowrap' }}>الحجم</th>
                <th className="mobcol-hide" style={{ padding: '0 14px', height: 38, textAlign: 'start', fontSize: 11, fontWeight: 600, color: 'var(--ink4)', background: 'var(--surf2)', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 1, whiteSpace: 'nowrap' }}>القطاع</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((co, i) => (
                <tr key={co.sym}
                  onClick={() => router.push(`/c/${co.sym}`)}
                  style={{
                    cursor: 'pointer',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.013)',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.013)')}
                >
                  <td style={{ width: 34, padding: '0 8px', textAlign: 'center' }}>
                    <button onClick={e => { e.stopPropagation(); toggleWatchlist(co.sym) }}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 13, color: 'var(--gold)', lineHeight: 1 }}
                      title="إزالة من المتابعة">★</button>
                  </td>
                  <td className="home-col-co" style={{ padding: '0 14px', minWidth: 180 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, height: 46 }}>
                      <CoLogo sym={co.sym} logo={co.logo} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{co.sym}</div>
                        <div style={{ fontSize: 10.5, color: 'var(--ink4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{co.ar || co.en || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '0 14px', textAlign: 'end', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink)' }}>{fmtPrice(co.close)}</td>
                  <td style={{ padding: '0 14px', textAlign: 'end' }}><ChangeBadge val={co.pct} /></td>
                  <td className="mobcol-hide" style={{ padding: '0 14px', textAlign: 'end', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink3)' }}>{fmtMcap(co.mcap)}</td>
                  <td className="mobcol-hide" style={{ padding: '0 14px', textAlign: 'end', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink3)' }}>{fmtVol(co.vol)}</td>
                  <td className="mobcol-hide" style={{ padding: '0 14px' }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', background: 'var(--surf3)', borderRadius: 4, color: 'var(--ink3)', whiteSpace: 'nowrap' }}>
                      {SECTORS.find(s => s.id === co.sec)?.ar || co.sec || '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────────
function EmptyState({ user, openAuth, onBrowse }: { user: any; openAuth: (t?: 'signin' | 'signup') => void; onBrowse: () => void }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '48px 24px', gap: 6,
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20, marginBottom: 8,
        background: 'var(--surf2)', border: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 34, color: 'var(--ink4)',
      }}>☆</div>
      <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>قائمة المتابعة فارغة</div>
      <div style={{ fontSize: 13, color: 'var(--ink3)', maxWidth: 320, lineHeight: 1.6 }}>
        اضغط على نجمة ★ بجانب أي شركة لإضافتها إلى قائمة المتابعة وتتبّع أسعارها بسهولة.
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button onClick={onBrowse} style={{
          padding: '10px 20px', background: 'var(--brand)', border: 'none', borderRadius: 10,
          color: '#fff', fontWeight: 700, fontSize: 13.5, fontFamily: 'inherit', cursor: 'pointer',
        }}>تصفّح الشركات</button>
        {!user && (
          <button onClick={() => openAuth('signup')} style={{
            padding: '10px 20px', background: 'transparent', border: '1px solid var(--line2)', borderRadius: 10,
            color: 'var(--ink2)', fontWeight: 700, fontSize: 13.5, fontFamily: 'inherit', cursor: 'pointer',
          }}>أنشئ حساباً للحفظ</button>
        )}
      </div>
      {!user && (
        <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 6 }}>
          سجّل الدخول لمزامنة قائمتك عبر كل أجهزتك
        </div>
      )}
    </div>
  )
}
