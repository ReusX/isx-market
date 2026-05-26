'use client'

export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { useApp } from '@/context/AppContext'

const QUESTS = [
  { icon: '📈', titleAr: 'تصفح السوق',      titleEn: 'Browse Market',      pts: 10,  descAr: 'افتح صفحة السوق مرة واحدة اليوم',         descEn: 'Visit the market page once today',       href: null },
  { icon: '⭐', titleAr: 'أضف للمراقبة',    titleEn: 'Add to Watchlist',   pts: 20,  descAr: 'أضف 3 شركات لقائمة المراقبة',              descEn: 'Add 3 companies to your watchlist',      href: null },
  { icon: '💼', titleAr: 'أول صفقة',        titleEn: 'First Trade',        pts: 100, descAr: 'نفّذ أول صفقة شراء أو بيع',               descEn: 'Complete your first buy or sell trade',  href: null },
  { icon: '🎡', titleAr: 'دوّر العجلة',     titleEn: 'Spin the Wheel',     pts: 50,  descAr: 'استخدم عجلة الحظ اليوم',                  descEn: 'Use the spin wheel today',               href: null },
  { icon: '⚽', titleAr: 'ركلة الجزاء',     titleEn: 'Penalty Shootout',   pts: 100, descAr: 'سجّل هدفاً واربح 100 نقطة (حتى 10 ركلات يومياً)', descEn: 'Score a penalty to win 100 pts (up to 10 shots/day)', href: '/penalty' },
  { icon: '🐍', titleAr: 'لعبة الثعبان',   titleEn: 'Snake Game',         pts: 100, descAr: 'كل طعامة = 100 نقطة، حتى 2000 نقطة يومياً',         descEn: 'Each food = 100 pts, up to 2000 pts/day',            href: '/snake' },
  { icon: '🔥', titleAr: 'تسلسل 7 أيام',   titleEn: '7-Day Streak',       pts: 300, descAr: 'سجّل دخولاً 7 أيام متتالية',              descEn: 'Log in 7 consecutive days',              href: null },
  { icon: '👥', titleAr: 'أحل صديقاً',      titleEn: 'Refer a Friend',     pts: 500, descAr: 'ادعُ صديقاً وسجّله عبر رمز الإحالة',     descEn: 'Invite a friend using your referral code', href: null },
  { icon: '📊', titleAr: 'تحقق من المخططات','titleEn': 'Check Charts',     pts: 15,  descAr: 'افتح مخطط أي شركة',                       descEn: 'Open any company chart',                 href: null },
  { icon: '💱', titleAr: 'تحويل العملة',    titleEn: 'Convert Currency',   pts: 10,  descAr: 'استخدم محوّل IQD/USD مرة واحدة',          descEn: 'Use the IQD/USD converter once',          href: null },
]

export default function QuestsPage() {
  const { lang, user, openAuth } = useApp()
  const ar = lang === 'ar'

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>
          {ar ? 'المهمات' : 'Quests'}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink3)', margin: 0 }}>
          {ar ? 'أكمل المهمات اليومية واربح نقاطاً إضافية!' : 'Complete daily quests to earn bonus points!'}
        </p>
      </div>

      {!user && (
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
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {QUESTS.map((q, i) => {
          const inner = (
            <>
              <div style={{
                width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                background: 'var(--surf3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
              }}>
                {q.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{ar ? q.titleAr : q.titleEn}</div>
                <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 2 }}>
                  {ar ? q.descAr : q.descEn}
                </div>
              </div>
              <div style={{
                flexShrink: 0, padding: '4px 10px', borderRadius: 999,
                background: 'rgba(245,200,75,0.12)', border: '1px solid rgba(245,200,75,0.27)',
                fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--gold)',
              }}>
                +{q.pts}
              </div>
              {q.href && (
                <div style={{ flexShrink: 0, fontSize: 14, color: 'var(--ink3)' }}>›</div>
              )}
            </>
          )
          const cardStyle: React.CSSProperties = {
            background: 'var(--surf)', border: '1px solid var(--line)',
            borderRadius: 14, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 14,
            textDecoration: 'none', color: 'inherit',
            ...(q.href ? { cursor: 'pointer' } : {}),
          }
          return q.href
            ? <Link key={i} href={q.href} style={cardStyle}>{inner}</Link>
            : <div key={i} style={cardStyle}>{inner}</div>
        })}
      </div>

      <p style={{ fontSize: 11, color: 'var(--ink4)', textAlign: 'center', marginTop: 20 }}>
        {ar ? 'يتم تتبع المهمات تلقائياً — ستُضاف النقاط عند إتمام كل مهمة' : 'Quests are tracked automatically — points added on completion'}
      </p>
    </div>
  )
}
