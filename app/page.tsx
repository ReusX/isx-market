'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import { fetchLive, fetchCompanyMeta, mergeCompanies, filterSort, fmtVol, fmtMcap, SECTORS, SORT_OPTIONS } from '@/lib/market'
import { rankFor, fmtPts } from '@/lib/ranks'
import type { Company, LiveData } from '@/types'

// ─── Mini Spark (direction-based) ────────────────────────────────────────────
function Spark({ pct }: { pct: number }) {
  const up = pct >= 0
  return (
    <svg width="52" height="22" viewBox="0 0 52 22" fill="none">
      <polyline
        points={up
          ? '0,18 10,14 20,16 30,10 40,8 52,4'
          : '0,4 10,8 20,6 30,12 40,14 52,18'}
        stroke={up ? 'var(--up)' : 'var(--dn)'}
        strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}

// ─── Real mini sparkline from hist data ──────────────────────────────────────
function MiniSpark({ points, up }: { points: number[]; up: boolean }) {
  if (!points || points.length < 2) {
    return (
      <svg width="64" height="28" viewBox="0 0 64 28" fill="none">
        <line x1="0" y1="14" x2="64" y2="14" stroke="var(--line2)" strokeWidth="1.5" />
      </svg>
    )
  }
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const w = 64, h = 28, pad = 2
  const pts = points.map((v, i) => {
    const x = pad + (i / (points.length - 1)) * (w - pad * 2)
    const y = h - pad - ((v - min) / range) * (h - pad * 2)
    return `${x},${y}`
  }).join(' ')
  const color = up ? 'var(--up)' : 'var(--dn)'
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <polyline points={pts} stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

// ─── Logo ────────────────────────────────────────────────────────────────────
function CoLogo({ sym, color, logo, size = 28 }: { sym: string; color?: string; logo?: string; size?: number }) {
  const [err, setErr] = useState(false)
  const src = !err ? (logo || `https://isc.gov.iq/Uploads/Companies/${sym}.png`) : null
  if (src) {
    return (
      <img
        src={src}
        alt={sym}
        width={size} height={size}
        style={{ borderRadius: 6, objectFit: 'contain', background: '#fff', padding: 2, flexShrink: 0 }}
        onError={() => setErr(true)}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: 6, flexShrink: 0,
      background: color || 'var(--brand)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size < 32 ? 9 : 11, fontWeight: 800, color: '#fff',
    }}>
      {sym.slice(0, 3)}
    </div>
  )
}

// ─── RSISX Mini Sparkline ─────────────────────────────────────────────────────
function RSISXSpark({ data, up, w = 120, h = 40 }: { data: [number, number][]; up: boolean; w?: number; h?: number }) {
  if (!data || data.length < 2) return null
  const values = data.map(d => d[1])
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pad = 2
  const pts = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2)
    const y = h - pad - ((v - min) / range) * (h - pad * 2)
    return `${x},${y}`
  }).join(' ')
  const color = up ? 'var(--up)' : 'var(--dn)'
  const firstPt = pts.split(' ')[0]
  const lastPt = pts.split(' ').slice(-1)[0]
  const [lx, ly] = lastPt.split(',').map(Number)
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="rsisx-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`${firstPt} ${pts} ${lx},${h} ${pad},${h}`}
        fill="url(#rsisx-grad)"
      />
      <polyline points={pts} stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="2.5" fill={color} />
    </svg>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { lang, user, profile, authLoading, watchlist, toggleWatchlist, openAuth } = useApp()
  const ar = lang === 'ar'
  const router = useRouter()

  const [companies, setCompanies] = useState<Company[]>([])
  const [liveData,  setLiveData]  = useState<LiveData | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [sector,    setSector]    = useState('all')
  const [sort,      setSort]      = useState('default')
  const [histShort,  setHistShort]  = useState<Record<string, [number, number][]>>({})
  const [rsisxHist,  setRsisxHist]  = useState<[number, number][]>([])

  useEffect(() => {
    Promise.all([
      fetchLive(),
      fetchCompanyMeta(),
      fetch(`/data/hist.json?t=${Math.floor(Date.now() / 60000)}`).then(r => r.json()).catch(() => ({})),
    ])
      .then(([live, meta, hist]) => {
        setLiveData(live)
        setCompanies(mergeCompanies(meta, live.stocks))
        setHistShort(hist.s ?? {})
        setRsisxHist((hist.rsisx_s ?? []).slice(-90))
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(
    () => filterSort(companies, sector, sort, watchlist),
    [companies, sector, sort, watchlist]
  )

  const rsisx    = liveData?.rsisx
  const rsisxVal = rsisx ? Number(rsisx.value).toFixed(2) : '—'
  const rsisxPct = rsisx ? Number(rsisx.pct) : 0
  const rsisxUp  = rsisxPct >= 0

  const gainers = useMemo(() => companies.filter(c => c.pct > 0 && c.close > 0).length, [companies])
  const losers  = useMemo(() => companies.filter(c => c.pct < 0 && c.close > 0).length, [companies])
  const rank    = profile ? rankFor(profile.points) : null

  // Mini sparkline points (last 20 closes from hist)
  function sparkPoints(sym: string) {
    const series = histShort[sym]
    if (!series || series.length < 2) return []
    const recent = series.slice(-20)
    return recent.map(p => p[1])
  }

  // ── Strip CTA items ─────────────────────────────────────────────────────
  const stripItems = user && profile ? [
    { icon: '🔥', label: ar ? `${profile.streak} يوم` : `${profile.streak}d streak` },
    { icon: rank?.icon ?? '⭐', label: ar ? rank?.ar : rank?.en },
    { icon: '🪙', label: fmtPts(profile.points) },
    { icon: '🎡', label: ar ? 'دوّر' : 'Spin', onClick: () => router.push('/rewards/spin') },
    { icon: '👥', label: ar ? 'أحل صديق' : 'Invite', onClick: () => router.push('/profile#referral') },
  ] : [
    { icon: '📈', label: ar ? 'أسهم العراق مباشرة' : 'Iraq stocks live' },
    { icon: '🎮', label: ar ? 'العب واربح نقاط' : 'Play & earn points' },
    { icon: '💼', label: ar ? 'إنشاء محفظة' : 'Build a portfolio' },
  ]

  // ── Column header ────────────────────────────────────────────────────────
  const colHdr: React.CSSProperties = {
    fontSize: 10, fontWeight: 700, color: 'var(--ink4)',
    textTransform: 'uppercase', letterSpacing: '0.05em',
    padding: '0 6px',
  }

  return (
    <>
      {/* ── SEO H1 — visually hidden, crawlable ── */}
      <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' }}>
        Iraq Stock Market — Iraq Stock Exchange (ISX) Live Prices | اسعار الاسهم العراقية | سوق الاسهم العراقي | بورصة العراق
      </h1>

      {/* ── Slim strip — desktop only ── */}
      <div className="desktop-only" style={{
        background: 'var(--surf)', borderBottom: '1px solid var(--line)',
        overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 0,
          maxWidth: 1440, margin: '0 auto', padding: '0 24px',
          height: 38, minWidth: 'max-content',
        }}>
          {stripItems.map((item, i) => (
            <button key={i} onClick={item.onClick}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '0 14px', height: '100%',
                background: 'none', border: 'none',
                borderRight: i < stripItems.length - 1 ? '1px solid var(--line)' : 'none',
                fontSize: 11, fontWeight: 600, color: 'var(--ink3)',
                fontFamily: 'inherit', whiteSpace: 'nowrap',
                cursor: item.onClick ? 'pointer' : 'default',
              }}
              onMouseEnter={e => item.onClick && (e.currentTarget.style.color = 'var(--ink)')}
              onMouseLeave={e => item.onClick && (e.currentTarget.style.color = 'var(--ink3)')}
            >
              <span style={{ fontSize: 12 }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          MOBILE LAYOUT
      ══════════════════════════════════════════════════════════════════ */}
      <div className="mobile-only" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>

        {/* ── Index card ── */}
        <div style={{ padding: '12px 16px 8px' }}>
          <Link href="/charts" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--surf)',
              border: '1px solid var(--line)',
              borderRadius: 16, padding: '14px 16px',
              cursor: 'pointer',
            }}>
              {/* Top row: label + breadth stats */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--ink4)', fontWeight: 600, marginBottom: 4 }}>
                    {ar ? 'مؤشر ربيع RSISX' : 'RSISX Index'} ›
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 800, lineHeight: 1 }}>
                    {loading ? '—' : rsisxVal}
                  </div>
                  {/* Reserve height always — prevents CLS when pct loads */}
                  <div style={{
                    fontSize: 12, fontWeight: 700, marginTop: 4,
                    color: rsisxUp ? 'var(--up)' : 'var(--dn)',
                    visibility: loading ? 'hidden' : 'visible',
                    minHeight: 18,
                  }}>
                    {rsisxUp ? '▲' : '▼'} {Math.abs(rsisxPct).toFixed(2)}%
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 14, paddingTop: 4 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--up)' }}>{gainers}</div>
                    <div style={{ fontSize: 9, color: 'var(--ink4)' }}>{ar ? 'رابح' : 'Up'}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--dn)' }}>{losers}</div>
                    <div style={{ fontSize: 9, color: 'var(--ink4)' }}>{ar ? 'خاسر' : 'Down'}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{companies.filter(c => c.close > 0).length}</div>
                    <div style={{ fontSize: 9, color: 'var(--ink4)' }}>{ar ? 'شركة' : 'Listed'}</div>
                  </div>
                </div>
              </div>
              {/* Sparkline — always reserve 48px height to prevent CLS */}
              <div style={{ marginTop: 4, marginInline: -2, height: 48 }}>
                {!loading && rsisxHist.length > 2 && (
                  <RSISXSpark data={rsisxHist} up={rsisxUp} w={320} h={48} />
                )}
              </div>
            </div>
          </Link>
        </div>

        {/* ── Quick actions ── */}
        <div style={{
          display: 'flex', gap: 8, padding: '0 16px 10px',
          overflowX: 'auto', scrollbarWidth: 'none',
        }}>
          {[
            { icon: '📚', labelAr: 'تعلّم', labelEn: 'Learn', href: '/quests' },
            { icon: '🔍', labelAr: 'بحث', labelEn: 'Research', href: '/market' },
            { icon: '📊', labelAr: 'تحليل', labelEn: 'Analysis', href: '/charts' },
            { icon: '⭐', labelAr: 'المراقبة', labelEn: 'Watchlist', action: () => setSort('watchlist') },
            { icon: '🏆', labelAr: 'المتصدرون', labelEn: 'Leaderboard', href: '/leaderboard' },
          ].map((chip, i) => (
            chip.href ? (
              <Link key={i} href={chip.href} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 14px', borderRadius: 999, whiteSpace: 'nowrap',
                background: 'var(--surf)', border: '1px solid var(--line)',
                fontSize: 11, fontWeight: 700, color: 'var(--ink2)',
                flexShrink: 0,
              }}>
                <span>{chip.icon}</span>
                {ar ? chip.labelAr : chip.labelEn}
              </Link>
            ) : (
              <button key={i} onClick={chip.action} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 14px', borderRadius: 999, whiteSpace: 'nowrap',
                background: sort === 'watchlist' ? 'var(--brand)' : 'var(--surf)',
                border: sort === 'watchlist' ? 'none' : '1px solid var(--line)',
                fontSize: 11, fontWeight: 700,
                color: sort === 'watchlist' ? '#fff' : 'var(--ink2)',
                flexShrink: 0, fontFamily: 'inherit',
              }}>
                <span>{chip.icon}</span>
                {ar ? chip.labelAr : chip.labelEn}
              </button>
            )
          ))}
        </div>

        {/* ── Sector chips ── */}
        <div style={{
          display: 'flex', gap: 6, padding: '0 16px 10px',
          overflowX: 'auto', scrollbarWidth: 'none',
        }}>
          {SECTORS.map(s => (
            <button key={s.id} onClick={() => setSector(s.id)}
              style={{
                padding: '5px 12px', borderRadius: 999, border: 'none', whiteSpace: 'nowrap',
                background: sector === s.id ? 'var(--brand)' : 'var(--surf2)',
                color: sector === s.id ? '#fff' : 'var(--ink3)',
                fontSize: 11, fontWeight: 700, fontFamily: 'inherit', flexShrink: 0,
              }}
            >
              {ar ? s.ar : s.en}
            </button>
          ))}
        </div>

        {/* ── Company list ── */}
        <div style={{ flex: 1 }}>
          {loading && Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 16px', borderBottom: '1px solid var(--line)',
            }}>
              <div className="skeleton" style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ height: 11, width: 100, borderRadius: 4, marginBottom: 6 }} />
                <div className="skeleton" style={{ height: 9, width: 60, borderRadius: 4 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <div className="skeleton" style={{ height: 11, width: 56, borderRadius: 4 }} />
                <div className="skeleton" style={{ height: 9, width: 40, borderRadius: 4 }} />
              </div>
            </div>
          ))}

          {!loading && filtered.slice(0, 25).map(co => {
            const up = co.pct >= 0
            const pts = sparkPoints(co.sym)
            return (
              <div
                key={co.sym}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 16px', borderBottom: '1px solid var(--line)',
                  cursor: 'pointer',
                }}
                onClick={() => router.push(`/c/${co.sym}`)}
              >
                {/* Logo */}
                <CoLogo sym={co.sym} color={co.color} logo={co.logo} size={38} />

                {/* Name + sparkline */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: 'var(--ink)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    marginBottom: 2,
                  }}>
                    {ar ? co.ar : co.en}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 9, color: 'var(--ink4)', fontFamily: 'var(--font-mono)' }}>
                      {co.sym}
                    </span>
                    <MiniSpark points={pts} up={up} />
                  </div>
                </div>

                {/* Price + change */}
                <div style={{ textAlign: 'end', flexShrink: 0 }}>
                  <div style={{
                    fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
                    color: 'var(--ink)', marginBottom: 2,
                  }}>
                    {co.close.toFixed(3)}
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 700,
                    color: up ? 'var(--up)' : 'var(--dn)',
                  }}>
                    {up ? '▲' : '▼'} {Math.abs(co.pct).toFixed(2)}%
                  </div>
                </div>
              </div>
            )
          })}

          {/* View all link */}
          {!loading && filtered.length > 25 && (
            <Link href="/market" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '14px 16px', fontSize: 13, fontWeight: 700, color: 'var(--brand)',
            }}>
              {ar ? `← عرض كل الشركات (${filtered.length})` : `View all ${filtered.length} companies →`}
            </Link>
          )}

          {!loading && filtered.length === 0 && (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--ink4)', fontSize: 13 }}>
              {sort === 'watchlist'
                ? (ar ? 'قائمة المراقبة فارغة — اضغط ★ لإضافة شركة' : 'Watchlist empty — tap ★ to add a company')
                : (ar ? 'لا توجد نتائج' : 'No results')}
            </div>
          )}
        </div>

        {/* ── Spin banner (above bottom nav) ── */}
        {!authLoading && !user && (
          <div style={{
            margin: '12px 16px',
            background: 'linear-gradient(135deg, rgba(245,200,75,0.15), rgba(245,200,75,0.05))',
            border: '1px solid rgba(245,200,75,0.4)',
            borderRadius: 14, padding: '12px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gold)' }}>
                {ar ? '🎡 عجلة الحظ متاحة!' : '🎡 SPIN READY'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--ink3)', marginTop: 2 }}>
                {ar ? 'اربح حتى 5,000 نقطة مجاناً' : 'Win up to 5,000 pts free'}
              </div>
            </div>
            <button
              onClick={() => openAuth('signup')}
              style={{
                padding: '8px 14px', borderRadius: 9, border: 'none',
                background: 'var(--gold)', color: '#0B0E14',
                fontSize: 11, fontWeight: 800, fontFamily: 'inherit', flexShrink: 0,
              }}
            >
              {ar ? 'سجّل' : 'Join'}
            </button>
          </div>
        )}
        {!authLoading && user && (
          <div style={{
            margin: '12px 16px',
            background: 'linear-gradient(135deg, rgba(245,200,75,0.15), rgba(245,200,75,0.05))',
            border: '1px solid rgba(245,200,75,0.4)',
            borderRadius: 14, padding: '12px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gold)' }}>
                {ar ? '🎡 عجلة الحظ جاهزة!' : '🎡 SPIN READY'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--ink3)', marginTop: 2 }}>
                {ar ? 'اربح حتى 5,000 نقطة مجاناً' : 'Win up to 5,000 pts free · Daily'}
              </div>
            </div>
            <button
              onClick={() => router.push('/rewards/spin')}
              style={{
                padding: '8px 14px', borderRadius: 9, border: 'none',
                background: 'var(--gold)', color: '#0B0E14',
                fontSize: 11, fontWeight: 800, fontFamily: 'inherit', flexShrink: 0,
              }}
            >
              {ar ? 'دوّر' : 'Spin'}
            </button>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          DESKTOP LAYOUT
      ══════════════════════════════════════════════════════════════════ */}
      <div className="desktop-only" style={{
        maxWidth: 1440, margin: '0 auto',
        padding: '20px 24px',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 300px',
        gap: 20, alignItems: 'start',
      }}>

        {/* ════════════════════ LEFT COLUMN ════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* RSISX Card */}
          <Link href="/charts" style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--surf)', border: '1px solid var(--line)',
              borderRadius: 16, padding: '16px 20px',
              display: 'grid',
              gridTemplateColumns: 'auto 1fr auto',
              alignItems: 'center', gap: 20,
              cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--brand)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--line)')}
            >
              {/* Left: value + pct */}
              <div>
                <div style={{ fontSize: 11, color: 'var(--ink4)', fontWeight: 600, marginBottom: 4 }}>
                  {ar ? 'مؤشر ربيع RSISX' : 'Rabee RSISX Index'} ›
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700 }}>
                    {loading ? '—' : rsisxVal}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: rsisxUp ? 'var(--up)' : 'var(--dn)', visibility: loading ? 'hidden' : 'visible' }}>
                    {rsisxUp ? '▲' : '▼'} {Math.abs(rsisxPct).toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Center: sparkline — reserve height to prevent CLS */}
              <div style={{ minWidth: 0, height: 52 }}>
                {!loading && rsisxHist.length > 2 && (
                  <RSISXSpark data={rsisxHist} up={rsisxUp} w={400} h={52} />
                )}
              </div>

              {/* Right: breadth stats */}
              <div style={{ display: 'flex', gap: 20 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--ink4)', marginBottom: 2 }}>{ar ? 'رابحون' : 'Gainers'}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--up)' }}>{gainers}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--ink4)', marginBottom: 2 }}>{ar ? 'خاسرون' : 'Losers'}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--dn)' }}>{losers}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--ink4)', marginBottom: 2 }}>{ar ? 'شركة' : 'Listed'}</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{companies.filter(c => c.close > 0).length}</div>
                </div>
              </div>
            </div>
          </Link>

          {/* Filter chips */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Sectors */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SECTORS.map(s => (
                <button key={s.id} onClick={() => setSector(s.id)}
                  style={{
                    padding: '5px 12px', borderRadius: 999, border: 'none',
                    background: sector === s.id ? 'var(--brand)' : 'var(--surf)',
                    color: sector === s.id ? '#fff' : 'var(--ink3)',
                    fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
                  }}
                >
                  {ar ? s.ar : s.en}
                </button>
              ))}
            </div>
            {/* Sorts */}
            <div style={{ display: 'flex', gap: 6 }}>
              {SORT_OPTIONS.map(s => (
                <button key={s.id} onClick={() => setSort(s.id)}
                  style={{
                    padding: '4px 10px', borderRadius: 999,
                    border: `1px solid ${sort === s.id ? 'var(--brand)' : 'var(--line)'}`,
                    background: 'none',
                    color: sort === s.id ? 'var(--brand)' : 'var(--ink4)',
                    fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
                  }}
                >
                  {ar ? s.ar : s.en}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div style={{
            background: 'var(--surf)', border: '1px solid var(--line)',
            borderRadius: 16, overflow: 'hidden',
          }}>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '28px 1fr 90px 80px 70px 80px 60px 36px',
              columnGap: 6,
              padding: '10px 16px', borderBottom: '1px solid var(--line)',
              alignItems: 'center',
            }}>
              <span style={colHdr}>#</span>
              <span style={colHdr}>{ar ? 'الشركة' : 'Company'}</span>
              <span style={{ ...colHdr, textAlign: 'end' }}>{ar ? 'السعر' : 'Price'}</span>
              <span style={{ ...colHdr, textAlign: 'end' }}>{ar ? 'التغيير' : 'Change'}</span>
              <span style={{ ...colHdr, textAlign: 'end' }}>{ar ? 'الحجم' : 'Volume'}</span>
              <span style={{ ...colHdr, textAlign: 'end' }}>{ar ? 'القيمة السوقية' : 'Mkt Cap'}</span>
              <span style={{ ...colHdr, textAlign: 'center' }}></span>
              <span style={colHdr}></span>
            </div>

            {loading && Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '28px 1fr 90px 80px 70px 80px 60px 36px',
                padding: '12px 16px', borderBottom: '1px solid var(--line)',
                alignItems: 'center', gap: 8,
              }}>
                <div className="skeleton" style={{ height: 10, width: 14, borderRadius: 4 }} />
                <div style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                  <div className="skeleton" style={{ width: 28, height: 28, borderRadius: 6 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div className="skeleton" style={{ height: 10, width: 80 }} />
                    <div className="skeleton" style={{ height: 9, width: 40 }} />
                  </div>
                </div>
                {[90, 70, 60, 70, 52, 90].map((w, j) => (
                  <div key={j} className="skeleton" style={{ height: 10, width: w, borderRadius: 4, justifySelf: 'end' }} />
                ))}
              </div>
            ))}

            {!loading && filtered.slice(0, 25).map((co, i) => {
              const up = co.pct >= 0
              const pct = Math.abs(co.pct).toFixed(2)
              const inWL = watchlist.includes(co.sym)
              return (
                <div
                  key={co.sym}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '28px 1fr 90px 80px 70px 80px 60px 36px',
                    padding: '10px 16px', borderBottom: '1px solid var(--line)',
                    alignItems: 'center', cursor: 'pointer',
                    transition: 'background 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = '')}
                  onClick={() => router.push(`/c/${co.sym}`)}
                >
                  <span style={{ fontSize: 10, color: 'var(--ink4)', fontFamily: 'var(--font-mono)' }}>{i + 1}</span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                    <CoLogo sym={co.sym} color={co.color} logo={co.logo} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ar ? co.ar : co.en}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontSize: 10, color: 'var(--ink4)', fontFamily: 'var(--font-mono)' }}>{co.sym}</span>
                        <button
                          onClick={e => { e.stopPropagation(); toggleWatchlist(co.sym) }}
                          style={{ background: 'none', border: 'none', padding: 0, fontSize: 9, color: inWL ? 'var(--gold)' : 'var(--ink4)', lineHeight: 1 }}
                        >★</button>
                      </div>
                    </div>
                  </div>

                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, textAlign: 'end' }}>
                    {co.close.toFixed(3)}
                  </span>

                  <span style={{ fontSize: 12, fontWeight: 700, color: up ? 'var(--up)' : 'var(--dn)', textAlign: 'end' }}>
                    {up ? '▲' : '▼'} {pct}%
                  </span>

                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink3)', textAlign: 'end' }}>
                    {fmtVol(co.vol)}
                  </span>

                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: 'var(--ink2)', textAlign: 'end' }}>
                    {fmtMcap(co.mcap)}
                  </span>

                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Spark pct={co.pct} />
                  </div>

                  <button onClick={e => { e.stopPropagation(); router.push(`/c/${co.sym}`) }} style={{
                    padding: '4px 8px', borderRadius: 6, border: '1px solid var(--line)',
                    background: 'none', color: 'var(--ink3)', fontSize: 13, fontFamily: 'inherit',
                  }}>›</button>
                </div>
              )
            })}

            {!loading && filtered.length > 25 && (
              <Link href="/market" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '14px 16px', fontSize: 13, fontWeight: 700, color: 'var(--brand)',
                borderTop: '1px solid var(--line)',
              }}>
                {ar ? `← عرض كل الشركات (${filtered.length})` : `View all ${filtered.length} companies →`}
              </Link>
            )}

            {!loading && filtered.length === 0 && (
              <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--ink4)', fontSize: 13 }}>
                {sort === 'watchlist'
                  ? (ar ? 'قائمة المراقبة فارغة — اضغط ★ لإضافة شركة' : 'Watchlist empty — tap ★ to add a company')
                  : (ar ? 'لا توجد نتائج' : 'No results')}
              </div>
            )}
          </div>
        </div>

        {/* ════════════════════ RIGHT SIDEBAR ════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Portfolio card (logged in) */}
          {authLoading ? (
            <div style={{ background: 'var(--surf)', border: '1px solid var(--line)', borderRadius: 16, padding: 16 }}>
              <div className="skeleton" style={{ height: 12, width: 80, borderRadius: 6, marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 20, width: '100%', borderRadius: 6, marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 36, width: '100%', borderRadius: 10 }} />
            </div>
          ) : user && profile ? (
            <div style={{
              background: 'var(--surf)', border: '1px solid var(--line)',
              borderRadius: 16, padding: 16,
            }}>
              <div style={{ fontSize: 11, color: 'var(--ink4)', fontWeight: 600, marginBottom: 10 }}>
                {ar ? 'محفظتي' : 'My Portfolio'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>{fmtPts(profile.points)}</div>
                  <div style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 2 }}>{ar ? 'نقطة' : 'pts'}</div>
                </div>
                <div style={{
                  padding: '4px 10px', borderRadius: 999,
                  background: rank ? `${rank.color}22` : 'var(--surf3)',
                  border: `1px solid ${rank?.color ?? 'var(--line)'}`,
                  fontSize: 11, fontWeight: 700, color: rank?.color ?? 'var(--ink3)',
                }}>
                  {rank?.icon} {ar ? rank?.ar : rank?.en}
                </div>
              </div>
              <Link href="/wallet" style={{
                display: 'block', textAlign: 'center', padding: '8px',
                background: 'var(--brand-soft)', border: '1px solid var(--brand)',
                borderRadius: 10, fontSize: 12, fontWeight: 700, color: 'var(--brand)',
              }}>
                {ar ? 'عرض المحفظة ›' : 'View Wallet ›'}
              </Link>
            </div>
          ) : (
            <div style={{
              background: 'linear-gradient(135deg, rgba(79,107,255,0.15) 0%, rgba(168,85,247,0.15) 100%)',
              border: '1px solid var(--brand)', borderRadius: 16, padding: 20,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🚀</div>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 6 }}>
                {ar ? 'ابدأ رحلتك الاستثمارية' : 'Start Your Journey'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink3)', marginBottom: 14, lineHeight: 1.6 }}>
                {ar
                  ? 'سجّل وابدأ بـ 1000 نقطة + محفظة افتراضية'
                  : 'Sign up with 1,000 pts + virtual portfolio'}
              </div>
              <button onClick={() => openAuth('signup')} style={{
                display: 'block', width: '100%', padding: '9px',
                background: 'var(--brand)', borderRadius: 10,
                fontSize: 12, fontWeight: 700, color: '#fff', border: 'none', fontFamily: 'inherit',
              }}>
                {ar ? 'إنشاء حساب مجاني' : 'Create Free Account'}
              </button>
            </div>
          )}

          {/* Spin widget */}
          <SpinWidget ar={ar} user={!!user} openAuth={openAuth} />

          {/* Top movers */}
          {!loading && companies.length > 0 && (
            <TopMovers companies={companies} ar={ar} router={router} />
          )}

          {/* FX quick widget */}
          <FxWidget ar={ar} />
        </div>
      </div>
    </>
  )
}

