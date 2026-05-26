'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useApp } from '@/context/AppContext'

const QUESTS = [
  { id: 'market_visit',     icon: '📈', titleAr: 'تصفح السوق',      titleEn: 'Browse Market',      pts: 10,  daily: true,  descAr: 'افتح صفحة السوق مرة واحدة اليوم',         descEn: 'Visit the market page once today',         href: '/market' },
  { id: 'chart_view',       icon: '📊', titleAr: 'تحقق من المخططات', titleEn: 'Check Charts',      pts: 15,  daily: true,  descAr: 'افتح مخطط أي شركة اليوم',                 descEn: 'Open any company chart today',              href: '/market' },
  { id: 'currency_convert', icon: '💱', titleAr: 'تحويل العملة',    titleEn: 'Convert Currency',   pts: 10,  daily: true,  descAr: 'استخدم صفحة IQD/USD مرة واحدة اليوم',     descEn: 'Visit the IQD/USD page once today',         href: '/fx' },
  { id: 'spin_wheel',       icon: '🎡', titleAr: 'دوّر العجلة',     titleEn: 'Spin the Wheel',     pts: 50,  daily: true,  descAr: 'استخدم عجلة الحظ اليوم',                  descEn: 'Use the spin wheel today',                  href: '/rewards/spin' },
  { id: 'watchlist_3',      icon: '⭐', titleAr: 'أضف للمراقبة',    titleEn: 'Add to Watchlist',   pts: 20,  daily: false, descAr: 'أضف 3 شركات لقائمة المراقبة',              descEn: 'Add 3 companies to your watchlist',         href: '/market' },
  { id: 'first_trade',      icon: '💼', titleAr: 'أول صفقة',        titleEn: 'First Trade',        pts: 100, daily: false, descAr: 'نفّذ أول صفقة شراء أو بيع',               descEn: 'Complete your first buy or sell trade',     href: null },
  { id: 'streak_7',         icon: '🔥', titleAr: 'تسلسل 7 أيام',   titleEn: '7-Day Streak',       pts: 300, daily: false, descAr: 'سجّل دخولاً 7 أيام متتالية',              descEn: 'Log in 7 consecutive days',                 href: null },
  { id: null,               icon: '⚽', titleAr: 'ركلة الجزاء',     titleEn: 'Penalty Shootout',   pts: 100, daily: true,  descAr: 'سجّل هدفاً واربح 100 نقطة (حتى 10 ركلات يومياً)', descEn: 'Score goals for 100 pts (10 shots/day)', href: '/penalty' },
  { id: null,               icon: '🐍', titleAr: 'لعبة الثعبان',   titleEn: 'Snake Game',         pts: 100, daily: true,  descAr: 'كل طعامة = 100 نقطة، حتى 2000 يومياً',    descEn: 'Each food = 100 pts, up to 2000/day',       href: '/snake' },
  { id: null,               icon: '👥', titleAr: 'أحل صديقاً',      titleEn: 'Refer a Friend',     pts: 500, daily: false, descAr: 'ادعُ صديقاً وسجّله عبر رمز الإحالة',     descEn: 'Invite a friend via referral code',         href: null },
]

