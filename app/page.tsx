'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'
import { fetchLive, fetchCompanyMeta, mergeCompanies, filterSort, fmtVol, fmtMcap, SECTORS, SORT_OPTIONS } from '@/lib/market'
import { rankFor, fmtPts } from '@/lib/ranks'
import type { Company, LiveData } from '@/types'

// ─── Sparkline ───────────────────────────────────────────────────────────────
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

// ─── Logo ────────────────────────────────────────────────────────────────────
function CoLogo({ sym, color }: { sym: string; color?: string }) {
  const [err, setErr] = useState(false)
  if (!err) {
    return (
      <img
        src={`https://isc.gov.iq/Uploads/Companies/${sym}.png`}
        alt={sym}
        width={28} height={28}
        style={{ borderRadius: 6, objectFit: 'contain', background: '#fff', padding: 2 }}
        onError={() => setErr(true)}
      />
    )
  }
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 6, flexShrink: 0,
      background: color || 'var(--brand)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, fontWeight: 800, color: '#fff',
    }}>
      {sym.slice(0, 3)}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { lang, user, profile, watchlist, toggleWatchlist } = useApp()
  const ar = lang === 'ar'
  const router = useRouter()

  const [companies, setCompanies] = useState<Company[]>([])
  const [liveData,  setLiveData]  = useState<LiveData | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [sector,    setSector]    = useState('all')
  const [sort,      setSort]      = useState('default')

  useEffect(() => {
    Promise.all([fetchLive(), fetchCompanyMeta()])
      .then(([live, meta]) => {
        setLiveData(live)
        setCompanies(mergeCompanies(meta, live.stocks))
      })
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(
    () => filterSort(companies, sector, sort, watchlist),
    [companies, sector, sort, watchlist]
  )

  const rsisx = liveData?.rsisx
  const rsisxVal  = rsisx ? Number(rsisx.value).toFixed(2) : '—'
  const rsisxChg  = rsisx ? Number(rsisx.change) : 0
  const rsisxPct  = rsisx ? Number(rsisx.pct) : 0
  const rsisxUp   = rsisxPct >= 0

  const gainers = useMemo(() => [...companies].filter(c => c.pct > 0 && c.close > 0).length, [companies])
  const losers  = useMemo(() => [...companies].filter(c => c.pct < 0 && c.close > 0).length, [companies])
  const rank    = profile ? rankFor(profile.points) : null

  // ── Strip CTA items ─────────────────────────────────────────────────────
  const stripItems = user && profile ? [
    { icon: '🔥', label: ar ? `${profile.streak} يوم` : `${profile.streak}d streak` },
    { icon: rank?.icon ?? '⭐', label: ar ? rank?.ar : rank?.en },
    { icon: '₽',  label: fmtPts(profile.points) },
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
      {/* ── Slim strip ── */}
      <div style={{
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

      {/* ── Main layout ── */}
      <div style={{
        maxWidth: 1440, margin: '0 auto',
        padding: '20px 24px',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 300px',
        gap: 20, alignItems: 'start',
      }}>

        {/* ════════════════════ LEFT COLUMN ════════════════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* RSISX Card */}
          <div style={{
            background: 'var(--surf)', border: '1px solid var(--line)',
            borderRadius: 16, padding: '16px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 12,
          }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--ink4)', fontWeight: 600, marginBottom: 4 }}>
                {ar ? 'مؤشر ربيع RSISX' : 'Rabee RSISX Index'}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 700 }}>
                  {loading ? '—' : rsisxVal}
                </span>
                {!loading && (
                  <span style={{ fontSize: 13, fontWeight: 700, color: rsisxUp ? 'var(--up)' : 'var(--dn)' }}>
                    {rsisxUp ? '▲' : '▼'} {Math.abs(rsisxPct).toFixed(2)}%
                  </span>
                )}
              </div>
            </div>
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
            <Link href="/charts" style={{
              padding: '8px 16px', background: 'var(--brand-soft)',
              border: '1px solid var(--brand)', borderRadius: 9,
              fontSize: 12, fontWeight: 700, color: 'var(--brand)',
            }}>
              {ar ? 'المخططات ›' : 'Charts ›'}
            </Link>
          </div>

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
                    fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
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
              gridTemplateColumns: '28px 1fr 90px 80px 70px 80px 60px 100px',
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
              <span style={{ ...colHdr, textAlign: 'end' }}>{ar ? 'تداول' : 'Trade'}</span>
            </div>

            {loading && Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '28px 1fr 90px 80px 70px 80px 60px 100px',
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

            {!loading && filtered.map((co, i) => {
              const up = co.pct >= 0
              const pct = Math.abs(co.pct).toFixed(2)
              const inWL = watchlist.includes(co.sym)
              return (
                <div
                  key={co.sym}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '28px 1fr 90px 80px 70px 80px 60px 100px',
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
                    <CoLogo sym={co.sym} color={co.color} />
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

                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink3)', textAlign: 'end' }}>
                    {fmtMcap(co.mcap)}
                  </span>

                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Spark pct={co.pct} />
                  </div>

                  <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => router.push(`/c/${co.sym}?action=buy`)} style={{
                      padding: '4px 9px', borderRadius: 6, border: 'none',
                      background: 'rgba(34,197,94,0.15)', color: 'var(--up)',
                      fontSize: 10, fontWeight: 700, fontFamily: 'inherit',
                    }}>
                      {ar ? 'شراء' : 'Buy'}
                    </button>
                    <button onClick={() => router.push(`/c/${co.sym}?action=sell`)} style={{
                      padding: '4px 9px', borderRadius: 6, border: 'none',
                      background: 'rgba(239,68,68,0.12)', color: 'var(--dn)',
                      fontSize: 10, fontWeight: 700, fontFamily: 'inherit',
                    }}>
                      {ar ? 'بيع' : 'Sell'}
                    </button>
                    <button onClick={() => router.push(`/c/${co.sym}`)} style={{
                      padding: '4px 9px', borderRadius: 6, border: '1px solid var(--line)',
                      background: 'none', color: 'var(--ink3)',
                      fontSize: 10, fontWeight: 700, fontFamily: 'inherit',
                    }}>›</button>
                  </div>
                </div>
              )
            })}

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
          {user && profile ? (
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
              <Link href="/?auth=signup" style={{
                display: 'block', padding: '9px',
                background: 'var(--brand)', borderRadius: 10,
                fontSize: 12, fontWeight: 700, color: '#fff',
              }}>
                {ar ? 'إنشاء حساب مجاني' : 'Create Free Account'}
              </Link>
            </div>
          )}

          {/* Spin widget */}
          <SpinWidget ar={ar} user={!!user} />

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
function SpinWidget({ ar, user }: { ar: boolean; user: boolean }) {
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
          {/* Mini wheel graphic */}
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
            onClick={() => user ? router.push('/rewards/spin') : router.push('/?auth=signup')}
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
  const rate = 1310 // IQD per USD (approximate)
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