// ─── Spin Widget ─────────────────────────────────────────────────────────────
function SpinWidget({ ar, user, openAuth }: { ar: boolean; user: boolean; openAuth: (tab?: 'signin' | 'signup') => void }) {
  const [expanded, setExpanded] = useState(false)
  const router = useRouter()

  return (
    <div style={{
      background: 'var(--surf)', border: '1px solid var(--line)',
      borderRadius: 16, overflow: 'hidden',
    }}>
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', background: 'none', border: 'none', fontFamily: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>🎡</span>
          <div style={{ textAlign: 'start' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
              {ar ? 'عجلة الحظ' : 'Spin the Wheel'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--ink4)' }}>
              {ar ? 'مجاني كل 24 ساعة' : 'Free every 24h'}
            </div>
          </div>
        </div>
        <span style={{ color: 'var(--ink4)', fontSize: 12 }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div style={{ padding: '0 16px 16px', textAlign: 'center' }}>
          <div style={{
            width: 120, height: 120, margin: '0 auto 12px',
            borderRadius: '50%',
            background: 'conic-gradient(#4F6BFF 0deg 60deg, #F5C84B 60deg 120deg, #22C55E 120deg 180deg, #EF4444 180deg 240deg, #A855F7 240deg 300deg, #4F6BFF 300deg 360deg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 24px rgba(79,107,255,0.4)',
            position: 'relative',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'var(--surf)', border: '2px solid var(--line)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20,
            }}>🎰</div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 12 }}>
            {ar ? 'اربح نقاط، مضاعفات، وهدايا!' : 'Win points, multipliers & prizes!'}
          </div>
          <button
            onClick={() => user ? router.push('/rewards/spin') : openAuth('signup')}
            style={{
              width: '100%', padding: '9px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #4F6BFF, #A855F7)',
              color: '#fff', fontWeight: 700, fontSize: 12, fontFamily: 'inherit',
            }}
          >
            {user ? (ar ? 'دوّر الآن' : 'Spin Now') : (ar ? 'سجّل للعب' : 'Sign Up to Play')}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Top Movers ──────────────────────────────────────────────────────────────
function TopMovers({ companies, ar, router }: { companies: Company[]; ar: boolean; router: any }) {
  const active = companies.filter(c => c.close > 0)
  const top3 = [...active].sort((a, b) => b.pct - a.pct).slice(0, 3)
  const bot3 = [...active].sort((a, b) => a.pct - b.pct).slice(0, 3)

  return (
    <div style={{
      background: 'var(--surf)', border: '1px solid var(--line)',
      borderRadius: 16, padding: 16,
    }}>
      <div style={{ fontSize: 11, color: 'var(--ink4)', fontWeight: 600, marginBottom: 12 }}>
        {ar ? 'أبرز التحركات' : 'Top Movers'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {top3.map(co => (
          <MoverRow key={co.sym} co={co} ar={ar} router={router} />
        ))}
        <div style={{ height: 1, background: 'var(--line)', margin: '4px 0' }} />
        {bot3.map(co => (
          <MoverRow key={co.sym} co={co} ar={ar} router={router} />
        ))}
      </div>
    </div>
  )
}

function MoverRow({ co, ar, router }: { co: Company; ar: boolean; router: any }) {
  const up = co.pct >= 0
  return (
    <div
      onClick={() => router.push(`/c/${co.sym}`)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '5px 8px', borderRadius: 8, cursor: 'pointer',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surf2)')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink2)' }}>
        {co.sym}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink3)' }}>
          {co.close.toFixed(3)}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: up ? 'var(--up)' : 'var(--dn)' }}>
          {up ? '+' : ''}{co.pct.toFixed(2)}%
        </span>
      </div>
    </div>
  )
}