export default function QuestsPage() {
  const { lang, user, openAuth } = useApp()
  const ar = lang === 'ar'

  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    fetch('/api/quest')
      .then(r => r.json())
      .then(d => setCompleted(new Set(d.completed ?? [])))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  const totalPts    = QUESTS.filter(q => q.id && completed.has(q.id)).reduce((s, q) => s + q.pts, 0)
  const totalQuests = QUESTS.filter(q => q.id).length
  const doneCount   = QUESTS.filter(q => q.id && completed.has(q.id)).length

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>
          {ar ? 'المهمات' : 'Quests'}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink3)', margin: 0 }}>
          {ar ? 'أكمل المهمات اليومية واربح نقاطاً إضافية!' : 'Complete daily quests to earn bonus points!'}
        </p>
      </div>

      {!user ? (
        <div style={{
          background: 'var(--brand-soft)', border: '1px solid var(--brand)',
          borderRadius: 14, padding: '14px 18px', marginBottom: 20,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontSize: 13, color: 'var(--ink2)' }}>
            {ar ? 'سجّل دخولك لتتبع تقدمك' : 'Sign in to track your progress'}
          </div>
          <button onClick={() => openAuth('signin')} style={{
            padding: '7px 16px', background: 'var(--brand)', borderRadius: 9,
            fontSize: 12, fontWeight: 700, color: '#fff', border: 'none', fontFamily: 'inherit',
          }}>
            {ar ? 'دخول' : 'Sign In'}
          </button>
        </div>
      ) : !loading && (
        <div style={{
          background: 'var(--surf)', border: '1px solid var(--line)',
          borderRadius: 14, padding: '14px 18px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          {/* Progress bar */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>
                {ar ? `${doneCount} / ${totalQuests} مهمة` : `${doneCount} / ${totalQuests} quests`}
              </span>
              {totalPts > 0 && (
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)' }}>
                  +{totalPts} {ar ? 'نقطة اليوم' : 'pts today'}
                </span>
              )}
            </div>
            <div style={{ height: 6, borderRadius: 999, background: 'var(--surf3)' }}>
              <div style={{
                height: '100%', borderRadius: 999,
                background: 'linear-gradient(90deg, var(--brand), var(--gold))',
                width: `${totalQuests > 0 ? (doneCount / totalQuests) * 100 : 0}%`,
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {QUESTS.map((q, i) => {
          const done = q.id ? completed.has(q.id) : false
          const inner = (
            <>
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: done ? 'rgba(34,197,94,0.12)' : 'var(--surf3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                border: done ? '1px solid rgba(34,197,94,0.35)' : '1px solid transparent',
              }}>
                {q.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 700, fontSize: 13,
                  color: done ? 'var(--ink3)' : 'inherit',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {ar ? q.titleAr : q.titleEn}
                  {q.daily && (
                    <span style={{
                      fontSize: 9, fontWeight: 600, padding: '1px 5px', borderRadius: 4,
                      background: 'rgba(79,107,255,0.12)', color: 'var(--brand)',
                      border: '1px solid rgba(79,107,255,0.2)',
                    }}>
                      {ar ? 'يومي' : 'DAILY'}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 2 }}>
                  {ar ? q.descAr : q.descEn}
                </div>
              </div>
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                {done ? (
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: 'rgba(34,197,94,0.15)', border: '1.5px solid #22C55E',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13,
                  }}>
                    ✓
                  </div>
                ) : (
                  <div style={{
                    padding: '4px 10px', borderRadius: 999,
                    background: 'rgba(245,200,75,0.12)', border: '1px solid rgba(245,200,75,0.27)',
                    fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--gold)',
                  }}>
                    +{q.pts}
                  </div>
                )}
                {q.href && !done && (
                  <div style={{ flexShrink: 0, fontSize: 14, color: 'var(--ink3)' }}>›</div>
                )}
              </div>
            </>
          )
          const cardStyle: React.CSSProperties = {
            background: done ? 'rgba(34,197,94,0.04)' : 'var(--surf)',
            border: done ? '1px solid rgba(34,197,94,0.2)' : '1px solid var(--line)',
            borderRadius: 14, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 14,
            textDecoration: 'none', color: 'inherit',
            opacity: done ? 0.75 : 1,
            ...(q.href && !done ? { cursor: 'pointer' } : {}),
          }
          return (q.href && !done)
            ? <Link key={i} href={q.href} style={cardStyle}>{inner}</Link>
            : <div key={i} style={cardStyle}>{inner}</div>
        })}
      </div>

      <p style={{ fontSize: 11, color: 'var(--ink4)', textAlign: 'center', marginTop: 20 }}>
        {ar
          ? 'تُتبع المهمات تلقائياً — تُضاف النقاط فور إتمام كل مهمة'
          : 'Quests are tracked automatically — points are added on completion'}
      </p>
    </div>
  )
}