// ─── FX Quick Widget ─────────────────────────────────────────────────────────
function FxWidget({ ar }: { ar: boolean }) {
  const [usd, setUsd] = useState('1')
  const rate = 1310
  const iqd = (parseFloat(usd || '0') * rate).toLocaleString('en')

  return (
    <div style={{
      background: 'var(--surf)', border: '1px solid var(--line)',
      borderRadius: 16, padding: 16,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--ink4)', fontWeight: 600 }}>
          {ar ? 'تحويل IQD ⇄ USD' : 'IQD ⇄ USD'}
        </div>
        <Link href="/fx" style={{ fontSize: 10, color: 'var(--brand)', fontWeight: 600 }}>
          {ar ? 'تفاصيل ›' : 'Full ›'}
        </Link>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <input
          type="number" min="0" value={usd}
          onChange={e => setUsd(e.target.value)}
          style={{
            flex: 1, padding: '8px 10px', borderRadius: 8,
            background: 'var(--surf3)', border: '1px solid var(--line)',
            color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: 13, outline: 'none',
          }}
        />
        <span style={{ fontSize: 11, color: 'var(--ink4)', fontWeight: 600 }}>USD</span>
      </div>
      <div style={{
        padding: '8px 10px', borderRadius: 8,
        background: 'var(--surf3)', border: '1px solid var(--line)',
        fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--gold)',
      }}>
        {iqd} IQD
      </div>
      <div style={{ fontSize: 9, color: 'var(--ink4)', marginTop: 8, textAlign: 'center' }}>
        {ar ? `1 USD = ${rate.toLocaleString('en')} IQD` : `1 USD ≈ ${rate.toLocaleString('en')} IQD`}
      </div>
    </div>
  )
}
